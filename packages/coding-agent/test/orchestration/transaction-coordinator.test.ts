import { describe, expect, it } from "vitest";
import {
	CoordinatorError,
	type CoordinatorErrorCode,
	type CoordinatorRecoverability,
	RequiredAuditWriteError,
	type TransactionPhase,
} from "../../src/core/orchestration/errors.ts";
import {
	applyReceiptedSteps,
	buildLedgerRecord,
	type CompensationHandle,
	type CompensatorExecutionStep,
	coordinatorStateHash,
	type GatedCompensationRequest,
	type LedgerGatedTransactionHandle,
	type LedgerGatedTransactionRequest,
	type LedgerRecord,
	type ReceiptedStep,
	type ReceiptHandle,
	runGatedCompensation,
	runLedgerGatedTransaction,
} from "../../src/core/orchestration/transaction-coordinator.ts";

type MockState = { value: number };

interface FakeStoreOptions {
	initialState?: MockState;
	existing?: LedgerRecord[];
	failAppend?: boolean;
	failMirror?: boolean;
	failCommit?: boolean;
}

interface FakeStore {
	begin: () => LedgerGatedTransactionHandle<MockState>;
	readonly state: MockState;
	readonly ledger: LedgerRecord[];
	readonly mirror: LedgerRecord[];
	readonly rollbacks: number;
	readonly commits: number;
}

function createFakeStore(options: FakeStoreOptions = {}): FakeStore {
	let committedState: MockState = options.initialState ?? { value: 0 };
	const ledger: LedgerRecord[] = [];
	const mirror: LedgerRecord[] = [...(options.existing ?? [])];
	let rollbacks = 0;
	let commits = 0;

	const begin = (): LedgerGatedTransactionHandle<MockState> => {
		const snapshotState = committedState;
		let stagedMirror: LedgerRecord[] = [];
		return {
			snapshot: () => snapshotState,
			findByIdempotencyKey: (key) => mirror.find((record) => record.idempotencyKey === key),
			appendRequiredEvent: (record) => {
				if (options.failAppend) {
					throw new Error("ledger append failed");
				}
				// JSONL append escapes transactional rollback (durable on disk).
				ledger.push(record);
			},
			mirrorEvent: (record) => {
				if (options.failMirror) {
					throw new Error("sqlite mirror failed");
				}
				stagedMirror.push(record);
			},
			commit: (state) => {
				if (options.failCommit) {
					throw new Error("sqlite commit failed");
				}
				for (const record of stagedMirror) {
					mirror.push(record);
				}
				committedState = state;
				commits += 1;
			},
			rollback: () => {
				stagedMirror = [];
				rollbacks += 1;
			},
		};
	};

	return {
		begin,
		get state() {
			return committedState;
		},
		get ledger() {
			return ledger;
		},
		get mirror() {
			return mirror;
		},
		get rollbacks() {
			return rollbacks;
		},
		get commits() {
			return commits;
		},
	};
}

function gateRequest(
	overrides: Partial<LedgerGatedTransactionRequest<MockState>> = {},
): LedgerGatedTransactionRequest<MockState> {
	return {
		runId: "run-1",
		nodeId: "node-1",
		operationId: "run-1:node-1",
		eventType: "scheduler.node.prepared",
		phase: "prepare",
		idempotencyKey: "run-1:node-1:prepare",
		mutate: (before) => ({ value: before.value + 1 }),
		...overrides,
	};
}

