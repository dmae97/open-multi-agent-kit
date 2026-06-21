import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
	type AnchoredEditMode,
	createReadAnchor,
	decideAnchoredEdit,
	READ_ANCHOR_SCHEMA_VERSION,
	type ReadAnchor,
	validateReadAnchor,
	verifyReadAnchor,
} from "../src/core/read-anchors.ts";

function sha256(content: string): string {
	return createHash("sha256").update(content, "utf8").digest("hex");
}

const FILE = "line1\nline2\nline3\nline4\nline5\n";

describe("createReadAnchor", () => {
	it("hashes the whole file and the read block, resolving the range", () => {
		const anchor = createReadAnchor({ path: "f.ts", content: FILE, offset: 2, limit: 2, readId: "r1" });
		expect(anchor.schemaVersion).toBe(READ_ANCHOR_SCHEMA_VERSION);
		expect(anchor.readId).toBe("r1");
		expect(anchor.path).toBe("f.ts");
		expect(anchor.fileSha256).toBe(sha256(FILE));
		expect(anchor.range).toEqual({ offset: 2, limit: 2, endLine: 3 });
		expect(anchor.blockSha256).toBe(sha256("line2\nline3"));
	});

	it("defaults to the whole file when no range is given", () => {
		const anchor = createReadAnchor({ path: "f.ts", content: FILE, readId: "r2" });
		expect(anchor.range.offset).toBe(1);
		// FILE has a trailing newline -> split yields a trailing empty element.
		expect(anchor.blockSha256).toBe(sha256(FILE));
	});

	it("normalizes CRLF before hashing so anchors are newline-agnostic", () => {
		const lf = createReadAnchor({ path: "f.ts", content: "a\nb\nc", readId: "r3" });
		const crlf = createReadAnchor({ path: "f.ts", content: "a\r\nb\r\nc", readId: "r3" });
		expect(crlf.fileSha256).toBe(lf.fileSha256);
		expect(crlf.blockSha256).toBe(lf.blockSha256);
	});

	it("clamps an out-of-range offset to an empty block at end of file", () => {
		const anchor = createReadAnchor({ path: "f.ts", content: "a\nb", offset: 99, readId: "r4" });
		expect(anchor.range).toEqual({ offset: 99, limit: 0, endLine: 98 });
		expect(anchor.blockSha256).toBe(sha256(""));
	});

	it("generates a unique readId when none is supplied", () => {
		const a = createReadAnchor({ path: "f.ts", content: FILE });
		const b = createReadAnchor({ path: "f.ts", content: FILE });
		expect(a.readId).not.toBe(b.readId);
		expect(a.readId.length).toBeGreaterThan(0);
	});
});

describe("verifyReadAnchor", () => {
	it("verifies an unchanged file and block", () => {
		const anchor = createReadAnchor({ path: "f.ts", content: FILE, offset: 2, limit: 2 });
		const result = verifyReadAnchor(anchor, FILE);
		expect(result.ok).toBe(true);
		expect(result.fileMatches).toBe(true);
		expect(result.blockMatches).toBe(true);
	});

	it("reports file mismatch but block match when an unrelated region changes", () => {
		const anchor = createReadAnchor({ path: "f.ts", content: FILE, offset: 2, limit: 2 });
		const changed = "line1\nline2\nline3\nCHANGED\nline5\n";
		const result = verifyReadAnchor(anchor, changed);
		expect(result.fileMatches).toBe(false);
		expect(result.blockMatches).toBe(true);
		expect(result.ok).toBe(false);
	});

	it("reports block mismatch when the anchored region changes", () => {
		const anchor = createReadAnchor({ path: "f.ts", content: FILE, offset: 2, limit: 2 });
		const changed = "line1\nCHANGED\nline3\nline4\nline5\n";
		const result = verifyReadAnchor(anchor, changed);
		expect(result.blockMatches).toBe(false);
		expect(result.ok).toBe(false);
	});
});

