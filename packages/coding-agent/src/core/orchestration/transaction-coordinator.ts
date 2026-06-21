/**
 * Phase 1: fail-closed, ledger-gated transaction coordinator (pure algorithms).
 *
 * These functions are deterministic and side-effect free except through the
 * injected in-memory transaction/store callbacks. No SQLite or filesystem is
 * wired here; the real durable store is injected later. The invariant enforced
 * is: no state-changing mutation commits unless its required ledger event was
 * durably appended (JSONL fsync) and mirrored, in that order.
 *
 * Reference: .omk/runs/omk-autonomous-harness-remediation-plan/algorithm-plan.md
 * (Phase 1) and audit-transaction.md.
 */

import {
	CoordinatorError,
	type CoordinatorRecoverability,
	RequiredAuditWriteError,
	type TransactionPhase,
} from "./errors.ts";
import { type JsonValue, sha256Hex, stableStringify } from "./replay-ledger.ts";

/**
 * A canonical, content-addressed ledger event record. `eventHash` is derived
 * deterministically from the identity + state hashes, which is what makes
 * idempotency detection (same key + same hash => no-op) reliable.
 */
export interface LedgerRecord {
	operationId: string;
	runId: string;
	nodeId: string;
	eventType: string;
	phase: TransactionPhase;
	idempotencyKey: string;
	beforeStateHash: string;
	afterStateHash: string;
	eventHash: string;
	attemptId?: string;
}

/**
 * Identity + intent for a single ledger-gated mutation. `mutate` is pure: it
 * receives the snapshot and returns the staged next state without committing.
 */
export interface LedgerGatedTransactionRequest<S> {
	runId: string;
	nodeId: string;
	operationId: string;
	eventType: string;
	phase: TransactionPhase;
	idempotencyKey: string;
	mutate: (before: S) => S;
	attemptId?: string;
}

/**
 * Injected transaction handle (a single `BEGIN IMMEDIATE` scope). The fake used
 * in tests and the real SQLite-backed handle implement this surface.
 *
 * Contract:
 * - `appendRequiredEvent` simulates the durable JSONL append + fsync. It escapes
 *   transactional rollback (an appended event stays on disk).
 * - `mirrorEvent` stages the SQLite mirror insert inside the open transaction.
 * - `commit` applies the staged mirror + state; `rollback` discards them.
 */
export interface LedgerGatedTransactionHandle<S> {
	snapshot: () => S;
	findByIdempotencyKey: (key: string) => LedgerRecord | undefined;
	appendRequiredEvent: (record: LedgerRecord) => void;
	mirrorEvent: (record: LedgerRecord) => void;
	commit: (state: S) => void;
	rollback: () => void;
}

export interface LedgerGatedTransactionDeps<S> {
	begin: () => LedgerGatedTransactionHandle<S>;
	hashState?: (state: S) => string;
}

export type LedgerGatedTransactionStatus = "committed" | "noop";

export interface LedgerGatedTransactionResult<S> {
	status: LedgerGatedTransactionStatus;
	applied: boolean;
	record: LedgerRecord;
	state: S;
}

/**
 * Default state hash. Callers with non-JSON state must inject `hashState`.
 */
export function coordinatorStateHash(state: unknown): string {
	return sha256Hex(stableStringify(state as JsonValue));
}

/**
 * Deterministically derive a content hash for a ledger event from its identity
 * and state transition. Volatile fields are excluded so replays are stable.
 */
export function computeCoordinatorEventHash(input: {
	operationId: string;
	runId: string;
	nodeId: string;
	eventType: string;
	phase: TransactionPhase;
	idempotencyKey: string;
	beforeStateHash: string;
	afterStateHash: string;
	attemptId?: string;
}): string {
	const canonical: { readonly [key: string]: JsonValue } = {
		operationId: input.operationId,
		runId: input.runId,
		nodeId: input.nodeId,
		eventType: input.eventType,
		phase: input.phase,
		idempotencyKey: input.idempotencyKey,
		beforeStateHash: input.beforeStateHash,
		afterStateHash: input.afterStateHash,
		attemptId: input.attemptId ?? null,
	};
	return sha256Hex(stableStringify(canonical));
}