describe("runLedgerGatedTransaction - required audit append gate", () => {
	it("commits staged mutation after ledger append and sqlite mirror succeed", () => {
		const store = createFakeStore({ initialState: { value: 1 } });
		const result = runLedgerGatedTransaction({ begin: store.begin }, gateRequest());

		expect(result.status).toBe("committed");
		expect(result.applied).toBe(true);
		expect(result.state).toEqual({ value: 2 });
		expect(store.state).toEqual({ value: 2 });
		expect(store.ledger).toHaveLength(1);
		expect(store.mirror).toHaveLength(1);
		expect(store.commits).toBe(1);
		expect(store.rollbacks).toBe(0);
		expect(result.record.beforeStateHash).not.toEqual(result.record.afterStateHash);
		expect(result.record.eventHash).toHaveLength(64);
	});

	it("test 1: prepare append failure leaves no lease/attempt/status change", () => {
		const store = createFakeStore({ initialState: { value: 1 }, failAppend: true });

		let captured: unknown;
		try {
			runLedgerGatedTransaction({ begin: store.begin }, gateRequest());
		} catch (error) {
			captured = error;
		}

		expect(captured).toBeInstanceOf(RequiredAuditWriteError);
		const coordinatorError = captured as CoordinatorError;
		expect(coordinatorError.code).toBe<CoordinatorErrorCode>("LEDGER_APPEND_REQUIRED_FAILED");
		expect(coordinatorError.phase).toBe<TransactionPhase>("prepare");
		expect(coordinatorError.recoverability).toBe<CoordinatorRecoverability>("rollback");
		// fail-closed: nothing durable, nothing committed, transaction rolled back.
		expect(store.state).toEqual({ value: 1 });
		expect(store.ledger).toHaveLength(0);
		expect(store.mirror).toHaveLength(0);
		expect(store.commits).toBe(0);
		expect(store.rollbacks).toBe(1);
	});

	it("test 2a: ledger append succeeds but sqlite mirror fails; recovery trusts ledger", () => {
		const store = createFakeStore({ initialState: { value: 1 }, failMirror: true });

		let captured: unknown;
		try {
			runLedgerGatedTransaction({ begin: store.begin }, gateRequest());
		} catch (error) {
			captured = error;
		}

		expect(captured).toBeInstanceOf(CoordinatorError);
		const coordinatorError = captured as CoordinatorError;
		expect(coordinatorError.code).toBe<CoordinatorErrorCode>("SQLITE_MIRROR_FAILED");
		expect(coordinatorError.recoverability).toBe<CoordinatorRecoverability>("in_doubt");
		// ledger event is durable; sqlite side rolled back; replay repairs later.
		expect(store.ledger).toHaveLength(1);
		expect(store.mirror).toHaveLength(0);
		expect(store.state).toEqual({ value: 1 });
		expect(store.commits).toBe(0);
		expect(store.rollbacks).toBe(1);
	});

	it("test 2b: ledger append succeeds but sqlite commit fails; recovery trusts ledger", () => {
		const store = createFakeStore({ initialState: { value: 1 }, failCommit: true });

		let captured: unknown;
		try {
			runLedgerGatedTransaction({ begin: store.begin }, gateRequest());
		} catch (error) {
			captured = error;
		}

		expect(captured).toBeInstanceOf(CoordinatorError);
		const coordinatorError = captured as CoordinatorError;
		expect(coordinatorError.code).toBe<CoordinatorErrorCode>("SQLITE_COMMIT_AFTER_LEDGER_FAILED");
		expect(coordinatorError.recoverability).toBe<CoordinatorRecoverability>("in_doubt");
		expect(store.ledger).toHaveLength(1);
		expect(store.mirror).toHaveLength(0);
		expect(store.state).toEqual({ value: 1 });
		expect(store.commits).toBe(0);
		expect(store.rollbacks).toBe(1);
	});

	it("mutation rollback: mutate throwing rolls back the transaction and stays fail-closed", () => {
		const store = createFakeStore({ initialState: { value: 1 } });
		const request = gateRequest({
			mutate: () => {
				throw new Error("illegal node transition");
			},
		});

		expect(() => runLedgerGatedTransaction({ begin: store.begin }, request)).toThrow("illegal node transition");
		expect(store.state).toEqual({ value: 1 });
		expect(store.ledger).toHaveLength(0);
		expect(store.mirror).toHaveLength(0);
		expect(store.commits).toBe(0);
		expect(store.rollbacks).toBe(1);
	});
});

