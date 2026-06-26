export type BuiltinMcpPresetName = "aside-ubuntu-compat" | "chrome-devtools" | "context7" | "korean-law" | "playwright";
export type BuiltinMcpEnvMode = "shell" | "empty";
export type BuiltinMcpPresetLicense = "Apache-2.0" | "MIT";
export type McpKnownCapability = "tools" | "resources" | "prompts" | "sampling";
export type McpAuthMode = "none" | "env" | "oauth" | "external";
export type McpSamplingMode = "disabled" | "client-gated";

export interface McpCapabilityDecision {
	trustedCapabilities: McpKnownCapability[];
	unknownCapabilities: string[];
	malformed: boolean;
	rule: string;
	reason: string;
}

export interface McpSamplingDecision {
	allowed: boolean;
	mode: McpSamplingMode;
	humanApprovalRequired: boolean;
	rule: string;
	reason: string;
}

export interface McpAuthDecision {
	mode: McpAuthMode;
	envKeys: string[];
	rule: string;
	reason: string;
}

export interface McpSamplingPolicyInput {
	mode: McpSamplingMode;
	humanApprovalRequired: boolean;
}

export interface McpAuthPolicyInput {
	mode: McpAuthMode;
	envKeys?: readonly string[];
}

export interface BuiltinMcpServerConfig {
	command: string;
	args: string[];
	env?: Record<string, string>;
	startup_timeout_sec?: number;
	autoApprove?: string[];
}

export interface BuiltinMcpPreset {
	name: BuiltinMcpPresetName;
	label: string;
	description: string;
	homepage: string;
	repository: string;
	license: BuiltinMcpPresetLicense;
	npmPackage: string;
	npmVersion: string;
	exactPackageSpec: string;
	gitTag: string;
	gitCommit: string;
	command: string;
	args: readonly string[];
	envKeys: readonly string[];
	requiredEnvKeys: readonly string[];
	optionalEnvKeys: readonly string[];
	capabilities: readonly McpKnownCapability[];
	samplingPolicy: McpSamplingPolicyInput;
	authPolicy: McpAuthPolicyInput;
	startupTimeoutSec: number;
	autoApprove: readonly string[];
	installHint: string;
	notes: readonly string[];
}

export interface BuiltinMcpPresetSummary {
	name: BuiltinMcpPresetName;
	label: string;
	description: string;
	homepage: string;
	repository: string;
	license: string;
	exactPackageSpec: string;
	gitTag: string;
	gitCommit: string;
	commandSummary: string;
	envKeys: string[];
	requiredEnvKeys: string[];
	optionalEnvKeys: string[];
	capabilityDecision: McpCapabilityDecision;
	samplingDecision: McpSamplingDecision;
	authDecision: McpAuthDecision;
	startupTimeoutSec: number;
	autoApproveCount: number;
	installHint: string;
	notes: string[];
}

const LAW_OC_ENV_PLACEHOLDER = "$" + "{LAW_OC}";
const KNOWN_MCP_CAPABILITIES: readonly McpKnownCapability[] = ["tools", "resources", "prompts", "sampling"];

function uniqueSortedStrings(values: readonly string[]): string[] {
	return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))].sort();
}

function orderedKnownCapabilities(values: readonly string[]): McpKnownCapability[] {
	const declared = new Set(values);
	return KNOWN_MCP_CAPABILITIES.filter((capability) => declared.has(capability));
}

function isKnownCapability(value: string): value is McpKnownCapability {
	return KNOWN_MCP_CAPABILITIES.includes(value as McpKnownCapability);
}

function isMcpAuthMode(value: unknown): value is McpAuthMode {
	return value === "none" || value === "env" || value === "oauth" || value === "external";
}

function isMcpSamplingMode(value: unknown): value is McpSamplingMode {
	return value === "disabled" || value === "client-gated";
}

