/**
 * Driver-agnostic SchedulerStore contract for the durable DAG orchestrator.
 *
 * This module owns the persistence *contract* and the deterministic, pure
 * helpers that any concrete store implementation must honor:
 *   - the canonical SQLite WAL DDL (one source of truth for the schema),
 *   - the connection pragmas,
 *   - stable idempotency / DAG hashing (so DAG ingestion is replay-safe),
 *   - access-set canonicalization (so stable keys are order-independent).
 *
 * It performs NO I/O itself. The concrete `node:sqlite` implementation lives in
 * `sqlite-scheduler-store.ts`. Keeping the contract and pure helpers here lets a
 * second driver (e.g. better-sqlite3) be added later without touching scheduler
 * logic, and lets tests assert determinism without a database.
 *
 * Schema reference: `.omk/runs/omk-orchestration-upgrade-plan/foundation.md` §3.
 * Conflict policy is reused from `scheduler-state.ts`; hashing primitives from
 * `replay-ledger.ts`. Erasable TypeScript only (no enum/namespace/param props).
 */

import { type JsonValue, sha256Hex, stableStringify } from "./replay-ledger.ts";
import {
	type AccessSetEntry,
	accessEntriesConflict,
	nodesConflict,
	type SchedulerNode,
	type SchedulerNodeStatus,
} from "./scheduler-state.ts";

export type RunStatus = "running" | "paused" | "completed" | "failed" | "cancelled";
export type NodeStatus = SchedulerNodeStatus;
export type EdgeType = "strong" | "weak";
export type AccessKind = "read" | "write";
export type ConflictReason = "write-write" | "write-read" | "read-write";
export type NodeRole = "planner" | "explorer" | "coder" | "tester" | "reviewer" | "security" | "memory" | "synthesizer";

/** Retry envelope persisted as JSON on the node row. */
export interface RetryPolicy {
	maxAttempts: number;
	baseMs: number;
	maxMs: number;
	multiplier: number;
}

export interface RunInput {
	runId: string;
	goal: string;
	topology: string;
	dagHash?: string;
	rootNodeId?: string;
}

export interface RunRow {
	runId: string;
	goal: string;
	topology: string;
	status: RunStatus;
	createdAt: string;
	updatedAt: string;
	completedAt: string | null;
	dagHash: string | null;
	rootNodeId: string | null;
}

/** A node as submitted by the root coordinator (caller owns `nodeId`). */
export interface NodeInput {
	nodeId: string;
	role: NodeRole;
	task: string;
	readSet?: readonly AccessSetEntry[];
	writeSet?: readonly AccessSetEntry[];
	priority?: number;
	parallelizable?: boolean;
	retryPolicy?: RetryPolicy;
	verificationContract?: string;
	costBudget?: number;
}

/** A persisted node row, rehydrated from SQLite. */
export interface NodeRow {
	nodeId: string;
	runId: string;
	role: NodeRole;
	task: string;
	status: NodeStatus;
	idempotencyKey: string;
	readSet: AccessSetEntry[];
	writeSet: AccessSetEntry[];
	leaseId: string | null;
	leaseExpiresAt: string | null;
	heartbeatAt: string | null;
	attemptCount: number;
	requeueCount: number;
	retryWaitUntil: string | null;
	priority: number;
	parallelizable: boolean;
	createdAt: string;
	startedAt: string | null;
	finishedAt: string | null;
}

export interface EdgeInput {
	fromNodeId: string;
	toNodeId: string;
	edgeType?: EdgeType;
}

export interface EdgeRow {
	runId: string;
	fromNodeId: string;
	toNodeId: string;
	edgeType: EdgeType;
}

/** A whole DAG submission: run header + nodes + edges. */
export interface DagSubmission {
	run: RunInput;
	nodes: readonly NodeInput[];
	edges?: readonly EdgeInput[];
}

