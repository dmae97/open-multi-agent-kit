import type { ProcurementReview } from "./package-procurement.ts";
import type { PackageSource } from "./settings-manager.ts";

export type CompositionSurface =
	| "theme"
	| "footer"
	| "header"
	| "editor"
	| "tool-row"
	| "assistant-markdown"
	| "status"
	| "permission"
	| "structured-input"
	| "report-preview"
	| "loadout";

export type OmkOwnedDomain =
	| "ontology"
	| "search"
	| "memory"
	| "cache"
	| "compaction"
	| "multi-agent"
	| "session"
	| "scheduler";

export type CompositionVerdict = "admit" | "reject" | "defer" | "canary";

export interface CompositionResourceFilter {
	extensions: boolean;
	skills: boolean;
	prompts: boolean;
	themes: boolean;
}

export interface SurfaceOwnerRule {
	surface: CompositionSurface;
	ownerPackageIdentity: string;
}

export interface PackageCompositionPolicy {
	readonly omkOwnedDomains: readonly OmkOwnedDomain[];
	readonly surfaceOwnership: readonly SurfaceOwnerRule[];
	readonly allowedResources: Readonly<Record<string, Partial<CompositionResourceFilter>>>;
	readonly capabilityToSurfaces: Readonly<Record<string, readonly CompositionSurface[]>>;
	readonly capabilityToOmkDomains: Readonly<Record<string, readonly OmkOwnedDomain[]>>;
}

export interface CompositionInput {
	identity: string;
	review: ProcurementReview;
	requestedSurfaces?: readonly CompositionSurface[];
}

export interface CompositionConflict {
	kind:
		| "duplicate-surface-owner"
		| "omk-domain-mutation"
		| "unapproved-surface"
		| "capability-surface-mismatch"
		| "resource-filter-blocked";
	surface?: CompositionSurface;
	domain?: OmkOwnedDomain;
	owner?: string;
	capability?: string;
	reason: string;
}

export interface CompositionReview {
	identity: string;
	verdict: CompositionVerdict;
	allowedResources: CompositionResourceFilter;
	admittedSurfaces: CompositionSurface[];
	conflicts: CompositionConflict[];
	deferredReason?: string;
	rejectedReasons: string[];
}

export interface CompositionPromotionRecord {
	schemaVersion: "omk.package-composition.promotion.v1";
	identity: string;
	source: string;
	scope: "project";
	allowedResources: CompositionResourceFilter;
	admittedSurfaces: CompositionSurface[];
	reviewedAt: string;
	reviewedBy: "manual" | "root-orchestrator";
}

const ALL_RESOURCES: CompositionResourceFilter = {
	extensions: true,
	skills: true,
	prompts: true,
	themes: true,
};

const SIDE_EFFECT_CAPABILITIES = new Set([
	"child-process",
	"network",
	"filesystem-write",
	"browser-control",
	"telemetry",
]);

const RESOURCE_PATTERNS: Record<keyof CompositionResourceFilter, string[]> = {
	extensions: ["**/*"],
	skills: ["**/*"],
	prompts: ["**/*"],
	themes: ["**/*"],
};