export function decideMcpCapabilities(rawCapabilities: unknown): McpCapabilityDecision {
	if (!rawCapabilities) {
		return {
			trustedCapabilities: [],
			unknownCapabilities: [],
			malformed: false,
			rule: "mcp.capabilities.unspecified",
			reason: "MCP capabilities were not declared.",
		};
	}

	let declared: string[] = [];
	let malformed = false;

	if (Array.isArray(rawCapabilities)) {
		for (const capability of rawCapabilities) {
			if (typeof capability === "string") {
				declared.push(capability.trim());
			} else {
				malformed = true;
			}
		}
	} else if (typeof rawCapabilities === "object") {
		for (const [capability, enabled] of Object.entries(rawCapabilities as Record<string, unknown>)) {
			if (typeof enabled !== "boolean") {
				malformed = true;
			}
			if (enabled === true) {
				declared.push(capability.trim());
			}
		}
	} else {
		malformed = true;
	}

	declared = uniqueSortedStrings(declared);
	const trustedCapabilities = orderedKnownCapabilities(declared.filter(isKnownCapability));
	const unknownCapabilities = declared.filter((capability) => !isKnownCapability(capability));
	const hasUntrustedInput = malformed || unknownCapabilities.length > 0;
	return {
		trustedCapabilities,
		unknownCapabilities,
		malformed,
		rule: hasUntrustedInput ? "mcp.capabilities.untrusted_input" : "mcp.capabilities.declared",
		reason: hasUntrustedInput
			? "Only known MCP capabilities are trusted; unknown or malformed entries are reported but ignored."
			: "MCP capabilities were declared with known capability names.",
	};
}

export function decideMcpSampling(capabilityDecision: McpCapabilityDecision, rawPolicy: unknown): McpSamplingDecision {
	if (!capabilityDecision.trustedCapabilities.includes("sampling")) {
		return {
			allowed: false,
			mode: "disabled",
			humanApprovalRequired: false,
			rule: "mcp.sampling.capability_missing",
			reason: "MCP sampling is denied because the trusted sampling capability is not declared.",
		};
	}

	if (!rawPolicy || typeof rawPolicy !== "object" || Array.isArray(rawPolicy)) {
		return {
			allowed: false,
			mode: "disabled",
			humanApprovalRequired: false,
			rule: "mcp.sampling.policy_missing",
			reason: "MCP sampling is denied until an explicit client-gated policy with human approval is present.",
		};
	}

	const policy = rawPolicy as Record<string, unknown>;
	const mode = policy.mode;
	const humanApprovalRequired = policy.humanApprovalRequired;
	if (isMcpSamplingMode(mode) && mode === "client-gated" && humanApprovalRequired === true) {
		return {
			allowed: true,
			mode,
			humanApprovalRequired: true,
			rule: "mcp.sampling.client_gated_human_approval",
			reason: "MCP sampling is client-gated and requires human approval.",
		};
	}

	return {
		allowed: false,
		mode: isMcpSamplingMode(mode) ? mode : "disabled",
		humanApprovalRequired: humanApprovalRequired === true,
		rule: "mcp.sampling.policy_invalid",
		reason: "MCP sampling is denied because policy is not client-gated with humanApprovalRequired true.",
	};
}

export function decideMcpAuth(rawAuth: unknown, declaredEnvKeys: readonly string[]): McpAuthDecision {
	const fallbackEnvKeys = uniqueSortedStrings(declaredEnvKeys);
	if (!rawAuth) {
		if (fallbackEnvKeys.length > 0) {
			return {
				mode: "env",
				envKeys: fallbackEnvKeys,
				rule: "mcp.auth.env_inferred",
				reason: "MCP auth uses declared environment variable names; values are not exposed.",
			};
		}
		return {
			mode: "none",
			envKeys: [],
			rule: "mcp.auth.none",
			reason: "MCP auth is not declared and no environment keys are configured.",
		};
	}

	const authMode = typeof rawAuth === "string" ? rawAuth : (rawAuth as Record<string, unknown>).mode;
	if (!isMcpAuthMode(authMode)) {
		return {
			mode: "external",
			envKeys: [],
			rule: "mcp.auth.invalid",
			reason: "MCP auth policy is invalid; treat credentials as externally managed.",
		};
	}

	if (authMode === "env") {
		const rawEnvKeys =
			typeof rawAuth === "object" && !Array.isArray(rawAuth) ? (rawAuth as Record<string, unknown>).envKeys : [];
		const envKeys = Array.isArray(rawEnvKeys)
			? uniqueSortedStrings(rawEnvKeys.filter((entry): entry is string => typeof entry === "string"))
			: [];
		const sanitizedEnvKeys = envKeys.length > 0 ? envKeys : fallbackEnvKeys;
		return {
			mode: "env",
			envKeys: sanitizedEnvKeys,
			rule: "mcp.auth.env",
			reason: "MCP auth uses environment variable names; values are not exposed.",
		};
	}

	return {
		mode: authMode,
		envKeys: [],
		rule: `mcp.auth.${authMode}`,
		reason:
			authMode === "none"
				? "MCP auth is explicitly disabled."
				: `MCP auth is handled by ${authMode}; secret values are not exposed.`,
	};
}

