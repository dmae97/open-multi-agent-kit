import { describe, expect, it } from "vitest";
import {
	detectFunctionalAssertionConflicts,
	InMemoryContextGraphMemoryStore,
	type MemoryAssertion,
	type MemoryGeneration,
	type MemoryScope,
	reinforceAssertionConfidence,
	validateMemoryScope,
} from "../src/core/context-graph-memory-store.ts";

const baseScope: MemoryScope = {
	workspaceId: "workspace-alpha",
	repoSha: "repo-alpha-sha",
	branch: "main",
};

const activeGeneration = (overrides: Partial<MemoryGeneration> = {}): MemoryGeneration => ({
	id: overrides.id ?? "gen-active",
	scope: overrides.scope ?? baseScope,
	status: overrides.status ?? "active",
	createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
	label: overrides.label,
});

const assertion = (overrides: Partial<MemoryAssertion> = {}): MemoryAssertion => ({
	id: overrides.id ?? "assertion-1",
	scope: overrides.scope ?? baseScope,
	generationId: overrides.generationId ?? "gen-active",
	subjectId: overrides.subjectId ?? "entity-session-cache",
	predicate: overrides.predicate ?? "omk:recordsDecision",
	object: overrides.object ?? "Session cache invalidation is owned by the runtime layer.",
	category: overrides.category ?? "decision",
	assertionKind: overrides.assertionKind ?? "observed",
	status: overrides.status ?? "active",
	confidence: overrides.confidence ?? 0.8,
	functional: overrides.functional,
	validTime: overrides.validTime ?? { from: "2026-01-01T00:00:00.000Z" },
	transactionTime: overrides.transactionTime ?? { from: "2026-01-02T00:00:00.000Z" },
	provenance: overrides.provenance ?? [
		{
			sourceKind: "test",
			sourceId: "context-graph-memory-store.test.ts",
			observedAt: "2026-01-02T00:00:00.000Z",
		},
	],
});

