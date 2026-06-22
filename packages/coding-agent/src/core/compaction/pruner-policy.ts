/**
 * Pure policy helpers for external context pruning and session compaction.
 *
 * Agent-message pruning and session_before_compact compaction are separate
 * ownership lanes. The runtime may run one agent-message pruner and one
 * session compactor, but only one enabled owner may handle session_before_compact.
 */

export type ExternalPrunerMode = "experimental" | "permanent";
export type ExternalPrunerLicense = "known" | "unknown";
export type PrunerTrigger = "agent-message";
export type SessionCompactorTrigger = "session_before_compact";
export type NeverPruneTarget = "entries";
export type SessionCompactorPhase = "Extract" | "Explore" | "Synthesize" | "Verify";
export type CompactStackProfile = "production" | "cost-experiment" | "long-context-precision";
export type ExternalContextPackageRole =
	| "agent-message-pruner"
	| "session-before-compact-compactor"
	| "orchestration-tool"
	| "continuation-helper"
	| "blocked"
	| "unsupported";

export interface PrunerRecommendedDefaults {
	trigger: PrunerTrigger;
	soft: number;
	hard: number;
	keepRecentTokens: number;
	recoverOriginals: boolean;
	neverPrune: NeverPruneTarget[];
}

export interface SessionCompactorRecommendedDefaults {
	trigger: SessionCompactorTrigger;
	owner: string;
	profile: string;
	autoTrigger: boolean;
	minContextPercent: number;
	backupEnabled: boolean;
	pinPaths: string[];
	preserveToolPairs: boolean;
	phases: SessionCompactorPhase[];
}

export interface CompactStackRecommendation {
	preCompression: string[];
	agentMessagePruner?: string;
	sessionCompactor?: string;
	orchestrationTools: string[];
	providerPromptCache: boolean;
}

export interface ExternalPrunerRegistration {
	owner: string;
	enabled: boolean;
	license?: ExternalPrunerLicense;
	defaults?: Partial<PrunerRecommendedDefaults>;
}

export interface ExternalSessionCompactorRegistration {
	owner: string;
	enabled: boolean;
	license?: ExternalPrunerLicense;
	providerPricingInjected?: boolean;
	sessionDefaults?: Partial<SessionCompactorRecommendedDefaults>;
}

export interface ExternalContextPackageRegistration
	extends ExternalPrunerRegistration,
		ExternalSessionCompactorRegistration {}

export interface ValidateExternalPrunerOptions {
	mode: ExternalPrunerMode;
}

export interface ValidatedExternalPrunerOwner {
	owner: string;
	mode: ExternalPrunerMode;
	defaults: PrunerRecommendedDefaults;
}

export interface ValidatedSessionCompactorOwner {
	owner: string;
	mode: ExternalPrunerMode;
	defaults: SessionCompactorRecommendedDefaults;
}

export interface ValidatedCompactPackageStack {
	agentMessagePruner?: ValidatedExternalPrunerOwner;
	sessionCompactor?: ValidatedSessionCompactorOwner;
	orchestrationTools: string[];
	continuationHelpers: string[];
}

interface BuiltInPrunerPolicy {
	license: ExternalPrunerLicense;
	allowedModes: readonly ExternalPrunerMode[];
	experimentalOnly: boolean;
}

interface ContextPackagePolicy {
	role: ExternalContextPackageRole;
	license: ExternalPrunerLicense;
	allowedModes: readonly ExternalPrunerMode[];
	blockedReason?: string;
	requiresProviderPricing?: boolean;
	sessionDefaults?: SessionCompactorRecommendedDefaults;
}

const PINNED_SESSION_COMPACTOR_PATHS = ["AGENTS.md", "OMK.md", ".omk/state.json"] as const;
const SESSION_COMPACTOR_PHASES = ["Extract", "Explore", "Synthesize", "Verify"] as const;

const BUILT_IN_PRUNER_POLICIES: Record<string, BuiltInPrunerPolicy> = {
	"pi-context-prune": {
		license: "known",
		allowedModes: ["experimental", "permanent"],
		experimentalOnly: false,
	},
	"pi-ultra-compact": {
		license: "known",
		allowedModes: ["experimental"],
		experimentalOnly: true,
	},
	"pi-vcc": {
		license: "unknown",
		allowedModes: ["experimental"],
		experimentalOnly: true,
	},
};

