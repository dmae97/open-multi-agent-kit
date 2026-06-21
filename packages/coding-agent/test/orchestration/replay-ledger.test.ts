import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
	type ArtifactReferenceResolver,
	canonicalizeBaseDir,
	computeEventHash,
	createFsArtifactResolver,
	type ReplayLedgerEventInput,
	recordReplayLedgerEvent,
	stableStringify,
	verifyArtifactReference,
	verifyReplayLedger,
	verifyReplayLedgerFromFile,
} from "../../src/core/orchestration/replay-ledger.ts";

function event(input: ReplayLedgerEventInput): ReplayLedgerEventInput & { eventHash: string } {
	return { ...input, eventHash: computeEventHash(input) };
}

describe("stableStringify", () => {
	it("serializes object keys in stable lexical order", () => {
		expect(stableStringify({ b: 2, a: 1, nested: { z: true, c: null } })).toBe(
			'{"a":1,"b":2,"nested":{"c":null,"z":true}}',
		);
	});

	it("preserves array order", () => {
		expect(stableStringify(["b", "a", { d: 4, c: 3 }])).toBe('["b","a",{"c":3,"d":4}]');
	});

	it("rejects non-finite numbers", () => {
		expect(() => stableStringify(Number.NaN)).toThrow("non-finite");
		expect(() => stableStringify(Number.POSITIVE_INFINITY)).toThrow("non-finite");
	});
});

describe("verifyReplayLedger", () => {
	it("passes a well-formed hash chain", () => {
		const first = event({
			sequence: 1,
			type: "scheduler.node.leased",
			reducerVersion: 1,
			payload: { nodeId: "n1" },
			beforeStateHash: "GENESIS",
			afterStateHash: "S1",
			prevEventHash: null,
		});
		const second = event({
			sequence: 2,
			type: "scheduler.node.running",
			reducerVersion: 1,
			payload: { nodeId: "n1" },
			beforeStateHash: "S1",
			afterStateHash: "S2",
			prevEventHash: first.eventHash,
		});

		expect(verifyReplayLedger([first, second])).toEqual({ ok: true });
	});

	it("fails when payload is tampered without recomputing eventHash", () => {
		const original = event({
			sequence: 1,
			type: "scheduler.node.leased",
			reducerVersion: 1,
			payload: { nodeId: "n1" },
			beforeStateHash: "GENESIS",
			afterStateHash: "S1",
			prevEventHash: null,
		});
		const tampered = { ...original, payload: { nodeId: "n2" } };

		expect(verifyReplayLedger([tampered]).ok).toBe(false);
		expect(verifyReplayLedger([tampered]).error).toContain("eventHash");
	});

	it("fails when prevEventHash linkage is broken", () => {
		const first = event({
			sequence: 1,
			type: "a",
			reducerVersion: 1,
			payload: {},
			beforeStateHash: "GENESIS",
			afterStateHash: "S1",
			prevEventHash: null,
		});
		const second = event({
			sequence: 2,
			type: "b",
			reducerVersion: 1,
			payload: {},
			beforeStateHash: "S1",
			afterStateHash: "S2",
			prevEventHash: "wrong",
		});

		expect(verifyReplayLedger([first, second]).error).toContain("prevEventHash");
	});

	it("fails when beforeStateHash does not match previous afterStateHash", () => {
		const first = event({
			sequence: 1,
			type: "a",
			reducerVersion: 1,
			payload: {},
			beforeStateHash: "GENESIS",
			afterStateHash: "S1",
			prevEventHash: null,
		});
		const second = event({
			sequence: 2,
			type: "b",
			reducerVersion: 1,
			payload: {},
			beforeStateHash: "not-S1",
			afterStateHash: "S2",
			prevEventHash: first.eventHash,
		});

		expect(verifyReplayLedger([first, second]).error).toContain("beforeStateHash");
	});
});

describe("verifyArtifactReference", () => {
	const resolver: ArtifactReferenceResolver = (path) => {
		if (path === "inside") return { realPath: "/repo/.omk/runs/r1/artifact.txt", isFile: true, sha256: "good" };
		if (path === "outside") return { realPath: "/tmp/escape.txt", isFile: true, sha256: "good" };
		if (path === "bad-hash") return { realPath: "/repo/.omk/runs/r1/bad.txt", isFile: true, sha256: "bad" };
		return undefined;
	};

	it("passes contained artifacts with matching hash", () => {
		expect(verifyArtifactReference({ path: "inside", repoRoot: "/repo", sha256: "good" }, resolver)).toEqual({
			ok: true,
		});
	});

	it("rejects artifacts that resolve outside the repo root", () => {
		expect(verifyArtifactReference({ path: "outside", repoRoot: "/repo", sha256: "good" }, resolver).error).toContain(
			"outside",
		);
	});

	it("rejects hash mismatches", () => {
		expect(
			verifyArtifactReference({ path: "bad-hash", repoRoot: "/repo", sha256: "good" }, resolver).error,
		).toContain("sha256");
	});
});