describe("runLedgerGatedTransaction - idempotency duplicate handling", () => {
	it("same idempotency key + same event hash is a no-op", () => {
		const before: MockState = { value: 1 };
		const staged: MockState = { value: 2 };
		const request = gateRequest({ mutate: () => staged });
		const existing = buildLedgerRecord(request, coordinatorStateHash(before), coordinatorStateHash(staged));
		const store = createFakeStore({ initialState: before, existing: [existing] });

		const result = runLedgerGatedTransaction({ begin: store.begin }, request);

		expect(result.status).toBe("noop");
		expect(result.applied).toBe(false);
		expect(result.record.eventHash).toBe(existing.eventHash);
		// no new event appended, nothing committed, empty transaction rolled back.
		expect(store.ledger).toHaveLength(0);
		expect(store.state).toEqual({ value: 1 });
		expect(store.commits).toBe(0);
		expect(store.rollbacks).toBe(1);
	});

	it("same idempotency key + different event hash is fatal", () => {
		const conflicting = buildLedgerRecord(
			gateRequest({ mutate: () => ({ value: 99 }) }),
			coordinatorStateHash({ value: 1 }),
			coordinatorStateHash({ value: 99 }),
		);
		const store = createFakeStore({ initialState: { value: 1 }, existing: [conflicting] });

		let captured: unknown;
		try {
			runLedgerGatedTransaction({ begin: store.begin }, gateRequest());
		} catch (error) {
			captured = error;
		}

		expect(captured).toBeInstanceOf(CoordinatorError);
		const coordinatorError = captured as CoordinatorError;
		expect(coordinatorError.code).toBe<CoordinatorErrorCode>("IDEMPOTENCY_CONFLICT");
		expect(coordinatorError.recoverability).toBe<CoordinatorRecoverability>("operator");
		expect(store.ledger).toHaveLength(0);
		expect(store.state).toEqual({ value: 1 });
		expect(store.commits).toBe(0);
		expect(store.rollbacks).toBe(1);
	});
});

function receiptedStep(id: string, sequence: number, run: () => void, idempotent = true): ReceiptedStep {
	return {
		id,
		receiptId: `receipt-${id}`,
		sequence,
		idempotent,
		beforeStateHash: `before-${id}`,
		afterStateHash: `after-${id}`,
		run,
	};
}

interface FakeReceiptHandleOptions {
	seed?: LedgerRecord[];
	failOnReceiptId?: string;
	persistOnFail?: boolean;
}

function createReceiptHandle(options: FakeReceiptHandleOptions = {}): ReceiptHandle & { receipts: LedgerRecord[] } {
	const receipts: LedgerRecord[] = [...(options.seed ?? [])];
	return {
		receipts,
		findReceipt: (receiptId) => receipts.find((record) => record.idempotencyKey === receiptId),
		appendReceiptEvent: (record) => {
			if (options.failOnReceiptId !== undefined && record.idempotencyKey === options.failOnReceiptId) {
				if (options.persistOnFail) {
					receipts.push(record);
				}
				throw new Error("receipt append failed");
			}
			receipts.push(record);
		},
	};
}

