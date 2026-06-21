import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	computeIdempotencyKey,
	type DagSubmission,
	NodeRedefinitionError,
	SCHEDULER_STORE_TABLES,
} from "../../src/core/orchestration/scheduler-store.ts";
import { SqliteSchedulerStore } from "../../src/core/orchestration/sqlite-scheduler-store.ts";

let store: SqliteSchedulerStore;

beforeEach(() => {
	store = new SqliteSchedulerStore(":memory:");
	store.createSchema();
});

afterEach(() => {
	store.close();
});

/** A small two-node DAG with an A -> B strong edge. */
function sampleDag(overrides: Partial<DagSubmission> = {}): DagSubmission {
	return {
		run: { runId: "run-1", goal: "demo goal", topology: "dag" },
		nodes: [
			{ nodeId: "A", role: "coder", task: "edit foo", writeSet: [{ path: "src/foo.ts" }] },
			{ nodeId: "B", role: "tester", task: "test foo", readSet: [{ path: "src/foo.ts" }] },
		],
		edges: [{ fromNodeId: "A", toNodeId: "B", edgeType: "strong" }],
		...overrides,
	};
}

describe("schema creation", () => {
	it("creates every canonical table", () => {
		// Each table must accept a trivial COUNT query without throwing.
		for (const table of SCHEDULER_STORE_TABLES) {
			expect(() => store.exec(`SELECT COUNT(*) FROM ${table}`)).not.toThrow();
		}
	});

	it("declares exactly the twelve required tables", () => {
		expect(SCHEDULER_STORE_TABLES).toEqual([
			"runs",
			"nodes",
			"edges",
			"access",
			"conflicts",
			"attempts",
			"leases",
			"artifacts",
			"worktrees",
			"merge_queue",
			"compensators",
			"events",
		]);
	});

	it("is idempotent: createSchema can run twice", () => {
		expect(() => store.createSchema()).not.toThrow();
	});
});

describe("WAL pragmas (file-backed)", () => {
	let dir: string;
	let fileStore: SqliteSchedulerStore;

	beforeEach(() => {
		dir = mkdtempSync(path.join(tmpdir(), "omk-scheduler-"));
		fileStore = new SqliteSchedulerStore(path.join(dir, "scheduler.db"));
		fileStore.createSchema();
	});

	afterEach(() => {
		fileStore.close();
		rmSync(dir, { recursive: true, force: true });
	});

	it("enables WAL journal mode on a file database", () => {
		expect(fileStore.pragma("journal_mode")).toBe("wal");
	});

	it("applies synchronous=NORMAL, busy_timeout, foreign_keys, temp_store", () => {
		expect(fileStore.pragma("synchronous")).toBe(1); // NORMAL
		expect(fileStore.pragma("busy_timeout")).toBe(5000);
		expect(fileStore.pragma("foreign_keys")).toBe(1);
		expect(fileStore.pragma("temp_store")).toBe(2); // MEMORY
	});
});

describe("run lifecycle", () => {
	it("creates and reads a run", () => {
		store.createRun({ runId: "run-x", goal: "g", topology: "parallel" });
		const run = store.getRun("run-x");
		expect(run?.goal).toBe("g");
		expect(run?.topology).toBe("parallel");
		expect(run?.status).toBe("running");
	});

	it("updates run status and stamps completed_at for terminal states", () => {
		store.createRun({ runId: "run-x", goal: "g", topology: "parallel" });
		expect(store.updateRunStatus("run-x", "completed", "2026-06-21T10:00:00.000Z")).toBe(true);
		const run = store.getRun("run-x");
		expect(run?.status).toBe("completed");
		expect(run?.completedAt).toBe("2026-06-21T10:00:00.000Z");
	});

	it("returns false when updating a missing run", () => {
		expect(store.updateRunStatus("nope", "failed")).toBe(false);
	});
});