const CONTEXT_PACKAGE_POLICIES: Record<string, ContextPackagePolicy> = {
	"pi-context-prune": {
		role: "agent-message-pruner",
		license: "known",
		allowedModes: ["experimental", "permanent"],
	},
	"pi-smart-compact": {
		role: "session-before-compact-compactor",
		license: "known",
		allowedModes: ["experimental", "permanent"],
		sessionDefaults: createSessionCompactorDefaults("pi-smart-compact", "balanced", 72),
	},
	"pi-better-compact": {
		role: "session-before-compact-compactor",
		license: "known",
		allowedModes: ["experimental"],
		requiresProviderPricing: true,
		sessionDefaults: createSessionCompactorDefaults("pi-better-compact", "cost-benefit", 70),
	},
	"pi-ultra-compact": {
		role: "session-before-compact-compactor",
		license: "known",
		allowedModes: ["experimental"],
		sessionDefaults: createSessionCompactorDefaults("pi-ultra-compact", "canary", 90),
	},
	"pi-omni-compact": {
		role: "session-before-compact-compactor",
		license: "known",
		allowedModes: ["experimental"],
		sessionDefaults: createSessionCompactorDefaults("pi-omni-compact", "precision", 82),
	},
	"pi-context-tools": {
		role: "orchestration-tool",
		license: "known",
		allowedModes: ["experimental", "permanent"],
	},
	"pi-continue": {
		role: "continuation-helper",
		license: "known",
		allowedModes: ["experimental", "permanent"],
	},
	"@adamjen/pi-compact-fast": {
		role: "blocked",
		license: "known",
		allowedModes: [],
		blockedReason: "source-edited model id configuration is not accepted for OMK runtime ownership",
	},
	"@davehardy20/pi-compact-plus": {
		role: "blocked",
		license: "known",
		allowedModes: [],
		blockedReason: "synthetic user message reinjection violates OMK authority-boundary preservation",
	},
};

const RECOMMENDED_PRUNER_DEFAULTS: PrunerRecommendedDefaults = {
	trigger: "agent-message",
	soft: 0.7,
	hard: 0.82,
	keepRecentTokens: 24_000,
	recoverOriginals: true,
	neverPrune: ["entries"],
};

export function getRecommendedPrunerDefaults(): PrunerRecommendedDefaults {
	return {
		...RECOMMENDED_PRUNER_DEFAULTS,
		neverPrune: [...RECOMMENDED_PRUNER_DEFAULTS.neverPrune],
	};
}

export function getRecommendedSessionCompactorDefaults(): SessionCompactorRecommendedDefaults {
	return cloneSessionCompactorDefaults(createSessionCompactorDefaults("pi-smart-compact", "balanced", 72));
}

export function getRecommendedCompactStack(profile: CompactStackProfile): CompactStackRecommendation {
	if (profile === "cost-experiment") {
		return {
			preCompression: ["LeanCTX", "Headroom"],
			sessionCompactor: "pi-better-compact",
			orchestrationTools: [],
			providerPromptCache: true,
		};
	}

	if (profile === "long-context-precision") {
		return {
			preCompression: ["LeanCTX", "Headroom"],
			sessionCompactor: "pi-omni-compact",
			orchestrationTools: [],
			providerPromptCache: false,
		};
	}

	return {
		preCompression: ["LeanCTX", "Headroom"],
		agentMessagePruner: "pi-context-prune",
		sessionCompactor: "pi-smart-compact",
		orchestrationTools: ["pi-context-tools"],
		providerPromptCache: true,
	};
}

export function registerExternalPrunerOwner(
	registry: readonly ExternalPrunerRegistration[],
	registration: ExternalPrunerRegistration,
): ExternalPrunerRegistration[] {
	return [...registry, cloneRegistration(registration)];
}

export function validateSingleExternalPrunerOwner(
	registry: readonly ExternalPrunerRegistration[],
	options: ValidateExternalPrunerOptions,
): ValidatedExternalPrunerOwner | undefined {
	const enabledPruners = registry.filter((registration) => registration.enabled);
	if (enabledPruners.length === 0) {
		return undefined;
	}

	if (enabledPruners.length > 1) {
		throw new Error(
			`Multiple enabled external pruners are not allowed: ${enabledPruners.map((registration) => registration.owner).join(", ")}`,
		);
	}

	const registration = enabledPruners[0];
	const builtInPolicy = BUILT_IN_PRUNER_POLICIES[registration.owner];
	const license = registration.license ?? builtInPolicy?.license ?? "unknown";

	if (options.mode === "permanent" && license === "unknown") {
		throw new Error(`${registration.owner} has unknown license and cannot be enabled in permanent mode`);
	}

	if (builtInPolicy && !builtInPolicy.allowedModes.includes(options.mode)) {
		const reason = builtInPolicy.experimentalOnly ? "experimental-only" : `not enabled for ${options.mode}`;
		throw new Error(`${registration.owner} is ${reason} and cannot be enabled in ${options.mode} mode`);
	}

	return {
		owner: registration.owner,
		mode: options.mode,
		defaults: mergeRecommendedDefaults(registration.defaults),
	};
}

export function validateSingleSessionCompactorOwner(
	registry: readonly ExternalSessionCompactorRegistration[],
	options: ValidateExternalPrunerOptions,
): ValidatedSessionCompactorOwner | undefined {
	const enabledCompactors = registry.filter((registration) => {
		if (!registration.enabled) return false;
		const role = classifyContextPackageRole(registration.owner);
		return role === "session-before-compact-compactor" || role === "blocked" || role === "unsupported";
	});

	for (const registration of enabledCompactors) {
		const policy = CONTEXT_PACKAGE_POLICIES[registration.owner];
		if (policy?.role === "blocked") {
			throw new Error(`${registration.owner} is blocked: ${policy.blockedReason ?? "not accepted"}`);
		}
	}

	if (enabledCompactors.length === 0) {
		return undefined;
	}

	if (enabledCompactors.length > 1) {
		throw new Error(
			`Multiple enabled session_before_compact compactors are not allowed: ${enabledCompactors.map((registration) => registration.owner).join(", ")}`,
		);
	}

	return validateSessionCompactorRegistration(enabledCompactors[0], options);
}