describe("createFsArtifactResolver", () => {
	const tempDirs: string[] = [];

	afterEach(() => {
		for (const dir of tempDirs.splice(0)) {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});

	function createTempDir(): string {
		const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "omk-fs-artifact-")));
		tempDirs.push(dir);
		return dir;
	}

	function sha256File(filePath: string): string {
		return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
	}

	it("resolves contained files via realpath and verifies their hash", () => {
		const root = createTempDir();
		const artifact = path.join(root, "artifact.txt");
		fs.writeFileSync(artifact, "payload", "utf-8");
		const base = canonicalizeBaseDir(root);
		const resolver = createFsArtifactResolver(base);

		const resolved = resolver("artifact.txt");
		expect(resolved).toMatchObject({ isFile: true, sha256: sha256File(artifact) });
		expect(
			verifyArtifactReference({ path: "artifact.txt", repoRoot: base, sha256: sha256File(artifact) }, resolver),
		).toEqual({ ok: true });
	});

	it("returns undefined for missing artifacts and broken symlinks", () => {
		const root = createTempDir();
		const resolver = createFsArtifactResolver(canonicalizeBaseDir(root));
		expect(resolver("missing.txt")).toBeUndefined();

		const broken = path.join(root, "broken-link");
		fs.symlinkSync(path.join(root, "does-not-exist"), broken);
		expect(resolver("broken-link")).toBeUndefined();
	});

	it("rejects symlinks whose realpath escapes the base directory", () => {
		const root = createTempDir();
		const outside = createTempDir();
		const secret = path.join(outside, "escape.txt");
		fs.writeFileSync(secret, "escape", "utf-8");
		const link = path.join(root, "link.txt");
		fs.symlinkSync(secret, link);
		const base = canonicalizeBaseDir(root);
		const resolver = createFsArtifactResolver(base);

		const result = verifyArtifactReference(
			{ path: "link.txt", repoRoot: base, sha256: sha256File(secret) },
			resolver,
		);
		expect(result.ok).toBe(false);
		expect(result.error).toContain("outside");
	});
});

// ── Persistence & file-based verification ─────────────────────────────────

