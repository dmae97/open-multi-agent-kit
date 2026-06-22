export type MemoryGenerationStatus = "active" | "archived";
export type MemoryAssertionKind = "observed" | "inferred" | "declared";
export type MemoryAssertionStatus = "active" | "superseded" | "retracted";

export type AllowedMemoryCategory =
	| "decision"
	| "verified_fact"
	| "resolved_error"
	| "user_preference"
	| "unresolved_task"
	| "test_evidence"
	| "build_evidence";

export type ForbiddenMemoryCategory = "raw_conversation" | "raw_shell_output" | "speculation" | "secret";
export type MemoryCategory = AllowedMemoryCategory | ForbiddenMemoryCategory | (string & {});

export type MemoryJsonValue =
	| string
	| number
	| boolean
	| null
	| readonly MemoryJsonValue[]
	| { readonly [key: string]: MemoryJsonValue | undefined };

export type MemoryTemporalInstant = string | Date;

export interface MemoryTemporalInterval {
	readonly from: MemoryTemporalInstant;
	readonly to?: MemoryTemporalInstant;
}

export interface MemoryScope {
	readonly workspaceId: string;
	readonly repoSha: string;
	readonly branch: string;
}

export interface MemoryProvenance {
	readonly sourceKind: "compiler" | "test" | "git" | "tool" | "user" | "document" | "llm" | "heuristic";
	readonly sourceId: string;
	readonly observedAt?: MemoryTemporalInstant;
	readonly excerpt?: string;
}

export interface MemoryGeneration {
	readonly id: string;
	readonly scope: MemoryScope;
	readonly status: MemoryGenerationStatus;
	readonly createdAt: MemoryTemporalInstant;
	readonly label?: string;
}

export interface MemoryEntity {
	readonly id: string;
	readonly scope: MemoryScope;
	readonly generationId: string;
	readonly entityType: string;
	readonly name: string;
	readonly aliases?: readonly string[];
	readonly validTime: MemoryTemporalInterval;
	readonly transactionTime: MemoryTemporalInterval;
}

export interface MemoryAssertion {
	readonly id: string;
	readonly scope: MemoryScope;
	readonly generationId: string;
	readonly subjectId: string;
	readonly predicate: string;
	readonly object: MemoryJsonValue;
	readonly category: MemoryCategory;
	readonly assertionKind: MemoryAssertionKind;
	readonly status: MemoryAssertionStatus;
	readonly confidence: number;
	readonly functional?: boolean;
	readonly validTime: MemoryTemporalInterval;
	readonly transactionTime: MemoryTemporalInterval;
	readonly provenance?: readonly MemoryProvenance[];
}

export interface MemoryEpisode {
	readonly id: string;
	readonly scope: MemoryScope;
	readonly generationId: string;
	readonly category: MemoryCategory;
	readonly title: string;
	readonly occurredAt: MemoryTemporalInstant;
	readonly validTime: MemoryTemporalInterval;
	readonly transactionTime: MemoryTemporalInterval;
	readonly provenance?: readonly MemoryProvenance[];
}

export type MemoryScopeValidationReason = "eligible" | "missing_workspace_id" | "missing_repo_sha" | "missing_branch";
export type MemoryScopeValidationDecision =
	| { readonly ok: true; readonly reason: "eligible" }
	| { readonly ok: false; readonly reason: Exclude<MemoryScopeValidationReason, "eligible"> };

export type MemoryCategoryValidationReason = "eligible" | "forbidden_category" | "unsupported_category";
export type MemoryCategoryValidationDecision =
	| { readonly ok: true; readonly reason: "eligible" }
	| { readonly ok: false; readonly reason: Exclude<MemoryCategoryValidationReason, "eligible"> };

export interface ListMemoryAssertionsInput {
	readonly scope: MemoryScope;
	readonly categories?: readonly MemoryCategory[];
	readonly statuses?: readonly MemoryAssertionStatus[];
	readonly validAt?: MemoryTemporalInstant;
	readonly transactionAsOf?: MemoryTemporalInstant;
	readonly includeInactiveGenerations?: boolean;
}