/** Outcome of an idempotent DAG ingestion. */
export interface DagIngestionResult {
	runId: string;
	dagHash: string;
	/** All node ids present after ingestion, in submission order. */
	nodeIds: string[];
	/** Node ids freshly inserted by this call. */
	insertedNodeIds: string[];
	/** Node ids that already existed (idempotency hit). */
	reusedNodeIds: string[];
}

export interface LeaseInput {
	leaseId: string;
	ownerToken: string;
	/** ISO-8601 absolute expiry deadline. */
	expiresAt: string;
	/** ISO-8601 issue time; defaults to now() in the implementation. */
	now?: string;
}

export interface LeaseRow {
	leaseId: string;
	runId: string;
	nodeId: string;
	attemptId: string | null;
	issuedAt: string;
	expiresAt: string;
	heartbeatAt: string | null;
	ownerToken: string;
	released: boolean;
}

/** One undirected edge of the conflict graph (always stored nodeA < nodeB). */
export interface ConflictEdge {
	runId: string;
	nodeA: string;
	nodeB: string;
	reason: ConflictReason;
}

export interface AttemptInput {
	attemptId: string;
	runId: string;
	nodeId: string;
	leaseId: string;
	status: "running" | "completed" | "failed" | "rolled_back" | "in_doubt";
	startedAt?: string;
	finishedAt?: string;
	exitCode?: number;
	errorSummary?: JsonValue;
	workerPid?: number;
}

export interface WorktreeInput {
	worktreeId: string;
	runId: string;
	nodeId: string;
	path: string;
	branchName: string;
	status?: "active" | "merged" | "reclaimed" | "orphaned";
	createdAt?: string;
}

export interface ArtifactInput {
	artifactId: string;
	runId: string;
	nodeId: string;
	attemptId?: string;
	path: string;
	kind: "evidence" | "patch" | "result" | "checkpoint" | "contract";
	sha256?: string;
	sizeBytes?: number;
	createdAt?: string;
}

/** A durable compensator row (mirrors recovery.ts CompensatorStep + run/node). */
export interface CompensatorInput {
	compensatorId: string;
	runId: string;
	nodeId: string;
	kind: string;
	sequence: number;
	idempotent: boolean;
	applied: boolean;
	preparedStateHash?: string | null;
	createdAt?: string;
}

export interface SchedulerEventInput {
	eventId: string;
	runId: string;
	operationId: string;
	sequence: number;
	timestamp: string;
	kind: string;
	status: string;
	causationId?: string | null;
	nodeId?: string | null;
	data?: JsonValue;
}

export interface SchedulerEventRow {
	eventId: string;
	runId: string;
	operationId: string;
	causationId: string | null;
	sequence: number;
	timestamp: string;
	kind: string;
	status: string;
	nodeId: string | null;
	data: JsonValue;
}

/**
 * The durable scheduler persistence contract. Mutating methods that race a
 * status guard return `boolean` (true iff the row was actually changed) so
 * callers get guard-based CAS semantics. All methods are synchronous because
 * both `node:sqlite` and `better-sqlite3` are synchronous.
 */
export interface SchedulerStore {
	// connection / schema
	open(path: string): void;
	close(): void;
	createSchema(): void;
	exec(sql: string): void;
	/** Read a single PRAGMA scalar (first column of the first row). */
	pragma(name: string): JsonValue;

	// run lifecycle
	createRun(run: RunInput): void;
	getRun(runId: string): RunRow | undefined;
	updateRunStatus(runId: string, status: RunStatus, now?: string): boolean;

	// DAG ingestion (idempotent)
	ingestDag(submission: DagSubmission): DagIngestionResult;
	getNode(runId: string, nodeId: string): NodeRow | undefined;
	getNodesByRun(runId: string): NodeRow[];
	getEdgesByRun(runId: string): EdgeRow[];

	// conflict graph
	buildConflictGraph(runId: string): ConflictEdge[];
	getConflicts(runId: string): ConflictEdge[];

