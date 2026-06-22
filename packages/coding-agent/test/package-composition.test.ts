import { describe, expect, it } from "vitest";
import {
	type CompositionInput,
	type CompositionSurface,
	checkCapabilitySurfaceMatch,
	checkOmkDomainMutation,
	checkSingleSurfaceOwner,
	composeCandidateBatch,
	composePackage,
	createDefaultCompositionPolicy,
	createPromotionRecord,
	inferRequestedSurfaces,
	resolveResourceFilter,
	toPackageSource,
} from "../src/core/package-composition.ts";
import { type ProcurementReview, procureCandidate, type SourceText } from "../src/core/package-procurement.ts";

function makeReview(
	name: string,
	version: string,
	options: {
		intendedUse?: "ephemeral-adopt" | "permanent-adopt" | "vendor" | "native" | "measurement-gated";
		expectedResources?: Array<"extension" | "skill" | "prompt" | "theme" | "tool">;
		sources?: SourceText[];
		metrics?: string[];
	} = {},
): ProcurementReview {
	return procureCandidate({
		candidate: {
			name,
			exactVersion: version,
			intendedUse: options.intendedUse ?? "ephemeral-adopt",
			expectedResources: options.expectedResources ?? ["extension"],
			metrics: options.metrics,
		},
		declaredLicense: "MIT",
		sources: options.sources ?? [{ path: "index.ts", text: "" }],
	});
}

function makeInput(
	identity: string,
	requestedSurfaces: CompositionSurface[],
	review: ProcurementReview = makeReview("pi-test", "1.0.0"),
): CompositionInput {
	return { identity, requestedSurfaces, review };
}

describe("createDefaultCompositionPolicy", () => {
	it("lists OMK-owned domains and known production owners", () => {
		const policy = createDefaultCompositionPolicy();

		expect(policy.omkOwnedDomains).toContain("ontology");
		expect(policy.omkOwnedDomains).toContain("compaction");
		expect(policy.omkOwnedDomains).toContain("multi-agent");
		expect(policy.surfaceOwnership).toContainEqual({ surface: "footer", ownerPackageIdentity: "npm:pi-zentui" });
		expect(policy.surfaceOwnership).toContainEqual({
			surface: "tool-row",
			ownerPackageIdentity: "npm:pi-claude-style-tools",
		});
	});
});

describe("checkSingleSurfaceOwner", () => {
	it("allows unowned surfaces and the registered owner identity", () => {
		expect(checkSingleSurfaceOwner("npm:package-a@1.0.0", ["status"], [])).toEqual([]);
		expect(
			checkSingleSurfaceOwner(
				"npm:pi-zentui@0.3.0",
				["footer"],
				[{ surface: "footer", ownerPackageIdentity: "npm:pi-zentui" }],
			),
		).toEqual([]);
	});

	it("rejects a second package claiming a single-owner surface", () => {
		const conflicts = checkSingleSurfaceOwner(
			"npm:other-footer@1.0.0",
			["footer"],
			[{ surface: "footer", ownerPackageIdentity: "npm:pi-zentui" }],
		);

		expect(conflicts).toHaveLength(1);
		expect(conflicts[0]).toMatchObject({
			kind: "duplicate-surface-owner",
			surface: "footer",
			owner: "npm:pi-zentui",
		});
	});
});

describe("checkOmkDomainMutation", () => {
	it("flags context, provider payload, and compaction mutation", () => {
		const policy = createDefaultCompositionPolicy();

		expect(checkOmkDomainMutation("npm:pi-lens@3.8.53", ["context"], policy)[0]).toMatchObject({
			kind: "omk-domain-mutation",
			domain: "session",
		});
		expect(checkOmkDomainMutation("npm:pi-lens@3.8.53", ["before_provider_request"], policy)[0]).toMatchObject({
			kind: "omk-domain-mutation",
			domain: "cache",
		});
		expect(checkOmkDomainMutation("npm:pi-compact@1.0.0", ["session_before_compact"], policy)[0]).toMatchObject({
			kind: "omk-domain-mutation",
			domain: "compaction",
		});
	});

	it("passes for display-only capabilities", () => {
		const conflicts = checkOmkDomainMutation(
			"npm:pi-zentui@0.3.0",
			["setFooter", "setEditorComponent"],
			createDefaultCompositionPolicy(),
		);

		expect(conflicts).toEqual([]);
	});
});

describe("checkCapabilitySurfaceMatch", () => {
	it("passes when capabilities support every requested surface", () => {
		const conflicts = checkCapabilitySurfaceMatch(
			"npm:pi-zentui@0.3.0",
			["footer", "editor"],
			["setFooter", "setEditorComponent"],
			createDefaultCompositionPolicy(),
		);

		expect(conflicts).toEqual([]);
	});

	it("flags requested surfaces unsupported by the detected capabilities", () => {
		const conflicts = checkCapabilitySurfaceMatch(
			"npm:pi-zentui@0.3.0",
			["loadout"],
			["setFooter"],
			createDefaultCompositionPolicy(),
		);

		expect(conflicts[0]).toMatchObject({ kind: "capability-surface-mismatch", surface: "loadout" });
	});
});

describe("resolveResourceFilter", () => {
	it("defaults to all resources when a package has no explicit filter", () => {
		expect(resolveResourceFilter("npm:unknown@1.0.0", createDefaultCompositionPolicy())).toEqual({
			extensions: true,
			skills: true,
			prompts: true,
			themes: true,
		});
	});

	it("restricts Tokyo Night to theme resources", () => {
		expect(resolveResourceFilter("npm:pi-tokyo-night@1.0.0", createDefaultCompositionPolicy())).toEqual({
			extensions: false,
			skills: false,
			prompts: false,
			themes: true,
		});
	});
});