describe("idempotent DAG ingestion", () => {
	it("inserts nodes, edges, and access rows on first ingest", () => {
		const result = store.ingestDag(sampleDag());
		expect(result.nodeIds).toEqual(["A", "B"]);
		expect(result.insertedNodeIds).toEqual(["A", "B"]);
		expect(result.reusedNodeIds).toEqual([]);

		const nodes = store.getNodesByRun("run-1");
		expect(nodes.map((n) => n.nodeId)).toEqual(["A", "B"]);
		expect(nodes[0].writeSet).toEqual([{ path: "src/foo.ts" }]);
		expect(nodes[1].readSet).toEqual([{ path: "src/foo.ts" }]);

		const edges = store.getEdgesByRun("run-1");
		expect(edges).toEqual([{ runId: "run-1", fromNodeId: "A", toNodeId: "B", edgeType: "strong" }]);
	});

	it("does not duplicate rows when the same DAG is ingested twice", () => {
		store.ingestDag(sampleDag());
		const second = store.ingestDag(sampleDag());
		expect(second.insertedNodeIds).toEqual([]);
		expect(second.reusedNodeIds).toEqual(["A", "B"]);
		expect(store.getNodesByRun("run-1")).toHaveLength(2);
		expect(store.getEdgesByRun("run-1")).toHaveLength(1);
	});

	it("does not mutate attempt_count on idempotent replay", () => {
		store.ingestDag(sampleDag());
		store.ingestDag(sampleDag());
		const a = store.getNode("run-1", "A");
		expect(a?.attemptCount).toBe(0);
	});

	it("computes a stable dag hash across identical submissions", () => {
		const first = store.ingestDag(sampleDag());
		const fresh = new SqliteSchedulerStore(":memory:");
		fresh.createSchema();
		const second = fresh.ingestDag(sampleDag());
		fresh.close();
		expect(first.dagHash).toBe(second.dagHash);
		expect(store.getRun("run-1")?.dagHash).toBe(first.dagHash);
	});

	it("produces order-independent idempotency keys for symbol lists", () => {
		const a = computeIdempotencyKey("run-1", {
			nodeId: "A",
			role: "coder",
			task: "t",
			writeSet: [{ path: "src/foo.ts", symbols: ["y", "x"] }],
		});
		const b = computeIdempotencyKey("run-1", {
			nodeId: "A",
			role: "coder",
			task: "t",
			writeSet: [{ path: "src/foo.ts", symbols: ["x", "y"] }],
		});
		expect(a).toBe(b);
	});

	it("rejects redefining an existing node id with a different descriptor (fail-closed, atomic)", () => {
		store.ingestDag(sampleDag());
		const changed = sampleDag({
			nodes: [
				{ nodeId: "A", role: "coder", task: "edit foo DIFFERENTLY", writeSet: [{ path: "src/foo.ts" }] },
				{ nodeId: "B", role: "tester", task: "test foo", readSet: [{ path: "src/foo.ts" }] },
			],
		});
		expect(() => store.ingestDag(changed)).toThrow(NodeRedefinitionError);
		// The whole ingest transaction rolled back: A keeps its original task.
		expect(store.getNode("run-1", "A")?.task).toBe("edit foo");
		expect(store.getNodesByRun("run-1")).toHaveLength(2);
	});
});

describe("conflict graph generation", () => {
	it("creates a write/read conflict edge for the same path", () => {
		store.ingestDag(sampleDag());
		const edges = store.buildConflictGraph("run-1");
		expect(edges).toEqual([{ runId: "run-1", nodeA: "A", nodeB: "B", reason: "write-read" }]);
		expect(store.getConflicts("run-1")).toEqual(edges);
	});

	it("creates a write/write conflict edge", () => {
		store.ingestDag(
			sampleDag({
				nodes: [
					{ nodeId: "A", role: "coder", task: "edit foo", writeSet: [{ path: "src/foo.ts" }] },
					{ nodeId: "B", role: "coder", task: "also edit foo", writeSet: [{ path: "src/foo.ts" }] },
				],
				edges: [],
			}),
		);
		const edges = store.buildConflictGraph("run-1");
		expect(edges).toEqual([{ runId: "run-1", nodeA: "A", nodeB: "B", reason: "write-write" }]);
	});

	it("does not create a conflict for read/read overlap", () => {
		store.ingestDag(
			sampleDag({
				nodes: [
					{ nodeId: "A", role: "tester", task: "read foo", readSet: [{ path: "src/foo.ts" }] },
					{ nodeId: "B", role: "tester", task: "read foo", readSet: [{ path: "src/foo.ts" }] },
				],
				edges: [],
			}),
		);
		expect(store.buildConflictGraph("run-1")).toEqual([]);
	});

	it("narrows by symbols: same path, disjoint symbols do not conflict", () => {
		store.ingestDag(
			sampleDag({
				nodes: [
					{ nodeId: "A", role: "coder", task: "edit x", writeSet: [{ path: "src/foo.ts", symbols: ["x"] }] },
					{ nodeId: "B", role: "tester", task: "read y", readSet: [{ path: "src/foo.ts", symbols: ["y"] }] },
				],
				edges: [],
			}),
		);
		expect(store.buildConflictGraph("run-1")).toEqual([]);
	});

	it("is idempotent and regenerable: rebuilding yields the same edges", () => {
		store.ingestDag(sampleDag());
		const first = store.buildConflictGraph("run-1");
		const second = store.buildConflictGraph("run-1");
		expect(second).toEqual(first);
		expect(store.getConflicts("run-1")).toHaveLength(1);
	});
});