/**
 * Build a complete ledger record (including `eventHash`) from a request and the
 * computed before/after state hashes.
 */
export function buildLedgerRecord(
	request: {
		operationId: string;
		runId: string;
		nodeId: string;
		eventType: string;
		phase: TransactionPhase;
		idempotencyKey: string;
		attemptId?: string;
	},
	beforeStateHash: string,
	afterStateHash: string,
): LedgerRecord {
	const eventHash = computeCoordinatorEventHash({
		operationId: request.operationId,
		runId: request.runId,
		nodeId: request.nodeId,
		eventType: request.eventType,
		phase: request.phase,
		idempotencyKey: request.idempotencyKey,
		beforeStateHash,
		afterStateHash,
		attemptId: request.attemptId,
	});
	return {
		operationId: request.operationId,
		runId: request.runId,
		nodeId: request.nodeId,
		eventType: request.eventType,
		phase: request.phase,
		idempotencyKey: request.idempotencyKey,
		beforeStateHash,
		afterStateHash,
		eventHash,
		...(request.attemptId === undefined ? {} : { attemptId: request.attemptId }),
	};
}

function errorContext(
	request: {
		runId: string;
		nodeId: string;
		operationId: string;
		phase: TransactionPhase;
		eventType: string;
		attemptId?: string;
	},
	recoverability: CoordinatorRecoverability,
	cause?: unknown,
): {
	runId: string;
	nodeId: string;
	operationId: string;
	phase: TransactionPhase;
	eventType: string;
	recoverability: CoordinatorRecoverability;
	attemptId?: string;
	cause?: unknown;
} {
	return {
		runId: request.runId,
		nodeId: request.nodeId,
		operationId: request.operationId,
		phase: request.phase,
		eventType: request.eventType,
		recoverability,
		attemptId: request.attemptId,
		cause,
	};
}

/**
 * Run one fail-closed, ledger-gated state-changing transaction.
 *
 * ```text
 * BEGIN IMMEDIATE
 * before = snapshot()
 * staged = mutate(before)            # no commit yet
 * record = ledger event with before/after state hashes
 * idempotency:
 *   same key + same eventHash  -> rollback, no-op
 *   same key + different hash   -> rollback, IDEMPOTENCY_CONFLICT
 * appendRequiredEvent(record)        # durable JSONL append + fsync
 *   fail -> rollback, LEDGER_APPEND_REQUIRED_FAILED
 * mirrorEvent(record)                # same transaction
 *   fail -> rollback, SQLITE_MIRROR_FAILED (ledger durable; replay repairs)
 * commit(staged)
 *   fail -> rollback, SQLITE_COMMIT_AFTER_LEDGER_FAILED (ledger durable)
 * ```
 *
 * Any failure leaves the injected store unmutated (transaction rolled back);
 * only the durable ledger append can survive, which recovery/replay reconciles.
 */