export interface MemorySearchInput {
	readonly scope: MemoryScope;
	readonly category: MemoryCategory;
	readonly query: string;
	readonly statuses?: readonly MemoryAssertionStatus[];
	readonly validAt?: MemoryTemporalInstant;
	readonly transactionAsOf?: MemoryTemporalInstant;
	readonly limit?: number;
	readonly includeInactiveGenerations?: boolean;
}

export interface MemorySearchHit {
	readonly assertion: MemoryAssertion;
	readonly score: number;
	readonly matchedTokens: readonly string[];
}

export interface FunctionalConflictOptions {
	readonly functionalPredicates?: readonly string[];
	readonly statuses?: readonly MemoryAssertionStatus[];
}

export interface MemoryAssertionConflict {
	readonly subjectId: string;
	readonly predicate: string;
	readonly assertionIds: readonly [string, string];
	readonly objectValues: readonly [MemoryJsonValue, MemoryJsonValue];
	readonly validOverlap: MemoryTemporalInterval;
}

export interface ConfidenceReinforcementInput {
	readonly currentConfidence: number;
	readonly evidenceConfidence: number;
	readonly weight?: number;
}

export interface ContextGraphMemoryStore {
	putGeneration(generation: MemoryGeneration): Promise<MemoryGeneration>;
	putEntity(entity: MemoryEntity): Promise<MemoryEntity>;
	putAssertion(assertion: MemoryAssertion): Promise<MemoryAssertion>;
	putEpisode(episode: MemoryEpisode): Promise<MemoryEpisode>;
	getGeneration(id: string): Promise<MemoryGeneration | undefined>;
	listAssertions(input: ListMemoryAssertionsInput): Promise<MemoryAssertion[]>;
	memory_search(input: MemorySearchInput): Promise<MemorySearchHit[]>;
}

const ALLOWED_MEMORY_CATEGORIES = new Set<string>([
	"decision",
	"verified_fact",
	"resolved_error",
	"user_preference",
	"unresolved_task",
	"test_evidence",
	"build_evidence",
]);

const FORBIDDEN_MEMORY_CATEGORIES = new Set<string>(["raw_conversation", "raw_shell_output", "speculation", "secret"]);
const DEFAULT_ASSERTION_STATUSES: readonly MemoryAssertionStatus[] = ["active"];

export function validateMemoryScope(scope: MemoryScope): MemoryScopeValidationDecision {
	if (scope.workspaceId.trim().length === 0) return { ok: false, reason: "missing_workspace_id" };
	if (scope.repoSha.trim().length === 0) return { ok: false, reason: "missing_repo_sha" };
	if (scope.branch.trim().length === 0) return { ok: false, reason: "missing_branch" };
	return { ok: true, reason: "eligible" };
}

export function validateMemoryCategory(category: MemoryCategory): MemoryCategoryValidationDecision {
	const normalized = category.trim();
	if (FORBIDDEN_MEMORY_CATEGORIES.has(normalized)) return { ok: false, reason: "forbidden_category" };
	if (!ALLOWED_MEMORY_CATEGORIES.has(normalized)) return { ok: false, reason: "unsupported_category" };
	return { ok: true, reason: "eligible" };
}

export function reinforceAssertionConfidence(input: ConfidenceReinforcementInput): number {
	const currentConfidence = clamp01(input.currentConfidence);
	const evidenceConfidence = clamp01(input.evidenceConfidence);
	const weight = clamp01(input.weight ?? 1);
	return clamp01(currentConfidence + (1 - currentConfidence) * evidenceConfidence * weight);
}