describe("applyReceiptedSteps - receipt append failure semantics", () => {
	it("appends a receipt for every executed side effect in order", () => {
		const order: string[] = [];
		const steps = [
			receiptedStep("s1", 0, () => order.push("s1")),
			receiptedStep("s2", 1, () => order.push("s2")),
			receiptedStep("s3", 2, () => order.push("s3")),
		];
		const handle = createReceiptHandle();

		const result = applyReceiptedSteps(handle, {
			runId: "run-1",
			nodeId: "node-1",
			operationId: "run-1:node-1",
			steps,
		});

		expect(result.status).toBe("completed");
		expect(order).toEqual(["s1", "s2", "s3"]);
		expect(result.executedStepIds).toEqual(["s1", "s2", "s3"]);
		expect(result.appliedReceipts).toHaveLength(3);
	});

	it("test 3a: receipt append failure after a side effect stops further side effects and marks in_doubt", () => {
		const order: string[] = [];
		const steps = [
			receiptedStep("s1", 0, () => order.push("s1")),
			receiptedStep("s2", 1, () => order.push("s2")),
			receiptedStep("s3", 2, () => order.push("s3")),
		];
		const handle = createReceiptHandle({ failOnReceiptId: "receipt-s2" });

		const result = applyReceiptedSteps(handle, {
			runId: "run-1",
			nodeId: "node-1",
			operationId: "run-1:node-1",
			steps,
		});

		expect(result.status).toBe("in_doubt");
		expect(result.stoppedAtStepId).toBe("s2");
		// side effect for s2 ran, but s3 must not run.
		expect(order).toEqual(["s1", "s2"]);
		expect(result.executedStepIds).toEqual(["s1", "s2"]);
	});

	it("test 3b: receipt append failure is tolerated when an idempotent receipt already exists", () => {
		const order: string[] = [];
		const steps = [
			receiptedStep("s1", 0, () => order.push("s1")),
			receiptedStep("s2", 1, () => order.push("s2")),
			receiptedStep("s3", 2, () => order.push("s3")),
		];
		// append throws for s2 but the durable receipt persists, so it is recoverable.
		const handle = createReceiptHandle({ failOnReceiptId: "receipt-s2", persistOnFail: true });

		const result = applyReceiptedSteps(handle, {
			runId: "run-1",
			nodeId: "node-1",
			operationId: "run-1:node-1",
			steps,
		});

		expect(result.status).toBe("completed");
		expect(order).toEqual(["s1", "s2", "s3"]);
		expect(result.executedStepIds).toEqual(["s1", "s2", "s3"]);
	});

	it("skips already-recorded side effects (idempotent replay) without re-running them", () => {
		const order: string[] = [];
		const seededReceipt = buildLedgerRecord(
			{
				runId: "run-1",
				nodeId: "node-1",
				operationId: "run-1:node-1",
				eventType: "scheduler.node.receipt",
				phase: "receipt",
				idempotencyKey: "receipt-s2",
			},
			"before-s2",
			"after-s2",
		);
		const steps = [
			receiptedStep("s1", 0, () => order.push("s1")),
			receiptedStep("s2", 1, () => order.push("s2")),
			receiptedStep("s3", 2, () => order.push("s3")),
		];
		const handle = createReceiptHandle({ seed: [seededReceipt] });

		const result = applyReceiptedSteps(handle, {
			runId: "run-1",
			nodeId: "node-1",
			operationId: "run-1:node-1",
			steps,
		});

		expect(result.status).toBe("completed");
		expect(order).toEqual(["s1", "s3"]);
		expect(result.skippedStepIds).toEqual(["s2"]);
		expect(result.executedStepIds).toEqual(["s1", "s3"]);
	});
});

function compensator(
	id: string,
	sequence: number,
	run: () => void,
	overrides: Partial<CompensatorExecutionStep> = {},
): CompensatorExecutionStep {
	return {
		id,
		sequence,
		idempotent: true,
		applied: true,
		run,
		...overrides,
	};
}

interface FakeCompensationHandleOptions {
	failStart?: boolean;
}

function createCompensationHandle(options: FakeCompensationHandleOptions = {}): CompensationHandle & {
	starts: LedgerRecord[];
	receipts: LedgerRecord[];
} {
	const starts: LedgerRecord[] = [];
	const receipts: LedgerRecord[] = [];
	return {
		starts,
		receipts,
		appendCompensationStart: (record) => {
			if (options.failStart) {
				throw new Error("compensation ledger-start append failed");
			}
			starts.push(record);
		},
		appendCompensationReceipt: (record) => {
			receipts.push(record);
		},
	};
}

function compensationRequest(steps: readonly CompensatorExecutionStep[]): GatedCompensationRequest {
	return {
		runId: "run-1",
		nodeId: "node-1",
		operationId: "run-1:node-1",
		idempotencyKey: "run-1:node-1:compensate",
		beforeStateHash: "before",
		afterStateHash: "after",
		steps,
	};
}

