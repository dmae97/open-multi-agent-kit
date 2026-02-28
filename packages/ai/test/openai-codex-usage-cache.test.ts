import { describe, expect, it } from "bun:test";
import type { UsageCache, UsageFetchContext, UsageReport } from "../src/usage";
import { openaiCodexUsageProvider } from "../src/usage/openai-codex";

function createCodexToken(args: { accountId?: string; email?: string }): string {
	const payload: Record<string, unknown> = {};
	if (args.accountId) {
		payload["https://api.openai.com/auth"] = { chatgpt_account_id: args.accountId };
	}
	if (args.email) {
		payload["https://api.openai.com/profile"] = { email: args.email };
	}
	const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
	const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
	return `${header}.${body}.sig`;
}

function createUsagePayload(): unknown {
	return {
		plan_type: "team",
		rate_limit: {
			allowed: true,
			limit_reached: false,
			primary_window: {
				used_percent: 12,
				limit_window_seconds: 5 * 60 * 60,
				reset_after_seconds: 60,
			},
		},
	};
}

function createMemoryCache(): UsageCache {
	const entries = new Map<string, { value: UsageReport | null; expiresAt: number }>();
	return {
		get(key) {
			return entries.get(key);
		},
		set(key, entry) {
			entries.set(key, entry);
		},
	};
}

describe("openai-codex usage cache identity", () => {
	it("does not reuse cache for different emails sharing one accountId", async () => {
		const now = Date.now();
		let fetchCalls = 0;
		const fetchMock = (async () => {
			fetchCalls += 1;
			return new Response(JSON.stringify(createUsagePayload()), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		}) as unknown as typeof fetch;
		const ctx: UsageFetchContext = {
			cache: createMemoryCache(),
			fetch: fetchMock,
			now: () => now,
		};

		await openaiCodexUsageProvider.fetchUsage(
			{
				provider: "openai-codex",
				credential: {
					type: "oauth",
					accessToken: createCodexToken({ accountId: "shared", email: "first@example.com" }),
					accountId: "shared",
					email: "first@example.com",
					expiresAt: now + 60_000,
				},
			},
			ctx,
		);
		await openaiCodexUsageProvider.fetchUsage(
			{
				provider: "openai-codex",
				credential: {
					type: "oauth",
					accessToken: createCodexToken({ accountId: "shared", email: "second@example.com" }),
					accountId: "shared",
					email: "second@example.com",
					expiresAt: now + 60_000,
				},
			},
			ctx,
		);

		expect(fetchCalls).toBe(2);
	});

	it("reuses cache for identical email identity", async () => {
		const now = Date.now();
		let fetchCalls = 0;
		const fetchMock = (async () => {
			fetchCalls += 1;
			return new Response(JSON.stringify(createUsagePayload()), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		}) as unknown as typeof fetch;
		const ctx: UsageFetchContext = {
			cache: createMemoryCache(),
			fetch: fetchMock,
			now: () => now,
		};

		const credential = {
			type: "oauth" as const,
			accessToken: createCodexToken({ accountId: "shared", email: "same@example.com" }),
			accountId: "shared",
			email: "same@example.com",
			expiresAt: now + 60_000,
		};

		await openaiCodexUsageProvider.fetchUsage({ provider: "openai-codex", credential }, ctx);
		await openaiCodexUsageProvider.fetchUsage({ provider: "openai-codex", credential }, ctx);

		expect(fetchCalls).toBe(1);
	});

	it("does not reuse cache when email is missing and tokens differ", async () => {
		const now = Date.now();
		let fetchCalls = 0;
		const fetchMock = (async () => {
			fetchCalls += 1;
			return new Response(JSON.stringify(createUsagePayload()), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		}) as unknown as typeof fetch;
		const ctx: UsageFetchContext = {
			cache: createMemoryCache(),
			fetch: fetchMock,
			now: () => now,
		};

		await openaiCodexUsageProvider.fetchUsage(
			{
				provider: "openai-codex",
				credential: {
					type: "oauth",
					accessToken: createCodexToken({ accountId: "shared" }),
					accountId: "shared",
					expiresAt: now + 60_000,
				},
			},
			ctx,
		);
		await openaiCodexUsageProvider.fetchUsage(
			{
				provider: "openai-codex",
				credential: {
					type: "oauth",
					accessToken: `${createCodexToken({ accountId: "shared" })}.variant`,
					accountId: "shared",
					expiresAt: now + 60_000,
				},
			},
			ctx,
		);

		expect(fetchCalls).toBe(2);
	});
});
