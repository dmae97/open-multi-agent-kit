import { describe, expect, it } from "vitest";
import {
	decideNetworkAccess,
	decidePathAccess,
	decideSandboxFallback,
	mergeSandboxPolicy,
	preflightBashSpawn,
	type ResolvedSandboxPath,
	type SandboxBackendStatus,
	type SandboxPathResolver,
	type SandboxPolicy,
} from "../src/core/sandbox/policy.ts";

const root = "/repo";

function basePolicy(): SandboxPolicy {
	return {
		mode: "enforce",
		profile: "workspace-write",
		filesystem: {
			root,
			readAllow: [root],
			readDeny: ["/repo/private"],
			writeAllow: ["/repo/src", "/tmp/omk"],
			denyWrite: ["/repo/.git", "/repo/node_modules", "/repo/.env"],
			tempWrite: ["/tmp/omk"],
			followSymlinks: false,
		},
		network: {
			mode: "domain-allowlist",
			allowedDomains: ["example.com"],
			deniedDomains: ["blocked.example.com"],
			allowUnixSockets: [],
			allowBrowser: false,
		},
		process: { allowExec: true, allowShell: true, allowPrivilege: false },
	};
}

function resolver(overrides: Record<string, ResolvedSandboxPath> = {}): SandboxPathResolver {
	return (requestPath) =>
		overrides[requestPath] ?? {
			requestedPath: requestPath,
			exists: true,
			realPath: requestPath.startsWith("/") ? requestPath : `/repo/${requestPath}`,
		};
}

describe("sandbox path policy", () => {
	it("allows scoped reads and writes", () => {
		expect(decidePathAccess(basePolicy(), { kind: "read", path: "/repo/README.md" }, resolver()).allowed).toBe(true);
		expect(decidePathAccess(basePolicy(), { kind: "write", path: "/repo/src/a.ts" }, resolver()).allowed).toBe(true);
	});

	it("denyWrite wins over writeAllow", () => {
		const result = decidePathAccess(basePolicy(), { kind: "write", path: "/repo/.git/config" }, resolver());
		expect(result).toMatchObject({ allowed: false, rule: "path.deny_write" });
	});

	it("denies sensitive credential paths", () => {
		const result = decidePathAccess(basePolicy(), { kind: "read", path: "/repo/.env.local" }, resolver());
		expect(result).toMatchObject({ allowed: false, rule: "path.secret" });
	});

	it("denies paths that resolve outside the sandbox root", () => {
		const result = decidePathAccess(
			basePolicy(),
			{ kind: "read", path: "/repo/link" },
			resolver({
				"/repo/link": { requestedPath: "/repo/link", exists: true, realPath: "/outside/secret", isSymlink: true },
			}),
		);
		expect(result).toMatchObject({ allowed: false, rule: "path.root_escape" });
	});

	it("uses nearest existing parent for missing write targets", () => {
		const result = decidePathAccess(
			basePolicy(),
			{ kind: "write", path: "/repo/src/new-file.ts" },
			resolver({
				"/repo/src/new-file.ts": {
					requestedPath: "/repo/src/new-file.ts",
					exists: false,
					nearestExistingParentRealPath: "/repo/src",
				},
			}),
		);
		expect(result).toMatchObject({ allowed: true, rule: "path.write_allow" });
	});
});

describe("sandbox network policy", () => {
	it("denies browser and Unix socket access by default", () => {
		expect(decideNetworkAccess(basePolicy(), { browser: true }).rule).toBe("network.socket_or_browser");
		expect(decideNetworkAccess(basePolicy(), { unixSocketPath: "/var/run/docker.sock" }).rule).toBe(
			"network.socket_or_browser",
		);
	});

	it("allows only configured domains in domain allowlist mode", () => {
		expect(decideNetworkAccess(basePolicy(), { host: "api.example.com" })).toMatchObject({ allowed: true });
		expect(decideNetworkAccess(basePolicy(), { host: "evil.test" })).toMatchObject({
			allowed: false,
			rule: "network.domain_not_allowed",
		});
	});

	it("denies explicitly blocked domains", () => {
		expect(decideNetworkAccess(basePolicy(), { host: "blocked.example.com" })).toMatchObject({
			allowed: false,
			rule: "network.domain_deny",
		});
	});
});

