import { describe, expect, it, vi } from "bun:test";
import { type SettingPath, Settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import * as pythonKernelModule from "@oh-my-pi/pi-coding-agent/ipy/kernel";
import { createTools, type ToolSession } from "@oh-my-pi/pi-coding-agent/tools";

function createTestSession(overrides: Partial<ToolSession> = {}): ToolSession {
	return {
		cwd: "/tmp/test",
		hasUI: false,
		getSessionFile: () => null,
		getSessionSpawns: () => "*",
		settings: Settings.isolated(),
		...overrides,
	};
}

function createSettingsWithOverrides(overrides: Partial<Record<SettingPath, unknown>> = {}): Settings {
	return Settings.isolated({
		"lsp.formatOnWrite": true,
		"bashInterceptor.enabled": true,
		...overrides,
	});
}

describe("createTools python fallback", () => {
	it("falls back to bash-only when kernel unavailable", async () => {
		const availabilitySpy = vi
			.spyOn(pythonKernelModule, "checkPythonKernelAvailability")
			.mockResolvedValue({ ok: false, reason: "unavailable" });

		const session = createTestSession({
			settings: createSettingsWithOverrides({
				"python.toolMode": "ipy-only",
				"python.kernelMode": "session",
			}),
		});

		const tools = await createTools(session, ["python"]);
		const names = tools.map(tool => tool.name).sort();

		expect(names).toEqual(["bash", "exit_plan_mode"]);

		availabilitySpy.mockRestore();
	});

	it("keeps bash when python mode is both but unavailable", async () => {
		const availabilitySpy = vi
			.spyOn(pythonKernelModule, "checkPythonKernelAvailability")
			.mockResolvedValue({ ok: false, reason: "unavailable" });

		const session = createTestSession({
			settings: createSettingsWithOverrides({
				"python.toolMode": "both",
				"python.kernelMode": "session",
			}),
		});

		const tools = await createTools(session);
		const names = tools.map(tool => tool.name);

		expect(names).toContain("bash");
		expect(names).not.toContain("python");

		availabilitySpy.mockRestore();
	});
});
