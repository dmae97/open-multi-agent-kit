import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
	canonicalJson,
	createHarnessControlEvent,
	hashCanonical,
	recordHarnessControlEvent,
	sanitizeHarnessControlEventData,
	verifyHarnessControlLedger,
} from "../src/core/harness-control-events.ts";

describe("harness control event ledger", () => {
	const tempDirs: string[] = [];
	const previousEventLog = process.env.OMK_HARNESS_CONTROL_EVENT_LOG;
	const previousEventsEnabled = process.env.OMK_HARNESS_CONTROL_EVENTS;

	afterEach(() => {
		for (const dir of tempDirs.splice(0)) {
			fs.rmSync(dir, { recursive: true, force: true });
		}
		if (previousEventLog === undefined) {
			delete process.env.OMK_HARNESS_CONTROL_EVENT_LOG;
		} else {
			process.env.OMK_HARNESS_CONTROL_EVENT_LOG = previousEventLog;
		}
		if (previousEventsEnabled === undefined) {
			delete process.env.OMK_HARNESS_CONTROL_EVENTS;
		} else {
			process.env.OMK_HARNESS_CONTROL_EVENTS = previousEventsEnabled;
		}
	});

	function createTempDir(): string {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "omk-harness-events-"));
		tempDirs.push(dir);
		return dir;
	}

	it("writes V2 JSONL events with deterministic audit fields and hash chain", () => {
		const root = createTempDir();
		const logPath = path.join(root, "events.jsonl");

		const first = recordHarnessControlEvent(
			"extension.migration.plan",
			"started",
			{ actions: 1 },
			{
				cwd: root,
				logPath,
				eventId: "event-1",
				runId: "run-1",
				sessionId: "session-1",
				operationId: "op-1",
				now: new Date("2026-06-18T00:00:00Z"),
			},
		);
		const second = recordHarnessControlEvent(
			"extension.migration.plan",
			"completed",
			{ actions: 1 },
			{
				cwd: root,
				logPath,
				eventId: "event-2",
				runId: "run-1",
				sessionId: "session-1",
				operationId: "op-1",
				causationId: "event-1",
				now: new Date("2026-06-18T00:00:01Z"),
			},
		);

		expect(first.ok).toBe(true);
		expect(second.ok).toBe(true);
		const lines = fs.readFileSync(logPath, "utf-8").trim().split("\n");
		expect(lines).toHaveLength(2);
		const firstEvent = JSON.parse(lines[0]!);
		const secondEvent = JSON.parse(lines[1]!);
		expect(firstEvent).toMatchObject({
			schemaVersion: "omk.harness-control.event.v2",
			eventId: "event-1",
			runId: "run-1",
			sessionId: "session-1",
			operationId: "op-1",
			sequence: 1,
			previousEventHash: "0".repeat(64),
			data: { actions: 1 },
		});
		expect(secondEvent).toMatchObject({ sequence: 2, previousEventHash: firstEvent.eventHash });
		expect(verifyHarnessControlLedger(logPath)).toMatchObject({ ok: true, errors: [] });
	});

	it("redacts sensitive event data by key and value before persistence", () => {
		const data = sanitizeHarnessControlEventData({
			apiKey: "secret-value",
			message: "Authorization: Bearer abc.def.ghi and sk-proj-abcdefghijklmnop",
			nested: { authorization: "Bearer token", safe: "kept" },
		});

		expect(data).toEqual({
			apiKey: "[redacted]",
			message: "Authorization: Bearer [redacted] and [redacted]",
			nested: { authorization: "[redacted]", safe: "kept" },
		});
	});

	it("canonicalizes JSON before hashing", () => {
		expect(canonicalJson({ b: 2, a: 1 })).toBe(canonicalJson({ a: 1, b: 2 }));
		expect(hashCanonical({ b: 2, a: 1 })).toBe(hashCanonical({ a: 1, b: 2 }));
	});

	it("can create events without writing when callers need dry-run data", () => {
		const event = createHarnessControlEvent(
			"interactive.theme.apply",
			"failed",
			{ themeName: "missing" },
			{
				cwd: "/tmp/project",
				eventId: "event-2",
				runId: "run-1",
				sessionId: "session-1",
				operationId: "op-2",
				now: new Date("2026-06-18T01:00:00Z"),
			},
		);

		expect(event).toMatchObject({
			eventId: "event-2",
			kind: "interactive.theme.apply",
			status: "failed",
			cwd: "/tmp/project",
			data: { themeName: "missing" },
		});
		expect(event.eventHash).toMatch(/^[a-f0-9]{64}$/);
	});

	it("does not remove an existing lock when append acquisition fails", () => {
		const root = createTempDir();
		const logPath = path.join(root, "events.jsonl");
		const lockPath = `${logPath}.lock`;
		fs.mkdirSync(path.dirname(logPath), { recursive: true });
		fs.writeFileSync(lockPath, "other-writer", "utf-8");

		const result = recordHarnessControlEvent(
			"spec.compile",
			"completed",
			{},
			{ cwd: root, logPath, lockTimeoutMs: 0 },
		);

		expect(result.ok).toBe(false);
		expect(fs.existsSync(lockPath)).toBe(true);
	});

	it("detects tampering in persisted events", () => {
		const root = createTempDir();
		const logPath = path.join(root, "events.jsonl");
		recordHarnessControlEvent("spec.compile", "completed", { actions: 1 }, { cwd: root, logPath });
		const tampered = fs.readFileSync(logPath, "utf-8").replace("actions", "changedActions");
		fs.writeFileSync(logPath, tampered, "utf-8");

		const result = verifyHarnessControlLedger(logPath);

		expect(result.ok).toBe(false);
		expect(result.errors.join("\n")).toContain("hash mismatch");
	});

	it("rotates oversized ledgers under the append lock", () => {
		const root = createTempDir();
		const logPath = path.join(root, "events.jsonl");
		recordHarnessControlEvent("spec.compile", "completed", { large: "x".repeat(120) }, { cwd: root, logPath });

		const second = recordHarnessControlEvent(
			"spec.compile",
			"completed",
			{},
			{
				cwd: root,
				logPath,
				maxLedgerBytes: 20,
				now: new Date("2026-06-18T02:00:00Z"),
			},
		);

		expect(second.ok).toBe(true);
		expect(fs.existsSync(`${logPath}.2026-06-18T02-00-00-000Z.rotated`)).toBe(true);
		expect(verifyHarnessControlLedger(logPath)).toMatchObject({ ok: true });
	});

	it("hashes allowed artifact references and blocks sensitive paths", () => {
		const root = createTempDir();
		const artifact = path.join(root, "artifact.txt");
		const secret = path.join(root, ".env");
		fs.writeFileSync(artifact, "artifact", "utf-8");
		fs.writeFileSync(secret, "TOKEN=secret", "utf-8");

		const event = createHarnessControlEvent(
			"spec.compile",
			"completed",
			{},
			{ cwd: root, artifactRefs: ["artifact.txt", ".env"] },
		);

		expect(event.artifacts).toContainEqual(
			expect.objectContaining({ path: "artifact.txt", exists: true, allowed: true, sha256: expect.any(String) }),
		);
		expect(event.artifacts).toContainEqual(expect.objectContaining({ path: ".env", exists: true, allowed: false }));
	});

	it("continues the global sequence and hash chain across a rotation anchor", () => {
		const root = createTempDir();
		const logPath = path.join(root, "events.jsonl");
		const first = recordHarnessControlEvent(
			"spec.compile",
			"completed",
			{ large: "x".repeat(120) },
			{ cwd: root, logPath, operationId: "op-1" },
		);
		const second = recordHarnessControlEvent(
			"spec.compile",
			"completed",
			{},
			{ cwd: root, logPath, operationId: "op-2", maxLedgerBytes: 20, now: new Date("2026-06-18T02:00:00Z") },
		);

		expect(first.ok).toBe(true);
		expect(second.ok).toBe(true);
		const lines = fs.readFileSync(logPath, "utf-8").trim().split("\n");
		const anchor = JSON.parse(lines[0]!);
		const continuation = JSON.parse(lines[1]!);
		expect(anchor).toMatchObject({
			schemaVersion: "omk.harness-control.anchor.v1",
			anchoredSequence: 1,
			anchoredEventHash: first.event!.eventHash,
			rotatedFrom: "events.jsonl.2026-06-18T02-00-00-000Z.rotated",
		});
		expect(continuation).toMatchObject({ sequence: 2, previousEventHash: first.event!.eventHash });
		expect(verifyHarnessControlLedger(logPath)).toMatchObject({ ok: true, errors: [] });
	});

	it("rejects a ledger anchor that is not the first line", () => {
		const root = createTempDir();
		const logPath = path.join(root, "events.jsonl");
		recordHarnessControlEvent("spec.compile", "completed", {}, { cwd: root, logPath, operationId: "op-1" });
		const anchorLine = JSON.stringify({
			schemaVersion: "omk.harness-control.anchor.v1",
			anchoredSequence: 1,
			anchoredEventHash: "a".repeat(64),
			rotatedFrom: "events.jsonl.rotated",
			timestamp: "2026-06-18T02:00:00.000Z",
		});
		fs.appendFileSync(logPath, `${anchorLine}\n`);

		const result = verifyHarnessControlLedger(logPath);
		expect(result.ok).toBe(false);
		expect(result.errors.join("\n")).toContain("ledger anchor must be the first line");
	});

	it("rejects a leading anchor with invalid fields", () => {
		const root = createTempDir();
		const logPath = path.join(root, "events.jsonl");
		const badAnchor = JSON.stringify({
			schemaVersion: "omk.harness-control.anchor.v1",
			anchoredSequence: 0,
			anchoredEventHash: "not-hex",
			rotatedFrom: "events.jsonl.rotated",
			timestamp: "2026-06-18T02:00:00.000Z",
		});
		fs.writeFileSync(logPath, `${badAnchor}\n`, "utf-8");

		const result = verifyHarnessControlLedger(logPath);
		expect(result.ok).toBe(false);
		expect(result.errors.join("\n")).toContain("anchoredSequence");
	});

	it("blocks artifact references whose symlink target escapes allowed roots", () => {
		const root = createTempDir();
		const outside = createTempDir();
		const secret = path.join(outside, "escape.txt");
		fs.writeFileSync(secret, "escape", "utf-8");
		const link = path.join(root, "link.txt");
		fs.symlinkSync(secret, link);

		const event = createHarnessControlEvent(
			"spec.compile",
			"completed",
			{},
			{ cwd: root, artifactRefs: ["link.txt"] },
		);

		const entry = event.artifacts.find((artifact) => artifact.path === "link.txt");
		expect(entry).toMatchObject({ allowed: false });
		expect(entry?.error).toContain("outside");
		expect(entry?.sha256).toBeUndefined();
	});

	it("creates ledger directory with group/world-writable bits cleared", () => {
		const root = createTempDir();
		const logPath = path.join(root, "subdir", "events.jsonl");

		recordHarnessControlEvent("spec.compile", "completed", {}, { cwd: root, logPath });

		const dirStats = fs.statSync(path.dirname(logPath));
		expect(dirStats.mode & 0o022).toBe(0);
	});

	it("tightens existing ledger file permissions before append", () => {
		const root = createTempDir();
		const logPath = path.join(root, "events.jsonl");
		fs.writeFileSync(logPath, "", "utf-8");
		fs.chmodSync(logPath, 0o666);

		const result = recordHarnessControlEvent("spec.compile", "completed", {}, { cwd: root, logPath });

		expect(result.ok).toBe(true);
		expect(fs.statSync(logPath).mode & 0o077).toBe(0);
	});

	it("fails to write when the last ledger line is not valid JSON", () => {
		const root = createTempDir();
		const logPath = path.join(root, "events.jsonl");

		// Write a valid first event.
		recordHarnessControlEvent("spec.compile", "completed", {}, { cwd: root, logPath, operationId: "op-1" });

		// Corrupt the last line.
		fs.appendFileSync(logPath, "garbage not json\n", "utf-8");

		const result = recordHarnessControlEvent(
			"spec.compile",
			"completed",
			{},
			{ cwd: root, logPath, operationId: "op-2" },
		);

		expect(result.ok).toBe(false);
		expect(result.error).toContain("not valid JSON");
	});

	it("quarantines unsupported ledger records instead of replaying them", () => {
		const root = createTempDir();
		const logPath = path.join(root, "events.jsonl");
		recordHarnessControlEvent("spec.compile", "completed", {}, { cwd: root, logPath, operationId: "op-1" });
		fs.appendFileSync(logPath, `${JSON.stringify({ schemaVersion: "unknown", operationId: "bad-op" })}\n`, "utf-8");

		const result = verifyHarnessControlLedger(logPath);

		expect(result.ok).toBe(false);
		expect(result.events.map((event) => event.operationId)).toEqual(["op-1"]);
		expect(result.quarantinedLines).toEqual([
			expect.objectContaining({ lineNumber: 2, reason: expect.stringContaining("unsupported schemaVersion") }),
		]);
	});

	it("fails to write when the last ledger record has a missing eventHash", () => {
		const root = createTempDir();
		const logPath = path.join(root, "events.jsonl");

		// Write an incomplete record (simulating a truncated write).
		fs.mkdirSync(path.dirname(logPath), { recursive: true });
		fs.writeFileSync(
			logPath,
			`${JSON.stringify({
				schemaVersion: "omk.harness-control.event.v2",
				sequence: 1,
				// missing eventHash
			})}\n`,
			"utf-8",
		);

		const result = recordHarnessControlEvent("spec.compile", "completed", {}, { cwd: root, logPath });

		expect(result.ok).toBe(false);
		expect(result.error).toContain("eventHash");
	});
});
