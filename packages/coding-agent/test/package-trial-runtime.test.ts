import { describe, expect, it } from "vitest";
import { createTrialRuntimePlan } from "../src/core/package-trial-runtime.ts";
import type { ResolvedSandboxPath, SandboxBackendStatus, SandboxPolicy } from "../src/core/sandbox/policy.ts";

function policy(mode: SandboxPolicy["mode"] = "audit"): SandboxPolicy {
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

describe("createTrialRuntimePlan", () => {
	it("turns an accepted trial install input into executor and cleanup metadata", () => {
		const runtime = createTrialRuntimePlan({
			source: "npm:example@1.2.3",
			installRoot: "/repo/.omk/tmp/trial-1",
			packageManagerName: "npm",
			policy: policy("audit"),
			backend: missingBackend,
			resolver,
			env: { PATH: "/usr/bin", OPENAI_API_KEY: "secret" },
		});

		expect(runtime.ok).toBe(true);
		if (!runtime.ok) return;
		expect(runtime.executor).toEqual({
			command: "npm",
			args: [
				"install",
				"example@1.2.3",
				"--prefix",
				"/repo/.omk/tmp/trial-1",
				"--legacy-peer-deps",
				"--ignore-scripts",
			],
			cwd: "/repo/.omk/tmp/trial-1",
			env: { PATH: "/usr/bin" },
			wrapped: false,
			lifecycleScripts: "ignored",
		});
		expect(runtime.cleanup).toEqual({
			installRoot: "/repo/.omk/tmp/trial-1",
			removePaths: ["/repo/.omk/tmp/trial-1"],
			recursive: true,
			force: true,
			reason: "ephemeral-trial",
		});
		expect(runtime.audit).toMatchObject({
			kind: "npm",
			packageManagerName: "npm",
			source: "npm:example@1.2.3",
			installRoot: "/repo/.omk/tmp/trial-1",
			lifecycleScripts: "ignored",
			sandboxMode: "audit",
			sandboxWrapped: false,
			sandboxRule: "sandbox.audit_fallback",
			networkMode: "domain-allowlist",
		});
	});

	it("uses configured wrapper argv for execution while keeping audit command logical", () => {
		const runtime = createTrialRuntimePlan({
			source: "npm:example@1.2.3",
			installRoot: "/repo/.omk/tmp/trial-wrapper",
			packageManagerName: "pnpm",
			packageManagerCommand: ["mise", "exec", "node@20", "--", "pnpm"],
			policy: policy("audit"),
			backend: missingBackend,
			resolver,
			env: { PATH: "/usr/bin" },
		});

		expect(runtime.ok).toBe(true);
		if (!runtime.ok) return;
		expect(runtime.executor.command).toBe("mise");
		expect(runtime.executor.args).toEqual([
			"exec",
			"node@20",
			"--",
			"pnpm",
			"install",
			"example@1.2.3",
			"--prefix",
			"/repo/.omk/tmp/trial-wrapper",
			"--config.auto-install-peers=false",
			"--config.strict-peer-dependencies=false",
			"--config.strict-dep-builds=false",
			"--ignore-scripts",
		]);
		expect(runtime.audit.command).toBe("pnpm");
		expect(runtime.audit.args).toEqual([
			"install",
			"example@1.2.3",
			"--prefix",
			"/repo/.omk/tmp/trial-wrapper",
			"--config.auto-install-peers=false",
			"--config.strict-peer-dependencies=false",
			"--config.strict-dep-builds=false",
			"--ignore-scripts",
		]);
	});

	it("fails closed for git trial sources without leaking credentials", () => {
		const runtime = createTrialRuntimePlan({
			source: "git:https://user:token-value@github.com/example/private.git#aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
			installRoot: "/repo/.omk/tmp/trial-redact",
			packageManagerName: "npm",
			policy: policy("audit"),
			backend: missingBackend,
			resolver,
		});

		if (runtime.ok) throw new Error("expected git trial source to fail closed");
		expect(runtime.reason).toMatch(/shell-free multi-step executor/);
		expect(runtime.reason).not.toContain("token-value");
	});

	it("propagates rejected source reasons without executor metadata", () => {
		const runtime = createTrialRuntimePlan({
			source: "npm:example",
			installRoot: "/repo/.omk/tmp/trial-2",
			packageManagerName: "npm",
			policy: policy("audit"),
			backend: missingBackend,
			resolver,
		});

		if (runtime.ok) throw new Error("expected unpinned source to be rejected");
		expect(runtime.reason).toMatch(/exact version/);
	});

	it("rejects enforce-mode trials when the sandbox backend is missing", () => {
		const runtime = createTrialRuntimePlan({
			source: "npm:example@1.2.3",
			installRoot: "/repo/.omk/tmp/trial-3",
			packageManagerName: "npm",
			policy: policy("enforce"),
			backend: missingBackend,
			resolver,
		});

		if (runtime.ok) throw new Error("expected missing backend to reject enforce trial");
		expect(runtime.reason).toMatch(/sandbox.backend_missing/);
	});
});
