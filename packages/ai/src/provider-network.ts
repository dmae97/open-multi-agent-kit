import type {
	Api,
	AssistantMessage,
	AssistantMessageEventStream,
	BeforeProviderNetworkRequest,
	ImagesApi,
	ImagesModel,
	Model,
	ProviderNetworkDecision,
	ProviderNetworkProtocol,
	ProviderNetworkPurpose,
	ProviderNetworkRequest,
	ProviderNetworkRequestSource,
	ProviderNetworkTransport,
	Usage,
} from "./types.ts";
import { createAssistantMessageEventStream } from "./utils/event-stream.ts";

const DEFAULT_USAGE: Usage = {
	input: 0,
	output: 0,
	cacheRead: 0,
	cacheWrite: 0,
	totalTokens: 0,
	cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
};

type ProviderNetworkModel =
	| Pick<Model<Api>, "api" | "baseUrl" | "id" | "provider">
	| Pick<ImagesModel<ImagesApi>, "api" | "baseUrl" | "id" | "provider">;

export interface NormalizeProviderNetworkRequestInput {
	model: ProviderNetworkModel;
	url?: string;
	transport?: ProviderNetworkTransport;
	purpose: ProviderNetworkPurpose;
	source?: ProviderNetworkRequestSource;
}

interface SanitizedProviderUrl {
	url: string;
	host: string;
	protocol: ProviderNetworkProtocol;
	port?: string;
	loopback: boolean;
}

export interface ProviderNetworkPolicyErrorDetails {
	provider: string;
	api: string;
	modelId: string;
	host?: string;
	rule: string;
	mode?: ProviderNetworkDecision["mode"];
}

export class ProviderNetworkPolicyError extends Error {
	readonly details: ProviderNetworkPolicyErrorDetails;

	constructor(details: ProviderNetworkPolicyErrorDetails) {
		const host = details.host ?? "<unknown>";
		super(
			`Provider network access denied: provider=${details.provider} api=${details.api} model=${details.modelId} host=${host} rule=${details.rule}`,
		);
		this.name = "ProviderNetworkPolicyError";
		this.details = details;
	}
}

function isProviderNetworkProtocol(protocol: string): protocol is ProviderNetworkProtocol {
	return protocol === "http:" || protocol === "https:" || protocol === "ws:" || protocol === "wss:";
}

function normalizeHostname(hostname: string): string {
	const unbracketed = hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;
	return unbracketed.toLowerCase().replace(/\.+$/u, "");
}

function formatHostForUrl(host: string): string {
	return host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
}

function isValidIpv4Octet(value: string): boolean {
	if (!/^\d{1,3}$/u.test(value)) return false;
	const parsed = Number(value);
	return Number.isInteger(parsed) && parsed >= 0 && parsed <= 255;
}

function isIpv4Loopback(host: string): boolean {
	const parts = host.split(".");
	return parts.length === 4 && parts.every(isValidIpv4Octet) && parts[0] === "127";
}

function isLoopbackHost(host: string): boolean {
	return (
		host === "localhost" ||
		host.endsWith(".localhost") ||
		host === "0.0.0.0" ||
		host === "::1" ||
		isIpv4Loopback(host)
	);
}

function createErrorDetails(
	model: ProviderNetworkModel,
	rule: string,
	host?: string,
	mode?: ProviderNetworkDecision["mode"],
): ProviderNetworkPolicyErrorDetails {
	return {
		provider: model.provider,
		api: String(model.api),
		modelId: model.id,
		host,
		rule,
		mode,
	};
}

function parseProviderUrl(rawUrl: string, model: ProviderNetworkModel, rule: string): URL {
	try {
		return new URL(rawUrl.trim());
	} catch {
		throw new ProviderNetworkPolicyError(createErrorDetails(model, rule));
	}
}