export function createDefaultCompositionPolicy(): PackageCompositionPolicy {
	return {
		omkOwnedDomains: ["ontology", "search", "memory", "cache", "compaction", "multi-agent", "session", "scheduler"],
		surfaceOwnership: [
			{ surface: "theme", ownerPackageIdentity: "npm:pi-tokyo-night" },
			{ surface: "footer", ownerPackageIdentity: "npm:pi-zentui" },
			{ surface: "editor", ownerPackageIdentity: "npm:pi-zentui" },
			{ surface: "header", ownerPackageIdentity: "omk:core" },
			{ surface: "tool-row", ownerPackageIdentity: "npm:pi-claude-style-tools" },
			{ surface: "loadout", ownerPackageIdentity: "npm:pi-loadout" },
			{ surface: "permission", ownerPackageIdentity: "npm:@gotgenes/pi-permission-system" },
			{ surface: "structured-input", ownerPackageIdentity: "npm:@juicesharp/rpiv-ask-user-question" },
			{ surface: "report-preview", ownerPackageIdentity: "npm:pi-markdown-preview" },
		],
		allowedResources: {
			"npm:pi-tokyo-night": { extensions: false, skills: false, prompts: false, themes: true },
			"npm:pi-zentui": { extensions: true, skills: false, prompts: false, themes: false },
			"npm:pi-claude-style-tools": { extensions: true, skills: false, prompts: false, themes: false },
			"npm:pi-loadout": { extensions: true, skills: false, prompts: false, themes: false },
			"npm:pi-lens": { extensions: true, skills: false, prompts: false, themes: false },
			"npm:@gotgenes/pi-permission-system": { extensions: true, skills: false, prompts: false, themes: false },
			"npm:@juicesharp/rpiv-ask-user-question": { extensions: true, skills: false, prompts: false, themes: false },
			"npm:pi-markdown-preview": { extensions: true, skills: false, prompts: false, themes: false },
			"npm:pi-langfuse": { extensions: true, skills: false, prompts: false, themes: false },
			"npm:pi-cache-optimizer": { extensions: true, skills: false, prompts: false, themes: false },
			"npm:pi-sandbox": { extensions: true, skills: false, prompts: false, themes: false },
		},
		capabilityToSurfaces: {
			setFooter: ["footer"],
			setEditorComponent: ["editor"],
			setHeader: ["header"],
			setStatus: ["status"],
			renderCall: ["tool-row"],
			renderResult: ["tool-row"],
			registerMessageRenderer: ["assistant-markdown"],
			setActiveTools: ["loadout"],
			permission: ["permission"],
			askUserQuestion: ["structured-input"],
			markdownPreview: ["report-preview"],
		},
		capabilityToOmkDomains: {
			context: ["session"],
			before_provider_request: ["cache", "session"],
			session_before_compact: ["compaction"],
			setModel: ["session"],
			setThinkingLevel: ["session"],
			memory: ["memory"],
			cache: ["cache"],
			ontology: ["ontology"],
			multiAgent: ["multi-agent"],
			scheduler: ["scheduler"],
		},
	};
}

export function checkSingleSurfaceOwner(
	identity: string,
	requestedSurfaces: readonly CompositionSurface[],
	existingOwners: readonly SurfaceOwnerRule[],
): CompositionConflict[] {
	const key = packageIdentityKey(identity);
	const conflicts: CompositionConflict[] = [];
	for (const surface of uniqueSorted(requestedSurfaces)) {
		const owner = existingOwners.find((rule) => rule.surface === surface);
		if (!owner) continue;
		if (owner.ownerPackageIdentity === key || owner.ownerPackageIdentity === identity) continue;
		conflicts.push({
			kind: "duplicate-surface-owner",
			surface,
			owner: owner.ownerPackageIdentity,
			reason: `${identity} cannot claim ${surface}; ${owner.ownerPackageIdentity} already owns it`,
		});
	}
	return conflicts;
}

export function checkOmkDomainMutation(
	identity: string,
	capabilities: readonly string[],
	policy: PackageCompositionPolicy,
): CompositionConflict[] {
	const conflicts: CompositionConflict[] = [];
	for (const capability of capabilities) {
		const domains = policy.capabilityToOmkDomains[capability] ?? [];
		for (const domain of domains) {
			conflicts.push({
				kind: "omk-domain-mutation",
				domain,
				capability,
				reason: `${identity} requested ${capability}, which mutates OMK-owned ${domain}`,
			});
		}
	}
	return conflicts;
}

export function checkCapabilitySurfaceMatch(
	identity: string,
	requestedSurfaces: readonly CompositionSurface[],
	capabilities: readonly string[],
	policy: PackageCompositionPolicy,
): CompositionConflict[] {
	if (capabilities.length === 0) return [];
	const supported = new Set<CompositionSurface>();
	for (const capability of capabilities) {
		for (const surface of policy.capabilityToSurfaces[capability] ?? []) {
			supported.add(surface);
		}
	}

	return uniqueSorted(requestedSurfaces)
		.filter((surface) => !supported.has(surface))
		.map((surface) => ({
			kind: "capability-surface-mismatch" as const,
			surface,
			reason: `${identity} requested ${surface}, but no detected capability supports that surface`,
		}));
}

export function resolveResourceFilter(identity: string, policy: PackageCompositionPolicy): CompositionResourceFilter {
	const override = policy.allowedResources[identity] ?? policy.allowedResources[packageIdentityKey(identity)] ?? {};
	return { ...ALL_RESOURCES, ...override };
}