	// lease lifecycle (owner-token fenced)
	acquireLease(runId: string, nodeId: string, lease: LeaseInput): boolean;
	heartbeat(runId: string, nodeId: string, ownerToken: string, now: string, expiresAt: string): boolean;
	startNode(runId: string, nodeId: string, ownerToken: string, now: string): boolean;
	reclaimExpiredLeases(runId: string, now: string): string[];
	getLease(leaseId: string): LeaseRow | undefined;

	// scaffolded sibling-lane tables (schema-complete, minimal writers)
	recordAttempt(attempt: AttemptInput): void;
	getAttemptsByRun(runId: string): AttemptInput[];
	registerWorktree(worktree: WorktreeInput): void;
	getWorktreesByRun(runId: string): WorktreeInput[];
	registerCompensator(compensator: CompensatorInput): void;
	getCompensatorsByNode(runId: string, nodeId: string): CompensatorInput[];
	recordArtifact(artifact: ArtifactInput): void;
	getArtifactsByRun(runId: string): ArtifactInput[];

	// ledger mirror
	appendEvent(event: SchedulerEventInput): void;
	getEvents(runId: string): SchedulerEventRow[];
}

/**
 * Canonical connection pragmas. WAL is a no-op for `:memory:` databases (SQLite
 * keeps an in-memory journal there) but is applied verbatim for file stores.
 */
export const SCHEDULER_STORE_PRAGMAS: readonly string[] = [
	"PRAGMA journal_mode = WAL",
	"PRAGMA synchronous = NORMAL",
	"PRAGMA busy_timeout = 5000",
	"PRAGMA foreign_keys = ON",
	"PRAGMA temp_store = MEMORY",
];

/** Tables the schema must create, in dependency-safe creation order. */
export const SCHEDULER_STORE_TABLES: readonly string[] = [
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
];

/**
 * Canonical SQLite WAL DDL. Parent tables precede children so FK declarations
 * resolve cleanly. This is the single source of truth for the durable schema.
 */
