import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	buildBackendArgv,
	buildBubblewrapArgv,
	buildSeatbeltArgv,
	detectSandboxBackend,
	type SandboxInvocation,
	strictBackendMissingVerdict,
} from "../src/core/sandbox/backend.ts";
import { filterSandboxEnv } from "../src/core/sandbox/env.ts";
import { nearestExistingParent, resolveSandboxPath } from "../src/core/sandbox/path-resolver.ts";
import type { SandboxBackendStatus, SandboxPolicy } from "../src/core/sandbox/policy.ts";

function basePolicy(): SandboxPolicy {
	return {
		mode: "enforce",
		profile: "workspace-write",
		filesystem: {
			root: "/repo",
			readAllow: ["/repo"],
			readDeny: [],
			writeAllow: ["/repo/src"],
			denyWrite: ["/repo/.git"],
			tempWrite: ["/tmp/omk"],
			followSymlinks: false,
		},
		network: {
			mode: "none",
			allowedDomains: [],
			deniedDomains: [],
			allowUnixSockets: [],
			allowBrowser: false,
		},
		process: { allowExec: true, allowShell: true, allowPrivilege: false },
	};
}

function baseInvocation(overrides: Partial<SandboxInvocation> = {}): SandboxInvocation {
	return {
		argv: ["/bin/ls", "-la"],
		cwd: "/repo",
		env: { PATH: "/usr/bin" },
		filesystem: {
			root: "/repo",
			readAllow: ["/repo"],
			writeAllow: ["/repo/src"],
			tempWrite: ["/tmp/omk"],
			denyWrite: ["/repo/.git"],
		},
		network: {
			mode: "none",
		},
		...overrides,
	};
}

describe("sandbox backend detection and status", () => {
	it("returns a status object for the current platform", () => {
		const status = detectSandboxBackend();
		expect(status.platform).toMatch(/^(macos|linux|unsupported)$/);
		expect(typeof status.backendAvailable).toBe("boolean");
		expect(typeof status.domainAllowlistAvailable).toBe("boolean");
	});

	it("reports domain allowlist only for seatbelt", () => {
		const status = detectSandboxBackend();
		if (status.platform === "macos" && status.backendAvailable) {
			expect(status.domainAllowlistAvailable).toBe(true);
		}
		if (status.platform === "linux") {
			expect(status.domainAllowlistAvailable).toBe(false);
		}
	});
});

describe("sandbox backend argv builders", () => {
	it("builds a seatbelt argv with profile and command", () => {
		const invocation = baseInvocation();
		const argv = buildSeatbeltArgv(invocation);
		expect(argv[0]).toBe("sandbox-exec");
		expect(argv).toContain("-p");
		const profileIndex = argv.indexOf("-p");
		expect(typeof argv[profileIndex + 1]).toBe("string");
		expect(argv[argv.length - 2]).toBe("/bin/ls");
		expect(argv[argv.length - 1]).toBe("-la");
	});

	it("builds a bubblewrap argv with bind flags", () => {
		const invocation = baseInvocation();
		const argv = buildBubblewrapArgv(invocation);
		expect(argv[0]).toBe("bwrap");
		expect(argv).toContain("--unshare-all");
		expect(argv).toContain("--bind");
		expect(argv).toContain("/repo");
		expect(argv).toContain("/repo");
		expect(argv).toContain("/bin/ls");
	});

	it("selects backend argv by platform", () => {
		const invocation = baseInvocation();
		const macStatus: SandboxBackendStatus = {
			platform: "macos",
			backendAvailable: true,
			domainAllowlistAvailable: true,
		};
		const linuxStatus: SandboxBackendStatus = {
			platform: "linux",
			backendAvailable: true,
			domainAllowlistAvailable: false,
		};
		const unsupportedStatus: SandboxBackendStatus = { platform: "unsupported", backendAvailable: false };

		expect(buildBackendArgv(macStatus, invocation)[0]).toBe("sandbox-exec");
		expect(buildBackendArgv(linuxStatus, invocation)[0]).toBe("bwrap");
		expect(() => buildBackendArgv(unsupportedStatus, invocation)).toThrow(/unsupported/);
	});
});

describe("strict backend-missing verdict", () => {
	it("blocks shell and exec in enforce mode when backend is missing", () => {
		const policy = basePolicy();
		const backend: SandboxBackendStatus = { platform: "unsupported", backendAvailable: false };
		const verdict = strictBackendMissingVerdict(policy, backend);
		expect(verdict.allowed).toBe(false);
		expect(verdict.rule).toBe("sandbox.backend_missing");
	});

	it("allows read-only tools in enforce mode even when backend is missing", () => {
		const policy = basePolicy();
		const backend: SandboxBackendStatus = { platform: "unsupported", backendAvailable: false };
		const verdict = strictBackendMissingVerdict(policy, backend);
		expect(verdict.rule).toBe("sandbox.backend_missing");
	});

	it("does not block when backend is available", () => {
		const policy = basePolicy();
		const backend: SandboxBackendStatus = { platform: "linux", backendAvailable: true };
		const verdict = strictBackendMissingVerdict(policy, backend);
		expect(verdict.allowed).toBe(true);
	});

	it("does not block when policy is off", () => {
		const policy = { ...basePolicy(), mode: "off" as const };
		const backend: SandboxBackendStatus = { platform: "unsupported", backendAvailable: false };
		const verdict = strictBackendMissingVerdict(policy, backend);
		expect(verdict.allowed).toBe(true);
	});

	it("does not block in audit mode when backend is missing", () => {
		const policy = { ...basePolicy(), mode: "audit" as const };
		const backend: SandboxBackendStatus = { platform: "unsupported", backendAvailable: false };
		const verdict = strictBackendMissingVerdict(policy, backend);
		expect(verdict.allowed).toBe(true);
		expect(verdict.rule).toBe("sandbox.audit_fallback");
	});
});