describe("context graph bitemporal memory store", () => {
	it("validates required scope fields and rejects forbidden categories", async () => {
		expect(validateMemoryScope(baseScope)).toEqual({ ok: true, reason: "eligible" });
		expect(validateMemoryScope({ ...baseScope, repoSha: " " })).toEqual({
			ok: false,
			reason: "missing_repo_sha",
		});

		const store = new InMemoryContextGraphMemoryStore();
		await expect(store.putGeneration(activeGeneration({ scope: { ...baseScope, branch: "" } }))).rejects.toThrow(
			"missing branch",
		);

		await store.putGeneration(activeGeneration());
		await expect(store.putAssertion(assertion({ id: "raw", category: "raw_conversation" }))).rejects.toThrow(
			"forbidden memory category",
		);
		await expect(store.putAssertion(assertion({ id: "secret", category: "secret" }))).rejects.toThrow(
			"forbidden memory category",
		);
	});

	it("requires provenance for observed and inferred assertions", async () => {
		const store = new InMemoryContextGraphMemoryStore();
		await store.putGeneration(activeGeneration());

		await expect(
			store.putAssertion(
				assertion({ id: "observed-without-provenance", assertionKind: "observed", provenance: [] }),
			),
		).rejects.toThrow("provenance is required");
		await expect(
			store.putAssertion(
				assertion({ id: "inferred-without-provenance", assertionKind: "inferred", provenance: [] }),
			),
		).rejects.toThrow("provenance is required");

		await expect(
			store.putAssertion(
				assertion({ id: "declared-without-provenance", assertionKind: "declared", provenance: [] }),
			),
		).resolves.toMatchObject({ id: "declared-without-provenance" });
	});

	it("isolates memory_search results by scope and category with deterministic ordering", async () => {
		const store = new InMemoryContextGraphMemoryStore();
		const otherScope = { ...baseScope, branch: "feature/memory" };
		await store.putGeneration(activeGeneration());
		await store.putGeneration(activeGeneration({ id: "gen-other", scope: otherScope }));

		await store.putAssertion(assertion({ id: "b-match", confidence: 0.7 }));
		await store.putAssertion(assertion({ id: "a-match", confidence: 0.7 }));
		await store.putAssertion(
			assertion({
				id: "other-scope-match",
				scope: otherScope,
				generationId: "gen-other",
				confidence: 1,
			}),
		);
		await store.putAssertion(
			assertion({
				id: "other-category-match",
				category: "build_evidence",
				object: "Session cache build evidence mentions invalidation.",
			}),
		);

		const results = await store.memory_search({ scope: baseScope, category: "decision", query: "session cache" });

		expect(results.map((hit) => hit.assertion.id)).toEqual(["a-match", "b-match"]);
		expect(results.every((hit) => hit.assertion.scope.branch === "main")).toBe(true);
		expect(results.every((hit) => hit.assertion.category === "decision")).toBe(true);
	});

	it("searches active generations only by default", async () => {
		const store = new InMemoryContextGraphMemoryStore();
		await store.putGeneration(activeGeneration());
		await store.putGeneration(activeGeneration({ id: "gen-archived", status: "archived" }));
		await store.putAssertion(assertion({ id: "active-hit", object: "Active generation cache decision." }));
		await store.putAssertion(
			assertion({
				id: "archived-hit",
				generationId: "gen-archived",
				object: "Archived generation cache decision.",
			}),
		);

		const results = await store.memory_search({ scope: baseScope, category: "decision", query: "cache decision" });

		expect(results.map((hit) => hit.assertion.id)).toEqual(["active-hit"]);
	});

	it("filters assertions by valid time, transaction time, and status", async () => {
		const validTimeStore = new InMemoryContextGraphMemoryStore();
		await validTimeStore.putGeneration(activeGeneration());
		await validTimeStore.putAssertion(
			assertion({
				id: "valid-before-june",
				object: "Temporal owner before June.",
				validTime: { from: "2026-01-01T00:00:00.000Z", to: "2026-06-01T00:00:00.000Z" },
			}),
		);
		await validTimeStore.putAssertion(
			assertion({
				id: "valid-after-june",
				object: "Temporal owner after June.",
				validTime: { from: "2026-06-01T00:00:00.000Z" },
			}),
		);

		await expect(
			validTimeStore.listAssertions({ scope: baseScope, validAt: "2026-04-01T00:00:00.000Z" }),
		).resolves.toEqual([expect.objectContaining({ id: "valid-before-june" })]);
		await expect(
			validTimeStore.listAssertions({ scope: baseScope, validAt: "2026-07-01T00:00:00.000Z" }),
		).resolves.toEqual([expect.objectContaining({ id: "valid-after-june" })]);

		const transactionStore = new InMemoryContextGraphMemoryStore();
		await transactionStore.putGeneration(activeGeneration());
		await transactionStore.putAssertion(
			assertion({
				id: "known-before-march",
				object: "Transaction view before March.",
				transactionTime: { from: "2026-01-02T00:00:00.000Z", to: "2026-03-01T00:00:00.000Z" },
			}),
		);
		await transactionStore.putAssertion(
			assertion({
				id: "known-after-march",
				object: "Transaction view after March.",
				transactionTime: { from: "2026-03-01T00:00:00.000Z" },
			}),
		);

		await expect(
			transactionStore.listAssertions({ scope: baseScope, transactionAsOf: "2026-02-01T00:00:00.000Z" }),
		).resolves.toEqual([expect.objectContaining({ id: "known-before-march" })]);
		await expect(
			transactionStore.listAssertions({ scope: baseScope, transactionAsOf: "2026-04-01T00:00:00.000Z" }),
		).resolves.toEqual([expect.objectContaining({ id: "known-after-march" })]);

		const statusStore = new InMemoryContextGraphMemoryStore();
		await statusStore.putGeneration(activeGeneration());
		await statusStore.putAssertion(
			assertion({ id: "retracted-hit", status: "retracted", object: "Retracted temporal cache evidence." }),
		);
		await expect(
			statusStore.memory_search({ scope: baseScope, category: "decision", query: "retracted" }),
		).resolves.toEqual([]);
		await expect(
			statusStore.memory_search({
				scope: baseScope,
				category: "decision",
				query: "retracted",
				statuses: ["retracted"],
			}),
		).resolves.toHaveLength(1);
	});

	it("detects conflicts only for functional predicates with overlapping valid times", () => {
		const conflicts = detectFunctionalAssertionConflicts(
			[
				assertion({
					id: "owner-a",
					predicate: "omk:owner",
					object: "runtime",
					validTime: { from: "2026-01-01T00:00:00.000Z", to: "2026-04-01T00:00:00.000Z" },
				}),
				assertion({
					id: "owner-b",
					predicate: "omk:owner",
					object: "retrieval",
					validTime: { from: "2026-03-01T00:00:00.000Z", to: "2026-04-01T00:00:00.000Z" },
				}),
				assertion({
					id: "tag-a",
					predicate: "omk:tag",
					object: "runtime",
				}),
				assertion({
					id: "tag-b",
					predicate: "omk:tag",
					object: "retrieval",
				}),
				assertion({
					id: "owner-later",
					predicate: "omk:owner",
					object: "sessions",
					validTime: { from: "2026-04-01T00:00:00.000Z" },
				}),
			],
			{ functionalPredicates: ["omk:owner"] },
		);

		expect(conflicts.map((conflict) => conflict.assertionIds)).toEqual([["owner-a", "owner-b"]]);
	});

	it("reinforces confidence with a bounded monotonic formula", () => {
		expect(
			reinforceAssertionConfidence({ currentConfidence: 0.8, evidenceConfidence: 0.5, weight: 0.5 }),
		).toBeCloseTo(0.85, 5);
		expect(reinforceAssertionConfidence({ currentConfidence: 1.5, evidenceConfidence: 2, weight: 2 })).toBe(1);
		expect(reinforceAssertionConfidence({ currentConfidence: -1, evidenceConfidence: 0.5 })).toBe(0.5);
		expect(reinforceAssertionConfidence({ currentConfidence: 0.4, evidenceConfidence: 0.9, weight: 0 })).toBe(0.4);
	});
});
