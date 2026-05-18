import { describe, expect, it } from "vitest";
import {
	detectTerminalBackground,
	getThemeForRgbColor,
	parseOsc11BackgroundColor,
} from "../src/modes/interactive/theme/theme.js";

describe("detectTerminalBackground", () => {
	it("uses the COLORFGBG background color index", () => {
		expect(detectTerminalBackground({ env: { COLORFGBG: "0;15" } })).toMatchObject({
			theme: "light",
			source: "COLORFGBG",
			confidence: "high",
		});
		expect(detectTerminalBackground({ env: { COLORFGBG: "15;0" } })).toMatchObject({
			theme: "dark",
			source: "COLORFGBG",
			confidence: "high",
		});
	});

	it("uses the last COLORFGBG field as the background", () => {
		expect(detectTerminalBackground({ env: { COLORFGBG: "0;7;15" } }).theme).toBe("light");
	});

	it("defaults to dark without terminal background hints", () => {
		expect(detectTerminalBackground({ env: {} })).toMatchObject({
			theme: "dark",
			source: "fallback",
			confidence: "low",
		});
	});
});

describe("parseOsc11BackgroundColor", () => {
	it("parses 16-bit OSC 11 rgb responses", () => {
		expect(parseOsc11BackgroundColor("\x1b]11;rgb:0000/8000/ffff\x07")).toEqual({ r: 0, g: 128, b: 255 });
	});

	it("parses OSC 11 hex responses", () => {
		expect(parseOsc11BackgroundColor("\x1b]11;#ffffff\x1b\\")).toEqual({ r: 255, g: 255, b: 255 });
		expect(parseOsc11BackgroundColor("\x1b]11;#000000\x07")).toEqual({ r: 0, g: 0, b: 0 });
	});

	it("classifies RGB colors by luminance", () => {
		expect(getThemeForRgbColor({ r: 8, g: 8, b: 8 })).toBe("dark");
		expect(getThemeForRgbColor({ r: 250, g: 250, b: 250 })).toBe("light");
	});
});
