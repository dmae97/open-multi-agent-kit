import { describe, expect, it } from "bun:test";
import { applyHeadTail, normalizeBashCommand } from "../../src/tools/bash-normalize";

describe("normalizeBashCommand", () => {
	describe("head/tail extraction", () => {
		it("extracts | head -n N", () => {
			const result = normalizeBashCommand("ls -la | head -n 50");
			expect(result.command).toBe("ls -la");
			expect(result.headLines).toBe(50);
			expect(result.tailLines).toBeUndefined();
		});

		it("extracts | head -N (short form)", () => {
			const result = normalizeBashCommand("cat file.txt | head -20");
			expect(result.command).toBe("cat file.txt");
			expect(result.headLines).toBe(20);
		});

		it("extracts | tail -n N", () => {
			const result = normalizeBashCommand("dmesg | tail -n 100");
			expect(result.command).toBe("dmesg");
			expect(result.tailLines).toBe(100);
			expect(result.headLines).toBeUndefined();
		});

		it("extracts | tail -N (short form)", () => {
			const result = normalizeBashCommand("journalctl | tail -50");
			expect(result.command).toBe("journalctl");
			expect(result.tailLines).toBe(50);
		});

		it("handles multiple spaces around pipe", () => {
			const result = normalizeBashCommand("git log   |   head -n 10");
			expect(result.command).toBe("git log");
			expect(result.headLines).toBe(10);
		});

		it("does not extract head/tail in middle of pipeline", () => {
			const result = normalizeBashCommand("cat file | head -n 10 | grep foo");
			expect(result.command).toBe("cat file | head -n 10 | grep foo");
			expect(result.headLines).toBeUndefined();
			expect(result.tailLines).toBeUndefined();
		});

		it("does not extract head without line count", () => {
			const result = normalizeBashCommand("cat file | head");
			expect(result.command).toBe("cat file | head");
			expect(result.headLines).toBeUndefined();
		});

		it("does not extract head with other flags", () => {
			const result = normalizeBashCommand("cat file | head -c 100");
			expect(result.command).toBe("cat file | head -c 100");
			expect(result.headLines).toBeUndefined();
		});
	});

	describe("2>&1 stripping", () => {
		it("strips 2>&1", () => {
			const result = normalizeBashCommand("make 2>&1");
			expect(result.command).toBe("make");
			expect(result.strippedRedirect).toBe(true);
		});

		it("strips 2>&1 before pipe", () => {
			const result = normalizeBashCommand("make 2>&1 | grep error");
			expect(result.command).toBe("make | grep error");
			expect(result.strippedRedirect).toBe(true);
		});

		it("strips multiple 2>&1", () => {
			const result = normalizeBashCommand("cmd1 2>&1 | cmd2 2>&1");
			expect(result.command).toBe("cmd1 | cmd2");
			expect(result.strippedRedirect).toBe(true);
		});

		it("reports no redirect stripped when none present", () => {
			const result = normalizeBashCommand("ls -la");
			expect(result.strippedRedirect).toBe(false);
		});
	});

	describe("combined patterns", () => {
		it("strips 2>&1 and extracts tail", () => {
			const result = normalizeBashCommand("make 2>&1 | tail -n 50");
			expect(result.command).toBe("make");
			expect(result.tailLines).toBe(50);
			expect(result.strippedRedirect).toBe(true);
		});

		it("handles complex command with 2>&1 before tail pipe", () => {
			const result = normalizeBashCommand(
				"podman build -f scripts/install-tests/tarball.dockerfile -t omp-test-tarball . 2>&1 | tail -60",
			);
			expect(result.command).toBe("podman build -f scripts/install-tests/tarball.dockerfile -t omp-test-tarball .");
			expect(result.tailLines).toBe(60);
			expect(result.strippedRedirect).toBe(true);
		});

		it("preserves command with no patterns", () => {
			const result = normalizeBashCommand("git status");
			expect(result.command).toBe("git status");
			expect(result.headLines).toBeUndefined();
			expect(result.tailLines).toBeUndefined();
			expect(result.strippedRedirect).toBe(false);
		});
	});
});

describe("applyHeadTail", () => {
	const sampleText = "line1\nline2\nline3\nline4\nline5";

	it("returns original when no limits", () => {
		const result = applyHeadTail(sampleText);
		expect(result.text).toBe(sampleText);
		expect(result.applied).toBe(false);
	});

	it("applies head limit", () => {
		const result = applyHeadTail(sampleText, 2);
		expect(result.text).toBe("line1\nline2");
		expect(result.applied).toBe(true);
		expect(result.headApplied).toBe(2);
	});

	it("applies tail limit", () => {
		const result = applyHeadTail(sampleText, undefined, 2);
		expect(result.text).toBe("line4\nline5");
		expect(result.applied).toBe(true);
		expect(result.tailApplied).toBe(2);
	});

	it("applies head then tail", () => {
		const result = applyHeadTail(sampleText, 4, 2);
		// head=4 gives: line1\nline2\nline3\nline4
		// tail=2 of that gives: line3\nline4
		expect(result.text).toBe("line3\nline4");
		expect(result.applied).toBe(true);
		expect(result.headApplied).toBe(4);
		expect(result.tailApplied).toBe(2);
	});

	it("does not apply if text is shorter than limit", () => {
		const result = applyHeadTail(sampleText, 10);
		expect(result.text).toBe(sampleText);
		expect(result.applied).toBe(false);
	});

	it("handles empty text", () => {
		const result = applyHeadTail("", 5);
		expect(result.text).toBe("");
		expect(result.applied).toBe(false);
	});

	it("handles single line", () => {
		const result = applyHeadTail("single", 1);
		expect(result.text).toBe("single");
		expect(result.applied).toBe(false);
	});
});
