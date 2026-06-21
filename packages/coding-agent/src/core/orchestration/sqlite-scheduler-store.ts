/**
 * `node:sqlite` (DatabaseSync) implementation of {@link SchedulerStore}.
 *
 * This is the default durable driver for the DAG scheduler. It owns ONLY
 * persistence: schema creation, WAL pragmas, idempotent DAG ingestion, conflict
 * graph materialization (reusing the pure conflict policy), and owner-token
 * fenced lease lifecycle. It performs NO scheduling decisions and NO runtime
 * wiring — the dispatch engine consumes this store through the interface.
 *
 * Determinism: every method takes explicit ISO-8601 timestamps where time
 * matters, so tests drive it with fixed clocks. Guard-based CAS is implemented
 * with `UPDATE ... WHERE <guard>` and the `changes` count returned by the
 * driver. Erasable TypeScript only (no enum/namespace/parameter properties).
 *
 * Schema source of truth: `scheduler-store.ts`. Conflict policy: `scheduler-state.ts`.
 */

import { DatabaseSync } from "node:sqlite";
import { type JsonValue, stableStringify } from "./replay-ledger.ts";
import type { AccessSetEntry, SchedulerNode } from "./scheduler-state.ts";
import {
	type ArtifactInput,
	type AttemptInput,
	type CompensatorInput,
	type ConflictEdge,
	classifyConflict,
	computeDagHash,
	computeIdempotencyKey,
	type DagIngestionResult,
	type DagSubmission,
	DEFAULT_RETRY_POLICY,
	type EdgeRow,
	type LeaseInput,
	type LeaseRow,
	type NodeInput,
	NodeRedefinitionError,
	type NodeRow,
	type RunInput,
	type RunRow,
	type RunStatus,
	SCHEDULER_STORE_PRAGMAS,
	SCHEDULER_STORE_SCHEMA,
	type SchedulerEventInput,
	type SchedulerEventRow,
	type SchedulerStore,
	type WorktreeInput,
} from "./scheduler-store.ts";

/** A single row returned by the driver: column name -> scalar value. */
type SqliteRow = Record<string, string | number | bigint | null | Uint8Array>;

export class SqliteSchedulerStore implements SchedulerStore {
	private db: DatabaseSync | null = null;

	/** Construct a store; optionally open a database immediately. */
	constructor(path?: string) {
		if (path !== undefined) {
			this.open(path);
		}
	}

	open(path: string): void {
		if (this.db !== null) {
			throw new Error("SqliteSchedulerStore is already open");
		}
		this.db = new DatabaseSync(path);
		for (const pragma of SCHEDULER_STORE_PRAGMAS) {
			this.db.exec(pragma);
		}
	}

	close(): void {
		if (this.db !== null) {
			this.db.close();
			this.db = null;
		}
	}

	createSchema(): void {
		this.connection().exec(SCHEDULER_STORE_SCHEMA);
	}

	exec(sql: string): void {
		this.connection().exec(sql);
	}

	pragma(name: string): JsonValue {
		const row = this.connection().prepare(`PRAGMA ${name}`).get() as SqliteRow | undefined;
		if (row === undefined) {
			return null;
		}
		const keys = Object.keys(row);
		if (keys.length === 0) {
			return null;
		}
		return scalar(row[keys[0]]);
	}

	// --- run lifecycle ---------------------------------------------------------

	createRun(run: RunInput): void {
		const now = nowIso();
		this.connection()
			.prepare(
				`INSERT INTO runs (run_id, goal, topology, status, created_at, updated_at, dag_hash, root_node_id)
				 VALUES (?, ?, ?, 'running', ?, ?, ?, ?)`,
			)
			.run(run.runId, run.goal, run.topology, now, now, run.dagHash ?? null, run.rootNodeId ?? null);
	}