const ASIDE_UBUNTU_COMPAT_PRESET: BuiltinMcpPreset = {
	name: "aside-ubuntu-compat",
	label: "Aside Ubuntu Compat MCP",
	description:
		"Ubuntu/zsh browser automation compatibility facade for workflows that expect an Aside-like MCP entrypoint. It uses Playwright MCP and does not provide native macOS Aside APIs on Linux.",
	homepage: "https://playwright.dev",
	repository: "https://github.com/microsoft/playwright-mcp.git",
	license: "Apache-2.0",
	npmPackage: "@playwright/mcp",
	npmVersion: "0.0.76",
	exactPackageSpec: "@playwright/mcp@0.0.76",
	gitTag: "v0.0.76",
	gitCommit: "b301c372ec741289eff1cf6aab9d3bec553f31e2",
	command: "zsh",
	args: ["-lc", "exec npx -y @playwright/mcp@0.0.76"],
	envKeys: ["DISPLAY", "WAYLAND_DISPLAY", "XDG_RUNTIME_DIR"],
	requiredEnvKeys: [],
	optionalEnvKeys: ["DISPLAY", "WAYLAND_DISPLAY", "XDG_RUNTIME_DIR"],
	capabilities: ["tools"],
	samplingPolicy: { mode: "disabled", humanApprovalRequired: false },
	authPolicy: { mode: "none" },
	startupTimeoutSec: 45,
	autoApprove: [],
	installHint:
		'Add an MCP server named aside-ubuntu-compat using command zsh and args -lc "exec npx -y @playwright/mcp@0.0.76".',
	notes: [
		"Exact npm pin; never uses @latest.",
		"Apache-2.0 licensed upstream at tag v0.0.76, commit b301c372ec741289eff1cf6aab9d3bec553f31e2.",
		"Compatibility facade only: it does not expose native macOS Aside APIs or a native Aside browser profile on Linux.",
		"Requires zsh, node/npm/npx, and a browser-capable Ubuntu environment.",
	],
};

const CHROME_DEVTOOLS_PRESET: BuiltinMcpPreset = {
	name: "chrome-devtools",
	label: "Chrome DevTools MCP",
	description:
		"Chrome DevTools 기반 브라우저 자동화 MCP 서버. UI reconnaissance, computed style extraction, performance traces, screenshots에 사용합니다.",
	homepage: "https://github.com/ChromeDevTools/chrome-devtools-mcp#readme",
	repository: "https://github.com/ChromeDevTools/chrome-devtools-mcp.git",
	license: "Apache-2.0",
	npmPackage: "chrome-devtools-mcp",
	npmVersion: "1.4.0",
	exactPackageSpec: "chrome-devtools-mcp@1.4.0",
	gitTag: "chrome-devtools-mcp-v1.4.0",
	gitCommit: "0aaa8e3cc0e9ae55b1ef5b456d6d25526015b886",
	command: "npx",
	args: ["-y", "chrome-devtools-mcp@1.4.0"],
	envKeys: [],
	requiredEnvKeys: [],
	optionalEnvKeys: [],
	capabilities: ["tools"],
	samplingPolicy: { mode: "disabled", humanApprovalRequired: false },
	authPolicy: { mode: "none" },
	startupTimeoutSec: 45,
	autoApprove: [],
	installHint: "Add an MCP server named chrome-devtools using command npx and args -y chrome-devtools-mcp@1.4.0.",
	notes: [
		"Exact npm pin; never uses @latest.",
		"Apache-2.0 licensed upstream at tag chrome-devtools-mcp-v1.4.0, commit 0aaa8e3cc0e9ae55b1ef5b456d6d25526015b886.",
		"Use for browser reconnaissance, screenshots, performance traces, and computed-style capture.",
	],
};