describe("inferRequestedSurfaces", () => {
	it("infers surfaces from resources and extension API tokens", () => {
		const review = makeReview("pi-claude-style-tools", "1.0.58", {
			sources: [{ path: "index.ts", text: "defineTool({ renderCall() {}, renderResult() {} })" }],
		});

		expect(inferRequestedSurfaces(review, createDefaultCompositionPolicy())).toContain("tool-row");
	});

	it("infers theme surface from expected theme resources", () => {
		const review = makeReview("pi-tokyo-night", "1.0.0", { expectedResources: ["theme"] });

		expect(inferRequestedSurfaces(review, createDefaultCompositionPolicy())).toEqual(["theme"]);
	});
});

describe("composePackage", () => {
	it("admits a low-risk theme package with a theme-only resource filter", () => {
		const review = makeReview("pi-tokyo-night", "1.0.0", { intendedUse: "vendor", expectedResources: ["theme"] });
		const result = composePackage(
			makeInput("npm:pi-tokyo-night@1.0.0", ["theme"], review),
			createDefaultCompositionPolicy(),
		);

		expect(result.verdict).toBe("admit");
		expect(result.allowedResources).toEqual({ extensions: false, skills: false, prompts: false, themes: true });
		expect(result.admittedSurfaces).toEqual(["theme"]);
	});

	it("rejects packages that mutate OMK-owned domains", () => {
		const review = makeReview("pi-lens", "3.8.53", {
			sources: [{ path: "index.ts", text: "omk.on('before_provider_request', () => ({ payload: {} }))" }],
		});
		const result = composePackage(
			makeInput("npm:pi-lens@3.8.53", ["tool-row"], review),
			createDefaultCompositionPolicy(),
		);

		expect(result.verdict).toBe("reject");
		expect(result.conflicts.some((conflict) => conflict.kind === "omk-domain-mutation")).toBe(true);
	});

	it("defers a package whose procurement review is deferred", () => {
		const review = makeReview("pi-cache-optimizer", "0.12.0", {
			intendedUse: "measurement-gated",
			sources: [{ path: "index.ts", text: "ctx.ui.setStatus('cache', 'ok')" }],
		});
		const result = composePackage(
			makeInput("npm:pi-cache-optimizer@0.12.0", ["status"], review),
			createDefaultCompositionPolicy(),
		);

		expect(result.verdict).toBe("defer");
		expect(result.deferredReason).toBe("pending-metrics");
	});

	it("sends packages with side-effect capabilities to canary", () => {
		const review = makeReview("pi-sandbox", "0.4.3", {
			sources: [{ path: "index.ts", text: "import { spawn } from 'node:child_process'; spawn('true')" }],
		});
		const result = composePackage(makeInput("npm:pi-sandbox@0.4.3", [], review), createDefaultCompositionPolicy());

		expect(result.verdict).toBe("canary");
		expect(result.rejectedReasons).toContain("canary-required: child-process");
	});
});

describe("composeCandidateBatch", () => {
	it("preserves single-owner semantics across candidates", () => {
		const policy = createDefaultCompositionPolicy();
		const results = composeCandidateBatch(
			[
				makeInput("npm:pi-zentui@0.3.0", ["footer", "editor"], makeReview("pi-zentui", "0.3.0")),
				makeInput("npm:other-footer@1.0.0", ["footer"], makeReview("other-footer", "1.0.0")),
			],
			policy,
		);

		expect(results[0]?.verdict).toBe("admit");
		expect(results[1]?.verdict).toBe("reject");
		expect(results[1]?.conflicts[0]).toMatchObject({ kind: "duplicate-surface-owner", surface: "footer" });
	});
});

describe("toPackageSource", () => {
	it("produces a filtered PackageSource object for promoted settings", () => {
		const review = makeReview("pi-tokyo-night", "1.0.0", { intendedUse: "vendor", expectedResources: ["theme"] });
		const result = composePackage(
			makeInput("npm:pi-tokyo-night@1.0.0", ["theme"], review),
			createDefaultCompositionPolicy(),
		);

		expect(toPackageSource(result)).toEqual({
			source: "npm:pi-tokyo-night@1.0.0",
			extensions: [],
			skills: [],
			prompts: [],
			themes: ["**/*"],
		});
	});
});

describe("createPromotionRecord", () => {
	it("records redacted project-scope promotion metadata", () => {
		const review = makeReview("pi-tokyo-night", "1.0.0", { intendedUse: "vendor", expectedResources: ["theme"] });
		const result = composePackage(
			makeInput("npm:pi-tokyo-night@1.0.0", ["theme"], review),
			createDefaultCompositionPolicy(),
		);
		const record = createPromotionRecord(result, "npm:pi-tokyo-night@1.0.0?token=SECRET", {
			now: new Date("2026-06-22T00:00:00.000Z"),
		});

		expect(record).toMatchObject({
			schemaVersion: "omk.package-composition.promotion.v1",
			identity: "npm:pi-tokyo-night@1.0.0",
			source: "npm:pi-tokyo-night@1.0.0?token=<redacted>",
			scope: "project",
			reviewedAt: "2026-06-22T00:00:00.000Z",
		});
		expect(record.admittedSurfaces).toEqual(["theme"]);
	});
});
