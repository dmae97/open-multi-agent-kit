import { describe, expect, test } from "bun:test";
import { parseGitUrl } from "@oh-my-pi/pi-coding-agent/extensibility/plugins/git-url";

describe("parseGitUrl", () => {
	describe("protocol URLs (accepted without git: prefix)", () => {
		test("parses https URL", () => {
			const result = parseGitUrl("https://github.com/user/repo");
			expect(result).toMatchObject({
				type: "git",
				host: "github.com",
				path: "user/repo",
				repo: "https://github.com/user/repo",
				pinned: false,
			});
		});

		test("parses ssh URL", () => {
			const result = parseGitUrl("ssh://git@github.com/user/repo");
			expect(result).toMatchObject({
				type: "git",
				host: "github.com",
				path: "user/repo",
				repo: "ssh://git@github.com/user/repo",
				pinned: false,
			});
		});

		test("parses git protocol URL", () => {
			const result = parseGitUrl("git://github.com/user/repo");
			expect(result).toMatchObject({
				type: "git",
				host: "github.com",
				path: "user/repo",
				repo: "git://github.com/user/repo",
				pinned: false,
			});
		});
	});

	describe("shorthand URLs (accepted only with git: prefix)", () => {
		test("parses host/path shorthand with git: prefix", () => {
			const result = parseGitUrl("git:github.com/user/repo");
			expect(result).toMatchObject({
				type: "git",
				host: "github.com",
				path: "user/repo",
				repo: "https://github.com/user/repo",
				pinned: false,
			});
		});

		test("parses scp-like ssh shorthand with git: prefix", () => {
			const result = parseGitUrl("git:git@github.com:user/repo@v1.0.0");
			expect(result).toMatchObject({
				type: "git",
				host: "github.com",
				path: "user/repo",
				repo: "git@github.com:user/repo",
				ref: "v1.0.0",
				pinned: true,
			});
		});
	});

	describe("local paths and unprefixed shorthand", () => {
		test("rejects unprefixed host/path shorthand", () => {
			expect(parseGitUrl("github.com/user/repo")).toBeNull();
		});

		test("rejects unprefixed scp-like SSH shorthand", () => {
			expect(parseGitUrl("git@github.com:user/repo")).toBeNull();
		});

		test("does not misclassify local paths containing dots", () => {
			expect(parseGitUrl("plugins.v2/my-plugin")).toBeNull();
			expect(parseGitUrl("vendor/github.enterprise/tools")).toBeNull();
		});
	});
});