export const SCHEDULER_STORE_SCHEMA = `
CREATE TABLE IF NOT EXISTS runs (
  run_id        TEXT PRIMARY KEY,
  goal          TEXT NOT NULL,
  topology      TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running','paused','completed','failed','cancelled')),
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  completed_at  TEXT,
  dag_hash      TEXT,
  root_node_id  TEXT
);

CREATE TABLE IF NOT EXISTS nodes (
  node_id           TEXT NOT NULL,
  run_id            TEXT NOT NULL,
  role              TEXT NOT NULL
    CHECK (role IN ('planner','explorer','coder','tester','reviewer','security','memory','synthesizer')),
  task              TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','leased','running','verifying','completed','retry_wait',
                      'compensating','rolled_back','in_doubt','blocked','cancelled','failed')),
  idempotency_key   TEXT NOT NULL,
  read_set          TEXT NOT NULL DEFAULT '[]',
  write_set         TEXT NOT NULL DEFAULT '[]',
  lease_id          TEXT,
  lease_expires_at  TEXT,
  heartbeat_at      TEXT,
  retry_policy      TEXT NOT NULL DEFAULT '{}',
  verification_contract TEXT,
  cost_budget       REAL,
  attempt_count     INTEGER NOT NULL DEFAULT 0,
  requeue_count     INTEGER NOT NULL DEFAULT 0,
  retry_wait_until  TEXT,
  created_at        TEXT NOT NULL,
  started_at        TEXT,
  finished_at       TEXT,
  priority          INTEGER NOT NULL DEFAULT 0,
  parallelizable    INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (run_id, node_id),
  FOREIGN KEY (run_id) REFERENCES runs(run_id) ON DELETE CASCADE,
  UNIQUE (run_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS edges (
  run_id        TEXT NOT NULL,
  from_node_id  TEXT NOT NULL,
  to_node_id    TEXT NOT NULL,
  edge_type     TEXT NOT NULL DEFAULT 'strong'
    CHECK (edge_type IN ('strong','weak')),
  PRIMARY KEY (run_id, from_node_id, to_node_id),
  FOREIGN KEY (run_id) REFERENCES runs(run_id) ON DELETE CASCADE,
  FOREIGN KEY (run_id, from_node_id) REFERENCES nodes(run_id, node_id) ON DELETE CASCADE,
  FOREIGN KEY (run_id, to_node_id)   REFERENCES nodes(run_id, node_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS access (
  access_id     TEXT PRIMARY KEY,
  run_id        TEXT NOT NULL,
  node_id       TEXT NOT NULL,
  kind          TEXT NOT NULL CHECK (kind IN ('read','write')),
  path          TEXT NOT NULL,
  symbols       TEXT NOT NULL DEFAULT '[]',
  FOREIGN KEY (run_id, node_id) REFERENCES nodes(run_id, node_id) ON DELETE CASCADE,
  UNIQUE (run_id, node_id, kind, path, symbols)
);

CREATE TABLE IF NOT EXISTS conflicts (
  run_id        TEXT NOT NULL,
  node_a        TEXT NOT NULL,
  node_b        TEXT NOT NULL,
  reason        TEXT NOT NULL CHECK (reason IN ('write-write','write-read','read-write')),
  PRIMARY KEY (run_id, node_a, node_b),
  FOREIGN KEY (run_id, node_a) REFERENCES nodes(run_id, node_id) ON DELETE CASCADE,
  FOREIGN KEY (run_id, node_b) REFERENCES nodes(run_id, node_id) ON DELETE CASCADE,
  CHECK (node_a < node_b)
);

CREATE TABLE IF NOT EXISTS attempts (
  attempt_id    TEXT PRIMARY KEY,
  run_id        TEXT NOT NULL,
  node_id       TEXT NOT NULL,
  lease_id      TEXT NOT NULL,
  started_at    TEXT NOT NULL,
  finished_at   TEXT,
  status        TEXT NOT NULL
    CHECK (status IN ('running','completed','failed','rolled_back','in_doubt')),
  exit_code     INTEGER,
  error_summary TEXT,
  worker_pid    INTEGER,
  FOREIGN KEY (run_id, node_id) REFERENCES nodes(run_id, node_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS leases (
  lease_id      TEXT PRIMARY KEY,
  run_id        TEXT NOT NULL,
  node_id       TEXT NOT NULL,
  attempt_id    TEXT,
  issued_at     TEXT NOT NULL,
  expires_at    TEXT NOT NULL,
  heartbeat_at  TEXT,
  owner_token   TEXT NOT NULL,
  released      INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (run_id, node_id) REFERENCES nodes(run_id, node_id) ON DELETE CASCADE,
  FOREIGN KEY (attempt_id) REFERENCES attempts(attempt_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS artifacts (
  artifact_id   TEXT PRIMARY KEY,
  run_id        TEXT NOT NULL,
  node_id       TEXT NOT NULL,
  attempt_id    TEXT,
  path          TEXT NOT NULL,
  kind          TEXT NOT NULL
    CHECK (kind IN ('evidence','patch','result','checkpoint','contract')),
  sha256        TEXT,
  size_bytes    INTEGER,
  created_at    TEXT NOT NULL,
  FOREIGN KEY (run_id, node_id) REFERENCES nodes(run_id, node_id) ON DELETE CASCADE,
  FOREIGN KEY (attempt_id) REFERENCES attempts(attempt_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS worktrees (
  worktree_id   TEXT PRIMARY KEY,
  run_id        TEXT NOT NULL,
  node_id       TEXT NOT NULL,
  path          TEXT NOT NULL,
  branch_name   TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','merged','reclaimed','orphaned')),
  created_at    TEXT NOT NULL,
  FOREIGN KEY (run_id, node_id) REFERENCES nodes(run_id, node_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS merge_queue (
  queue_id          TEXT PRIMARY KEY,
  run_id            TEXT NOT NULL,
  node_id           TEXT NOT NULL,
  branch_name       TEXT NOT NULL,
  target_branch     TEXT NOT NULL DEFAULT 'main',
  status            TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','merging','merged','conflict','blocked')),
  priority          INTEGER NOT NULL DEFAULT 0,
  dag_depth         INTEGER NOT NULL DEFAULT 0,
  lease_finished_at TEXT,
  created_at        TEXT NOT NULL,
  merged_at         TEXT,
  FOREIGN KEY (run_id, node_id) REFERENCES nodes(run_id, node_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS compensators (
  compensator_id      TEXT PRIMARY KEY,
  run_id              TEXT NOT NULL,
  node_id             TEXT NOT NULL,
  kind                TEXT NOT NULL,
  sequence            INTEGER NOT NULL,
  idempotent          INTEGER NOT NULL DEFAULT 1,
  applied             INTEGER NOT NULL DEFAULT 0,
  prepared_state_hash TEXT,
  created_at          TEXT NOT NULL,
  FOREIGN KEY (run_id, node_id) REFERENCES nodes(run_id, node_id) ON DELETE CASCADE,
  UNIQUE (run_id, node_id, sequence)
);

CREATE TABLE IF NOT EXISTS events (
  event_id      TEXT PRIMARY KEY,
  run_id        TEXT NOT NULL,
  operation_id  TEXT NOT NULL,
  causation_id  TEXT,
  sequence      INTEGER NOT NULL,
  timestamp     TEXT NOT NULL,
  kind          TEXT NOT NULL,
  status        TEXT NOT NULL,
  node_id       TEXT,
  data          TEXT NOT NULL,
  FOREIGN KEY (run_id) REFERENCES runs(run_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_nodes_dispatch
  ON nodes(run_id, status, retry_wait_until, priority, attempt_count)
  WHERE status IN ('queued','retry_wait');
CREATE INDEX IF NOT EXISTS idx_nodes_lease ON nodes(run_id, lease_id);
CREATE INDEX IF NOT EXISTS idx_nodes_expired
  ON nodes(lease_expires_at)
  WHERE status = 'leased' OR status = 'running' OR status = 'verifying';
CREATE INDEX IF NOT EXISTS idx_edges_to   ON edges(run_id, to_node_id);
CREATE INDEX IF NOT EXISTS idx_edges_from ON edges(run_id, from_node_id);
CREATE INDEX IF NOT EXISTS idx_access_node ON access(run_id, node_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_run ON conflicts(run_id, node_a, node_b);
CREATE INDEX IF NOT EXISTS idx_artifacts_path ON artifacts(run_id, path);
CREATE INDEX IF NOT EXISTS idx_events_run_seq ON events(run_id, sequence);
CREATE INDEX IF NOT EXISTS idx_events_node    ON events(run_id, node_id, sequence);
`;

