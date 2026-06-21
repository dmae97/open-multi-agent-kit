import { describe, expect, it } from "vitest";
import type { ResolvedSandboxPath, SandboxBackendStatus, SandboxPolicy } from "../src/core/sandbox/policy.ts";
import { createLocalBashOperations } from "../src/core/tools/bash.ts";

function policy(mode: SandboxPolicy["mode"]): SandboxPolicy {
	return {
		mode,
		profile: "workspace-write",
		filesystem: {
			root: process.cwd(),
			readAllow: [process.cwd()],
			readDeny: [],
			writeAllow: [process.cwd()],
			denyWrite: [".git"],
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

function collectExec(
	operations: ReturnType<typeof createLocalBashOperations>,
	command: string,
	env?: NodeJS.ProcessEnv,
): Promise<string> {
	let output = "";
	return operations
		.exec(command, process.cwd(), {
			onData: (data) => {
				output += data.toString();
			},
			env,
		})
		.then(() => output);
}

describe("createLocalBashOperations sandbox spawn", () => {
	it("rejects before spawn when enforce mode has no backend", async () => {
		const operations = createLocalBashOperations({
			sandboxPolicy: { policy: policy("enforce"), backend: missingBackend, resolver },
		});

		await expect(operations.exec("echo should-not-run", process.cwd(), { onData: () => {} })).rejects.toThrow(
			/sandbox\.backend_missing/,
		);
	});

	it("filters secret env vars in audit fallback", async () => {
		const operations = createLocalBashOperations({
			sandboxPolicy: { policy: policy("audit"), backend: missingBackend, resolver },
		});

		const output = await collectExec(
			operations,
			`${process.execPath} -e "console.log(process.env.OPENAI_API_KEY || 'missing')"`,
			{ PATH: process.env.PATH, OPENAI_API_KEY: "secret" },
		);

		expect(output.trim()).toBe("missing");
	});

	it("preserves legacy behavior when no sandbox policy is provided", async () => {
		const operations = createLocalBashOperations();
		const output = await collectExec(operations, "printf ok");
		expect(output).toBe("ok");
	});
});
