import { describe, expect, it } from "vitest";
import { planPackageTrialInstall } from "../src/core/package-trial-sandbox.ts";
import type { ResolvedSandboxPath, SandboxBackendStatus, SandboxPolicy } from "../src/core/sandbox/policy.ts";

function policy(mode: SandboxPolicy["mode"] = "enforce"): SandboxPolicy {
	return {
		mode,
		profile: "networked",
		filesystem: {
			root: "/repo",
			readAllow: ["/repo"],
			readDeny: [],
			writeAllow: ["/repo/.omk/tmp"],
			denyWrite: ["/repo/.git"],
			tempWrite: ["/tmp/omk"],
			followSymlinks: false,
		},
		network: {
			mode: "domain-allowlist",
			allowedDomains: ["registry.npmjs.org", "github.com"],
			deniedDomains: [],
			allowUnixSockets: [],
			allowBrowser: false,
		},
		process: { allowExec: true, allowShell: true, allowPrivilege: false },
	};
}

const linuxBackend: SandboxBackendStatus = {
	platform: "linux",
	backendAvailable: true,
	domainAllowlistAvailable: false,
};
const missingBackend: SandboxBackendStatus = { platform: "unsupported", backendAvailable: false };

function resolver(path: string): ResolvedSandboxPath {
	return {
		requestedPath: path,
		exists: true,
		realPath: path,
		nearestExistingParentRealPath: path,
		isSymlink: false,
	};
}

describe("planPackageTrialInstall", () => {
	it("rejects npm trial sources without an exact version", () => {
		const result = planPackageTrialInstall({
			source: "npm:example",
			installRoot: "/repo/.omk/tmp/trial",
			packageManagerName: "npm",
			policy: policy(),
			backend: linuxBackend,
			resolver,
		});

		if (result.ok) throw new Error("expected npm source to be rejected");
		expect(result.reason).toMatch(/exact version/);
	});

	it("forces --ignore-scripts for exact npm trial installs", () => {
		const result = planPackageTrialInstall({
			source: "npm:example@1.2.3",
			installRoot: "/repo/.omk/tmp/trial",
			packageManagerName: "npm",
			policy: policy(),
			backend: linuxBackend,
			resolver,
		});

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.lifecycleScripts).toBe("ignored");
		expect(result.command).toBe("npm");
		expect(result.args).toContain("--ignore-scripts");
		expect(result.args).not.toContain("--foreground-scripts");
		expect(result.sandbox.allowed).toBe(true);
	});

	it("preserves configured package-manager wrapper argv for npm sandbox execution", () => {
		const result = planPackageTrialInstall({
			source: "npm:example@1.2.3",
			installRoot: "/repo/.omk/tmp/trial",
			packageManagerName: "pnpm",
			packageManagerCommand: ["mise", "exec", "node@20", "--", "pnpm"],
			policy: policy("audit"),
			backend: missingBackend,
			resolver,
		});

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.command).toBe("pnpm");
		expect(result.args).toContain("--ignore-scripts");
		expect(result.sandbox.allowed).toBe(true);
		if (!result.sandbox.allowed) return;
		expect(result.sandbox.argv).toEqual([
			"mise",
			"exec",
			"node@20",
			"--",
			"pnpm",
			"install",
			"example@1.2.3",
			"--prefix",
			"/repo/.omk/tmp/trial",
			"--config.auto-install-peers=false",
			"--config.strict-peer-dependencies=false",
			"--config.strict-dep-builds=false",
			"--ignore-scripts",
		]);
	});

	it("rejects trial installs when enforce mode has no sandbox backend", () => {
		const result = planPackageTrialInstall({
			source: "npm:example@1.2.3",
			installRoot: "/repo/.omk/tmp/trial",
			packageManagerName: "npm",
			policy: policy("enforce"),
			backend: missingBackend,
			resolver,
		});

		if (result.ok) throw new Error("expected missing sandbox backend to reject trial install");
		expect(result.reason).toMatch(/sandbox.backend_missing/);
	});

	it("rejects trial install roots outside sandbox write policy before executor planning", () => {
		const result = planPackageTrialInstall({
			source: "npm:example@1.2.3",
			installRoot: "/repo/not-write-allowed/trial",
			packageManagerName: "npm",
			policy: policy(),
			backend: linuxBackend,
			resolver,
		});

		if (result.ok) throw new Error("expected write-disallowed install root to be rejected");
		expect(result.reason).toMatch(/path\.write_not_allowed/);
	});

	it("rejects git trial refs unless they are full commit shas", () => {
		const result = planPackageTrialInstall({
			source: "git:https://github.com/example/repo.git#main",
			installRoot: "/repo/.omk/tmp/trial",
			packageManagerName: "npm",
			policy: policy(),
			backend: linuxBackend,
			resolver,
		});

		if (result.ok) throw new Error("expected mutable git ref to be rejected");
		expect(result.reason).toMatch(/mutable branch/);
	});

	it("fails closed for full-SHA git trials until a shell-free multi-step executor is available", () => {
		const result = planPackageTrialInstall({
			source: "git:https://github.com/example/repo.git#1234567890abcdef1234567890abcdef12345678",
			installRoot: "/repo/.omk/tmp/trial",
			packageManagerName: "npm",
			policy: policy(),
			backend: linuxBackend,
			resolver,
		});

		if (result.ok) throw new Error(`expected git trial to fail closed, got args: ${result.args.join(" ")}`);
		expect(result.reason).toMatch(/shell-free multi-step executor/);
	});
});