describe("runGatedCompensation - ledger-gated compensation start", () => {
	it("runs idempotent compensators in reverse execution order after the start gate passes", () => {
		const order: string[] = [];
		const steps = [
			compensator("c1", 0, () => order.push("c1")),
			compensator("c2", 1, () => order.push("c2")),
			compensator("c3", 2, () => order.push("c3")),
		];
		const handle = createCompensationHandle();

		const result = runGatedCompensation(handle, compensationRequest(steps));

		expect(result.status).toBe("rolled_back");
		expect(order).toEqual(["c3", "c2", "c1"]);
		expect(result.executedStepIds).toEqual(["c3", "c2", "c1"]);
		expect(handle.starts).toHaveLength(1);
		expect(handle.receipts).toHaveLength(3);
	});

	it("test 4: compensation ledger-start failure runs no compensators", () => {
		let runs = 0;
		const steps = [
			compensator("c1", 0, () => {
				runs += 1;
			}),
			compensator("c2", 1, () => {
				runs += 1;
			}),
		];
		const handle = createCompensationHandle({ failStart: true });

		let captured: unknown;
		try {
			runGatedCompensation(handle, compensationRequest(steps));
		} catch (error) {
			captured = error;
		}

		expect(captured).toBeInstanceOf(RequiredAuditWriteError);
		const coordinatorError = captured as CoordinatorError;
		expect(coordinatorError.code).toBe<CoordinatorErrorCode>("LEDGER_APPEND_REQUIRED_FAILED");
		expect(coordinatorError.phase).toBe<TransactionPhase>("compensate");
		expect(runs).toBe(0);
		expect(handle.receipts).toHaveLength(0);
	});

	it("refuses to auto-compensate a non-idempotent step that was already applied", () => {
		let runs = 0;
		const steps = [
			compensator("c1", 0, () => {
				runs += 1;
			}),
			compensator(
				"c2",
				1,
				() => {
					runs += 1;
				},
				{ idempotent: false, applied: true },
			),
		];
		const handle = createCompensationHandle();

		let captured: unknown;
		try {
			runGatedCompensation(handle, compensationRequest(steps));
		} catch (error) {
			captured = error;
		}

		expect(captured).toBeInstanceOf(CoordinatorError);
		const coordinatorError = captured as CoordinatorError;
		expect(coordinatorError.code).toBe<CoordinatorErrorCode>("COMPENSATION_FAILED");
		// fail-closed: nothing ran, no start event recorded.
		expect(runs).toBe(0);
		expect(handle.starts).toHaveLength(0);
		expect(handle.receipts).toHaveLength(0);
	});
});

describe("errors - typed coordinator errors preserve metadata", () => {
	it("CoordinatorError carries phase/run/node/operation metadata", () => {
		const cause = new Error("root cause");
		const error = new CoordinatorError("VERIFY_GATE_FAILED", "verification gate failed", {
			runId: "run-7",
			nodeId: "node-7",
			operationId: "run-7:node-7",
			attemptId: "attempt-3",
			phase: "verify",
			eventType: "scheduler.node.verifying",
			recoverability: "in_doubt",
			cause,
		});

		expect(error).toBeInstanceOf(Error);
		expect(error).toBeInstanceOf(CoordinatorError);
		expect(error.name).toBe("CoordinatorError");
		expect(error.code).toBe<CoordinatorErrorCode>("VERIFY_GATE_FAILED");
		expect(error.runId).toBe("run-7");
		expect(error.nodeId).toBe("node-7");
		expect(error.operationId).toBe("run-7:node-7");
		expect(error.attemptId).toBe("attempt-3");
		expect(error.phase).toBe<TransactionPhase>("verify");
		expect(error.eventType).toBe("scheduler.node.verifying");
		expect(error.recoverability).toBe<CoordinatorRecoverability>("in_doubt");
		expect(error.cause).toBe(cause);
	});

	it("RequiredAuditWriteError is a CoordinatorError with the ledger append code", () => {
		const error = new RequiredAuditWriteError("required ledger append failed", {
			runId: "run-8",
			nodeId: "node-8",
			operationId: "run-8:node-8",
			phase: "apply",
			eventType: "scheduler.node.receipt",
		});

		expect(error).toBeInstanceOf(CoordinatorError);
		expect(error).toBeInstanceOf(RequiredAuditWriteError);
		expect(error.name).toBe("RequiredAuditWriteError");
		expect(error.code).toBe<CoordinatorErrorCode>("LEDGER_APPEND_REQUIRED_FAILED");
		expect(error.recoverability).toBe<CoordinatorRecoverability>("rollback");
		expect(error.phase).toBe<TransactionPhase>("apply");
	});
});