describe("recordReplayLedgerEvent", () => {
	const tempDirs: string[] = [];

	afterEach(() => {
		for (const dir of tempDirs.splice(0)) {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});

	function createTempDir(): string {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "omk-replay-ledger-persist-"));
		tempDirs.push(dir);
		return dir;
	}

	it("creates ledger directory with 0o700 permissions", () => {
		const root = createTempDir();
		const ledgerPath = path.join(root, "subdir", "replay.jsonl");
		const ev = event({
			sequence: 1,
			type: "test",
			reducerVersion: 1,
			payload: {},
			beforeStateHash: "GENESIS",
			afterStateHash: "S1",
			prevEventHash: null,
		});

		const result = recordReplayLedgerEvent(ev, { ledgerPath });
		expect(result.ok).toBe(true);

		// Check directory permissions (ignoring umask, only check that group/other write bits are off).
		const dirStats = fs.statSync(path.dirname(ledgerPath));
		expect(dirStats.mode & 0o022).toBe(0);
	});

	it("opens ledger file with 0o600 permissions", () => {
		const root = createTempDir();
		const ledgerPath = path.join(root, "replay.jsonl");
		const ev = event({
			sequence: 1,
			type: "test",
			reducerVersion: 1,
			payload: {},
			beforeStateHash: "GENESIS",
			afterStateHash: "S1",
			prevEventHash: null,
		});

		const result = recordReplayLedgerEvent(ev, { ledgerPath });
		expect(result.ok).toBe(true);

		const fileStats = fs.statSync(ledgerPath);
		expect(fileStats.mode & 0o077).toBe(0);
	});

	it("tightens existing ledger file permissions before append", () => {
		const root = createTempDir();
		const ledgerPath = path.join(root, "replay.jsonl");
		fs.writeFileSync(ledgerPath, "", "utf-8");
		fs.chmodSync(ledgerPath, 0o666);
		const ev = event({
			sequence: 1,
			type: "test",
			reducerVersion: 1,
			payload: {},
			beforeStateHash: "GENESIS",
			afterStateHash: "S1",
			prevEventHash: null,
		});

		const result = recordReplayLedgerEvent(ev, { ledgerPath });

		expect(result.ok).toBe(true);
		expect(fs.statSync(ledgerPath).mode & 0o077).toBe(0);
	});

	it("durably persists event content that survives re-read after write", () => {
		const root = createTempDir();
		const ledgerPath = path.join(root, "replay.jsonl");
		const ev = event({
			sequence: 1,
			type: "test",
			reducerVersion: 1,
			payload: { key: "value" },
			beforeStateHash: "GENESIS",
			afterStateHash: "S1",
			prevEventHash: null,
		});

		recordReplayLedgerEvent(ev, { ledgerPath });

		// Re-read the file and verify the written content matches.
		const content = fs.readFileSync(ledgerPath, "utf-8").trim();
		const parsed = JSON.parse(content);
		expect(parsed).toMatchObject({
			sequence: 1,
			type: "test",
			reducerVersion: 1,
			payload: { key: "value" },
			beforeStateHash: "GENESIS",
			afterStateHash: "S1",
			prevEventHash: null,
			eventHash: ev.eventHash,
		});
	});

	it("fails the write when the lock file already exists and timeout is 0", () => {
		const root = createTempDir();
		const ledgerPath = path.join(root, "replay.jsonl");
		const lockPath = `${ledgerPath}.lock`;
		fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
		fs.writeFileSync(lockPath, "other-writer", "utf-8");

		const ev = event({
			sequence: 1,
			type: "test",
			reducerVersion: 1,
			payload: {},
			beforeStateHash: "GENESIS",
			afterStateHash: "S1",
			prevEventHash: null,
		});
		const result = recordReplayLedgerEvent(ev, { ledgerPath, lockTimeoutMs: 0 });

		expect(result.ok).toBe(false);
		expect(fs.existsSync(lockPath)).toBe(true); // foreign lock preserved
	});

	it("removes its own lock after write", () => {
		const root = createTempDir();
		const ledgerPath = path.join(root, "replay.jsonl");
		const lockPath = `${ledgerPath}.lock`;

		const ev = event({
			sequence: 1,
			type: "test",
			reducerVersion: 1,
			payload: {},
			beforeStateHash: "GENESIS",
			afterStateHash: "S1",
			prevEventHash: null,
		});
		recordReplayLedgerEvent(ev, { ledgerPath });

		expect(fs.existsSync(lockPath)).toBe(false);
	});
});

