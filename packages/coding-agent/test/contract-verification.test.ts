import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	CONTRACT_RESULT_SCHEMA_VERSION,
	CONTRACT_VERIFY_EVENT_KIND,
	type ContractResult,
	verifyCliContract,
} from "../src/core/contract-verification.ts";
import { type HarnessControlEvent, verifyHarnessControlLedger } from "../src/core/harness-control-events.ts";

function sha256Hex(content: string): string {
	return `sha256:${createHash("sha256").update(content).digest("hex")}`;
}

function readEvents(logPath: string): HarnessControlEvent[] {
	return fs
		.readFileSync(logPath, "utf-8")
		.trim()
		.split("\n")
		.filter((line) => line.length > 0)
		.map((line) => JSON.parse(line) as HarnessControlEvent);
}

describe("verifyCliContract", () => {
	let cwd: string;
	let manifestPath: string;
	let testPath: string;
	let logPath: string;
	let resultPath: string;
	const manifestContent = '{"schemaVersion":"omk.cli-contract.v1.1"}';
	const testContent = 'it("contract", () => {});\n';

	beforeEach(() => {
		cwd = fs.mkdtempSync(path.join(os.tmpdir(), "omk-contract-verify-"));
		manifestPath = path.join(cwd, "manifest.v1.json");
		testPath = path.join(cwd, "contract.test.ts");
		logPath = path.join(cwd, "events.jsonl");
		resultPath = "contract-result.json";
		fs.writeFileSync(manifestPath, manifestContent);
		fs.writeFileSync(testPath, testContent);
	});

	afterEach(() => {
		fs.rmSync(cwd, { recursive: true, force: true });
	});

	function run(gateOk: boolean): Promise<ContractResult> {
		return verifyCliContract({
			contractId: "model-selector",
			contractVersion: "omk.cli-contract.v1.1",
			manifestPath,
			testPath,
			runGate: () => ({ ok: gateOk, details: gateOk ? undefined : "gate failed" }),
			cwd,
			logPath,
			resultPath,
		});
	}

	it("passes, hashes artifacts, and writes a contract result", async () => {
		const result = await run(true);

		expect(result.status).toBe("passed");
		expect(result.schemaVersion).toBe(CONTRACT_RESULT_SCHEMA_VERSION);
		expect(result.manifestHash).toBe(sha256Hex(manifestContent));
		expect(result.testFileHash).toBe(sha256Hex(testContent));
		expect(result.ledger.verified).toBe(true);
		expect(result.ledger.errors).toEqual([]);

		const written = JSON.parse(fs.readFileSync(path.join(cwd, resultPath), "utf-8")) as ContractResult;
		expect(written).toEqual(result);
	});

	it("records started then completed events on a valid hash chain", async () => {
		await run(true);
		const events = readEvents(logPath);

		expect(events.map((e) => e.kind)).toEqual([CONTRACT_VERIFY_EVENT_KIND, CONTRACT_VERIFY_EVENT_KIND]);
		expect(events.map((e) => e.status)).toEqual(["started", "completed"]);
		// Both events belong to the same operation, completed caused by started.
		expect(events[1].correlationId).toBe(events[0].correlationId);
		expect(events[1].causationId).toBe(events[0].eventId);
		expect(verifyHarnessControlLedger(logPath)).toMatchObject({ ok: true, errors: [] });
	});

	it("blocks and records a blocked event when the gate fails", async () => {
		const result = await run(false);

		expect(result.status).toBe("blocked");
		expect(result.gate).toEqual({ ok: false, details: "gate failed" });
		const events = readEvents(logPath);
		expect(events.at(-1)?.status).toBe("blocked");
		// A failing gate still leaves a valid (untampered) ledger.
		expect(result.ledger.verified).toBe(true);
	});

	it("changes the manifest hash when the manifest changes", async () => {
		const first = await run(true);
		fs.writeFileSync(manifestPath, '{"schemaVersion":"omk.cli-contract.v2"}');
		const second = await run(true);
		expect(second.manifestHash).not.toBe(first.manifestHash);
	});

	it("blocks when the audit ledger has been tampered with", async () => {
		await run(true);

		// Tamper the first recorded event's data without fixing its hashes.
		const lines = fs.readFileSync(logPath, "utf-8").trim().split("\n");
		const tampered = JSON.parse(lines[0]) as HarnessControlEvent;
		tampered.data = { ...tampered.data, injected: "tamper" };
		lines[0] = JSON.stringify(tampered);
		fs.writeFileSync(logPath, `${lines.join("\n")}\n`);

		// A standalone verification detects the break...
		const verification = verifyHarnessControlLedger(logPath);
		expect(verification.ok).toBe(false);
		expect(verification.errors.length).toBeGreaterThan(0);

		// ...and a subsequent contract verification is blocked by it.
		const result = await run(true);
		expect(result.ledger.verified).toBe(false);
		expect(result.status).toBe("blocked");
	});

	it("hashes extra contract files too", async () => {
		const extraPath = path.join(cwd, "regression.test.ts");
		const extraContent = "// regression\n";
		fs.writeFileSync(extraPath, extraContent);

		const result = await verifyCliContract({
			contractId: "model-selector",
			contractVersion: "omk.cli-contract.v1.1",
			manifestPath,
			testPath,
			extraFiles: [{ id: "regression", path: extraPath }],
			runGate: () => ({ ok: true }),
			cwd,
			logPath,
		});

		const extra = result.files.find((f) => f.id === "regression");
		expect(extra?.sha256).toBe(sha256Hex(extraContent));
	});
});