export function detectFunctionalAssertionConflicts(
	assertions: readonly MemoryAssertion[],
	options: FunctionalConflictOptions = {},
): MemoryAssertionConflict[] {
	const functionalPredicates = new Set(options.functionalPredicates ?? []);
	const statuses = new Set(options.statuses ?? DEFAULT_ASSERTION_STATUSES);
	const candidates = [...assertions]
		.filter((candidate) => statuses.has(candidate.status) && isFunctionalAssertion(candidate, functionalPredicates))
		.sort(compareAssertionIds);
	const conflicts: MemoryAssertionConflict[] = [];

	for (const [leftIndex, left] of candidates.entries()) {
		for (const right of candidates.slice(leftIndex + 1)) {
			if (!canConflict(left, right)) continue;
			const validOverlap = getIntervalOverlap(left.validTime, right.validTime);
			if (!validOverlap) continue;
			conflicts.push({
				subjectId: left.subjectId,
				predicate: left.predicate,
				assertionIds: [left.id, right.id],
				objectValues: [left.object, right.object],
				validOverlap,
			});
		}
	}

	return conflicts.sort(
		(a, b) =>
			a.assertionIds[0].localeCompare(b.assertionIds[0]) || a.assertionIds[1].localeCompare(b.assertionIds[1]),
	);
}

export class InMemoryContextGraphMemoryStore implements ContextGraphMemoryStore {
	private readonly generations = new Map<string, MemoryGeneration>();
	private readonly entities = new Map<string, MemoryEntity>();
	private readonly assertions = new Map<string, MemoryAssertion>();
	private readonly episodes = new Map<string, MemoryEpisode>();

	async putGeneration(generation: MemoryGeneration): Promise<MemoryGeneration> {
		assertValidScope(generation.scope);
		assertNonEmptyId(generation.id, "generation id");
		parseInstant(generation.createdAt, "generation createdAt");
		const record = cloneGeneration(generation);
		this.generations.set(record.id, record);
		return cloneGeneration(record);
	}

	async putEntity(entity: MemoryEntity): Promise<MemoryEntity> {
		assertValidScope(entity.scope);
		assertNonEmptyId(entity.id, "entity id");
		this.assertGenerationScope(entity.generationId, entity.scope);
		assertValidInterval(entity.validTime, "entity validTime");
		assertValidInterval(entity.transactionTime, "entity transactionTime");
		const record = cloneEntity(entity);
		this.entities.set(record.id, record);
		return cloneEntity(record);
	}

	async putAssertion(assertion: MemoryAssertion): Promise<MemoryAssertion> {
		assertValidScope(assertion.scope);
		assertNonEmptyId(assertion.id, "assertion id");
		assertAllowedCategory(assertion.category);
		assertValidConfidence(assertion.confidence);
		assertProvenance(assertion);
		this.assertGenerationScope(assertion.generationId, assertion.scope);
		assertValidInterval(assertion.validTime, "assertion validTime");
		assertValidInterval(assertion.transactionTime, "assertion transactionTime");
		const record = cloneAssertion(assertion);
		this.assertions.set(record.id, record);
		return cloneAssertion(record);
	}

	async putEpisode(episode: MemoryEpisode): Promise<MemoryEpisode> {
		assertValidScope(episode.scope);
		assertNonEmptyId(episode.id, "episode id");
		assertAllowedCategory(episode.category);
		parseInstant(episode.occurredAt, "episode occurredAt");
		this.assertGenerationScope(episode.generationId, episode.scope);
		assertValidInterval(episode.validTime, "episode validTime");
		assertValidInterval(episode.transactionTime, "episode transactionTime");
		const record = cloneEpisode(episode);
		this.episodes.set(record.id, record);
		return cloneEpisode(record);
	}

	async getGeneration(id: string): Promise<MemoryGeneration | undefined> {
		const generation = this.generations.get(id);
		return generation ? cloneGeneration(generation) : undefined;
	}

