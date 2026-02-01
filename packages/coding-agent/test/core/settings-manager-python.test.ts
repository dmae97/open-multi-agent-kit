import { describe, expect, it } from "bun:test";
import { Settings } from "@oh-my-pi/pi-coding-agent/config/settings";

describe("Settings python settings", () => {
	it("defaults to both and session", () => {
		const settings = Settings.isolated({});

		expect(settings.get("python.toolMode")).toBe("both");
		expect(settings.get("python.kernelMode")).toBe("session");
	});

	it("persists python tool and kernel modes", () => {
		const settings = Settings.isolated({});

		settings.set("python.toolMode", "bash-only");
		settings.set("python.kernelMode", "per-call");

		expect(settings.get("python.toolMode")).toBe("bash-only");
		expect(settings.get("python.kernelMode")).toBe("per-call");
		const serialized = settings.serialize();
		expect((serialized.python as any)?.toolMode).toBe("bash-only");
		expect((serialized.python as any)?.kernelMode).toBe("per-call");
	});
});
