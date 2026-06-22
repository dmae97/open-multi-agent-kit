import { describe, expect, it } from "vitest";
import {
	ALLOWED_SEMANTIC_CACHE_TASK_CLASSES,
	classifySemanticCacheEligibility,
	FORBIDDEN_SEMANTIC_CACHE_ACTION_TERMS,
	FORBIDDEN_SEMANTIC_CACHE_TASK_CLASS_TERMS,
	type SemanticCacheCandidate,
	type SemanticCacheContextAttributes,
	validateSemanticCacheAttributes,
} from "../src/core/semantic-cache-policy.ts";

const attributes: SemanticCacheContextAttributes = {
	branch: "main",
	worktree: "/repo",
	repoSha: "abc123",
};

function candidate(overrides: Partial<SemanticCacheCandidate> = {}): SemanticCacheCandidate {
	return {
		enabled: true,
		responseKind: "final",
		responseReadOnly: true,
		pendingToolCallCount: 0,
		taskClass: "faq",
		action: "answer",
		cacheAttributes: attributes,
		currentAttributes: attributes,
		...overrides,
	};
}

describe("semantic cache policy", () => {
	it("allows FAQ and read-only analysis final responses with matching repository attributes", () => {
		expect(ALLOWED_SEMANTIC_CACHE_TASK_CLASSES).toContain("faq");
		expect(ALLOWED_SEMANTIC_CACHE_TASK_CLASSES).toContain("read_only_analysis");
		expect(classifySemanticCacheEligibility(candidate())).toMatchObject({ eligible: true, reason: "eligible" });
		expect(
			classifySemanticCacheEligibility(candidate({ taskClass: "read-only analysis", action: "summarize" })),
		).toMatchObject({ eligible: true, reason: "eligible" });
	});

	it("fails closed when semantic cache is not explicitly enabled", () => {
		expect(classifySemanticCacheEligibility(candidate({ enabled: false }))).toMatchObject({
			eligible: false,
			reason: "disabled",
		});
		expect(classifySemanticCacheEligibility({})).toMatchObject({ eligible: false, reason: "disabled" });
	});

	it("rejects non-final or non-read-only responses", () => {
		expect(classifySemanticCacheEligibility(candidate({ responseKind: "tool_result" }))).toMatchObject({
			eligible: false,
			reason: "response.not_final",
		});
		expect(classifySemanticCacheEligibility(candidate({ responseReadOnly: false }))).toMatchObject({
			eligible: false,
			reason: "response.not_read_only",
		});
	});

	it("rejects candidates with pending tool calls", () => {
		expect(classifySemanticCacheEligibility(candidate({ pendingToolCallCount: 1 }))).toMatchObject({
			eligible: false,
			reason: "tool_calls.pending",
		});
	});

	it("rejects mutation and deployment task classes or actions", () => {
		expect(FORBIDDEN_SEMANTIC_CACHE_TASK_CLASS_TERMS).toContain("mutation");
		expect(FORBIDDEN_SEMANTIC_CACHE_ACTION_TERMS).toContain("deploy");
		expect(classifySemanticCacheEligibility(candidate({ taskClass: "mutation" }))).toMatchObject({
			eligible: false,
			reason: "task_class.forbidden_term",
		});
		expect(classifySemanticCacheEligibility(candidate({ action: "deploy preview" }))).toMatchObject({
			eligible: false,
			reason: "action.forbidden_term",
		});
		expect(classifySemanticCacheEligibility(candidate({ dependencies: { mutation: true } }))).toMatchObject({
			eligible: false,
			reason: "dependence.mutation",
		});
	});

	it("rejects authentication and security-sensitive task classes or actions", () => {
		expect(FORBIDDEN_SEMANTIC_CACHE_TASK_CLASS_TERMS).toContain("auth");
		expect(FORBIDDEN_SEMANTIC_CACHE_ACTION_TERMS).toContain("security");
		expect(classifySemanticCacheEligibility(candidate({ taskClass: "auth_help" }))).toMatchObject({
			eligible: false,
			reason: "task_class.forbidden_term",
		});
		expect(classifySemanticCacheEligibility(candidate({ action: "security review" }))).toMatchObject({
			eligible: false,
			reason: "action.forbidden_term",
		});
	});

	it("rejects time or external-state dependent candidates", () => {
		expect(classifySemanticCacheEligibility(candidate({ dependencies: { time: true } }))).toMatchObject({
			eligible: false,
			reason: "dependence.time",
		});
		expect(classifySemanticCacheEligibility(candidate({ dependencies: { externalState: true } }))).toMatchObject({
			eligible: false,
			reason: "dependence.external_state",
		});
	});

	it("rejects missing branch, worktree, or repoSha attributes", () => {
		expect(validateSemanticCacheAttributes({ branch: "main", worktree: "/repo" }, attributes)).toMatchObject({
			valid: false,
			reason: "attributes.missing_repo_sha",
		});
		expect(
			classifySemanticCacheEligibility(candidate({ cacheAttributes: { ...attributes, branch: "" } })),
		).toMatchObject({
			eligible: false,
			reason: "attributes.missing_branch",
		});
	});

	it("rejects cache entries from a different branch", () => {
		expect(
			classifySemanticCacheEligibility(
				candidate({ cacheAttributes: { ...attributes, branch: "feature/semantic-cache" } }),
			),
		).toMatchObject({ eligible: false, reason: "attributes.branch_mismatch" });
	});
});
