export type BuiltinMcpPresetName = "korean-law";
export type BuiltinMcpEnvMode = "shell" | "empty";

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
	license: "MIT";
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
	startupTimeoutSec: number;
	autoApproveCount: number;
	installHint: string;
	notes: string[];
}

const LAW_OC_ENV_PLACEHOLDER = "$" + "{LAW_OC}";

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

const BUILTIN_MCP_PRESETS: ReadonlyArray<BuiltinMcpPreset> = [KOREAN_LAW_PRESET];

function clonePreset(preset: BuiltinMcpPreset): BuiltinMcpPreset {
	return {
		...preset,
		args: [...preset.args],
		envKeys: [...preset.envKeys],
		requiredEnvKeys: [...preset.requiredEnvKeys],
		optionalEnvKeys: [...preset.optionalEnvKeys],
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
	return {
		command: preset.command,
		args: [...preset.args],
		...(envMode === "shell" ? { env: { LAW_OC: LAW_OC_ENV_PLACEHOLDER } } : {}),
		startup_timeout_sec: preset.startupTimeoutSec,
		...(preset.autoApprove.length > 0 ? { autoApprove: [...preset.autoApprove] } : {}),
	};
}

export function summarizeBuiltinMcpPreset(preset: BuiltinMcpPreset): BuiltinMcpPresetSummary {
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
		startupTimeoutSec: preset.startupTimeoutSec,
		autoApproveCount: preset.autoApprove.length,
		installHint: preset.installHint,
		notes: [...preset.notes],
	};
}