	getRun(runId: string): RunRow | undefined {
		const row = this.connection().prepare(`SELECT * FROM runs WHERE run_id = ?`).get(runId) as SqliteRow | undefined;
		return row === undefined ? undefined : mapRunRow(row);
	}

	updateRunStatus(runId: string, status: RunStatus, now?: string): boolean {
		const ts = now ?? nowIso();
		const completedAt = status === "completed" || status === "failed" || status === "cancelled" ? ts : null;
		const result = this.connection()
			.prepare(
				`UPDATE runs
				 SET status = ?, updated_at = ?, completed_at = COALESCE(?, completed_at)
				 WHERE run_id = ?`,
			)
			.run(status, ts, completedAt, runId);
		return changed(result);
	}

	// --- DAG ingestion (idempotent) -------------------------------------------

	ingestDag(submission: DagSubmission): DagIngestionResult {
		const db = this.connection();
		const dagHash = computeDagHash(submission);
		const nodeIds: string[] = [];
		const insertedNodeIds: string[] = [];
		const reusedNodeIds: string[] = [];

		this.transaction(() => {
			const now = nowIso();
			// Run header: insert once; never overwrite on replay.
			db.prepare(
				`INSERT OR IGNORE INTO runs (run_id, goal, topology, status, created_at, updated_at, dag_hash, root_node_id)
				 VALUES (?, ?, ?, 'running', ?, ?, ?, ?)`,
			).run(
				submission.run.runId,
				submission.run.goal,
				submission.run.topology,
				now,
				now,
				dagHash,
				submission.run.rootNodeId ?? null,
			);

			for (const node of submission.nodes) {
				const key = computeIdempotencyKey(submission.run.runId, node);
				// Identity is (run_id, node_id). The idempotency key (which itself
				// includes node_id) distinguishes a true replay from a redefinition.
				const existing = db
					.prepare(`SELECT idempotency_key FROM nodes WHERE run_id = ? AND node_id = ?`)
					.get(submission.run.runId, node.nodeId) as SqliteRow | undefined;
				if (existing !== undefined) {
					if (asString(existing.idempotency_key) !== key) {
						throw new NodeRedefinitionError(submission.run.runId, node.nodeId);
					}
					nodeIds.push(node.nodeId);
					reusedNodeIds.push(node.nodeId);
					continue;
				}
				this.insertNode(submission.run.runId, node, key, now);
				nodeIds.push(node.nodeId);
				insertedNodeIds.push(node.nodeId);
			}

			for (const edge of submission.edges ?? []) {
				db.prepare(
					`INSERT OR IGNORE INTO edges (run_id, from_node_id, to_node_id, edge_type)
					 VALUES (?, ?, ?, ?)`,
				).run(submission.run.runId, edge.fromNodeId, edge.toNodeId, edge.edgeType ?? "strong");
			}
		});

		return { runId: submission.run.runId, dagHash, nodeIds, insertedNodeIds, reusedNodeIds };
	}