	async listAssertions(input: ListMemoryAssertionsInput): Promise<MemoryAssertion[]> {
		assertValidScope(input.scope);
		for (const category of input.categories ?? []) {
			assertAllowedCategory(category);
		}
		const categories = input.categories ? new Set(input.categories) : undefined;
		const statuses = new Set(input.statuses ?? DEFAULT_ASSERTION_STATUSES);
		const activeGenerationIds = this.getGenerationIds(input.scope, "active");
		const filtered = [...this.assertions.values()]
			.filter((assertion) => sameScope(assertion.scope, input.scope))
			.filter((assertion) => categories === undefined || categories.has(assertion.category))
			.filter((assertion) => statuses.has(assertion.status))
			.filter(
				(assertion) => input.includeInactiveGenerations === true || activeGenerationIds.has(assertion.generationId),
			)
			.filter((assertion) => matchesValidTime(assertion.validTime, input.validAt))
			.filter((assertion) => matchesTransactionTime(assertion.transactionTime, input.transactionAsOf))
			.sort(compareAssertionIds)
			.map(cloneAssertion);
		return filtered;
	}

	async memory_search(input: MemorySearchInput): Promise<MemorySearchHit[]> {
		assertAllowedCategory(input.category);
		const queryTokens = uniqueTokens(input.query);
		const assertions = await this.listAssertions({
			scope: input.scope,
			categories: [input.category],
			statuses: input.statuses,
			validAt: input.validAt,
			transactionAsOf: input.transactionAsOf,
			includeInactiveGenerations: input.includeInactiveGenerations,
		});
		const hits = assertions
			.map((assertion) => scoreSearchAssertion(assertion, input.query, queryTokens))
			.filter((hit) => queryTokens.length === 0 || hit.score > 0)
			.sort(compareSearchHits);
		const limit = input.limit === undefined ? hits.length : Math.max(0, Math.floor(input.limit));
		return hits.slice(0, limit);
	}

	private assertGenerationScope(generationId: string, scope: MemoryScope): void {
		const generation = this.generations.get(generationId);
		if (!generation) throw new Error(`memory generation not found: ${generationId}`);
		if (!sameScope(generation.scope, scope)) throw new Error(`memory generation scope mismatch: ${generationId}`);
	}

	private getGenerationIds(scope: MemoryScope, status: MemoryGenerationStatus): Set<string> {
		return new Set(
			[...this.generations.values()]
				.filter((generation) => generation.status === status && sameScope(generation.scope, scope))
				.map((generation) => generation.id),
		);
	}
}

function assertValidScope(scope: MemoryScope): void {
	const decision = validateMemoryScope(scope);
	if (decision.ok) return;
	throw new Error(`invalid memory scope: missing ${formatScopeReason(decision.reason)}`);
}

function assertAllowedCategory(category: MemoryCategory): void {
	const decision = validateMemoryCategory(category);
	if (decision.ok) return;
	if (decision.reason === "forbidden_category") throw new Error(`forbidden memory category: ${category}`);
	throw new Error(`unsupported memory category: ${category}`);
}

function assertProvenance(assertion: MemoryAssertion): void {
	if (assertion.assertionKind !== "observed" && assertion.assertionKind !== "inferred") return;
	const provenance = assertion.provenance ?? [];
	if (provenance.length === 0 || provenance.some((entry) => entry.sourceId.trim().length === 0)) {
		throw new Error("provenance is required for observed and inferred assertions");
	}
}

function assertValidConfidence(confidence: number): void {
	if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
		throw new Error("assertion confidence must be between 0 and 1");
	}
}

function assertNonEmptyId(id: string, label: string): void {
	if (id.trim().length === 0) throw new Error(`missing ${label}`);
}

function assertValidInterval(interval: MemoryTemporalInterval, label: string): void {
	const from = parseInstant(interval.from, `${label}.from`);
	const to = interval.to === undefined ? Number.POSITIVE_INFINITY : parseInstant(interval.to, `${label}.to`);
	if (to <= from) throw new Error(`${label} must have to greater than from`);
}

