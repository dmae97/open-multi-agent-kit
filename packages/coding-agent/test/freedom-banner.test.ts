import { describe, expect, it } from "vitest";
import { type BannerMemo, bannerOnce } from "../src/core/freedom/banner.ts";
import { FREEDOM_CONFIG_DEFAULTS, type FreedomConfig } from "../src/core/freedom/config.ts";

function makeCfg(overrides: Partial<FreedomConfig> = {}): FreedomConfig {
	return { ...FREEDOM_CONFIG_DEFAULTS, ...overrides };
}

describe("bannerOnce", () => {
	it("returns undefined when freedom is disabled", () => {
		const memo: BannerMemo = {};
		expect(bannerOnce(FREEDOM_CONFIG_DEFAULTS, memo)).toBeUndefined();
		expect(memo.shown).toBeUndefined();
	});

	it("returns the banner the first time, then suppresses", () => {
		const memo: BannerMemo = {};
		const cfg = makeCfg({ enabled: true });
		const first = bannerOnce(cfg, memo);
		expect(first).toBeDefined();
		expect(first).toContain("OMK FREEDOM MODE");
		expect(memo.shown).toBe(true);
		expect(bannerOnce(cfg, memo)).toBeUndefined();
	});

	it("respects banner.show=false even when freedom is enabled", () => {
		const cfg = makeCfg({ enabled: true, banner: { show: false, suppressAfter: "session" } });
		const memo: BannerMemo = {};
		expect(bannerOnce(cfg, memo)).toBeUndefined();
		expect(memo.shown).toBeUndefined();
	});
});