/**
 * Thrown when a DAG re-submission reuses an existing `node_id` within a run but
 * supplies a different canonical descriptor. DAGs are immutable within a run:
 * identical re-submissions are idempotent replays, but a changed definition for
 * an existing node id is a divergence the store surfaces fail-closed instead of
 * silently keeping the old or overwriting with the new.
 */
export class NodeRedefinitionError extends Error {
	readonly runId: string;
	readonly nodeId: string;
	constructor(runId: string, nodeId: string) {
		super(
			`node "${nodeId}" in run "${runId}" was redefined with a different descriptor; DAGs are immutable within a run`,
		);
		this.name = "NodeRedefinitionError";
		this.runId = runId;
		this.nodeId = nodeId;
	}
}

/** Default retry policy applied when a node omits one. */
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
	maxAttempts: 3,
	baseMs: 1000,
	maxMs: 30000,
	multiplier: 2,
};

/**
 * Canonicalize one access entry: drop undefined symbols, sort symbols, so the
 * stable key never depends on declaration order.
 */
export function canonicalizeAccessEntry(entry: AccessSetEntry): { path: string; symbols: string[] } {
	const symbols = entry.symbols === undefined ? [] : [...entry.symbols].sort(compareString);
	return { path: entry.path, symbols };
}

/** Canonicalize an access set: canonicalize each entry, then sort entries. */
export function canonicalizeAccessSet(
	entries: readonly AccessSetEntry[] | undefined,
): { path: string; symbols: string[] }[] {
	const canonical = (entries ?? []).map(canonicalizeAccessEntry);
	canonical.sort((a, b) => {
		const byPath = compareString(a.path, b.path);
		if (byPath !== 0) {
			return byPath;
		}
		return compareString(stableStringify(a.symbols), stableStringify(b.symbols));
	});
	return canonical;
}