	private insertNode(runId: string, node: NodeInput, idempotencyKey: string, now: string): void {
		const db = this.connection();
		const readSet = (node.readSet ?? []).map(normalizeAccessEntry);
		const writeSet = (node.writeSet ?? []).map(normalizeAccessEntry);
		db.prepare(
			`INSERT INTO nodes (
				node_id, run_id, role, task, status, idempotency_key,
				read_set, write_set, retry_policy, verification_contract, cost_budget,
				created_at, priority, parallelizable
			 ) VALUES (?, ?, ?, ?, 'queued', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		).run(
			node.nodeId,
			runId,
			node.role,
			node.task,
			idempotencyKey,
			JSON.stringify(readSet),
			JSON.stringify(writeSet),
			JSON.stringify(node.retryPolicy ?? DEFAULT_RETRY_POLICY),
			node.verificationContract ?? null,
			node.costBudget ?? null,
			now,
			node.priority ?? 0,
			node.parallelizable === false ? 0 : 1,
		);

		const insertAccess = db.prepare(
			`INSERT OR IGNORE INTO access (access_id, run_id, node_id, kind, path, symbols)
			 VALUES (?, ?, ?, ?, ?, ?)`,
		);
		for (const entry of readSet) {
			insertAccess.run(
				accessId(runId, node.nodeId, "read", entry),
				runId,
				node.nodeId,
				"read",
				entry.path,
				JSON.stringify(entry.symbols),
			);
		}
		for (const entry of writeSet) {
			insertAccess.run(
				accessId(runId, node.nodeId, "write", entry),
				runId,
				node.nodeId,
				"write",
				entry.path,
				JSON.stringify(entry.symbols),
			);
		}
	}

	getNode(runId: string, nodeId: string): NodeRow | undefined {
		const row = this.connection()
			.prepare(`SELECT * FROM nodes WHERE run_id = ? AND node_id = ?`)
			.get(runId, nodeId) as SqliteRow | undefined;
		return row === undefined ? undefined : mapNodeRow(row);
	}

	getNodesByRun(runId: string): NodeRow[] {
		const rows = this.connection()
			.prepare(`SELECT * FROM nodes WHERE run_id = ? ORDER BY node_id ASC`)
			.all(runId) as SqliteRow[];
		return rows.map(mapNodeRow);
	}

	getEdgesByRun(runId: string): EdgeRow[] {
		const rows = this.connection()
			.prepare(`SELECT * FROM edges WHERE run_id = ? ORDER BY from_node_id ASC, to_node_id ASC`)
			.all(runId) as SqliteRow[];
		return rows.map((row) => ({
			runId: asString(row.run_id),
			fromNodeId: asString(row.from_node_id),
			toNodeId: asString(row.to_node_id),
			edgeType: asString(row.edge_type) === "weak" ? "weak" : "strong",
		}));
	}

	// --- conflict graph --------------------------------------------------------

	buildConflictGraph(runId: string): ConflictEdge[] {
		const nodes = this.getNodesByRun(runId);
		const schedulerNodes = nodes.map(toSchedulerNode);
		const edges: ConflictEdge[] = [];

		this.transaction(() => {
			const db = this.connection();
			db.prepare(`DELETE FROM conflicts WHERE run_id = ?`).run(runId);
			const insert = db.prepare(
				`INSERT OR IGNORE INTO conflicts (run_id, node_a, node_b, reason) VALUES (?, ?, ?, ?)`,
			);
			for (let i = 0; i < schedulerNodes.length; i += 1) {
				for (let j = i + 1; j < schedulerNodes.length; j += 1) {
					// Canonical order: nodeA < nodeB (getNodesByRun already sorts by node_id).
					const a = schedulerNodes[i];
					const b = schedulerNodes[j];
					const reason = classifyConflict(a, b);
					if (reason === undefined) {
						continue;
					}
					insert.run(runId, a.nodeId, b.nodeId, reason);
					edges.push({ runId, nodeA: a.nodeId, nodeB: b.nodeId, reason });
				}
			}
		});

		return edges;
	}

	getConflicts(runId: string): ConflictEdge[] {
		const rows = this.connection()
			.prepare(`SELECT * FROM conflicts WHERE run_id = ? ORDER BY node_a ASC, node_b ASC`)
			.all(runId) as SqliteRow[];
		return rows.map((row) => ({
			runId: asString(row.run_id),
			nodeA: asString(row.node_a),
			nodeB: asString(row.node_b),
			reason: asString(row.reason) as ConflictEdge["reason"],
		}));
	}

	// --- lease lifecycle (owner-token fenced) ----------------------------------

	acquireLease(runId: string, nodeId: string, lease: LeaseInput): boolean {
		const db = this.connection();
		let acquired = false;
		this.transaction(() => {
			const result = db
				.prepare(
					`UPDATE nodes
					 SET status = 'leased', lease_id = ?, lease_expires_at = ?, heartbeat_at = NULL,
						 attempt_count = attempt_count + 1
					 WHERE run_id = ? AND node_id = ? AND status = 'queued'`,
				)
				.run(lease.leaseId, lease.expiresAt, runId, nodeId);
			if (!changed(result)) {
				// Guard lost (already leased / not queued): leave the transaction a no-op.
				return;
			}
			db.prepare(
				`INSERT INTO leases (lease_id, run_id, node_id, issued_at, expires_at, heartbeat_at, owner_token, released)
				 VALUES (?, ?, ?, ?, ?, NULL, ?, 0)`,
			).run(lease.leaseId, runId, nodeId, lease.now ?? nowIso(), lease.expiresAt, lease.ownerToken);
			acquired = true;
		});
		return acquired;
	}

	heartbeat(runId: string, nodeId: string, ownerToken: string, now: string, expiresAt: string): boolean {
		const db = this.connection();
		let ok = false;
		this.transaction(() => {
			const result = db
				.prepare(
					`UPDATE leases
					 SET heartbeat_at = ?, expires_at = ?
					 WHERE run_id = ? AND node_id = ? AND owner_token = ? AND released = 0`,
				)
				.run(now, expiresAt, runId, nodeId, ownerToken);
			if (!changed(result)) {
				return;
			}
			// Mirror the extension onto the scheduler's node view (reclaim reads nodes).
			db.prepare(
				`UPDATE nodes
				 SET heartbeat_at = ?, lease_expires_at = ?
				 WHERE run_id = ? AND node_id = ?
				   AND lease_id IN (SELECT lease_id FROM leases
									WHERE run_id = ? AND node_id = ? AND owner_token = ? AND released = 0)`,
			).run(now, expiresAt, runId, nodeId, runId, nodeId, ownerToken);
			ok = true;
		});
		return ok;
	}

	startNode(runId: string, nodeId: string, ownerToken: string, now: string): boolean {
		const result = this.connection()
			.prepare(
				`UPDATE nodes
				 SET status = 'running', started_at = ?, heartbeat_at = ?
				 WHERE run_id = ? AND node_id = ? AND status = 'leased'
				   AND lease_id IN (SELECT lease_id FROM leases
									WHERE run_id = ? AND node_id = ? AND owner_token = ? AND released = 0)`,
			)
			.run(now, now, runId, nodeId, runId, nodeId, ownerToken);
		return changed(result);
	}

	reclaimExpiredLeases(runId: string, now: string): string[] {
		const db = this.connection();
		const reclaimed: string[] = [];
		this.transaction(() => {
			const rows = db
				.prepare(
					`SELECT node_id, lease_id FROM nodes
					 WHERE run_id = ?
					   AND status IN ('leased','running','verifying')
					   AND lease_expires_at IS NOT NULL
					   AND lease_expires_at < ?`,
				)
				.all(runId, now) as SqliteRow[];
			for (const row of rows) {
				const nodeId = asString(row.node_id);
				const leaseId = row.lease_id === null ? null : asString(row.lease_id);
				if (leaseId !== null) {
					db.prepare(`UPDATE leases SET released = 1 WHERE lease_id = ?`).run(leaseId);
				}
				db.prepare(
					`UPDATE nodes
					 SET status = 'queued', lease_id = NULL, lease_expires_at = NULL, heartbeat_at = NULL,
						 requeue_count = requeue_count + 1
					 WHERE run_id = ? AND node_id = ?`,
				).run(runId, nodeId);
				reclaimed.push(nodeId);
			}
		});
		return reclaimed;
	}

	getLease(leaseId: string): LeaseRow | undefined {
		const row = this.connection().prepare(`SELECT * FROM leases WHERE lease_id = ?`).get(leaseId) as
			| SqliteRow
			| undefined;
		if (row === undefined) {
			return undefined;
		}
		return {
			leaseId: asString(row.lease_id),
			runId: asString(row.run_id),
			nodeId: asString(row.node_id),
			attemptId: row.attempt_id === null ? null : asString(row.attempt_id),
			issuedAt: asString(row.issued_at),
			expiresAt: asString(row.expires_at),
			heartbeatAt: row.heartbeat_at === null ? null : asString(row.heartbeat_at),
			ownerToken: asString(row.owner_token),
			released: asNumber(row.released) !== 0,
		};
	}

	// --- scaffolded sibling-lane tables ---------------------------------------

	recordAttempt(attempt: AttemptInput): void {
		this.connection()
			.prepare(
				`INSERT INTO attempts (attempt_id, run_id, node_id, lease_id, started_at, finished_at, status,
									   exit_code, error_summary, worker_pid)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.run(
				attempt.attemptId,
				attempt.runId,
				attempt.nodeId,
				attempt.leaseId,
				attempt.startedAt ?? nowIso(),
				attempt.finishedAt ?? null,
				attempt.status,
				attempt.exitCode ?? null,
				attempt.errorSummary === undefined ? null : stableStringify(attempt.errorSummary),
				attempt.workerPid ?? null,
			);
	}

	getAttemptsByRun(runId: string): AttemptInput[] {
		const rows = this.connection()
			.prepare(`SELECT * FROM attempts WHERE run_id = ? ORDER BY started_at ASC, attempt_id ASC`)
			.all(runId) as SqliteRow[];
		return rows.map((row) => ({
			attemptId: asString(row.attempt_id),
			runId: asString(row.run_id),
			nodeId: asString(row.node_id),
			leaseId: asString(row.lease_id),
			status: asString(row.status) as AttemptInput["status"],
			startedAt: asString(row.started_at),
			finishedAt: row.finished_at === null ? undefined : asString(row.finished_at),
			exitCode: row.exit_code === null ? undefined : asNumber(row.exit_code),
			errorSummary: row.error_summary === null ? undefined : (JSON.parse(asString(row.error_summary)) as JsonValue),
			workerPid: row.worker_pid === null ? undefined : asNumber(row.worker_pid),
		}));
	}

	registerWorktree(worktree: WorktreeInput): void {
		this.connection()
			.prepare(
				`INSERT INTO worktrees (worktree_id, run_id, node_id, path, branch_name, status, created_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?)`,
			)
			.run(
				worktree.worktreeId,
				worktree.runId,
				worktree.nodeId,
				worktree.path,
				worktree.branchName,
				worktree.status ?? "active",
				worktree.createdAt ?? nowIso(),
			);
	}

	getWorktreesByRun(runId: string): WorktreeInput[] {
		const rows = this.connection()
			.prepare(`SELECT * FROM worktrees WHERE run_id = ? ORDER BY worktree_id ASC`)
			.all(runId) as SqliteRow[];
		return rows.map((row) => ({
			worktreeId: asString(row.worktree_id),
			runId: asString(row.run_id),
			nodeId: asString(row.node_id),
			path: asString(row.path),
			branchName: asString(row.branch_name),
			status: asString(row.status) as WorktreeInput["status"],
			createdAt: asString(row.created_at),
		}));
	}

	registerCompensator(compensator: CompensatorInput): void {
		this.connection()
			.prepare(
				`INSERT INTO compensators (compensator_id, run_id, node_id, kind, sequence, idempotent, applied,
										  prepared_state_hash, created_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.run(
				compensator.compensatorId,
				compensator.runId,
				compensator.nodeId,
				compensator.kind,
				compensator.sequence,
				compensator.idempotent ? 1 : 0,
				compensator.applied ? 1 : 0,
				compensator.preparedStateHash ?? null,
				compensator.createdAt ?? nowIso(),
			);
	}

	getCompensatorsByNode(runId: string, nodeId: string): CompensatorInput[] {
		const rows = this.connection()
			.prepare(`SELECT * FROM compensators WHERE run_id = ? AND node_id = ? ORDER BY sequence ASC`)
			.all(runId, nodeId) as SqliteRow[];
		return rows.map((row) => ({
			compensatorId: asString(row.compensator_id),
			runId: asString(row.run_id),
			nodeId: asString(row.node_id),
			kind: asString(row.kind),
			sequence: asNumber(row.sequence),
			idempotent: asNumber(row.idempotent) !== 0,
			applied: asNumber(row.applied) !== 0,
			preparedStateHash: row.prepared_state_hash === null ? null : asString(row.prepared_state_hash),
			createdAt: asString(row.created_at),
		}));
	}

	recordArtifact(artifact: ArtifactInput): void {
		this.connection()
			.prepare(
				`INSERT INTO artifacts (artifact_id, run_id, node_id, attempt_id, path, kind, sha256, size_bytes, created_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.run(
				artifact.artifactId,
				artifact.runId,
				artifact.nodeId,
				artifact.attemptId ?? null,
				artifact.path,
				artifact.kind,
				artifact.sha256 ?? null,
				artifact.sizeBytes ?? null,
				artifact.createdAt ?? nowIso(),
			);
	}

	getArtifactsByRun(runId: string): ArtifactInput[] {
		const rows = this.connection()
			.prepare(`SELECT * FROM artifacts WHERE run_id = ? ORDER BY path ASC, artifact_id ASC`)
			.all(runId) as SqliteRow[];
		return rows.map((row) => ({
			artifactId: asString(row.artifact_id),
			runId: asString(row.run_id),
			nodeId: asString(row.node_id),
			attemptId: row.attempt_id === null ? undefined : asString(row.attempt_id),
			path: asString(row.path),
			kind: asString(row.kind) as ArtifactInput["kind"],
			sha256: row.sha256 === null ? undefined : asString(row.sha256),
			sizeBytes: row.size_bytes === null ? undefined : asNumber(row.size_bytes),
			createdAt: asString(row.created_at),
		}));
	}

	// --- ledger mirror ---------------------------------------------------------

	appendEvent(event: SchedulerEventInput): void {
		this.connection()
			.prepare(
				`INSERT INTO events (event_id, run_id, operation_id, causation_id, sequence, timestamp, kind, status, node_id, data)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.run(
				event.eventId,
				event.runId,
				event.operationId,
				event.causationId ?? null,
				event.sequence,
				event.timestamp,
				event.kind,
				event.status,
				event.nodeId ?? null,
				stableStringify(event.data ?? null),
			);
	}

	getEvents(runId: string): SchedulerEventRow[] {
		const rows = this.connection()
			.prepare(`SELECT * FROM events WHERE run_id = ? ORDER BY sequence ASC, event_id ASC`)
			.all(runId) as SqliteRow[];
		return rows.map((row) => ({
			eventId: asString(row.event_id),
			runId: asString(row.run_id),
			operationId: asString(row.operation_id),
			causationId: row.causation_id === null ? null : asString(row.causation_id),
			sequence: asNumber(row.sequence),
			timestamp: asString(row.timestamp),
			kind: asString(row.kind),
			status: asString(row.status),
			nodeId: row.node_id === null ? null : asString(row.node_id),
			data: JSON.parse(asString(row.data)) as JsonValue,
		}));
	}

	// --- internals -------------------------------------------------------------

	private connection(): DatabaseSync {
		if (this.db === null) {
			throw new Error("SqliteSchedulerStore is not open");
		}
		return this.db;
	}

	/** Run `fn` inside a single transaction; rollback on throw. */
	private transaction(fn: () => void): void {
		const db = this.connection();
		db.exec("BEGIN");
		try {
			fn();
			db.exec("COMMIT");
		} catch (error) {
			db.exec("ROLLBACK");
			throw error;
		}
	}
}

function normalizeAccessEntry(entry: AccessSetEntry): { path: string; symbols: string[] } {
	return { path: entry.path, symbols: entry.symbols === undefined ? [] : [...entry.symbols] };
}

function accessId(runId: string, nodeId: string, kind: string, entry: { path: string; symbols: string[] }): string {
	return `${runId}\u0000${nodeId}\u0000${kind}\u0000${entry.path}\u0000${stableStringify([...entry.symbols].sort())}`;
}

function toSchedulerNode(row: NodeRow): SchedulerNode {
	return {
		nodeId: row.nodeId,
		status: row.status,
		priority: row.priority,
		parallelizable: row.parallelizable,
		readSet: row.readSet,
		writeSet: row.writeSet,
	};
}

function mapRunRow(row: SqliteRow): RunRow {
	return {
		runId: asString(row.run_id),
		goal: asString(row.goal),
		topology: asString(row.topology),
		status: asString(row.status) as RunStatus,
		createdAt: asString(row.created_at),
		updatedAt: asString(row.updated_at),
		completedAt: row.completed_at === null ? null : asString(row.completed_at),
		dagHash: row.dag_hash === null ? null : asString(row.dag_hash),
		rootNodeId: row.root_node_id === null ? null : asString(row.root_node_id),
	};
}

function mapNodeRow(row: SqliteRow): NodeRow {
	return {
		nodeId: asString(row.node_id),
		runId: asString(row.run_id),
		role: asString(row.role) as NodeRow["role"],
		task: asString(row.task),
		status: asString(row.status) as NodeRow["status"],
		idempotencyKey: asString(row.idempotency_key),
		readSet: parseAccessSet(asString(row.read_set)),
		writeSet: parseAccessSet(asString(row.write_set)),
		leaseId: row.lease_id === null ? null : asString(row.lease_id),
		leaseExpiresAt: row.lease_expires_at === null ? null : asString(row.lease_expires_at),
		heartbeatAt: row.heartbeat_at === null ? null : asString(row.heartbeat_at),
		attemptCount: asNumber(row.attempt_count),
		requeueCount: asNumber(row.requeue_count),
		retryWaitUntil: row.retry_wait_until === null ? null : asString(row.retry_wait_until),
		priority: asNumber(row.priority),
		parallelizable: asNumber(row.parallelizable) !== 0,
		createdAt: asString(row.created_at),
		startedAt: row.started_at === null ? null : asString(row.started_at),
		finishedAt: row.finished_at === null ? null : asString(row.finished_at),
	};
}

function parseAccessSet(json: string): AccessSetEntry[] {
	const parsed = JSON.parse(json) as Array<{ path: string; symbols?: string[] }>;
	return parsed.map((entry) =>
		entry.symbols !== undefined && entry.symbols.length > 0
			? { path: entry.path, symbols: entry.symbols }
			: { path: entry.path },
	);
}

function changed(result: { changes: number | bigint }): boolean {
	return Number(result.changes) > 0;
}

function scalar(value: string | number | bigint | null | Uint8Array): JsonValue {
	if (value === null) {
		return null;
	}
	if (typeof value === "bigint") {
		return Number(value);
	}
	if (value instanceof Uint8Array) {
		return Buffer.from(value).toString("base64");
	}
	return value;
}

function asString(value: string | number | bigint | null | Uint8Array): string {
	if (typeof value === "string") {
		return value;
	}
	if (value === null) {
		throw new Error("expected string column, got null");
	}
	if (typeof value === "bigint" || typeof value === "number") {
		return String(value);
	}
	throw new Error("expected string column, got blob");
}

function asNumber(value: string | number | bigint | null | Uint8Array): number {
	if (typeof value === "number") {
		return value;
	}
	if (typeof value === "bigint") {
		return Number(value);
	}
	if (typeof value === "string") {
		return Number(value);
	}
	throw new Error("expected numeric column");
}

function nowIso(): string {
	return new Date().toISOString();
}