function parseInstant(instant: MemoryTemporalInstant, label: string): number {
	const timestamp = instant instanceof Date ? instant.getTime() : Date.parse(instant);
	if (!Number.isFinite(timestamp)) throw new Error(`invalid temporal instant: ${label}`);
	return timestamp;
}

function matchesValidTime(interval: MemoryTemporalInterval, validAt: MemoryTemporalInstant | undefined): boolean {
	if (validAt === undefined) return true;
	return intervalContains(interval, parseInstant(validAt, "validAt"));
}

function matchesTransactionTime(
	interval: MemoryTemporalInterval,
	transactionAsOf: MemoryTemporalInstant | undefined,
): boolean {
	if (transactionAsOf === undefined) return interval.to === undefined;
	return intervalContains(interval, parseInstant(transactionAsOf, "transactionAsOf"));
}

function intervalContains(interval: MemoryTemporalInterval, timestamp: number): boolean {
	const from = parseInstant(interval.from, "interval.from");
	const to = interval.to === undefined ? Number.POSITIVE_INFINITY : parseInstant(interval.to, "interval.to");
	return from <= timestamp && timestamp < to;
}

function getIntervalOverlap(
	left: MemoryTemporalInterval,
	right: MemoryTemporalInterval,
): MemoryTemporalInterval | undefined {
	const leftFrom = parseInstant(left.from, "left validTime.from");
	const leftTo = left.to === undefined ? Number.POSITIVE_INFINITY : parseInstant(left.to, "left validTime.to");
	const rightFrom = parseInstant(right.from, "right validTime.from");
	const rightTo = right.to === undefined ? Number.POSITIVE_INFINITY : parseInstant(right.to, "right validTime.to");
	const overlapFrom = Math.max(leftFrom, rightFrom);
	const overlapTo = Math.min(leftTo, rightTo);
	if (overlapTo <= overlapFrom) return undefined;
	return {
		from: new Date(overlapFrom).toISOString(),
		to: Number.isFinite(overlapTo) ? new Date(overlapTo).toISOString() : undefined,
	};
}

function isFunctionalAssertion(assertion: MemoryAssertion, functionalPredicates: ReadonlySet<string>): boolean {
	return assertion.functional === true || functionalPredicates.has(assertion.predicate);
}

function canConflict(left: MemoryAssertion, right: MemoryAssertion): boolean {
	return (
		sameScope(left.scope, right.scope) &&
		left.subjectId === right.subjectId &&
		left.predicate === right.predicate &&
		canonicalJsonStringify(left.object) !== canonicalJsonStringify(right.object)
	);
}

function scoreSearchAssertion(
	assertion: MemoryAssertion,
	query: string,
	queryTokens: readonly string[],
): MemorySearchHit {
	const searchText = getAssertionSearchText(assertion);
	const searchTokens = new Set(tokenize(searchText));
	const matchedTokens = queryTokens.filter((token) => searchTokens.has(token));
	const coverageScore = queryTokens.length === 0 ? 1 : matchedTokens.length / queryTokens.length;
	const normalizedQuery = normalizeSearchText(query);
	const phraseBonus =
		normalizedQuery.length > 0 && normalizeSearchText(searchText).includes(normalizedQuery) ? 0.1 : 0;
	return {
		assertion,
		score: clamp01(coverageScore + phraseBonus),
		matchedTokens,
	};
}

function getAssertionSearchText(assertion: MemoryAssertion): string {
	return [
		assertion.id,
		assertion.subjectId,
		assertion.predicate,
		assertion.category,
		canonicalJsonStringify(assertion.object),
	]
		.filter((part) => part.length > 0)
		.join("\n");
}

function uniqueTokens(text: string): string[] {
	return [...new Set(tokenize(text))];
}

function tokenize(text: string): string[] {
	return normalizeSearchText(text).match(/[\p{L}\p{N}]+/gu) ?? [];
}

function normalizeSearchText(text: string): string {
	return text
		.replace(/([\p{Ll}\d])([\p{Lu}])/gu, "$1 $2")
		.normalize("NFKC")
		.toLowerCase();
}