describe("lease acquisition + owner-token fencing", () => {
	function lease(overrides: Partial<{ leaseId: string; ownerToken: string; expiresAt: string; now: string }> = {}) {
		return {
			leaseId: "lease-1",
			ownerToken: "token-1",
			expiresAt: "2026-06-21T10:05:00.000Z",
			now: "2026-06-21T10:00:00.000Z",
			...overrides,
		};
	}

	beforeEach(() => {
		store.ingestDag(sampleDag());
	});

	it("acquires a lease and moves the node to leased", () => {
		expect(store.acquireLease("run-1", "A", lease())).toBe(true);
		const node = store.getNode("run-1", "A");
		expect(node?.status).toBe("leased");
		expect(node?.leaseId).toBe("lease-1");
		expect(node?.leaseExpiresAt).toBe("2026-06-21T10:05:00.000Z");
		expect(node?.attemptCount).toBe(1);
		expect(store.getLease("lease-1")?.ownerToken).toBe("token-1");
	});

	it("rejects a second lease on an already-leased node (status guard)", () => {
		expect(store.acquireLease("run-1", "A", lease())).toBe(true);
		expect(store.acquireLease("run-1", "A", lease({ leaseId: "lease-2", ownerToken: "token-2" }))).toBe(false);
		// The losing lease row must not have been inserted (rolled back).
		expect(store.getLease("lease-2")).toBeUndefined();
		expect(store.getNode("run-1", "A")?.leaseId).toBe("lease-1");
	});

	it("extends the lease on heartbeat with the correct owner token", () => {
		store.acquireLease("run-1", "A", lease());
		const ok = store.heartbeat("run-1", "A", "token-1", "2026-06-21T10:02:00.000Z", "2026-06-21T10:07:00.000Z");
		expect(ok).toBe(true);
		expect(store.getLease("lease-1")?.expiresAt).toBe("2026-06-21T10:07:00.000Z");
		expect(store.getNode("run-1", "A")?.leaseExpiresAt).toBe("2026-06-21T10:07:00.000Z");
	});

	it("rejects a heartbeat with the wrong owner token (fencing)", () => {
		store.acquireLease("run-1", "A", lease());
		const ok = store.heartbeat("run-1", "A", "WRONG", "2026-06-21T10:02:00.000Z", "2026-06-21T10:09:00.000Z");
		expect(ok).toBe(false);
		// Expiry must be unchanged by a fenced-out heartbeat.
		expect(store.getLease("lease-1")?.expiresAt).toBe("2026-06-21T10:05:00.000Z");
	});

	it("starts a node only with the correct owner token", () => {
		store.acquireLease("run-1", "A", lease());
		expect(store.startNode("run-1", "A", "WRONG", "2026-06-21T10:03:00.000Z")).toBe(false);
		expect(store.getNode("run-1", "A")?.status).toBe("leased");
		expect(store.startNode("run-1", "A", "token-1", "2026-06-21T10:03:00.000Z")).toBe(true);
		const node = store.getNode("run-1", "A");
		expect(node?.status).toBe("running");
		expect(node?.startedAt).toBe("2026-06-21T10:03:00.000Z");
	});

	it("reclaims an expired lease back to queued and increments requeue_count", () => {
		store.acquireLease("run-1", "A", lease());
		const reclaimed = store.reclaimExpiredLeases("run-1", "2026-06-21T10:10:00.000Z");
		expect(reclaimed).toEqual(["A"]);
		const node = store.getNode("run-1", "A");
		expect(node?.status).toBe("queued");
		expect(node?.leaseId).toBeNull();
		expect(node?.requeueCount).toBe(1);
		expect(store.getLease("lease-1")?.released).toBe(true);
	});

	it("does not reclaim a lease that has not expired", () => {
		store.acquireLease("run-1", "A", lease());
		expect(store.reclaimExpiredLeases("run-1", "2026-06-21T10:04:00.000Z")).toEqual([]);
		expect(store.getNode("run-1", "A")?.status).toBe("leased");
	});

	it("allows re-acquisition after reclaim", () => {
		store.acquireLease("run-1", "A", lease());
		store.reclaimExpiredLeases("run-1", "2026-06-21T10:10:00.000Z");
		expect(store.acquireLease("run-1", "A", lease({ leaseId: "lease-2", ownerToken: "token-2" }))).toBe(true);
		expect(store.getNode("run-1", "A")?.attemptCount).toBe(2);
	});
});

