import { describe, expect, it } from "vitest";
import type { ResolvedSandboxPath, SandboxBackendStatus, SandboxPolicy } from "../src/core/sandbox/policy.ts";
import { buildSandboxedSpawnRequest } from "../src/core/sandbox/spawn.ts";

function policy(mode: SandboxPolicy["mode"] = "enforce"): SandboxPolicy {
	return {
		mode,
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

const missingBackend: SandboxBackendStatus = { platform: "unsupported", backendAvailable: false };
const linuxBackend: SandboxBackendStatus = {
	platform: "linux",
	backendAvailable: true,
	domainAllowlistAvailable: false,
};

function resolver(path: string): ResolvedSandboxPath {
	return {
		requestedPath: path,
		exists: true,
		realPath: path.startsWith("/repo") ? path : `/repo/${path}`,
		nearestExistingParentRealPath: path.startsWith("/repo") ? path : `/repo/${path}`,
		isSymlink: false,
	};
}

describe("buildSandboxedSpawnRequest", () => {
	it("denies enforce-mode spawn when the backend is unavailable", () => {
		const result = buildSandboxedSpawnRequest({
			argv: ["/bin/echo", "ok"],
			cwd: "/repo",
			env: { PATH: "/usr/bin" },
			policy: policy("enforce"),
			backend: missingBackend,
			resolver,
		});

		expect(result.allowed).toBe(false);
		expect(result.rule).toBe("sandbox.backend_missing");
	});

	it("allows audit fallback without wrapping but still filters environment", () => {
		const result = buildSandboxedSpawnRequest({
			argv: ["/bin/echo", "ok"],
			cwd: "/repo",
			env: { PATH: "/usr/bin", OPENAI_API_KEY: "secret", LD_PRELOAD: "/tmp/x.so" },
			policy: policy("audit"),
			backend: missingBackend,
			resolver,
		});

		expect(result.allowed).toBe(true);
		if (!result.allowed) return;
		expect(result.wrapped).toBe(false);
		expect(result.argv).toEqual(["/bin/echo", "ok"]);
		expect(result.env).toEqual({ PATH: "/usr/bin" });
	});

	it("wraps argv with the selected backend when available", () => {
		const result = buildSandboxedSpawnRequest({
			argv: ["/bin/echo", "ok"],
			cwd: "/repo",
			env: { PATH: "/usr/bin", NPM_TOKEN: "secret" },
			policy: policy("enforce"),
			backend: linuxBackend,
			resolver,
		});

		expect(result.allowed).toBe(true);
		if (!result.allowed) return;
		expect(result.wrapped).toBe(true);
		expect(result.argv[0]).toBe("bwrap");
		expect(result.argv).toContain("/bin/echo");
		expect(result.env).toEqual({ PATH: "/usr/bin" });
	});

	it("denies a cwd outside the sandbox root before wrapping", () => {
		const result = buildSandboxedSpawnRequest({
			argv: ["/bin/echo", "ok"],
			cwd: "/outside",
			env: { PATH: "/usr/bin" },
			policy: policy("enforce"),
			backend: linuxBackend,
			resolver: (path) => ({
				requestedPath: path,
				exists: true,
				realPath: path,
				nearestExistingParentRealPath: path,
				isSymlink: false,
			}),
		});

		expect(result.allowed).toBe(false);
		expect(result.rule).toBe("path.root_escape");
	});
});
