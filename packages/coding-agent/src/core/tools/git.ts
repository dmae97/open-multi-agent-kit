import type { AgentTool, AgentToolContext, AgentToolResult, AgentToolUpdateCallback } from "@oh-my-pi/pi-agent-core";
import { StringEnum } from "@oh-my-pi/pi-ai";
import { type GitParams, gitTool as gitToolCore, type ToolResponse } from "@oh-my-pi/pi-git-tool";
import { type Static, Type } from "@sinclair/typebox";
import gitDescription from "../../prompts/tools/git.md" with { type: "text" };
import { renderPromptTemplate } from "../prompt-templates";
import type { ToolSession } from "./index";

const gitSchema = Type.Object({
	operation: StringEnum([
		"status",
		"diff",
		"log",
		"show",
		"blame",
		"branch",
		"add",
		"restore",
		"commit",
		"checkout",
		"merge",
		"rebase",
		"stash",
		"cherry-pick",
		"fetch",
		"pull",
		"push",
		"tag",
		"pr",
		"issue",
		"ci",
		"release",
	]),

	// Status
	only: Type.Optional(StringEnum(["branch", "modified", "staged", "untracked", "conflicts", "sync"])),
	ignored: Type.Optional(Type.Boolean()),

	// Diff
	target: Type.Optional(
		Type.Union([
			Type.Object({
				from: Type.String(),
				to: Type.Optional(Type.String()),
			}),
			Type.String(),
		]),
	),
	paths: Type.Optional(Type.Array(Type.String())),
	stat_only: Type.Optional(Type.Boolean()),
	name_only: Type.Optional(Type.Boolean()),
	context: Type.Optional(Type.Number()),
	max_lines: Type.Optional(Type.Number()),
	ignore_whitespace: Type.Optional(Type.Boolean()),

	// Log
	limit: Type.Optional(Type.Number()),
	ref: Type.Optional(Type.String()),
	author: Type.Optional(Type.String()),
	since: Type.Optional(Type.String()),
	until: Type.Optional(Type.String()),
	grep: Type.Optional(Type.String()),
	format: Type.Optional(StringEnum(["oneline", "short", "full"])),
	stat: Type.Optional(Type.Boolean()),
	merges: Type.Optional(Type.Boolean()),
	first_parent: Type.Optional(Type.Boolean()),

	// Show
	path: Type.Optional(Type.String()),
	diff: Type.Optional(Type.Boolean()),
	lines: Type.Optional(
		Type.Object({
			start: Type.Number(),
			end: Type.Number(),
		}),
	),

	// Blame
	root: Type.Optional(Type.Boolean()),

	// Branch
	action: Type.Optional(StringEnum(["list", "create", "delete", "rename", "current"])),
	name: Type.Optional(Type.String()),
	newName: Type.Optional(Type.String()),
	startPoint: Type.Optional(Type.String()),
	remotes: Type.Optional(Type.Boolean()),
	force: Type.Optional(Type.Boolean()),

	// Add/Restore
	update: Type.Optional(Type.Boolean()),
	all: Type.Optional(Type.Boolean()),
	dry_run: Type.Optional(Type.Boolean()),
	staged: Type.Optional(Type.Boolean()),
	worktree: Type.Optional(Type.Boolean()),
	source: Type.Optional(Type.String()),

	// Commit
	message: Type.Optional(Type.String()),
	allow_empty: Type.Optional(Type.Boolean()),
	sign: Type.Optional(Type.Boolean()),
	no_verify: Type.Optional(Type.Boolean()),
	amend: Type.Optional(Type.Boolean()),

	// Checkout
	create: Type.Optional(Type.Boolean()),

	// Merge
	no_ff: Type.Optional(Type.Boolean()),
	ff_only: Type.Optional(Type.Boolean()),
	squash: Type.Optional(Type.Boolean()),
	abort: Type.Optional(Type.Boolean()),
	continue: Type.Optional(Type.Boolean()),

	// Rebase
	onto: Type.Optional(Type.String()),
	upstream: Type.Optional(Type.String()),
	skip: Type.Optional(Type.Boolean()),

	// Stash
	include_untracked: Type.Optional(Type.Boolean()),
	index: Type.Optional(Type.Number()),
	keep_index: Type.Optional(Type.Boolean()),

	// Cherry-pick
	commits: Type.Optional(Type.Array(Type.String())),
	no_commit: Type.Optional(Type.Boolean()),

	// Fetch/Pull/Push/Tag
	remote: Type.Optional(Type.String()),
	branch: Type.Optional(Type.String()),
	prune: Type.Optional(Type.Boolean()),
	tags: Type.Optional(Type.Boolean()),
	rebase: Type.Optional(Type.Boolean()),
	set_upstream: Type.Optional(Type.Boolean()),
	force_with_lease: Type.Optional(Type.Boolean()),
	delete: Type.Optional(Type.Boolean()),
	force_override: Type.Optional(Type.Boolean()),

	// Tag
	// (name/message/ref already covered)

	// PR
	number: Type.Optional(Type.Number()),
	title: Type.Optional(Type.String()),
	body: Type.Optional(Type.String()),
	base: Type.Optional(Type.String()),
	head: Type.Optional(Type.String()),
	draft: Type.Optional(Type.Boolean()),
	state: Type.Optional(StringEnum(["open", "closed", "merged", "all"])),
	merge_method: Type.Optional(StringEnum(["merge", "squash", "rebase"])),
	review_action: Type.Optional(StringEnum(["approve", "request-changes", "comment"])),
	review_body: Type.Optional(Type.String()),

	// Issue
	labels: Type.Optional(Type.Array(Type.String())),
	assignee: Type.Optional(Type.String()),
	comment_body: Type.Optional(Type.String()),

	// CI
	workflow: Type.Optional(Type.String()),
	run_id: Type.Optional(Type.Number()),
	inputs: Type.Optional(Type.Record(Type.String(), Type.String())),
	logs_failed: Type.Optional(Type.Boolean()),

	// Release
	notes: Type.Optional(Type.String()),
	generate_notes: Type.Optional(Type.Boolean()),
	prerelease: Type.Optional(Type.Boolean()),
	assets: Type.Optional(Type.Array(Type.String())),
});

export type GitToolDetails = ToolResponse<unknown>;

export class GitTool implements AgentTool<typeof gitSchema, GitToolDetails> {
	public readonly name = "git";
	public readonly label = "Git";
	public readonly description: string;
	public readonly parameters = gitSchema;

	private readonly session: ToolSession;

	constructor(session: ToolSession) {
		this.session = session;
		this.description = renderPromptTemplate(gitDescription);
	}

	static createIf(session: ToolSession): GitTool | null {
		return session.settings?.getGitToolEnabled() === false ? null : new GitTool(session);
	}

	public async execute(
		_toolCallId: string,
		params: Static<typeof gitSchema>,
		_signal?: AbortSignal,
		_onUpdate?: AgentToolUpdateCallback<GitToolDetails>,
		_context?: AgentToolContext,
	): Promise<AgentToolResult<GitToolDetails>> {
		if (params.operation === "commit" && !params.message) {
			throw new Error("Git commit requires a message to avoid an interactive editor. Provide `message`.");
		}

		const result = await gitToolCore(params as GitParams, this.session.cwd);
		if ("error" in result) {
			const message = result._rendered ?? result.error;
			return { content: [{ type: "text", text: message }], details: result };
		}
		if ("confirm" in result) {
			const message = result._rendered ?? result.confirm;
			return { content: [{ type: "text", text: message }], details: result };
		}
		return { content: [{ type: "text", text: result._rendered }], details: result };
	}
}