export function runLedgerGatedTransaction<S>(
	deps: LedgerGatedTransactionDeps<S>,
	request: LedgerGatedTransactionRequest<S>,
): LedgerGatedTransactionResult<S> {
	const hashState = deps.hashState ?? coordinatorStateHash;
	const handle = deps.begin();
	let settled = false;
	const rollbackOnce = (): void => {
		if (!settled) {
			settled = true;
			handle.rollback();
		}
	};

	try {
		const before = handle.snapshot();
		const staged = request.mutate(before);
		const record = buildLedgerRecord(request, hashState(before), hashState(staged));

		const existing = handle.findByIdempotencyKey(request.idempotencyKey);
		if (existing !== undefined) {
			rollbackOnce();
			if (existing.eventHash === record.eventHash) {
				return { status: "noop", applied: false, record: existing, state: before };
			}
			throw new CoordinatorError(
				"IDEMPOTENCY_CONFLICT",
				`idempotency key "${request.idempotencyKey}" already recorded with a different event hash`,
				errorContext(request, "operator"),
			);
		}

		try {
			handle.appendRequiredEvent(record);
		} catch (cause) {
			rollbackOnce();
			throw new RequiredAuditWriteError(
				`required ledger append failed for "${request.eventType}"`,
				errorContext(request, "rollback", cause),
			);
		}

		try {
			handle.mirrorEvent(record);
		} catch (cause) {
			rollbackOnce();
			throw new CoordinatorError(
				"SQLITE_MIRROR_FAILED",
				`sqlite mirror failed after ledger append for "${request.eventType}"`,
				errorContext(request, "in_doubt", cause),
			);
		}

		try {
			handle.commit(staged);
			settled = true;
		} catch (cause) {
			rollbackOnce();
			throw new CoordinatorError(
				"SQLITE_COMMIT_AFTER_LEDGER_FAILED",
				`sqlite commit failed after ledger append for "${request.eventType}"`,
				errorContext(request, "in_doubt", cause),
			);
		}

		return { status: "committed", applied: true, record, state: staged };
	} catch (error) {
		rollbackOnce();
		throw error;
	}
}

/**
 * A single side-effecting step that must record a receipt after its side effect.
 * Each step declares a stable `receiptId` so a durable receipt can short-circuit
 * re-execution on replay.
 */
export interface ReceiptedStep {
	id: string;
	receiptId: string;
	sequence: number;
	idempotent: boolean;
	beforeStateHash: string;
	afterStateHash: string;
	run: () => void;
}

export interface ReceiptHandle {
	findReceipt: (receiptId: string) => LedgerRecord | undefined;
	appendReceiptEvent: (record: LedgerRecord) => void;
}

export interface ReceiptApplyRequest {
	runId: string;
	nodeId: string;
	operationId: string;
	attemptId?: string;
	eventType?: string;
	steps: readonly ReceiptedStep[];
}

export type ReceiptApplyStatus = "completed" | "in_doubt";

export interface ReceiptApplyResult {
	status: ReceiptApplyStatus;
	executedStepIds: string[];
	skippedStepIds: string[];
	appliedReceipts: LedgerRecord[];
	stoppedAtStepId?: string;
	reason?: string;
}

/**
 * Apply side-effecting steps in deterministic sequence order, recording a
 * required receipt after each side effect.
 *
 * Fail-closed rule (algorithm-plan Phase 1, test 3): if a receipt append fails
 * after its side effect ran, stop executing further side effects and return
 * `in_doubt` — UNLESS a durable idempotent receipt for that step exists, in
 * which case the side effect is provably recorded and execution continues.
 *
 * Steps whose receipt is already durably recorded are skipped (idempotent
 * replay) and never re-run.
 */
export function applyReceiptedSteps(handle: ReceiptHandle, request: ReceiptApplyRequest): ReceiptApplyResult {
	const eventType = request.eventType ?? "scheduler.node.receipt";
	const ordered = [...request.steps].sort((a, b) => a.sequence - b.sequence);
	const executedStepIds: string[] = [];
	const skippedStepIds: string[] = [];
	const appliedReceipts: LedgerRecord[] = [];

	for (const step of ordered) {
		const pre = handle.findReceipt(step.receiptId);
		if (pre !== undefined) {
			// Receipt already durable: idempotent replay, do not re-run the side effect.
			skippedStepIds.push(step.id);
			appliedReceipts.push(pre);
			continue;
		}

		step.run();
		executedStepIds.push(step.id);

		const record = buildLedgerRecord(
			{
				operationId: request.operationId,
				runId: request.runId,
				nodeId: request.nodeId,
				eventType,
				phase: "receipt",
				idempotencyKey: step.receiptId,
				attemptId: request.attemptId,
			},
			step.beforeStateHash,
			step.afterStateHash,
		);

		try {
			handle.appendReceiptEvent(record);
			appliedReceipts.push(record);
		} catch {
			const post = handle.findReceipt(step.receiptId);
			if (post !== undefined) {
				// Receipt persisted despite the append error: recoverable, keep going.
				appliedReceipts.push(post);
				continue;
			}
			return {
				status: "in_doubt",
				executedStepIds,
				skippedStepIds,
				appliedReceipts,
				stoppedAtStepId: step.id,
				reason: `receipt append failed after side effect for step "${step.id}" with no durable receipt`,
			};
		}
	}

	return { status: "completed", executedStepIds, skippedStepIds, appliedReceipts };
}

