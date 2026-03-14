import { afterEach, beforeEach, describe, expect, it, vi } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const executeShellMock = vi.fn();
const shellAbortMock = vi.fn();
const shellRunMock = vi.fn();
const shellConstructMock = vi.fn();

vi.mock("@oh-my-pi/pi-natives", () => ({
	executeShell: executeShellMock,
	Shell: class {
		constructor(options?: unknown) {
			shellConstructMock(options);
		}

		run = shellRunMock;
		abort = shellAbortMock;
	},
}));

function makeTempDir(): string {
	return fs.mkdtempSync(path.join(os.tmpdir(), "omp-bash-hard-timeout-"));
}

describe("executeBash hard-timeout recovery", () => {
	let tempDir: string;

	beforeEach(async () => {
		tempDir = makeTempDir();
		vi.useFakeTimers();
		vi.resetModules();

		executeShellMock.mockReset();
		shellAbortMock.mockReset().mockResolvedValue(undefined);
		shellRunMock.mockReset();
		shellConstructMock.mockReset();

		const { _resetSettingsForTest, Settings } = await import("../src/config/settings");
		_resetSettingsForTest();
		await Settings.init({ inMemory: true, cwd: tempDir });
		vi.spyOn(Settings.prototype, "getShellConfig").mockReturnValue({
			shell: "/bin/sh",
			args: ["-c"],
			env: {
				PATH: Bun.env.PATH ?? "",
				HOME: Bun.env.HOME ?? tempDir,
			},
			prefix: undefined,
		});
	});

	afterEach(async () => {
		const { _resetSettingsForTest } = await import("../src/config/settings");
		_resetSettingsForTest();
		vi.restoreAllMocks();
		vi.useRealTimers();
		if (fs.existsSync(tempDir)) {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
	});

	it("falls back to one-shot execution after a persistent session hard timeout", async () => {
		shellRunMock.mockImplementation(() => {
			const { promise } = Promise.withResolvers<never>();
			return promise;
		});
		executeShellMock.mockImplementation(
			async (
				_options: unknown,
				onChunk?: (chunk: string) => void,
			): Promise<{ exitCode: number; cancelled: boolean; timedOut: boolean }> => {
				onChunk?.("second\n");
				return {
					exitCode: 0,
					cancelled: false,
					timedOut: false,
				};
			},
		);

		const { executeBash } = await import("../src/exec/bash-executor");

		const firstPromise = executeBash("echo first", {
			cwd: tempDir,
			timeout: 1,
			sessionKey: "stuck-session",
		});

		await vi.advanceTimersByTimeAsync(6_000);
		const first = await firstPromise;

		expect(first.cancelled).toBe(true);
		expect(first.output).toContain("Command exceeded hard timeout after 6 seconds");
		expect(shellRunMock).toHaveBeenCalledTimes(1);
		expect(shellAbortMock).toHaveBeenCalledTimes(1);

		const second = await executeBash("echo second", {
			cwd: tempDir,
			timeout: 1,
			sessionKey: "stuck-session",
		});

		expect(second.cancelled).toBe(false);
		expect(second.exitCode).toBe(0);
		expect(second.output.trim()).toBe("second");
		expect(shellRunMock).toHaveBeenCalledTimes(1);
		expect(executeShellMock).toHaveBeenCalledTimes(1);
		expect(shellConstructMock).toHaveBeenCalledTimes(1);
	});
});