function canonicalJsonStringify(value: MemoryJsonValue): string {
	if (value === null) return "null";
	if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
	if (typeof value === "number") return Number.isFinite(value) ? JSON.stringify(value) : "null";
	if (isMemoryJsonArray(value)) return `[${value.map((item) => canonicalJsonStringify(item)).join(",")}]`;
	const record: { readonly [key: string]: MemoryJsonValue | undefined } = value;
	const entries = Object.keys(record)
		.filter((key) => record[key] !== undefined)
		.sort()
		.map((key) => `${JSON.stringify(key)}:${canonicalJsonStringify(record[key] ?? null)}`);
	return `{${entries.join(",")}}`;
}

function isMemoryJsonArray(value: MemoryJsonValue): value is readonly MemoryJsonValue[] {
	return Array.isArray(value);
}

function compareAssertionIds(left: MemoryAssertion, right: MemoryAssertion): number {
	return left.id.localeCompare(right.id);
}

function compareSearchHits(left: MemorySearchHit, right: MemorySearchHit): number {
	return (
		right.score - left.score ||
		right.assertion.confidence - left.assertion.confidence ||
		left.assertion.id.localeCompare(right.assertion.id)
	);
}

function sameScope(left: MemoryScope, right: MemoryScope): boolean {
	return left.workspaceId === right.workspaceId && left.repoSha === right.repoSha && left.branch === right.branch;
}

function formatScopeReason(reason: Exclude<MemoryScopeValidationReason, "eligible">): string {
	if (reason === "missing_workspace_id") return "workspaceId";
	if (reason === "missing_repo_sha") return "repoSha";
	return "branch";
}

function cloneScope(scope: MemoryScope): MemoryScope {
	return { workspaceId: scope.workspaceId, repoSha: scope.repoSha, branch: scope.branch };
}

function cloneInterval(interval: MemoryTemporalInterval): MemoryTemporalInterval {
	return { from: interval.from, to: interval.to };
}

function cloneProvenance(provenance: readonly MemoryProvenance[] | undefined): MemoryProvenance[] | undefined {
	return provenance?.map((entry) => ({ ...entry }));
}

function cloneGeneration(generation: MemoryGeneration): MemoryGeneration {
	return { ...generation, scope: cloneScope(generation.scope) };
}

function cloneEntity(entity: MemoryEntity): MemoryEntity {
	return {
		...entity,
		scope: cloneScope(entity.scope),
		aliases: entity.aliases ? [...entity.aliases] : undefined,
		validTime: cloneInterval(entity.validTime),
		transactionTime: cloneInterval(entity.transactionTime),
	};
}

function cloneAssertion(assertion: MemoryAssertion): MemoryAssertion {
	return {
		...assertion,
		scope: cloneScope(assertion.scope),
		object: cloneJsonValue(assertion.object),
		validTime: cloneInterval(assertion.validTime),
		transactionTime: cloneInterval(assertion.transactionTime),
		provenance: cloneProvenance(assertion.provenance),
	};
}

function cloneJsonValue(value: MemoryJsonValue): MemoryJsonValue {
	if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
		return value;
	}
	if (isMemoryJsonArray(value)) return value.map((item) => cloneJsonValue(item));
	const clone: Record<string, MemoryJsonValue> = {};
	for (const key of Object.keys(value)) {
		const item = value[key];
		if (item !== undefined) clone[key] = cloneJsonValue(item);
	}
	return clone;
}

function cloneEpisode(episode: MemoryEpisode): MemoryEpisode {
	return {
		...episode,
		scope: cloneScope(episode.scope),
		validTime: cloneInterval(episode.validTime),
		transactionTime: cloneInterval(episode.transactionTime),
		provenance: cloneProvenance(episode.provenance),
	};
}

function clamp01(value: number): number {
	if (!Number.isFinite(value) || value <= 0) return 0;
	if (value >= 1) return 1;
	return value;
}