export function inferRequestedSurfaces(
	review: ProcurementReview,
	policy: PackageCompositionPolicy,
): CompositionSurface[] {
	const surfaces = new Set<CompositionSurface>();
	for (const resource of review.candidate.expectedResources) {
		if (resource === "theme") surfaces.add("theme");
	}
	for (const capability of review.capabilities) {
		for (const surface of policy.capabilityToSurfaces[capability] ?? []) {
			surfaces.add(surface);
		}
	}
	return uniqueSorted([...surfaces]);
}

export function composePackage(input: CompositionInput, policy: PackageCompositionPolicy): CompositionReview {
	const requestedSurfaces = uniqueSorted(input.requestedSurfaces ?? inferRequestedSurfaces(input.review, policy));
	const allowedResources = resolveResourceFilter(input.identity, policy);
	const conflicts = [
		...checkSingleSurfaceOwner(input.identity, requestedSurfaces, policy.surfaceOwnership),
		...checkOmkDomainMutation(input.identity, input.review.capabilities, policy),
		...checkCapabilitySurfaceMatch(input.identity, requestedSurfaces, input.review.capabilities, policy),
		...checkResourceFilter(input.identity, requestedSurfaces, allowedResources),
	];

	const rejectedReasons = [...input.review.rejectedReasons, ...conflicts.map((conflict) => conflict.reason)];
	const blockingConflict = conflicts.find((conflict) =>
		[
			"duplicate-surface-owner",
			"omk-domain-mutation",
			"unapproved-surface",
			"capability-surface-mismatch",
			"resource-filter-blocked",
		].includes(conflict.kind),
	);

	if (!input.review.pinned) {
		return compositionReview(input.identity, "reject", allowedResources, requestedSurfaces, conflicts, undefined, [
			...rejectedReasons,
			"missing-exact-pin",
		]);
	}
	if (input.review.licenseVerdict === "reject" || input.review.lifecycleVerdict === "reject") {
		return compositionReview(
			input.identity,
			"reject",
			allowedResources,
			requestedSurfaces,
			conflicts,
			undefined,
			rejectedReasons,
		);
	}
	if (input.review.pathCompatibility === "pi-hardcoded") {
		return compositionReview(input.identity, "reject", allowedResources, requestedSurfaces, conflicts, undefined, [
			...rejectedReasons,
			"pi-hardcoded-paths",
		]);
	}
	if (blockingConflict) {
		return compositionReview(
			input.identity,
			"reject",
			allowedResources,
			requestedSurfaces,
			conflicts,
			undefined,
			rejectedReasons,
		);
	}
	if (input.review.adoption === "deferred") {
		return compositionReview(
			input.identity,
			"defer",
			allowedResources,
			requestedSurfaces,
			conflicts,
			input.review.deferredReason,
			rejectedReasons,
		);
	}
	if (input.review.adoption === "reject") {
		return compositionReview(
			input.identity,
			"reject",
			allowedResources,
			requestedSurfaces,
			conflicts,
			undefined,
			rejectedReasons,
		);
	}

	const canaryReasons = canaryRequiredReasons(input.review.capabilities);
	if (input.review.risk === "high" && canaryReasons.length === 0) {
		canaryReasons.push("canary-required: high-risk");
	}
	if (canaryReasons.length > 0) {
		return compositionReview(input.identity, "canary", allowedResources, requestedSurfaces, conflicts, undefined, [
			...rejectedReasons,
			...canaryReasons,
		]);
	}

	return compositionReview(
		input.identity,
		"admit",
		allowedResources,
		requestedSurfaces,
		conflicts,
		undefined,
		rejectedReasons,
	);
}

export function composeCandidateBatch(
	inputs: readonly CompositionInput[],
	basePolicy: PackageCompositionPolicy,
): CompositionReview[] {
	const owners = [...basePolicy.surfaceOwnership];
	const results: CompositionReview[] = [];
	for (const input of inputs) {
		const policy = { ...basePolicy, surfaceOwnership: owners };
		const result = composePackage(input, policy);
		results.push(result);
		if (result.verdict === "admit" || result.verdict === "canary") {
			const ownerKey = packageIdentityKey(result.identity);
			for (const surface of result.admittedSurfaces) {
				if (!owners.some((owner) => owner.surface === surface)) {
					owners.push({ surface, ownerPackageIdentity: ownerKey });
				}
			}
		}
	}
	return results;
}

