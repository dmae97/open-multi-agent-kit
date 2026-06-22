import "./providers/register-builtins.ts";

import { getApiProvider } from "./api-registry.ts";
import { getEnvApiKey } from "./env-api-keys.ts";
import { createProviderNetworkGuardedStream } from "./provider-network.ts";
import type {
	Api,
	AssistantMessage,
	AssistantMessageEventStream,
	Context,
	Model,
	ProviderStreamOptions,
	SimpleStreamOptions,
	StreamOptions,
} from "./types.ts";

export { getEnvApiKey } from "./env-api-keys.ts";

function hasExplicitApiKey(apiKey: string | undefined): apiKey is string {
	return typeof apiKey === "string" && apiKey.trim().length > 0;
}

function withEnvApiKey<TOptions extends StreamOptions>(
	model: Model<Api>,
	options: TOptions | undefined,
): TOptions | undefined {
	if (hasExplicitApiKey(options?.apiKey)) return options;
	const apiKey = getEnvApiKey(model.provider);
	if (!apiKey) return options;
	return { ...options, apiKey } as TOptions;
}

function resolveApiProvider(api: Api) {
	const provider = getApiProvider(api);
	if (!provider) {
		throw new Error(`No API provider registered for api: ${api}`);
	}
	return provider;
}

function applyBeforeProviderSend<TApi extends Api>(
	model: Model<TApi>,
	context: Context,
	options: StreamOptions | undefined,
	mode: "stream" | "streamSimple",
): Context {
	const nextContext = options?.beforeProviderSend?.({
		model: model as Model<Api>,
		context,
		options,
		mode,
	});
	return nextContext ?? context;
}

export function stream<TApi extends Api>(
	model: Model<TApi>,
	context: Context,
	options?: ProviderStreamOptions,
): AssistantMessageEventStream {
	const providerContext = applyBeforeProviderSend(model, context, options, "stream");
	if (options?.beforeNetworkRequest) {
		return createProviderNetworkGuardedStream({
			model,
			purpose: "chat",
			transport: "http",
			source: "model.baseUrl",
			beforeNetworkRequest: options.beforeNetworkRequest,
			invoke: () => {
				const provider = resolveApiProvider(model.api);
				return provider.stream(model, providerContext, withEnvApiKey(model, options) as StreamOptions);
			},
		});
	}
	const provider = resolveApiProvider(model.api);
	return provider.stream(model, providerContext, withEnvApiKey(model, options) as StreamOptions);
}

export async function complete<TApi extends Api>(
	model: Model<TApi>,
	context: Context,
	options?: ProviderStreamOptions,
): Promise<AssistantMessage> {
	const s = stream(model, context, options);
	return s.result();
}

export function streamSimple<TApi extends Api>(
	model: Model<TApi>,
	context: Context,
	options?: SimpleStreamOptions,
): AssistantMessageEventStream {
	const providerContext = applyBeforeProviderSend(model, context, options, "streamSimple");
	if (options?.beforeNetworkRequest) {
		return createProviderNetworkGuardedStream({
			model,
			purpose: "completion",
			transport: "http",
			source: "model.baseUrl",
			beforeNetworkRequest: options.beforeNetworkRequest,
			invoke: () => {
				const provider = resolveApiProvider(model.api);
				return provider.streamSimple(model, providerContext, withEnvApiKey(model, options));
			},
		});
	}
	const provider = resolveApiProvider(model.api);
	return provider.streamSimple(model, providerContext, withEnvApiKey(model, options));
}

export async function completeSimple<TApi extends Api>(
	model: Model<TApi>,
	context: Context,
	options?: SimpleStreamOptions,
): Promise<AssistantMessage> {
	const s = streamSimple(model, context, options);
	return s.result();
}
