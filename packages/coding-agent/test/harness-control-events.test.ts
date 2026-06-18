import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
	createHarnessControlEvent,
	recordHarnessControlEvent,
	sanitizeHarnessControlEventData,
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

	it("writes append-only JSONL events with deterministic audit fields", () => {
		const root = createTempDir();
		const logPath = path.join(root, "events.jsonl");

		const result = recordHarnessControlEvent(
			"extension.migration.plan",
			"completed",
			{ actions: 1 },
			{ cwd: root, logPath, id: "event-1", now: new Date("2026-06-18T00:00:00Z") },
		);

		expect(result.ok).toBe(true);
		const lines = fs.readFileSync(logPath, "utf-8").trim().split("\n");
		expect(lines).toHaveLength(1);
		expect(JSON.parse(lines[0]!)).toMatchObject({
			schemaVersion: "omk.harness-control.event.v1",
			id: "event-1",
			timestamp: "2026-06-18T00:00:00.000Z",
			kind: "extension.migration.plan",
			status: "completed",
			cwd: root,
			data: { actions: 1 },
		});
	});

	it("redacts sensitive event data before persistence", () => {
		const data = sanitizeHarnessControlEventData({
			apiKey: "secret-value",
			nested: { authorization: "Bearer token", safe: "kept" },
		});

		expect(data).toEqual({
			apiKey: "[redacted]",
			nested: { authorization: "[redacted]", safe: "kept" },
		});
	});

	it("can create events without writing when callers need dry-run data", () => {
		const event = createHarnessControlEvent(
			"interactive.theme.apply",
			"failed",
			{ themeName: "missing" },
			{ cwd: "/tmp/project", id: "event-2", now: new Date("2026-06-18T01:00:00Z") },
		);

		expect(event).toMatchObject({
			id: "event-2",
			kind: "interactive.theme.apply",
			status: "failed",
			cwd: "/tmp/project",
			data: { themeName: "missing" },
		});
	});
});