export function toPackageSource(review: CompositionReview): PackageSource {
	assertPromotable(review);
	if (isAllResourcesEnabled(review.allowedResources)) {
		return review.identity;
	}
	return {
		source: review.identity,
		extensions: review.allowedResources.extensions ? RESOURCE_PATTERNS.extensions : [],
		skills: review.allowedResources.skills ? RESOURCE_PATTERNS.skills : [],
		prompts: review.allowedResources.prompts ? RESOURCE_PATTERNS.prompts : [],
		themes: review.allowedResources.themes ? RESOURCE_PATTERNS.themes : [],
	};
}

export function createPromotionRecord(
	review: CompositionReview,
	source: string,
	options: { reviewedBy?: "manual" | "root-orchestrator"; now?: Date } = {},
): CompositionPromotionRecord {
	assertPromotable(review);
	return {
		schemaVersion: "omk.package-composition.promotion.v1",
		identity: review.identity,
		source: redactSource(source),
		scope: "project",
		allowedResources: review.allowedResources,
		admittedSurfaces: review.admittedSurfaces,
		reviewedAt: (options.now ?? new Date()).toISOString(),
		reviewedBy: options.reviewedBy ?? "root-orchestrator",
	};
}

function checkResourceFilter(
	identity: string,
	requestedSurfaces: readonly CompositionSurface[],
	filter: CompositionResourceFilter,
): CompositionConflict[] {
	const conflicts: CompositionConflict[] = [];
	for (const surface of requestedSurfaces) {
		const resource = resourceForSurface(surface);
		if (filter[resource]) continue;
		conflicts.push({
			kind: "resource-filter-blocked",
			surface,
			reason: `${identity} requested ${surface}, but ${resource} resources are disabled`,
		});
	}
	return conflicts;
}

function resourceForSurface(surface: CompositionSurface): keyof CompositionResourceFilter {
	return surface === "theme" ? "themes" : "extensions";
}

function canaryRequiredReasons(capabilities: readonly string[]): string[] {
	const reasons: string[] = [];
	for (const capability of capabilities) {
		if (SIDE_EFFECT_CAPABILITIES.has(capability)) {
			reasons.push(`canary-required: ${capability}`);
		}
	}
	return uniqueSorted(reasons);
}

function compositionReview(
	identity: string,
	verdict: CompositionVerdict,
	allowedResources: CompositionResourceFilter,
	admittedSurfaces: readonly CompositionSurface[],
	conflicts: readonly CompositionConflict[],
	deferredReason: string | undefined,
	rejectedReasons: readonly string[],
): CompositionReview {
	return {
		identity,
		verdict,
		allowedResources,
		admittedSurfaces: uniqueSorted(admittedSurfaces),
		conflicts: [...conflicts],
		...(deferredReason === undefined ? {} : { deferredReason }),
		rejectedReasons: uniqueSorted(rejectedReasons),
	};
}

function assertPromotable(review: CompositionReview): void {
	if (review.verdict !== "admit") {
		throw new Error(`Package composition verdict ${review.verdict} cannot be promoted`);
	}
}

function isAllResourcesEnabled(filter: CompositionResourceFilter): boolean {
	return filter.extensions && filter.skills && filter.prompts && filter.themes;
}

function packageIdentityKey(identity: string): string {
	if (!identity.startsWith("npm:")) return identity;
	const spec = identity.slice("npm:".length);
	const at = spec.lastIndexOf("@");
	if (at <= 0) return identity;
	if (spec.startsWith("@")) {
		const scopedVersionAt = spec.indexOf("@", spec.indexOf("/") + 1);
		return scopedVersionAt > 0 ? `npm:${spec.slice(0, scopedVersionAt)}` : identity;
	}
	return `npm:${spec.slice(0, at)}`;
}

function uniqueSorted<T extends string>(values: readonly T[]): T[] {
	return [...new Set(values)].sort();
}

function redactSource(source: string): string {
	return source
		.replace(/(https?:\/\/)([^\s/@]+@)/gi, "$1<redacted>@")
		.replace(/([?&](?:access_token|auth|key|password|token)=)[^&#]+/gi, "$1<redacted>");
}