describe("sandbox env filter", () => {
	it("strips loader injection variables", () => {
		const env = {
			PATH: "/usr/bin",
			LD_PRELOAD: "/tmp/evil.so",
			DYLD_INSERT_LIBRARIES: "/tmp/evil.dylib",
		};
		const filtered = filterSandboxEnv(env);
		expect(filtered.LD_PRELOAD).toBeUndefined();
		expect(filtered.DYLD_INSERT_LIBRARIES).toBeUndefined();
		expect(filtered.PATH).toBe("/usr/bin");
	});

	it("strips secret-bearing env vars by default", () => {
		const env = {
			PATH: "/usr/bin",
			OPENAI_API_KEY: "sk-secret",
			NPM_TOKEN: "npm-secret",
			GITHUB_TOKEN: "gh-secret",
			AWS_SECRET_ACCESS_KEY: "aws-secret",
			MY_PASSWORD: "hunter2",
		};
		const filtered = filterSandboxEnv(env);
		expect(filtered.OPENAI_API_KEY).toBeUndefined();
		expect(filtered.NPM_TOKEN).toBeUndefined();
		expect(filtered.GITHUB_TOKEN).toBeUndefined();
		expect(filtered.AWS_SECRET_ACCESS_KEY).toBeUndefined();
		expect(filtered.MY_PASSWORD).toBeUndefined();
		expect(filtered.PATH).toBe("/usr/bin");
	});

	it("preserves allowlisted secret vars", () => {
		const env = {
			PATH: "/usr/bin",
			OPENAI_API_KEY: "sk-secret",
			NPM_TOKEN: "npm-secret",
		};
		const filtered = filterSandboxEnv(env, { allowlist: ["NPM_TOKEN"] });
		expect(filtered.OPENAI_API_KEY).toBeUndefined();
		expect(filtered.NPM_TOKEN).toBe("npm-secret");
	});

	it("applies extra blocklist", () => {
		const env = {
			PATH: "/usr/bin",
			CUSTOM_SENSITIVE: "x",
		};
		const filtered = filterSandboxEnv(env, { extraBlocklist: ["CUSTOM_SENSITIVE"] });
		expect(filtered.CUSTOM_SENSITIVE).toBeUndefined();
		expect(filtered.PATH).toBe("/usr/bin");
	});

	it("drops undefined values", () => {
		const env = {
			PATH: "/usr/bin",
			EMPTY: undefined,
		};
		const filtered = filterSandboxEnv(env);
		expect(filtered.EMPTY).toBeUndefined();
		expect("EMPTY" in filtered).toBe(false);
	});
});

describe("sandbox path resolver", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "omk-sandbox-path-"));
	});

	afterEach(() => {
		if (existsSync(tempDir)) {
			rmSync(tempDir, { recursive: true });
		}
	});

	it("resolves an existing file to its realpath", () => {
		const file = join(tempDir, "file.txt");
		writeFileSync(file, "hello");
		const resolved = resolveSandboxPath(tempDir, file);
		expect(resolved.exists).toBe(true);
		expect(resolved.realPath).toBe(resolve(file));
		expect(resolved.error).toBeUndefined();
	});

	it("finds nearest existing parent for missing paths", () => {
		const parent = join(tempDir, "parent");
		mkdirSync(parent);
		const missing = join(parent, "missing", "deep", "file.txt");
		const resolved = resolveSandboxPath(tempDir, missing);
		expect(resolved.exists).toBe(false);
		expect(resolved.nearestExistingParentRealPath).toBe(resolve(parent));
	});

	it("detects symlinks", () => {
		const target = join(tempDir, "target.txt");
		const link = join(tempDir, "link.txt");
		writeFileSync(target, "hello");
		symlinkSync(target, link);
		const resolved = resolveSandboxPath(tempDir, link);
		expect(resolved.exists).toBe(true);
		expect(resolved.isSymlink).toBe(true);
		expect(resolved.realPath).toBe(resolve(target));
	});

	it("resolves relative paths against root", () => {
		const sub = join(tempDir, "sub");
		mkdirSync(sub);
		const resolved = resolveSandboxPath(tempDir, "sub/file.txt");
		expect(resolved.exists).toBe(false);
		expect(resolved.nearestExistingParentRealPath).toBe(resolve(sub));
	});

	it("returns an error for nul bytes", () => {
		const resolved = resolveSandboxPath(tempDir, "file\0.txt");
		expect(resolved.error).toBeDefined();
		expect(resolved.exists).toBe(false);
	});

	it("nearestExistingParent returns undefined when nothing exists", () => {
		const result = nearestExistingParent("/this/should/not/exist/anywhere");
		expect(result).toBeUndefined();
	});
});
