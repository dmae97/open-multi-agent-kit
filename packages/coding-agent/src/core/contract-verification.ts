/**
 * `cli.contract.verify` — durable, tamper-evident verification of a CLI contract.
 *
 * Builds on the harness-control hash-chained ledger to record a contract
 * verification as two correlated events (started -> completed/blocked), each
 * carrying the SHA-256 of the contract's manifest and test files. After
 * recording, the whole ledger is re-verified; a contract is only `passed` when
 * both the gate succeeds AND the hash-chain ledger verifies. This lets a release
 * gate detect after-the-fact tampering of either the contract artifacts or the
 * audit ledger itself.
 *
 * Dependency-free: uses node:crypto only (no fast-check/xterm/etc.).
 */

import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
	type HarnessControlEventOptions,
	type HarnessControlEventWriteResult,
	recordHarnessControlEvent,
	resolveHarnessControlEventLogPath,
	verifyHarnessControlLedger,
} from "./harness-control-events.ts";

export const CONTRACT_VERIFY_EVENT_KIND = "cli.contract.verify";
export const CONTRACT_RESULT_SCHEMA_VERSION = "omk.cli-contract.result.v1";

export interface ContractFileRef {
	readonly id: string;
	readonly path: string;
}

export interface ContractFileHash {
	readonly id: string;
	readonly path: string;
	/** `sha256:<hex>` of the file contents. */
	readonly sha256: string;
}

export type ContractVerificationStatus = "passed" | "blocked";

export interface ContractGateResult {
	readonly ok: boolean;
	readonly details?: string;
}

export interface ContractLedgerSummary {
	readonly path: string;
	readonly verified: boolean;
	readonly errors: readonly string[];
}

export interface ContractResult {
	readonly schemaVersion: typeof CONTRACT_RESULT_SCHEMA_VERSION;
	readonly contractId: string;
	readonly contractVersion: string;
	readonly status: ContractVerificationStatus;
	readonly manifestHash: string;
	readonly testFileHash: string;
	readonly files: readonly ContractFileHash[];
	readonly gate: ContractGateResult;
	readonly ledger: ContractLedgerSummary;
	readonly startedAt: string;
	readonly completedAt: string;
}

export interface VerifyCliContractOptions {
	readonly contractId: string;
	readonly contractVersion: string;
	readonly manifestPath: string;
	readonly testPath: string;
	readonly extraFiles?: readonly ContractFileRef[];
	/** Runs the actual contract gate (e.g. the vitest contract file). */
	readonly runGate: () => ContractGateResult | Promise<ContractGateResult>;
	readonly cwd?: string;
	readonly logPath?: string;
	readonly runId?: string;
	/** When set, a JSON contract-result is written here (atomically). */
	readonly resultPath?: string;
	readonly now?: () => Date;
}

function hashFile(path: string): string {
	return `sha256:${createHash("sha256").update(readFileSync(path)).digest("hex")}`;
}

function writeJsonAtomic(path: string, value: unknown): void {
	mkdirSync(dirname(path), { recursive: true });
	const tmp = `${path}.tmp-${process.pid}-${randomUUID()}`;
	writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf-8", mode: 0o600 });
	renameSync(tmp, path);
}

function ledgerErrorOf(record: HarnessControlEventWriteResult): string | undefined {
	if (record.ok) return undefined;
	return record.error ? `event not recorded: ${record.error}` : "event not recorded";
}

/**
 * Verify a CLI contract and append a tamper-evident audit trail.
 *
 * Algorithm:
 *  1. SHA-256 the manifest, test, and any extra contract files.
 *  2. Record a `started` ledger event (manifest/test hashes + artifact manifest).
 *  3. Run the contract gate.
 *  4. Record a `completed` (gate ok) or `blocked` (gate failed) ledger event.
 *  5. Re-verify the whole hash-chain ledger.
 *  6. Status is `passed` only when the gate passed AND the ledger verifies;
 *     otherwise `blocked`.
 *  7. Optionally write a canonical contract-result.json.
 */
export async function verifyCliContract(options: VerifyCliContractOptions): Promise<ContractResult> {
	const clock = options.now ?? (() => new Date());
	const cwd = options.cwd ?? process.cwd();
	const operationId = randomUUID();
	const startedAt = clock().toISOString();

	const files: ContractFileHash[] = [
		{ id: "manifest", path: options.manifestPath, sha256: hashFile(options.manifestPath) },
		{ id: "test", path: options.testPath, sha256: hashFile(options.testPath) },
		...(options.extraFiles ?? []).map((file) => ({ id: file.id, path: file.path, sha256: hashFile(file.path) })),
	];
	const manifestHash = files[0]?.sha256 ?? "";
	const testFileHash = files[1]?.sha256 ?? "";
	const artifactRefs = files.map((file) => file.path);

	const eventBase: HarnessControlEventOptions = {
		cwd,
		logPath: options.logPath,
		runId: options.runId,
		operationId,
		correlationId: operationId,
		artifactRefs,
	};

	const startedRecord = recordHarnessControlEvent(
		CONTRACT_VERIFY_EVENT_KIND,
		"started",
		{ contractId: options.contractId, contractVersion: options.contractVersion, manifestHash, testFileHash, files },
		{ ...eventBase, now: clock() },
	);

	const gate = await options.runGate();
	const completedAt = clock().toISOString();

	const completedRecord = recordHarnessControlEvent(
		CONTRACT_VERIFY_EVENT_KIND,
		gate.ok ? "completed" : "blocked",
		{
			contractId: options.contractId,
			contractVersion: options.contractVersion,
			manifestHash,
			testFileHash,
			gate,
		},
		{ ...eventBase, causationId: startedRecord.event?.eventId ?? null, now: clock() },
	);

	const ledgerPath = resolveHarnessControlEventLogPath({ cwd, logPath: options.logPath, runId: options.runId });
	const ledgerErrors: string[] = [];
	let ledgerChainOk = true;
	if (ledgerPath) {
		const verification = verifyHarnessControlLedger(ledgerPath);
		ledgerChainOk = verification.ok;
		ledgerErrors.push(...verification.errors);
	}
	for (const record of [startedRecord, completedRecord]) {
		const error = ledgerErrorOf(record);
		if (error) ledgerErrors.push(error);
	}
	const ledgerVerified = ledgerChainOk && ledgerErrors.length === 0;

	const result: ContractResult = {
		schemaVersion: CONTRACT_RESULT_SCHEMA_VERSION,
		contractId: options.contractId,
		contractVersion: options.contractVersion,
		status: gate.ok && ledgerVerified ? "passed" : "blocked",
		manifestHash,
		testFileHash,
		files,
		gate,
		ledger: { path: ledgerPath ?? "", verified: ledgerVerified, errors: ledgerErrors },
		startedAt,
		completedAt,
	};

	if (options.resultPath) {
		writeJsonAtomic(resolve(cwd, options.resultPath), result);
	}

	return result;
}
