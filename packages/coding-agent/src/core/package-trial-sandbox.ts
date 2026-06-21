import { validateExactNpmVersion, validateGitRef, validateNpmPackageName } from "./package-procurement.ts";
import { resolveSandboxPath } from "./sandbox/path-resolver.ts";
import {
	decidePathAccess,
	type SandboxBackendStatus,
	type SandboxPathResolver,
	type SandboxPolicy,
} from "./sandbox/policy.ts";
import { buildSandboxedSpawnRequest, type SandboxedSpawnRequest } from "./sandbox/spawn.ts";

export type TrialPackageManagerName = "npm" | "pnpm" | "bun";
export type TrialInstallKind = "npm" | "git";

export interface PackageTrialInstallInput {
	readonly source: string;
	readonly installRoot: string;
	readonly packageManagerName: TrialPackageManagerName;
	readonly packageManagerCommand?: readonly [string, ...string[]];
	readonly policy: SandboxPolicy;
	readonly backend: SandboxBackendStatus;
	readonly resolver?: SandboxPathResolver;
	readonly env?: NodeJS.ProcessEnv;
}

export type PackageTrialInstallPlan =
	| { readonly ok: false; readonly reason: string }
	| {
			readonly ok: true;
			readonly kind: TrialInstallKind;
			readonly command: string;
			readonly args: readonly string[];
			readonly lifecycleScripts: "ignored";
			readonly sandbox: SandboxedSpawnRequest;
	  };

interface ParsedNpmTrialSource {
	readonly kind: "npm";
	readonly spec: string;
	readonly name: string;
	readonly version: string;
}

interface ParsedGitTrialSource {
	readonly kind: "git";
	readonly repo: string;
	readonly ref: string;
	readonly commit: string;
}

type ParsedTrialSource = ParsedNpmTrialSource | ParsedGitTrialSource;

function parseNpmTrialSource(source: string): ParsedNpmTrialSource | string {
	const spec = source.slice("npm:".length).trim();
	const versionSeparator = spec.lastIndexOf("@");
	if (versionSeparator <= 0) return "npm trial source requires an exact version";
	const name = spec.slice(0, versionSeparator);
	const version = spec.slice(versionSeparator + 1);
	const nameVerdict = validateNpmPackageName(name);
	if (!nameVerdict.ok) return nameVerdict.message;
	const versionVerdict = validateExactNpmVersion(version);
	if (!versionVerdict.ok) return versionVerdict.message;
	return { kind: "npm", spec, name: nameVerdict.name, version: versionVerdict.version };
}

function parseGitTrialSource(source: string): ParsedGitTrialSource | string {
	const value = source.slice("git:".length).trim();
	const hashIndex = value.lastIndexOf("#");
	if (hashIndex <= 0 || hashIndex === value.length - 1) {
		return "git trial source requires a full commit ref after #";
	}
	const repo = value.slice(0, hashIndex);
	const ref = value.slice(hashIndex + 1);
	const refVerdict = validateGitRef(ref);
	if (!refVerdict.ok) return refVerdict.message;
	return { kind: "git", repo, ref: refVerdict.ref, commit: refVerdict.commit };
}

function parseTrialSource(source: string): ParsedTrialSource | string {
	if (source.startsWith("npm:")) return parseNpmTrialSource(source);
	if (source.startsWith("git:")) return parseGitTrialSource(source);
	return "trial source must start with npm: or git:";
}

function npmTrialArgs(manager: TrialPackageManagerName, spec: string, installRoot: string): string[] {
	if (manager === "bun") {
		return ["install", spec, "--cwd", installRoot, "--omit=peer", "--ignore-scripts"];
	}
	if (manager === "pnpm") {
		return [
			"install",
			spec,
			"--prefix",
			installRoot,
			"--config.auto-install-peers=false",
			"--config.strict-peer-dependencies=false",
			"--config.strict-dep-builds=false",
			"--ignore-scripts",
		];
	}
	return ["install", spec, "--prefix", installRoot, "--legacy-peer-deps", "--ignore-scripts"];
}

function buildCommand(
	parsed: ParsedNpmTrialSource,
	manager: TrialPackageManagerName,
	installRoot: string,
): {
	command: string;
	args: string[];
} {
	return { command: manager, args: npmTrialArgs(manager, parsed.spec, installRoot) };
}

function resolveForTrialPolicy(input: PackageTrialInstallInput): SandboxPathResolver {
	return input.resolver ?? ((requestPath) => resolveSandboxPath(input.policy.filesystem.root, requestPath));
}

export function planPackageTrialInstall(input: PackageTrialInstallInput): PackageTrialInstallPlan {
	const parsed = parseTrialSource(input.source);
	if (typeof parsed === "string") {
		return { ok: false, reason: parsed };
	}

	if (parsed.kind === "git") {
		return {
			ok: false,
			reason: "temporary git trial installs require a shell-free multi-step executor before clone/checkout can run",
		};
	}

	const resolver = resolveForTrialPolicy(input);
	const writeDecision = decidePathAccess(input.policy, { kind: "write", path: input.installRoot }, resolver);
	if (!writeDecision.allowed) {
		return { ok: false, reason: `[${writeDecision.rule}] ${writeDecision.reason}` };
	}

	const { command, args } = buildCommand(parsed, input.packageManagerName, input.installRoot);
	const packageManagerArgv = input.packageManagerCommand ?? [command];
	const sandbox = buildSandboxedSpawnRequest({
		argv: [...packageManagerArgv, ...args],
		cwd: input.installRoot,
		env: input.env ?? {},
		policy: input.policy,
		backend: input.backend,
		resolver,
	});
	if (!sandbox.allowed) {
		return { ok: false, reason: `[${sandbox.rule}] ${sandbox.reason}` };
	}

	return {
		ok: true,
		kind: parsed.kind,
		command,
		args,
		lifecycleScripts: "ignored",
		sandbox,
	};
}