export function validateCompactPackageStack(
	registry: readonly ExternalContextPackageRegistration[],
	options: ValidateExternalPrunerOptions,
): ValidatedCompactPackageStack {
	const agentMessagePruners: ExternalPrunerRegistration[] = [];
	const sessionCompactors: ExternalSessionCompactorRegistration[] = [];
	const orchestrationTools: string[] = [];
	const continuationHelpers: string[] = [];

	for (const registration of registry) {
		if (!registration.enabled) continue;
		const role = classifyContextPackageRole(registration.owner);
		if (role === "agent-message-pruner") {
			agentMessagePruners.push(registration);
		} else if (role === "session-before-compact-compactor" || role === "blocked" || role === "unsupported") {
			sessionCompactors.push(registration);
		} else if (role === "orchestration-tool") {
			orchestrationTools.push(registration.owner);
		} else if (role === "continuation-helper") {
			continuationHelpers.push(registration.owner);
		}
	}

	return {
		agentMessagePruner: validateSingleExternalPrunerOwner(agentMessagePruners, options),
		sessionCompactor: validateSingleSessionCompactorOwner(sessionCompactors, options),
		orchestrationTools,
		continuationHelpers,
	};
}

export function classifyContextPackageRole(owner: string): ExternalContextPackageRole {
	return CONTEXT_PACKAGE_POLICIES[owner]?.role ?? "unsupported";
}

function validateSessionCompactorRegistration(
	registration: ExternalSessionCompactorRegistration,
	options: ValidateExternalPrunerOptions,
): ValidatedSessionCompactorOwner {
	const policy = CONTEXT_PACKAGE_POLICIES[registration.owner];
	const license = registration.license ?? policy?.license ?? "unknown";

	if (options.mode === "permanent" && license === "unknown") {
		throw new Error(`${registration.owner} has unknown license and cannot be enabled in permanent mode`);
	}

	if (policy && !policy.allowedModes.includes(options.mode)) {
		throw new Error(`${registration.owner} is not enabled for ${options.mode} mode`);
	}

	if (policy?.requiresProviderPricing === true && registration.providerPricingInjected !== true) {
		throw new Error(`${registration.owner} requires provider pricing before it can own session_before_compact`);
	}

	return {
		owner: registration.owner,
		mode: options.mode,
		defaults: mergeSessionCompactorDefaults(
			policy?.sessionDefaults ?? createSessionCompactorDefaults(registration.owner, "custom", 72),
			registration.sessionDefaults,
		),
	};
}

function createSessionCompactorDefaults(
	owner: string,
	profile: string,
	minContextPercent: number,
): SessionCompactorRecommendedDefaults {
	return {
		trigger: "session_before_compact",
		owner,
		profile,
		autoTrigger: true,
		minContextPercent,
		backupEnabled: true,
		pinPaths: [...PINNED_SESSION_COMPACTOR_PATHS],
		preserveToolPairs: true,
		phases: [...SESSION_COMPACTOR_PHASES],
	};
}

function mergeRecommendedDefaults(
	overrides: Partial<PrunerRecommendedDefaults> | undefined,
): PrunerRecommendedDefaults {
	const defaults = getRecommendedPrunerDefaults();
	if (!overrides) {
		return defaults;
	}

	return {
		...defaults,
		...overrides,
		neverPrune: overrides.neverPrune ? [...overrides.neverPrune] : defaults.neverPrune,
	};
}

function mergeSessionCompactorDefaults(
	defaults: SessionCompactorRecommendedDefaults,
	overrides: Partial<SessionCompactorRecommendedDefaults> | undefined,
): SessionCompactorRecommendedDefaults {
	if (!overrides) return cloneSessionCompactorDefaults(defaults);
	return {
		...defaults,
		...overrides,
		pinPaths: overrides.pinPaths ? [...overrides.pinPaths] : [...defaults.pinPaths],
		phases: overrides.phases ? [...overrides.phases] : [...defaults.phases],
	};
}

function cloneSessionCompactorDefaults(
	defaults: SessionCompactorRecommendedDefaults,
): SessionCompactorRecommendedDefaults {
	return {
		...defaults,
		pinPaths: [...defaults.pinPaths],
		phases: [...defaults.phases],
	};
}

function cloneRegistration(registration: ExternalPrunerRegistration): ExternalPrunerRegistration {
	return {
		...registration,
		defaults: registration.defaults
			? {
					...registration.defaults,
					neverPrune: registration.defaults.neverPrune ? [...registration.defaults.neverPrune] : undefined,
				}
			: undefined,
	};
}