/**
 * A registered compensator and its forward-execution status.
 */
export interface CompensatorExecutionStep {
	id: string;
	sequence: number;
	idempotent: boolean;
	applied: boolean;
	run: () => void;
}

export interface CompensationHandle {
	appendCompensationStart: (record: LedgerRecord) => void;
	appendCompensationReceipt: (record: LedgerRecord) => void;
}

export interface GatedCompensationRequest {
	runId: string;
	nodeId: string;
	operationId: string;
	idempotencyKey: string;
	beforeStateHash: string;
	afterStateHash: string;
	attemptId?: string;
	steps: readonly CompensatorExecutionStep[];
}

export interface GatedCompensationResult {
	status: "rolled_back";
	executedStepIds: string[];
	receipts: LedgerRecord[];
}

/**
 * Run compensation fail-closed (algorithm-plan Phase 1, test 4 + invariant I7).
 *
 * 1. Refuse to auto-compensate if any NON-idempotent step was already applied
 *    (state is ambiguous): throw COMPENSATION_FAILED before anything runs.
 * 2. The compensation start is itself ledger-gated: if its required event cannot
 *    be appended, throw RequiredAuditWriteError and run NO compensators.
 * 3. Only idempotent compensators run, in reverse execution order, each
 *    recording a compensation receipt.
 */
export function runGatedCompensation(
	handle: CompensationHandle,
	request: GatedCompensationRequest,
): GatedCompensationResult {
	const baseContext = {
		runId: request.runId,
		nodeId: request.nodeId,
		operationId: request.operationId,
		phase: "compensate" as TransactionPhase,
		eventType: "scheduler.node.compensating",
		attemptId: request.attemptId,
	};

	for (const step of request.steps) {
		if (!step.idempotent && step.applied) {
			throw new CoordinatorError(
				"COMPENSATION_FAILED",
				`cannot auto-compensate non-idempotent step "${step.id}" that was already applied`,
				{ ...baseContext, recoverability: "in_doubt" },
			);
		}
	}

	const startRecord = buildLedgerRecord(
		{
			operationId: request.operationId,
			runId: request.runId,
			nodeId: request.nodeId,
			eventType: "scheduler.node.compensating",
			phase: "compensate",
			idempotencyKey: request.idempotencyKey,
			attemptId: request.attemptId,
		},
		request.beforeStateHash,
		request.afterStateHash,
	);

	try {
		handle.appendCompensationStart(startRecord);
	} catch (cause) {
		throw new RequiredAuditWriteError("required compensation-start ledger append failed", { ...baseContext, cause });
	}

	const reversed = request.steps.filter((step) => step.idempotent).sort((a, b) => b.sequence - a.sequence);
	const executedStepIds: string[] = [];
	const receipts: LedgerRecord[] = [];

	for (const step of reversed) {
		try {
			step.run();
		} catch (cause) {
			throw new CoordinatorError("COMPENSATION_FAILED", `compensator "${step.id}" failed`, {
				...baseContext,
				recoverability: "in_doubt",
				cause,
			});
		}
		executedStepIds.push(step.id);
		const receipt = buildLedgerRecord(
			{
				operationId: request.operationId,
				runId: request.runId,
				nodeId: request.nodeId,
				eventType: "scheduler.node.compensation.receipt",
				phase: "compensate",
				idempotencyKey: `${request.idempotencyKey}:${step.id}`,
				attemptId: request.attemptId,
			},
			request.beforeStateHash,
			request.afterStateHash,
		);
		handle.appendCompensationReceipt(receipt);
		receipts.push(receipt);
	}

	return { status: "rolled_back", executedStepIds, receipts };
}
