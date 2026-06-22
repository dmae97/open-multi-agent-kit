import { describe, expect, it } from "vitest";
import {
	type ExternalContextPackageRegistration,
	type ExternalPrunerRegistration,
	getRecommendedCompactStack,
	getRecommendedPrunerDefaults,
	getRecommendedSessionCompactorDefaults,
	registerExternalPrunerOwner,
	validateCompactPackageStack,
	validateSingleExternalPrunerOwner,
	validateSingleSessionCompactorOwner,
} from "../src/core/compaction/pruner-policy.ts";

describe("external pruner ownership policy", () => {
	it("maps the recommended agent-message pruning defaults", () => {
		expect(getRecommendedPrunerDefaults()).toEqual({
			trigger: "agent-message",
			soft: 0.7,
			hard: 0.82,
			keepRecentTokens: 24_000,
			recoverOriginals: true,
			neverPrune: ["entries"],
		});
	});

	it("maps the recommended session_before_compact owner to pi-smart-compact", () => {
		expect(getRecommendedSessionCompactorDefaults()).toEqual({
			trigger: "session_before_compact",
			owner: "pi-smart-compact",
			profile: "balanced",
			autoTrigger: true,
			minContextPercent: 72,
			backupEnabled: true,
			pinPaths: ["AGENTS.md", "OMK.md", ".omk/state.json"],
			preserveToolPairs: true,
			phases: ["Extract", "Explore", "Synthesize", "Verify"],
		});
	});

	it("recommends distinct production, cost-experiment, and long-context stacks", () => {
		expect(getRecommendedCompactStack("production")).toEqual({
			preCompression: ["LeanCTX", "Headroom"],
			agentMessagePruner: "pi-context-prune",
			sessionCompactor: "pi-smart-compact",
			orchestrationTools: ["pi-context-tools"],
			providerPromptCache: true,
		});
		expect(getRecommendedCompactStack("cost-experiment").sessionCompactor).toBe("pi-better-compact");
		expect(getRecommendedCompactStack("long-context-precision").sessionCompactor).toBe("pi-omni-compact");
	});

	it("registers and validates a single enabled owner without mutating the registry", () => {
		const registry: ExternalPrunerRegistration[] = [];
		const next = registerExternalPrunerOwner(registry, {
			owner: "local-pruner",
			enabled: true,
			license: "known",
		});

		expect(registry).toEqual([]);
		expect(next).toHaveLength(1);
		expect(validateSingleExternalPrunerOwner(next, { mode: "permanent" })).toEqual({
			owner: "local-pruner",
			mode: "permanent",
			defaults: getRecommendedPrunerDefaults(),
		});
	});

	it("validates the recommended production stack with one session compactor", () => {
		const registry: ExternalContextPackageRegistration[] = [
			{ owner: "pi-context-prune", enabled: true },
			{ owner: "pi-smart-compact", enabled: true },
			{ owner: "pi-context-tools", enabled: true },
		];

		expect(validateCompactPackageStack(registry, { mode: "permanent" })).toEqual({
			agentMessagePruner: {
				owner: "pi-context-prune",
				mode: "permanent",
				defaults: getRecommendedPrunerDefaults(),
			},
			sessionCompactor: {
				owner: "pi-smart-compact",
				mode: "permanent",
				defaults: getRecommendedSessionCompactorDefaults(),
			},
			orchestrationTools: ["pi-context-tools"],
			continuationHelpers: [],
		});
	});

	it("rejects multiple enabled session_before_compact compactors", () => {
		const registry: ExternalContextPackageRegistration[] = [
			{ owner: "pi-smart-compact", enabled: true },
			{ owner: "pi-better-compact", enabled: true, providerPricingInjected: true },
		];

		expect(() => validateCompactPackageStack(registry, { mode: "experimental" })).toThrow(
			/Multiple enabled session_before_compact compactors are not allowed: pi-smart-compact, pi-better-compact/,
		);
	});

	it("requires provider pricing before enabling pi-better-compact", () => {
		expect(() =>
			validateSingleSessionCompactorOwner([{ owner: "pi-better-compact", enabled: true }], { mode: "experimental" }),
		).toThrow(/pi-better-compact requires provider pricing/);

		expect(
			validateSingleSessionCompactorOwner(
				[{ owner: "pi-better-compact", enabled: true, providerPricingInjected: true }],
				{ mode: "experimental" },
			),
		).toEqual({
			owner: "pi-better-compact",
			mode: "experimental",
			defaults: expect.objectContaining({ owner: "pi-better-compact", trigger: "session_before_compact" }),
		});
	});

	it("blocks compact packages that violate authority boundaries or require source-edited model ids", () => {
		expect(() =>
			validateSingleSessionCompactorOwner([{ owner: "@davehardy20/pi-compact-plus", enabled: true }], {
				mode: "experimental",
			}),
		).toThrow(/synthetic user message/);
		expect(() =>
			validateSingleSessionCompactorOwner([{ owner: "@adamjen/pi-compact-fast", enabled: true }], {
				mode: "experimental",
			}),
		).toThrow(/source-edited model id/);
	});

	it("rejects multiple enabled external pruner owners", () => {
		const registry: ExternalPrunerRegistration[] = [
			{ owner: "first-pruner", enabled: true, license: "known" },
			{ owner: "disabled-pruner", enabled: false, license: "known" },
			{ owner: "second-pruner", enabled: true, license: "known" },
		];

		expect(() => validateSingleExternalPrunerOwner(registry, { mode: "experimental" })).toThrow(
			/Multiple enabled external pruners are not allowed: first-pruner, second-pruner/,
		);
	});

	it("blocks pi-vcc from permanent mode because its license is unknown", () => {
		expect(() =>
			validateSingleExternalPrunerOwner([{ owner: "pi-vcc", enabled: true }], { mode: "permanent" }),
		).toThrow(/pi-vcc.*unknown license.*permanent/);
	});

	it("allows pi-ultra-compact only in experimental mode", () => {
		expect(
			validateSingleExternalPrunerOwner([{ owner: "pi-ultra-compact", enabled: true }], { mode: "experimental" }),
		).toEqual({
			owner: "pi-ultra-compact",
			mode: "experimental",
			defaults: getRecommendedPrunerDefaults(),
		});

		expect(() =>
			validateSingleExternalPrunerOwner([{ owner: "pi-ultra-compact", enabled: true }], { mode: "permanent" }),
		).toThrow(/pi-ultra-compact.*experimental-only/);
	});
});