describe("sandbox fallback and merge policy", () => {
	it("blocks shell and exec when backend is unavailable in enforce mode", () => {
		const fallback = decideSandboxFallback(basePolicy(), { platform: "linux", backendAvailable: false });
		expect(fallback.allowed).toBe(false);
		expect(fallback.allowShell).toBe(false);
		expect(fallback.allowExec).toBe(false);
		expect(fallback.allowReadOnlyTools).toBe(true);
	});

	it("project overrides narrow by default", () => {
		const merged = mergeSandboxPolicy(basePolicy(), {
			filesystem: {
				root,
				readAllow: ["/repo/src"],
				readDeny: ["/repo/secrets"],
				writeAllow: ["/repo"],
				denyWrite: ["/repo/dist"],
				tempWrite: [],
				followSymlinks: false,
			},
			network: {
				mode: "all-explicit",
				allowedDomains: ["other.example"],
				deniedDomains: [],
				allowUnixSockets: ["/tmp/socket"],
				allowBrowser: false,
			},
		});

		expect(merged.filesystem.readAllow).toEqual(["/repo/src"]);
		expect(merged.filesystem.writeAllow).toEqual(["/repo/src"]);
		expect(merged.filesystem.denyWrite).toContain("/repo/dist");
		expect(merged.network.mode).toBe("domain-allowlist");
	});
});

describe("bash spawn preflight", () => {
	const backendAvailable: SandboxBackendStatus = { platform: "linux", backendAvailable: true };
	const backendMissing: SandboxBackendStatus = { platform: "linux", backendAvailable: false };

	it("denies shell when the OS sandbox backend is missing in enforce mode", () => {
		const verdict = preflightBashSpawn(basePolicy(), backendMissing, { command: "ls", cwd: root });
		expect(verdict).toMatchObject({ allowed: false, allowShell: false, rule: "sandbox.backend_missing" });
		expect(verdict.reason.length).toBeGreaterThan(0);
	});

	it("denies a command whose cwd is outside the sandbox root", () => {
		const verdict = preflightBashSpawn(basePolicy(), backendAvailable, { command: "ls", cwd: "/outside/work" });
		expect(verdict).toMatchObject({ allowed: false, allowShell: false, rule: "cwd.root_escape" });
	});

	it("denies a cwd that resolves outside the root via the resolver", () => {
		const escapeResolver: SandboxPathResolver = (p) => ({
			requestedPath: p,
			exists: true,
			realPath: "/outside/escaped",
		});
		const verdict = preflightBashSpawn(
			basePolicy(),
			backendAvailable,
			{ command: "ls", cwd: "/repo/link" },
			escapeResolver,
		);
		expect(verdict).toMatchObject({ allowed: false, allowShell: false, rule: "cwd.root_escape" });
	});

	it("allows an in-root spawn when the backend is available", () => {
		const verdict = preflightBashSpawn(basePolicy(), backendAvailable, { command: "ls", cwd: "/repo/src" });
		expect(verdict).toMatchObject({ allowed: true, allowShell: true, rule: "sandbox.shell_preflight_ok" });
	});

	it("allows execution without a backend in audit mode", () => {
		const verdict = preflightBashSpawn({ ...basePolicy(), mode: "audit" }, backendMissing, {
			command: "ls",
			cwd: root,
		});
		expect(verdict).toMatchObject({ allowed: true, allowShell: true });
	});

	it("never enforces cwd containment when the policy mode is off", () => {
		const verdict = preflightBashSpawn({ ...basePolicy(), mode: "off" }, backendMissing, {
			command: "ls",
			cwd: "/outside",
		});
		expect(verdict).toMatchObject({ allowed: true, allowShell: true, rule: "sandbox.off" });
	});

	it("denies shell when the policy disables shell execution", () => {
		const policy: SandboxPolicy = {
			...basePolicy(),
			process: { allowExec: true, allowShell: false, allowPrivilege: false },
		};
		const verdict = preflightBashSpawn(policy, backendAvailable, { command: "ls", cwd: root });
		expect(verdict).toMatchObject({ allowed: false, allowShell: false, rule: "process.shell_denied" });
	});
});