describe("scaffolded sibling-lane tables", () => {
	beforeEach(() => {
		store.ingestDag(sampleDag());
	});

	it("records and reads attempts with FK integrity", () => {
		store.acquireLease("run-1", "A", {
			leaseId: "lease-1",
			ownerToken: "token-1",
			expiresAt: "2026-06-21T10:05:00.000Z",
			now: "2026-06-21T10:00:00.000Z",
		});
		store.recordAttempt({
			attemptId: "att-1",
			runId: "run-1",
			nodeId: "A",
			leaseId: "lease-1",
			status: "running",
			startedAt: "2026-06-21T10:00:00.000Z",
		});
		const attempts = store.getAttemptsByRun("run-1");
		expect(attempts).toHaveLength(1);
		expect(attempts[0].attemptId).toBe("att-1");
		expect(attempts[0].status).toBe("running");
	});

	it("registers and reads worktrees", () => {
		store.registerWorktree({
			worktreeId: "wt-1",
			runId: "run-1",
			nodeId: "A",
			path: ".omk/worktrees/run-1/A",
			branchName: "omk/run-run-1/node-A",
			createdAt: "2026-06-21T10:00:00.000Z",
		});
		const worktrees = store.getWorktreesByRun("run-1");
		expect(worktrees).toHaveLength(1);
		expect(worktrees[0].status).toBe("active");
		expect(worktrees[0].branchName).toBe("omk/run-run-1/node-A");
	});

	it("registers and reads compensators ordered by sequence", () => {
		store.registerCompensator({
			compensatorId: "c-2",
			runId: "run-1",
			nodeId: "A",
			kind: "git-reset",
			sequence: 2,
			idempotent: true,
			applied: false,
			preparedStateHash: "hash-2",
			createdAt: "2026-06-21T10:00:00.000Z",
		});
		store.registerCompensator({
			compensatorId: "c-1",
			runId: "run-1",
			nodeId: "A",
			kind: "snapshot",
			sequence: 1,
			idempotent: false,
			applied: true,
			createdAt: "2026-06-21T10:00:00.000Z",
		});
		const comps = store.getCompensatorsByNode("run-1", "A");
		expect(comps.map((c) => c.sequence)).toEqual([1, 2]);
		expect(comps[0].idempotent).toBe(false);
		expect(comps[0].applied).toBe(true);
		expect(comps[1].preparedStateHash).toBe("hash-2");
	});

	it("records and reads artifacts", () => {
		store.recordArtifact({
			artifactId: "art-1",
			runId: "run-1",
			nodeId: "A",
			path: ".omk/runs/run-1/A.md",
			kind: "evidence",
			sha256: "deadbeef",
			sizeBytes: 1024,
			createdAt: "2026-06-21T10:00:00.000Z",
		});
		const artifacts = store.getArtifactsByRun("run-1");
		expect(artifacts).toHaveLength(1);
		expect(artifacts[0].kind).toBe("evidence");
		expect(artifacts[0].sha256).toBe("deadbeef");
	});

	it("rejects an attempt for a node that does not exist (FK enforced)", () => {
		expect(() =>
			store.recordAttempt({
				attemptId: "att-x",
				runId: "run-1",
				nodeId: "GHOST",
				leaseId: "lease-x",
				status: "running",
			}),
		).toThrow();
	});
});

describe("ledger mirror", () => {
	beforeEach(() => {
		store.ingestDag(sampleDag());
	});

	it("appends and reads events ordered by sequence", () => {
		store.appendEvent({
			eventId: "e-2",
			runId: "run-1",
			operationId: "run-1:A",
			sequence: 2,
			timestamp: "2026-06-21T10:01:00.000Z",
			kind: "scheduler.node.started",
			status: "started",
			nodeId: "A",
			data: { worker: 1 },
		});
		store.appendEvent({
			eventId: "e-1",
			runId: "run-1",
			operationId: "run-1:A",
			sequence: 1,
			timestamp: "2026-06-21T10:00:00.000Z",
			kind: "scheduler.node.leased",
			status: "leased",
			nodeId: "A",
		});
		const events = store.getEvents("run-1");
		expect(events.map((e) => e.sequence)).toEqual([1, 2]);
		expect(events[0].kind).toBe("scheduler.node.leased");
		expect(events[1].data).toEqual({ worker: 1 });
	});
});
