/**
 * Package-manager-facing trial runtime adapter.
 *
 * Narrow, pure adapter around `package-trial-sandbox.ts`. It takes a trial install
 * request, validates it through the existing `planPackageTrialInstall` gate, and
 * shapes the result into the three artifacts a package-manager executor needs:
 *
 *   - executor instructions: the exact (possibly OS-sandbox-wrapped) argv/cwd/env
 *     to spawn, so the runtime never re-derives the command;
 *   - cleanup plan: the ephemeral install root to remove after the trial;
 *   - audit record: deterministic, secret-free metadata describing the trial.
 *
 * This module performs no I/O: it does not install, spawn, clone, read, write, or
 * mutate any filesystem/network state. It only transforms validated inputs into a
 * declarative plan consumed by the package-manager executor.
 */

import {
	type PackageTrialInstallInput,
	planPackageTrialInstall,
	type TrialInstallKind,
	type TrialPackageManagerName,
} from "./package-trial-sandbox.ts";
import type { NetworkMode, SandboxMode } from "./sandbox/policy.ts";

/** Exact spawn instruction for the package-manager executor. */
export interface TrialExecutorInstruction {
	/** argv[0] to spawn: the OS-sandbox wrapper when wrapped, otherwise the tool. */
	readonly command: string;
	/** Remaining argv to pass to the command. */
	readonly args: readonly string[];
	/** Working directory for the spawn. */
	readonly cwd: string;
	/** Filtered environment for the spawn (carries spawn-time values, never audited). */
	readonly env: Readonly<Record<string, string>>;
	/** True when the argv is wrapped by an OS sandbox backend. */
	readonly wrapped: boolean;
	/** Lifecycle scripts are always ignored for trial installs. */
	readonly lifecycleScripts: "ignored";
}

/** Declarative cleanup metadata for the ephemeral trial install. */
export interface TrialCleanupPlan {
	/** The trial install root that should be torn down. */
	readonly installRoot: string;
	/** Paths to remove after the trial completes (currently the install root). */
	readonly removePaths: readonly string[];
	readonly recursive: true;
	readonly force: true;
	readonly reason: "ephemeral-trial";
}

/** Deterministic, secret-free audit record for the trial. */
export interface TrialAuditRecord {
	readonly kind: TrialInstallKind;
	readonly packageManagerName: TrialPackageManagerName;
	readonly source: string;
	readonly installRoot: string;
	/** Logical tool command (npm/pnpm/bun/git), not the sandbox wrapper. */
	readonly command: string;
	/** Logical (unwrapped) args for the tool command. */
	readonly args: readonly string[];
	readonly lifecycleScripts: "ignored";
	readonly sandboxMode: SandboxMode;
	readonly sandboxWrapped: boolean;
	readonly sandboxRule: string;
	readonly networkMode: NetworkMode;
}

export type TrialRuntimePlan =
	| { readonly ok: false; readonly reason: string }
	| {
			readonly ok: true;
			readonly executor: TrialExecutorInstruction;
			readonly cleanup: TrialCleanupPlan;
			readonly audit: TrialAuditRecord;
	  };

const SOURCE_CREDENTIAL_PATTERN = /(https?:\/\/)([^\s/@]+@)/gi;
const SOURCE_TOKEN_QUERY_PATTERN = /([?&](?:access_token|auth|key|password|token)=)[^&#]+/gi;

function redactTrialSource(source: string): string {
	return source
		.replace(SOURCE_CREDENTIAL_PATTERN, "$1<redacted>@")
		.replace(SOURCE_TOKEN_QUERY_PATTERN, "$1<redacted>");
}

function redactTrialArgs(args: readonly string[]): string[] {
	return args.map((arg) => redactTrialSource(arg));
}

/**
 * Validate a trial install request and shape it into executor/cleanup/audit
 * artifacts. Pure and deterministic: identical inputs always produce identical
 * output, and no side effects are performed.
 */
export function createTrialRuntimePlan(input: PackageTrialInstallInput): TrialRuntimePlan {
	const plan = planPackageTrialInstall(input);
	if (!plan.ok) {
		return { ok: false, reason: plan.reason };
	}

	const sandbox = plan.sandbox;
	if (!sandbox.allowed) {
		// Defensive: planPackageTrialInstall only returns ok when the sandbox is allowed.
		return { ok: false, reason: `[${sandbox.rule}] ${sandbox.reason}` };
	}

	const executor: TrialExecutorInstruction = {
		command: sandbox.argv[0],
		args: sandbox.argv.slice(1),
		cwd: sandbox.cwd,
		env: sandbox.env,
		wrapped: sandbox.wrapped,
		lifecycleScripts: plan.lifecycleScripts,
	};

	const cleanup: TrialCleanupPlan = {
		installRoot: input.installRoot,
		removePaths: [input.installRoot],
		recursive: true,
		force: true,
		reason: "ephemeral-trial",
	};

	const audit: TrialAuditRecord = {
		kind: plan.kind,
		packageManagerName: input.packageManagerName,
		source: redactTrialSource(input.source),
		installRoot: input.installRoot,
		command: plan.command,
		args: redactTrialArgs(plan.args),
		lifecycleScripts: plan.lifecycleScripts,
		sandboxMode: input.policy.mode,
		sandboxWrapped: sandbox.wrapped,
		sandboxRule: sandbox.rule,
		networkMode: input.policy.network.mode,
	};

	return { ok: true, executor, cleanup, audit };
}