/**
 * Deterministic node descriptor used for idempotency. Excludes runtime state
 * (status, leases, counters) so identical logical work always hashes the same.
 */
export function canonicalNodeDescriptor(node: NodeInput): JsonValue {
	return {
		nodeId: node.nodeId,
		role: node.role,
		task: node.task,
		priority: node.priority ?? 0,
		parallelizable: node.parallelizable ?? true,
		readSet: canonicalizeAccessSet(node.readSet),
		writeSet: canonicalizeAccessSet(node.writeSet),
	};
}

/**
 * Stable idempotency key: `sha256(stableStringify({runId, descriptor}))`.
 * Two submissions of identical logical work produce the same key, so DAG
 * ingestion can deduplicate across root-coordinator retries (foundation §6.5).
 */
export function computeIdempotencyKey(runId: string, node: NodeInput): string {
	return sha256Hex(stableStringify({ runId, descriptor: canonicalNodeDescriptor(node) }));
}

/** Stable hash over the whole DAG (nodes + edges), order-independent. */
export function computeDagHash(submission: DagSubmission): string {
	const nodes = submission.nodes.map(canonicalNodeDescriptor);
	nodes.sort((a, b) => compareString(stableStringify(a), stableStringify(b)));
	const edges = (submission.edges ?? []).map((edge) => ({
		fromNodeId: edge.fromNodeId,
		toNodeId: edge.toNodeId,
		edgeType: edge.edgeType ?? "strong",
	}));
	edges.sort((a, b) => compareString(stableStringify(a), stableStringify(b)));
	return sha256Hex(stableStringify({ runId: submission.run.runId, nodes, edges }));
}

/**
 * Classify the conflict between two nodes in canonical (nodeA < nodeB) order.
 *
 * Existence is decided by the shared pure policy `nodesConflict`; the label is
 * derived from the same atomic `accessEntriesConflict` predicate. Precedence is
 * deterministic: write/write, then write/read, then read/write. Returns
 * undefined when the nodes do not conflict.
 */
export function classifyConflict(nodeA: SchedulerNode, nodeB: SchedulerNode): ConflictReason | undefined {
	if (!nodesConflict(nodeA, nodeB)) {
		return undefined;
	}
	if (setsConflict(nodeA.writeSet, nodeB.writeSet)) {
		return "write-write";
	}
	if (setsConflict(nodeA.writeSet, nodeB.readSet)) {
		return "write-read";
	}
	if (setsConflict(nodeA.readSet, nodeB.writeSet)) {
		return "read-write";
	}
	// nodesConflict was true, so one of the above must hold; fall back defensively.
	return "write-write";
}

function setsConflict(left: readonly AccessSetEntry[], right: readonly AccessSetEntry[]): boolean {
	for (const l of left) {
		for (const r of right) {
			if (accessEntriesConflict(l, r)) {
				return true;
			}
		}
	}
	return false;
}

function compareString(a: string, b: string): number {
	if (a < b) {
		return -1;
	}
	if (a > b) {
		return 1;
	}
	return 0;
}
