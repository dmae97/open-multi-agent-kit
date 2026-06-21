import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { hashCanonical, recordHarnessControlEvent } from "../src/core/harness-control-events.ts";
import { replayHarnessControlEvents, verifyHarnessControlReplay } from "../src/core/harness-control-replay.ts";

const tempDirs: string[] = [];

afterEach(() => {
	for (const dir of tempDirs.splice(0)) {
		fs.rmSync(dir, { recursive: true, force: true });
	}
});

function createTempDir(): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "omk-harness-replay-"));
	tempDirs.push(dir);
	return dir;
}

describe("harness control replay", () => {
	it("verifies complete operations from a ledger", () => {
		const root = createTempDir();
		const logPath = path.join(root, "events.jsonl");
		recordHarnessControlEvent(
			"spec.compile",
			"started",
			{ feature: "002" },
			{ cwd: root, logPath, operationId: "op-1" },
		);
		recordHarnessControlEvent(
			"spec.compile",
			"completed",
			{ feature: "002" },
			{ cwd: root, logPath, operationId: "op-1" },
		);

		const report = verifyHarnessControlReplay(logPath);

		expect(report.ok).toBe(true);
		expect(report.operations).toMatchObject([{ operationId: "op-1", started: true, terminalStatus: "completed" }]);
	});

	it("fails replay when an operation starts without a terminal event", () => {
		const root = createTempDir();
		const logPath = path.join(root, "events.jsonl");
		recordHarnessControlEvent("spec.compile", "started", {}, { cwd: root, logPath, operationId: "op-2" });

		const report = verifyHarnessControlReplay(logPath);

		expect(report.ok).toBe(false);
		expect(report.errors).toContain("operation op-2 has no terminal event");
	});

	it("warns when replay sees a terminal event without a start", () => {
		const root = createTempDir();
		const completed = recordHarnessControlEvent("spec.compile", "completed", {}, { cwd: root, operationId: "op-3" });
		const report = replayHarnessControlEvents(completed.event ? [completed.event] : []);

		expect(report.ok).toBe(true);
		expect(report.warnings).toContain("operation op-3 has no started event");
	});

	it("rejects duplicate terminal events and events after terminal completion", () => {
		const root = createTempDir();
		const logPath = path.join(root, "events.jsonl");
		recordHarnessControlEvent("spec.compile", "started", {}, { cwd: root, logPath, operationId: "op-4" });
		recordHarnessControlEvent("spec.compile", "completed", {}, { cwd: root, logPath, operationId: "op-4" });
		recordHarnessControlEvent("spec.compile", "failed", {}, { cwd: root, logPath, operationId: "op-4" });

		const report = verifyHarnessControlReplay(logPath);

		expect(report.ok).toBe(false);
		expect(report.errors).toContain("operation op-4 has multiple terminal events");
		expect(report.errors).toContain("operation op-4 has event after terminal event");
	});

	it("rejects causation ids that do not point to an earlier event in the same correlation", () => {
		const root = createTempDir();
		const logPath = path.join(root, "events.jsonl");
		recordHarnessControlEvent("spec.compile", "started", {}, { cwd: root, logPath, operationId: "op-5" });
		recordHarnessControlEvent(
			"spec.compile",
			"completed",
			{},
			{
				cwd: root,
				logPath,
				operationId: "op-5",
				causationId: "missing-event",
			},
		);

		const report = verifyHarnessControlReplay(logPath);

		expect(report.ok).toBe(false);
		expect(report.errors).toContain(
			"event causation missing-event for operation op-5 does not reference an earlier event",
		);
	});

	it("reconstructs a deterministic final state hash across operation finals", () => {
		const root = createTempDir();
		const logPath = path.join(root, "events.jsonl");
		recordHarnessControlEvent("spec.compile", "started", {}, { cwd: root, logPath, operationId: "op-a" });
		recordHarnessControlEvent(
			"spec.compile",
			"completed",
			{},
			{
				cwd: root,
				logPath,
				operationId: "op-a",
				afterState: { compiled: true },
			},
		);
		recordHarnessControlEvent("spec.verify", "started", {}, { cwd: root, logPath, operationId: "op-b" });
		recordHarnessControlEvent(
			"spec.verify",
			"completed",
			{},
			{
				cwd: root,
				logPath,
				operationId: "op-b",
				afterState: { verified: true },
			},
		);

		const report = verifyHarnessControlReplay(logPath);

		expect(report.ok).toBe(true);
		expect(report.reconstructedStateHash).toBe(
			hashCanonical(
				report.operations.map((operation) => ({
					operationId: operation.operationId,
					kind: operation.kind,
					finalStateHash: operation.finalStateHash,
					terminalStatus: operation.terminalStatus,
				})),
			),
		);
	});

	function recordOperationWithArtifact(root: string, logPath: string): void {
		recordHarnessControlEvent("spec.compile", "started", {}, { cwd: root, logPath, operationId: "op-art" });
		recordHarnessControlEvent(
			"spec.compile",
			"completed",
			{},
			{ cwd: root, logPath, operationId: "op-art", artifactRefs: ["artifact.txt"] },
		);
	}

	it("re-verifies allowed artifacts during replay and passes when unchanged", () => {
		const root = createTempDir();
		const logPath = path.join(root, "events.jsonl");
		fs.writeFileSync(path.join(root, "artifact.txt"), "payload", "utf-8");
		recordOperationWithArtifact(root, logPath);

		expect(verifyHarnessControlReplay(logPath)).toMatchObject({ ok: true });
	});

	it("fails replay when an allowed artifact no longer matches its recorded hash", () => {
		const root = createTempDir();
		const logPath = path.join(root, "events.jsonl");
		const artifact = path.join(root, "artifact.txt");
		fs.writeFileSync(artifact, "payload", "utf-8");
		recordOperationWithArtifact(root, logPath);
		fs.writeFileSync(artifact, "tampered", "utf-8");

		const report = verifyHarnessControlReplay(logPath);
		expect(report.ok).toBe(false);
		expect(report.errors.join("\n")).toContain("artifact.txt");
		expect(report.errors.join("\n")).toContain("sha256");
	});

	it("warns but does not fail when an allowed artifact was removed before replay", () => {
		const root = createTempDir();
		const logPath = path.join(root, "events.jsonl");
		const artifact = path.join(root, "artifact.txt");
		fs.writeFileSync(artifact, "payload", "utf-8");
		recordOperationWithArtifact(root, logPath);
		fs.rmSync(artifact);

		const report = verifyHarnessControlReplay(logPath);
		expect(report.ok).toBe(true);
		expect(report.warnings.join("\n")).toContain("no longer present");
	});

	it("skips artifact rehash when verifyArtifacts is disabled", () => {
		const root = createTempDir();
		const logPath = path.join(root, "events.jsonl");
		const artifact = path.join(root, "artifact.txt");
		fs.writeFileSync(artifact, "payload", "utf-8");
		recordOperationWithArtifact(root, logPath);
		fs.writeFileSync(artifact, "tampered", "utf-8");

		expect(verifyHarnessControlReplay(logPath, { verifyArtifacts: false })).toMatchObject({ ok: true });
	});

	it("does not replay quarantined hash-mismatched events", () => {
		const root = createTempDir();
		const logPath = path.join(root, "events.jsonl");
		recordHarnessControlEvent("spec.compile", "started", {}, { cwd: root, logPath, operationId: "op-good" });
		recordHarnessControlEvent("spec.compile", "completed", {}, { cwd: root, logPath, operationId: "op-good" });
		recordHarnessControlEvent("spec.compile", "started", {}, { cwd: root, logPath, operationId: "op-bad" });
		const lines = fs.readFileSync(logPath, "utf-8").trim().split("\n");
		const badEvent = JSON.parse(lines[2]!) as Record<string, unknown>;
		badEvent.eventHash = "f".repeat(64);
		lines[2] = JSON.stringify(badEvent);
		fs.writeFileSync(logPath, `${lines.join("\n")}\n`, "utf-8");

		const report = verifyHarnessControlReplay(logPath);

		expect(report.ok).toBe(false);
		expect(report.operations.map((operation) => operation.operationId)).toEqual(["op-good"]);
		expect(report.errors.join("\n")).toContain("hash mismatch");
		expect(report.quarantinedLines).toEqual([
			expect.objectContaining({ lineNumber: 3, reason: expect.stringContaining("hash mismatch") }),
		]);
	});
});