const CONTEXT7_PRESET: BuiltinMcpPreset = {
	name: "context7",
	label: "Context7 MCP",
	description:
		"Library/framework documentation MCP server. Use it to fetch current docs for React, Next.js, Tailwind, shadcn/ui, Playwright, and @rhwp/core APIs.",
	homepage: "https://github.com/upstash/context7#readme",
	repository: "https://github.com/upstash/context7.git",
	license: "MIT",
	npmPackage: "@upstash/context7-mcp",
	npmVersion: "3.2.2",
	exactPackageSpec: "@upstash/context7-mcp@3.2.2",
	gitTag: "@upstash/context7-mcp@3.2.2",
	gitCommit: "18e6d4727bbcfb4001a8a17337b0f0f717f1b4fd",
	command: "npx",
	args: ["-y", "@upstash/context7-mcp@3.2.2"],
	envKeys: [],
	requiredEnvKeys: [],
	optionalEnvKeys: [],
	capabilities: ["tools"],
	samplingPolicy: { mode: "disabled", humanApprovalRequired: false },
	authPolicy: { mode: "none" },
	startupTimeoutSec: 30,
	autoApprove: [],
	installHint: "Add an MCP server named context7 using command npx and args -y @upstash/context7-mcp@3.2.2.",
	notes: [
		"Exact npm pin; never uses @latest.",
		"MIT licensed upstream at tag @upstash/context7-mcp@3.2.2, commit 18e6d4727bbcfb4001a8a17337b0f0f717f1b4fd.",
		"Use for current framework and package documentation before coding against external APIs.",
	],
};

const KOREAN_LAW_PRESET: BuiltinMcpPreset = {
	name: "korean-law",
	label: "Korean Law MCP",
	description:
		"법제처 Open API 기반 한국 법령·판례·조례·조약 MCP 서버. Requires a LAW_OC or KOREAN_LAW_API_KEY value at runtime.",
	homepage: "https://github.com/chrisryugj/korean-law-mcp",
	repository: "https://github.com/chrisryugj/korean-law-mcp.git",
	license: "MIT",
	npmPackage: "korean-law-mcp",
	npmVersion: "4.4.0",
	exactPackageSpec: "korean-law-mcp@4.4.0",
	gitTag: "v4.4.0",
	gitCommit: "2ef8f1827d349381fc2bde15120c803fd2e7bfed",
	command: "npx",
	args: ["-y", "korean-law-mcp@4.4.0"],
	envKeys: ["LAW_OC", "KOREAN_LAW_API_KEY"],
	requiredEnvKeys: ["LAW_OC"],
	optionalEnvKeys: ["KOREAN_LAW_API_KEY"],
	capabilities: ["tools"],
	samplingPolicy: { mode: "disabled", humanApprovalRequired: false },
	authPolicy: { mode: "env", envKeys: ["LAW_OC", "KOREAN_LAW_API_KEY"] },
	startupTimeoutSec: 30,
	autoApprove: [],
	installHint:
		"Add an MCP server named korean-law using command npx and args -y korean-law-mcp@4.4.0; set LAW_OC from your shell or secret manager.",
	notes: [
		"Exact npm pin; never uses @latest.",
		"MIT licensed upstream at tag v4.4.0, commit 2ef8f1827d349381fc2bde15120c803fd2e7bfed.",
		"Env values are intentionally not embedded in the preset.",
	],
};

const PLAYWRIGHT_PRESET: BuiltinMcpPreset = {
	name: "playwright",
	label: "Playwright MCP",
	description:
		"Playwright 기반 browser automation MCP 서버. Visual QA, responsive screenshots, interaction sweeps, visual diff evidence에 사용합니다.",
	homepage: "https://playwright.dev",
	repository: "https://github.com/microsoft/playwright-mcp.git",
	license: "Apache-2.0",
	npmPackage: "@playwright/mcp",
	npmVersion: "0.0.76",
	exactPackageSpec: "@playwright/mcp@0.0.76",
	gitTag: "v0.0.76",
	gitCommit: "b301c372ec741289eff1cf6aab9d3bec553f31e2",
	command: "npx",
	args: ["-y", "@playwright/mcp@0.0.76"],
	envKeys: [],
	requiredEnvKeys: [],
	optionalEnvKeys: [],
	capabilities: ["tools"],
	samplingPolicy: { mode: "disabled", humanApprovalRequired: false },
	authPolicy: { mode: "none" },
	startupTimeoutSec: 45,
	autoApprove: [],
	installHint: "Add an MCP server named playwright using command npx and args -y @playwright/mcp@0.0.76.",
	notes: [
		"Exact npm pin; never uses @latest.",
		"Apache-2.0 licensed upstream at tag v0.0.76, commit b301c372ec741289eff1cf6aab9d3bec553f31e2.",
		"Use for deterministic screenshots, viewport sweeps, interactions, and visual QA artifacts.",
	],
};