describe("validateReadAnchor", () => {
	it("accepts a created anchor", () => {
		const anchor = createReadAnchor({ path: "f.ts", content: FILE, readId: "r1" });
		const result = validateReadAnchor(anchor);
		expect(result.ok).toBe(true);
		expect(result.anchor?.readId).toBe("r1");
	});

	it("rejects malformed anchors", () => {
		expect(validateReadAnchor(null).ok).toBe(false);
		expect(validateReadAnchor({ schemaVersion: READ_ANCHOR_SCHEMA_VERSION }).ok).toBe(false);
		const bad = {
			schemaVersion: READ_ANCHOR_SCHEMA_VERSION,
			readId: "r",
			path: "f",
			fileSha256: "short",
			blockSha256: "short",
			range: { offset: -1, limit: 0, endLine: 0 },
		};
		const result = validateReadAnchor(bad);
		expect(result.ok).toBe(false);
		expect(result.errors.some((e) => e.includes("fileSha256"))).toBe(true);
		expect(result.errors.some((e) => e.includes("range.offset"))).toBe(true);
	});
});

describe("decideAnchoredEdit", () => {
	function anchorFor(content: string, offset?: number, limit?: number): ReadAnchor {
		return createReadAnchor({ path: "f.ts", content, offset, limit, readId: "r" });
	}

	it("allows an edit when the file is unchanged", () => {
		const anchor = anchorFor(FILE, 2, 2);
		const decision = decideAnchoredEdit({ anchor, currentContent: FILE });
		expect(decision.verdict).toBe("allow");
		expect(decision.fileChanged).toBe(false);
	});

	it("rejects a stale edit in strict mode (the default)", () => {
		const anchor = anchorFor(FILE, 2, 2);
		const changed = "line1\nline2\nline3\nCHANGED\nline5\n";
		const decision = decideAnchoredEdit({ anchor, currentContent: changed });
		expect(decision.verdict).toBe("reject-stale");
		expect(decision.fileChanged).toBe(true);
		expect(decision.reason).toContain("re-read");
	});

	it("allows a lenient edit when the anchored block is still uniquely locatable", () => {
		const anchor = anchorFor(FILE, 2, 1); // anchored block = "line2"
		const changed = "HEADER\nline1\nline2\nline3\nline4\nline5\n"; // file changed, block still unique
		const decision = decideAnchoredEdit({
			anchor,
			currentContent: changed,
			mode: "lenient",
			anchoredBlockText: "line2",
		});
		expect(decision.verdict).toBe("allow-lenient");
		expect(decision.blockRelocated).toBe(true);
		expect(decision.occurrences).toBe(1);
	});

	it("rejects a lenient edit when the anchored block is ambiguous (multiple matches)", () => {
		const anchor = anchorFor("dup\nother\n", 1, 1); // anchored block = "dup"
		const changed = "dup\nother\ndup\n"; // now two occurrences
		const decision = decideAnchoredEdit({
			anchor,
			currentContent: changed,
			mode: "lenient",
			anchoredBlockText: "dup",
		});
		expect(decision.verdict).toBe("reject-stale");
		expect(decision.occurrences).toBe(2);
		expect(decision.reason).toContain("ambiguous");
	});

	it("rejects a lenient edit when the anchored block no longer exists", () => {
		const anchor = anchorFor("alpha\nbeta\n", 1, 1); // anchored block = "alpha"
		const changed = "beta\ngamma\n";
		const decision = decideAnchoredEdit({
			anchor,
			currentContent: changed,
			mode: "lenient",
			anchoredBlockText: "alpha",
		});
		expect(decision.verdict).toBe("reject-stale");
		expect(decision.occurrences).toBe(0);
	});

	it("rejects lenient relocation when block text is missing or does not match the anchor hash", () => {
		const anchor = anchorFor(FILE, 2, 1); // block = "line2"
		const changed = "HEADER\nline2\nline3\n";

		const missing = decideAnchoredEdit({ anchor, currentContent: changed, mode: "lenient" });
		expect(missing.verdict).toBe("reject-stale");
		expect(missing.reason).toContain("requires the anchored block text");

		const wrong = decideAnchoredEdit({
			anchor,
			currentContent: changed,
			mode: "lenient" as AnchoredEditMode,
			anchoredBlockText: "not-the-block",
		});
		expect(wrong.verdict).toBe("reject-stale");
		expect(wrong.reason).toContain("does not match the anchored block hash");
	});
});
