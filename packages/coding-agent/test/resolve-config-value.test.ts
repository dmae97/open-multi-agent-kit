import type { PathOrFileDescriptor } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

type ReadFileSync = (path: PathOrFileDescriptor, encoding?: BufferEncoding) => string | Buffer;
type ReadProcEnviron = (path: string, encoding: BufferEncoding) => string | undefined;

const readProcEnviron = vi.hoisted(() => vi.fn<ReadProcEnviron>());

vi.mock("node:fs", async (importOriginal) => {
	const actual = await importOriginal<object>();
	const actualReadFileSync = (actual as { readFileSync: ReadFileSync }).readFileSync;
	const readFileSync: ReadFileSync = (path, encoding) => {
		if (path === "/proc/self/environ") {
			const value = readProcEnviron(path, encoding ?? "utf-8");
			if (value !== undefined) return value;
		}
		return actualReadFileSync(path, encoding);
	};
	return { ...actual, readFileSync };
});

import {
	clearConfigValueCache,
	getMissingConfigValueEnvVarNames,
	isConfigValueConfigured,
	resolveConfigValue,
} from "../src/core/resolve-config-value.ts";

const originalEnv = { ...process.env };
const originalVersionsDescriptor = Object.getOwnPropertyDescriptor(process, "versions");

function replaceProcessEnv(nextEnv: NodeJS.ProcessEnv): void {
	for (const key of Object.keys(process.env)) {
		delete process.env[key];
	}
	Object.assign(process.env, nextEnv);
}

function setBunRuntime(): void {
	Object.defineProperty(process, "versions", {
		configurable: true,
		value: { ...process.versions, bun: "1.2.0" },
	});
}

afterEach(() => {
	replaceProcessEnv(originalEnv);
	if (originalVersionsDescriptor) {
		Object.defineProperty(process, "versions", originalVersionsDescriptor);
	}
	readProcEnviron.mockReset();
	clearConfigValueCache();
});

describe("resolveConfigValue", () => {
	it("falls back to /proc/self/environ for Bun when process.env is empty", () => {
		setBunRuntime();
		replaceProcessEnv({});
		readProcEnviron.mockReturnValue("OMK_RESOLVE_CONFIG_VALUE_TEST=proc-env-fallback-value\0");

		expect(resolveConfigValue("$OMK_RESOLVE_CONFIG_VALUE_TEST")).toBe("proc-env-fallback-value");
		expect(isConfigValueConfigured("$OMK_RESOLVE_CONFIG_VALUE_TEST")).toBe(true);
		expect(getMissingConfigValueEnvVarNames("$OMK_RESOLVE_CONFIG_VALUE_TEST")).toEqual([]);
		expect(readProcEnviron).toHaveBeenCalledWith("/proc/self/environ", "utf-8");
	});

	it("keeps process.env precedence and skips /proc/self/environ when process.env has entries", () => {
		setBunRuntime();
		replaceProcessEnv({ OMK_RESOLVE_CONFIG_VALUE_TEST: "process-env-value" });
		readProcEnviron.mockReturnValue("OMK_RESOLVE_CONFIG_VALUE_TEST=proc-env-fallback-value\0");

		expect(resolveConfigValue("$OMK_RESOLVE_CONFIG_VALUE_TEST")).toBe("process-env-value");
		expect(readProcEnviron).not.toHaveBeenCalled();
	});
});