const BUILTIN_MCP_PRESETS: ReadonlyArray<BuiltinMcpPreset> = [
	ASIDE_UBUNTU_COMPAT_PRESET,
	CHROME_DEVTOOLS_PRESET,
	CONTEXT7_PRESET,
	KOREAN_LAW_PRESET,
	PLAYWRIGHT_PRESET,
];

function buildShellEnvForPreset(preset: BuiltinMcpPreset): Record<string, string> {
	if (preset.name === "korean-law") return { LAW_OC: LAW_OC_ENV_PLACEHOLDER };
	return {};
}

function clonePreset(preset: BuiltinMcpPreset): BuiltinMcpPreset {
	return {
		...preset,
		args: [...preset.args],
		envKeys: [...preset.envKeys],
		requiredEnvKeys: [...preset.requiredEnvKeys],
		optionalEnvKeys: [...preset.optionalEnvKeys],
		capabilities: [...preset.capabilities],
		samplingPolicy: { ...preset.samplingPolicy },
		authPolicy: {
			...preset.authPolicy,
			...(preset.authPolicy.envKeys ? { envKeys: [...preset.authPolicy.envKeys] } : {}),
		},
		autoApprove: [...preset.autoApprove],
		notes: [...preset.notes],
	};
}

export function listBuiltinMcpPresets(): BuiltinMcpPreset[] {
	return BUILTIN_MCP_PRESETS.map(clonePreset);
}

export function getBuiltinMcpPreset(name: string): BuiltinMcpPreset | undefined {
	const preset = BUILTIN_MCP_PRESETS.find((entry) => entry.name === name);
	return preset ? clonePreset(preset) : undefined;
}

export function buildBuiltinMcpServerConfig(
	name: string,
	options: { envMode?: BuiltinMcpEnvMode } = {},
): BuiltinMcpServerConfig | undefined {
	const preset = getBuiltinMcpPreset(name);
	if (!preset) return undefined;
	const envMode = options.envMode ?? "shell";
	const shellEnv = envMode === "shell" ? buildShellEnvForPreset(preset) : {};
	return {
		command: preset.command,
		args: [...preset.args],
		...(Object.keys(shellEnv).length > 0 ? { env: shellEnv } : {}),
		startup_timeout_sec: preset.startupTimeoutSec,
		...(preset.autoApprove.length > 0 ? { autoApprove: [...preset.autoApprove] } : {}),
	};
}

export function summarizeBuiltinMcpPreset(preset: BuiltinMcpPreset): BuiltinMcpPresetSummary {
	const capabilityDecision = decideMcpCapabilities(preset.capabilities);
	return {
		name: preset.name,
		label: preset.label,
		description: preset.description,
		homepage: preset.homepage,
		repository: preset.repository,
		license: preset.license,
		exactPackageSpec: preset.exactPackageSpec,
		gitTag: preset.gitTag,
		gitCommit: preset.gitCommit,
		commandSummary: `${preset.command} ${preset.args.join(" ")}`,
		envKeys: [...preset.envKeys],
		requiredEnvKeys: [...preset.requiredEnvKeys],
		optionalEnvKeys: [...preset.optionalEnvKeys],
		capabilityDecision,
		samplingDecision: decideMcpSampling(capabilityDecision, preset.samplingPolicy),
		authDecision: decideMcpAuth(preset.authPolicy, preset.envKeys),
		startupTimeoutSec: preset.startupTimeoutSec,
		autoApproveCount: preset.autoApprove.length,
		installHint: preset.installHint,
		notes: [...preset.notes],
	};
}
