/**
 * Phase 0 safety contracts for the fail-closed orchestration control plane.
 *
 * These are pure type/value definitions shared by the transaction coordinator,
 * recovery classifier, and (later) the SQLite scheduler store. They encode the
 * invariant that no state-changing mutation may commit unless its required
 * ledger event was durably appended and mirrored.
 *
 * Reference: .omk/runs/omk-autonomous-harness-remediation-plan/algorithm-plan.md
 * (Phase 0 + Phase 1) and audit-transaction.md.
 */

/**
 * Coarse transaction phase for a single durable operation. Carried on every
 * typed coordinator error so operators and recovery can locate the crash point.
 */
export type TransactionPhase =
	| "prepare"
	| "start"
	| "apply"
	| "receipt"
	| "verify"
	| "commit"
	| "rollback"
	| "compensate";

/**
 * Whether a ledger event is mandatory before the surrounding mutation commits
 * ("required", fail-closed) or best-effort observability ("optional-readonly").
 */
export type LedgerRequirement = "required" | "optional-readonly";

/**
 * Execution mode is derived from print/json/RPC/SDK invocation, independent of
 * whether an interactive UI is available. Headless never auto-confirms.
 */
export type ExecutionMode = "interactive" | "headless";

/**
 * How a typed coordinator failure should be handled by recovery/operators.
 */
export type CoordinatorRecoverability = "retry" | "rollback" | "in_doubt" | "operator";

/**
 * Closed set of typed coordinator error codes (algorithm-plan Phase 0).
 */
export type CoordinatorErrorCode =
	| "LEDGER_APPEND_REQUIRED_FAILED"
	| "LEDGER_INTEGRITY_FAILED"
	| "SQLITE_MIRROR_FAILED"
	| "SQLITE_COMMIT_AFTER_LEDGER_FAILED"
	| "IDEMPOTENCY_CONFLICT"
	| "VERIFY_GATE_FAILED"
	| "COMPENSATION_FAILED";

/**
 * Structured metadata attached to every coordinator error. Preserving this
 * across throws is what lets recovery map a crash to resume/rollback/in_doubt.
 */
export interface CoordinatorErrorContext {
	runId: string;
	nodeId: string;
	operationId: string;
	phase: TransactionPhase;
	recoverability: CoordinatorRecoverability;
	attemptId?: string;
	eventType?: string;
	cause?: unknown;
}

/**
 * Base typed error for the orchestration control plane. Always carries the
 * operation identity, phase, and recoverability so failures are auditable.
 */
export class CoordinatorError extends Error {
	readonly code: CoordinatorErrorCode;
	readonly runId: string;
	readonly nodeId: string;
	readonly operationId: string;
	readonly phase: TransactionPhase;
	readonly recoverability: CoordinatorRecoverability;
	readonly attemptId?: string;
	readonly eventType?: string;

	constructor(code: CoordinatorErrorCode, message: string, context: CoordinatorErrorContext) {
		super(message, context.cause === undefined ? undefined : { cause: context.cause });
		this.name = "CoordinatorError";
		this.code = code;
		this.runId = context.runId;
		this.nodeId = context.nodeId;
		this.operationId = context.operationId;
		this.phase = context.phase;
		this.recoverability = context.recoverability;
		this.attemptId = context.attemptId;
		this.eventType = context.eventType;
	}
}

/**
 * Required-audit-write failure: a mandatory ledger event could not be appended,
 * so the surrounding mutation must roll back fail-closed. This is the canonical
 * `LEDGER_APPEND_REQUIRED_FAILED` error and defaults to `rollback` recovery.
 */
export class RequiredAuditWriteError extends CoordinatorError {
	constructor(
		message: string,
		context: Omit<CoordinatorErrorContext, "recoverability" | "code"> & {
			recoverability?: CoordinatorRecoverability;
		},
	) {
		super("LEDGER_APPEND_REQUIRED_FAILED", message, {
			...context,
			recoverability: context.recoverability ?? "rollback",
		});
		this.name = "RequiredAuditWriteError";
	}
}
