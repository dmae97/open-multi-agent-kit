import { describe, expect, it } from "vitest";
import { createEventBus } from "../src/core/event-bus.ts";
import { createExtensionRuntime, loadExtensionFromFactory } from "../src/core/extensions/loader.ts";
import type { ExtensionAPI, ExtensionExecSandbox } from "../src/core/extensions/types.ts";
import { detectSandboxBackend } from "../src/core/sandbox/backend.ts";
import type { SandboxBackendStatus, SandboxPolicy } from "../src/core/sandbox/policy.ts";

function makePolicy(mode: SandboxPolicy["mode"], allowExec = true): SandboxPolicy {
	const root = process.cwd();
	return {
		mode,
		profile: "workspace-write",
		filesystem: {
			root,
			readAllow: [root],
			readDeny: [],
			writeAllow: [root],
			denyWrite: [],
			tempWrite: [],
			followSymlinks: false,
		},
		network: {
			mode: "none",
			allowedDomains: [],
			deniedDomains: [],
			allowUnixSockets: [],
			allowBrowser: false,
		},
		process: { allowExec, allowShell: true, allowPrivilege: false },
	};
}

const missingBackend: SandboxBackendStatus = { platform: "linux", backendAvailable: false };
const availableBackend: SandboxBackendStatus = {
	platform: "linux",
	backendAvailable: true,
	domainAllowlistAvailable: false,
};

async function loadApi(execSandbox?: ExtensionExecSandbox, cwd = process.cwd()): Promise<ExtensionAPI> {
	const runtime = createExtensionRuntime();
	const eventBus = createEventBus();
	let captured: ExtensionAPI | undefined;
	await loadExtensionFromFactory(
		(omk) => {
			captured = omk;
		},
		cwd,
		eventBus,
		runtime,
		"<sandbox-exec-test>",
		execSandbox ? { execSandbox } : undefined,
	);
	if (!captured) throw new Error("extension api not captured");
	return captured;
}

// A harmless, portable command: run the current node binary to print "ok".
const echoArgs = ["-e", "process.stdout.write('ok')"];

describe("extension api.exec sandbox gating", () => {
	it("preserves default exec behavior when no sandbox policy is provided", async () => {
		const api = await loadApi();
		const result = await api.exec(process.execPath, echoArgs);
		expect(result.code).toBe(0);
		expect(result.stdout).toBe("ok");
	});

	it("denies exec in enforce mode when the sandbox backend is missing", async () => {
		const api = await loadApi({ policy: makePolicy("enforce"), backend: missingBackend });
		await expect(api.exec(process.execPath, echoArgs)).rejects.toThrow(/sandbox\.backend_missing/);
	});

	it("fails closed in enforce mode when no backend status is provided", async () => {
		const api = await loadApi({ policy: makePolicy("enforce") });
		await expect(api.exec(process.execPath, echoArgs)).rejects.toThrow(/sandbox\.backend_missing/);
	});

	it("runs exec normally when sandbox mode is off", async () => {
		const api = await loadApi({ policy: makePolicy("off"), backend: missingBackend });
		const result = await api.exec(process.execPath, echoArgs);
		expect(result.code).toBe(0);
		expect(result.stdout).toBe("ok");
	});

	it("allows exec in audit mode without a backend (fallback)", async () => {
		const api = await loadApi({ policy: makePolicy("audit"), backend: missingBackend });
		const result = await api.exec(process.execPath, echoArgs);
		expect(result.code).toBe(0);
		expect(result.stdout).toBe("ok");
	});

	it("allows exec in enforce mode when a detected sandbox backend is available", async () => {
		const backend = detectSandboxBackend();
		if (!backend.backendAvailable) {
			expect(backend.backendAvailable).toBe(false);
			return;
		}

		const api = await loadApi({ policy: makePolicy("enforce"), backend });
		const result = await api.exec(process.execPath, echoArgs);
		expect(result.code).toBe(0);
		expect(result.stdout).toBe("ok");
	});

	it("filters sensitive inherited environment values when a sandbox policy is active", async () => {
		const variableName = "OMK_SANDBOX_TEST_API_KEY";
		const previousValue = process.env[variableName];
		process.env[variableName] = "secret-test-value";
		try {
			const api = await loadApi({ policy: makePolicy("audit"), backend: missingBackend });
			const result = await api.exec(process.execPath, [
				"-e",
				`process.stdout.write(process.env.${variableName} ?? "missing")`,
			]);
			expect(result.code).toBe(0);
			expect(result.stdout).toBe("missing");
		} finally {
			if (previousValue === undefined) {
				delete process.env[variableName];
			} else {
				process.env[variableName] = previousValue;
			}
		}
	});

	it("denies exec when the policy disables exec even with a backend", async () => {
		const api = await loadApi({ policy: makePolicy("enforce", false), backend: availableBackend });
		await expect(api.exec(process.execPath, echoArgs)).rejects.toThrow(/exec denied/);
	});
});