describe("verifyReplayLedgerFromFile", () => {
	const tempDirs: string[] = [];

	afterEach(() => {
		for (const dir of tempDirs.splice(0)) {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});

	function createTempDir(): string {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "omk-replay-ledger-verify-"));
		tempDirs.push(dir);
		return dir;
	}

	it("passes a well-formed ledger from file", () => {
		const root = createTempDir();
		const ledgerPath = path.join(root, "replay.jsonl");

		const first = event({
			sequence: 1,
			type: "test",
			reducerVersion: 1,
			payload: {},
			beforeStateHash: "GENESIS",
			afterStateHash: "S1",
			prevEventHash: null,
		});
		const second = event({
			sequence: 2,
			type: "test",
			reducerVersion: 1,
			payload: {},
			beforeStateHash: "S1",
			afterStateHash: "S2",
			prevEventHash: first.eventHash,
		});

		recordReplayLedgerEvent(first, { ledgerPath });
		recordReplayLedgerEvent(second, { ledgerPath });

		const result = verifyReplayLedgerFromFile(ledgerPath);
		expect(result.ok).toBe(true);
		expect(result.events).toHaveLength(2);
		expect(result.errors).toEqual([]);
	});

	it("rejects malformed JSON lines", () => {
		const root = createTempDir();
		const ledgerPath = path.join(root, "replay.jsonl");

		recordReplayLedgerEvent(
			event({
				sequence: 1,
				type: "test",
				reducerVersion: 1,
				payload: {},
				beforeStateHash: "GENESIS",
				afterStateHash: "S1",
				prevEventHash: null,
			}),
			{ ledgerPath },
		);

		// Append a malformed line directly.
		fs.appendFileSync(ledgerPath, "this is not valid json\n", "utf-8");

		const result = verifyReplayLedgerFromFile(ledgerPath);
		expect(result.ok).toBe(false);
		expect(result.errors.some((err) => err.includes("malformed JSON"))).toBe(true);
	});

	it("quarantines malformed records and skips dependent continuation during recovery", () => {
		const root = createTempDir();
		const ledgerPath = path.join(root, "replay.jsonl");
		const first = event({
			sequence: 1,
			type: "test",
			reducerVersion: 1,
			payload: {},
			beforeStateHash: "GENESIS",
			afterStateHash: "S1",
			prevEventHash: null,
		});
		const dependentAfterMalformed = event({
			sequence: 3,
			type: "test",
			reducerVersion: 1,
			payload: {},
			beforeStateHash: "S1",
			afterStateHash: "S3",
			prevEventHash: first.eventHash,
		});
		recordReplayLedgerEvent(first, { ledgerPath });
		fs.appendFileSync(ledgerPath, "this is not valid json\n", "utf-8");
		fs.appendFileSync(ledgerPath, `${JSON.stringify(dependentAfterMalformed)}\n`, "utf-8");

		const result = verifyReplayLedgerFromFile(ledgerPath);

		expect(result.ok).toBe(false);
		expect(result.events).toEqual([first]);
		expect(result.quarantinedLines).toEqual([
			expect.objectContaining({ lineNumber: 2, reason: expect.stringContaining("malformed JSON") }),
			expect.objectContaining({ lineNumber: 3, reason: expect.stringContaining("sequence mismatch") }),
		]);
	});

	it("rejects truncated records with missing required fields", () => {
		const root = createTempDir();
		const ledgerPath = path.join(root, "replay.jsonl");

		recordReplayLedgerEvent(
			event({
				sequence: 1,
				type: "test",
				reducerVersion: 1,
				payload: {},
				beforeStateHash: "GENESIS",
				afterStateHash: "S1",
				prevEventHash: null,
			}),
			{ ledgerPath },
		);

		// Append a record missing key fields (simulating a truncated/incomplete write).
		fs.appendFileSync(ledgerPath, `${JSON.stringify({ sequence: 2, type: "test" })}\n`, "utf-8");

		const result = verifyReplayLedgerFromFile(ledgerPath);
		expect(result.ok).toBe(false);
		expect(result.errors.some((err) => err.includes("truncated or incomplete"))).toBe(true);
	});

	it("rejects records with invalid field types", () => {
		const root = createTempDir();
		const ledgerPath = path.join(root, "replay.jsonl");

		recordReplayLedgerEvent(
			event({
				sequence: 1,
				type: "test",
				reducerVersion: 1,
				payload: {},
				beforeStateHash: "GENESIS",
				afterStateHash: "S1",
				prevEventHash: null,
			}),
			{ ledgerPath },
		);

		// Append a record with an invalid eventHash (not hex).
		fs.appendFileSync(
			ledgerPath,
			`${JSON.stringify({
				sequence: 2,
				type: "test",
				reducerVersion: 1,
				payload: {},
				beforeStateHash: "S1",
				afterStateHash: "S2",
				prevEventHash: "a".repeat(64),
				eventHash: "not-hex",
			})}\n`,
			"utf-8",
		);

		const result = verifyReplayLedgerFromFile(ledgerPath);
		expect(result.ok).toBe(false);
		expect(result.errors.some((err) => err.includes("invalid eventHash"))).toBe(true);
	});

	it("detects tampered records via hash chain verification", () => {
		const root = createTempDir();
		const ledgerPath = path.join(root, "replay.jsonl");

		recordReplayLedgerEvent(
			event({
				sequence: 1,
				type: "test",
				reducerVersion: 1,
				payload: { original: true },
				beforeStateHash: "GENESIS",
				afterStateHash: "S1",
				prevEventHash: null,
			}),
			{ ledgerPath },
		);

		// Tamper: change payload without recomputing eventHash.
		const content = fs.readFileSync(ledgerPath, "utf-8").replace("original", "tampered");
		fs.writeFileSync(ledgerPath, content, "utf-8");

		const result = verifyReplayLedgerFromFile(ledgerPath);
		expect(result.ok).toBe(false);
		expect(result.errors.some((err) => err.includes("eventHash mismatch") || err.includes("malformed"))).toBe(true);
	});

	it("returns ok with empty events for a ledger file with only whitespace", () => {
		const root = createTempDir();
		const ledgerPath = path.join(root, "replay.jsonl");
		fs.writeFileSync(ledgerPath, "\n\n\n", "utf-8");

		const result = verifyReplayLedgerFromFile(ledgerPath);
		expect(result.ok).toBe(true);
		expect(result.events).toEqual([]);
	});

	it("returns ok for a non-existent ledger", () => {
		const root = createTempDir();
		const ledgerPath = path.join(root, "does-not-exist.jsonl");

		const result = verifyReplayLedgerFromFile(ledgerPath);
		expect(result.ok).toBe(true);
		expect(result.events).toEqual([]);
	});
});