function sanitizeProviderUrl(rawUrl: string, model: ProviderNetworkModel, rule: string): SanitizedProviderUrl {
	const parsed = parseProviderUrl(rawUrl, model, rule);
	if (!isProviderNetworkProtocol(parsed.protocol)) {
		throw new ProviderNetworkPolicyError(createErrorDetails(model, "network.unsupported_protocol"));
	}

	const host = normalizeHostname(parsed.hostname);
	if (!host) {
		throw new ProviderNetworkPolicyError(createErrorDetails(model, "network.unknown_host"));
	}

	const port = parsed.port || undefined;
	const url = `${parsed.protocol}//${formatHostForUrl(host)}${port ? `:${port}` : ""}/`;
	return {
		url,
		host,
		protocol: parsed.protocol,
		port,
		loopback: isLoopbackHost(host),
	};
}

export function normalizeProviderNetworkRequest(input: NormalizeProviderNetworkRequestInput): ProviderNetworkRequest {
	const base = sanitizeProviderUrl(input.model.baseUrl, input.model, "network.invalid_base_url");
	const target = sanitizeProviderUrl(input.url ?? input.model.baseUrl, input.model, "network.invalid_url");
	return {
		provider: input.model.provider,
		api: input.model.api,
		modelId: input.model.id,
		baseUrl: base.url,
		url: target.url,
		host: target.host,
		protocol: target.protocol,
		port: target.port,
		loopback: target.loopback,
		transport: input.transport ?? (target.protocol === "ws:" || target.protocol === "wss:" ? "websocket" : "http"),
		purpose: input.purpose,
		source: input.source ?? "model.baseUrl",
	};
}

function normalizeDeniedDecision(
	decision: ProviderNetworkDecision | undefined,
): Pick<ProviderNetworkDecision, "mode" | "rule"> {
	return {
		mode: decision?.mode ?? "enforce",
		rule: decision?.rule ?? "network.no_decision",
	};
}

export async function assertProviderNetworkRequestAllowed(
	input: NormalizeProviderNetworkRequestInput,
	beforeNetworkRequest: BeforeProviderNetworkRequest | undefined,
): Promise<ProviderNetworkRequest | undefined> {
	if (!beforeNetworkRequest) return undefined;

	const request = normalizeProviderNetworkRequest(input);
	const decision = await beforeNetworkRequest(request);
	if (!decision?.allowed) {
		const denied = normalizeDeniedDecision(decision);
		throw new ProviderNetworkPolicyError(createErrorDetails(input.model, denied.rule, request.host, denied.mode));
	}
	return request;
}

function errorMessageForProviderNetworkFailure(error: unknown): string {
	if (error instanceof ProviderNetworkPolicyError) return error.message;
	return "Provider network preflight failed";
}

function createProviderNetworkErrorMessage(model: ProviderNetworkModel, error: unknown): AssistantMessage {
	return {
		role: "assistant",
		content: [],
		api: model.api as Api,
		provider: model.provider,
		model: model.id,
		usage: DEFAULT_USAGE,
		stopReason: "error",
		errorMessage: errorMessageForProviderNetworkFailure(error),
		timestamp: Date.now(),
	};
}

export function createProviderNetworkGuardedStream(
	input: NormalizeProviderNetworkRequestInput & {
		beforeNetworkRequest: BeforeProviderNetworkRequest;
		invoke: () => AssistantMessageEventStream;
	},
): AssistantMessageEventStream {
	const guarded = createAssistantMessageEventStream();

	queueMicrotask(async () => {
		try {
			await assertProviderNetworkRequestAllowed(input, input.beforeNetworkRequest);
			const upstream = input.invoke();
			for await (const event of upstream) {
				guarded.push(event);
			}
		} catch (error) {
			const message = createProviderNetworkErrorMessage(input.model, error);
			guarded.push({ type: "error", reason: "error", error: message });
		}
	});

	return guarded;
}

/**
 * Build an `AssistantMessageEventStream` that terminates immediately with a
 * sanitized provider network policy error. Used when a pre-auth preflight
 * denies a request before any provider network I/O or auth resolution.
 *
 * The error message exposes only origin metadata (provider, api, model id,
 * host, rule); it never includes headers, API keys, request bodies, prompts,
 * or responses.
 */
export function createProviderNetworkErrorStream(
	model: ProviderNetworkModel,
	error: unknown,
): AssistantMessageEventStream {
	const stream = createAssistantMessageEventStream();
	const message = createProviderNetworkErrorMessage(model, error);
	queueMicrotask(() => {
		stream.push({ type: "error", reason: "error", error: message });
	});
	return stream;
}
