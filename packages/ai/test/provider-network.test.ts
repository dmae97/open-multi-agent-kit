import { afterEach, describe, expect, it } from "vitest";
import { registerApiProvider, unregisterApiProviders } from "../src/api-registry.ts";
import { generateImages } from "../src/images.ts";
import { registerImagesApiProvider } from "../src/images-api-registry.ts";
import { normalizeProviderNetworkRequest, ProviderNetworkPolicyError } from "../src/provider-network.ts";
import { stream, streamSimple } from "../src/stream.ts";
import type {
	Api,
	AssistantImages,
	AssistantMessage,
	AssistantMessageEventStream,
	Context,
	ImagesApi,
	ImagesContext,
	ImagesModel,
	Model,
	ProviderNetworkDecision,
	Usage,
} from "../src/types.ts";
import { createAssistantMessageEventStream } from "../src/utils/event-stream.ts";

const DEFAULT_USAGE: Usage = {
	input: 0,
	output: 0,
	cacheRead: 0,
	cacheWrite: 0,
	totalTokens: 0,
	cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
};

const context: Context = {
	messages: [{ role: "user", content: "hello", timestamp: 1 }],
};

const imagesContext: ImagesContext = {
	input: [{ type: "text", text: "draw a circle" }],
};

const sourceIds: string[] = [];
let nextId = 0;

afterEach(() => {
	for (const sourceId of sourceIds.splice(0)) {
		unregisterApiProviders(sourceId);
	}
});

function createModel(api: Api, baseUrl = "https://api.example.com/v1?api_key=sk-secret"): Model<Api> {
	return {
		id: `model-${nextId++}`,
		name: "Test Model",
		api,
		provider: "test-provider",
		baseUrl,
		reasoning: false,
		input: ["text"],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 128000,
		maxTokens: 4096,
	};
}

function createImagesModel(api: ImagesApi): ImagesModel<ImagesApi> {
	return {
		id: `image-model-${nextId++}`,
		name: "Test Image Model",
		api,
		provider: "test-images-provider",
		baseUrl: "https://images.example.com/v1?api_key=sk-image-secret",
		input: ["text"],
		output: ["image"],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
	};
}

function createDoneStream(model: Model<Api>): AssistantMessageEventStream {
	const streamResult = createAssistantMessageEventStream();
	const message: AssistantMessage = {
		role: "assistant",
		content: [{ type: "text", text: "ok" }],
		api: model.api,
		provider: model.provider,
		model: model.id,
		usage: DEFAULT_USAGE,
		stopReason: "stop",
		timestamp: 2,
	};
	queueMicrotask(() => {
		streamResult.push({ type: "done", reason: "stop", message });
	});
	return streamResult;
}

function registerTextProvider(api: Api, onInvoke: () => void): void {
	const sourceId = `provider-network-test-${nextId++}`;
	sourceIds.push(sourceId);
	registerApiProvider(
		{
			api,
			stream: (model) => {
				onInvoke();
				return createDoneStream(model);
			},
			streamSimple: (model) => {
				onInvoke();
				return createDoneStream(model);
			},
		},
		sourceId,
	);
}

function registerImageProvider(api: ImagesApi, onInvoke: () => void): void {
	registerImagesApiProvider({
		api,
		generateImages: async (model): Promise<AssistantImages> => {
			onInvoke();
			return {
				api: model.api,
				provider: model.provider,
				model: model.id,
				output: [{ type: "image", data: "ZmFrZQ==", mimeType: "image/png" }],
				stopReason: "stop",
				timestamp: 3,
			};
		},
	});
}

describe("provider network helper", () => {
	it("normalizes provider URLs without preserving credentials, queries, or fragments", () => {
		const model = createModel("provider-network-normalize", "https://BASE.EXAMPLE.COM/root?api_key=base-secret");

		const request = normalizeProviderNetworkRequest({
			model,
			url: "https://user:password@Api.Example.COM.:443/v1/chat?api_key=sk-secret#fragment",
			purpose: "chat",
			transport: "http",
			source: "provider-derived-url",
		});

		expect(request).toMatchObject({
			provider: "test-provider",
			api: "provider-network-normalize",
			modelId: model.id,
			baseUrl: "https://base.example.com/",
			url: "https://api.example.com/",
			host: "api.example.com",
			protocol: "https:",
			loopback: false,
			transport: "http",
			purpose: "chat",
			source: "provider-derived-url",
		});
		expect(JSON.stringify(request)).not.toContain("sk-secret");
		expect(JSON.stringify(request)).not.toContain("base-secret");
		expect(JSON.stringify(request)).not.toContain("password");
	});

	it("marks local provider hosts as loopback", () => {
		const model = createModel("provider-network-loopback");
		const urls = [
			"http://localhost:11434/v1",
			"http://api.localhost/v1",
			"http://127.42.0.1:8080/v1",
			"http://[::1]:8080/v1",
			"http://0.0.0.0:1234/v1",
		];

		for (const url of urls) {
			expect(normalizeProviderNetworkRequest({ model, url, purpose: "chat", transport: "http" }).loopback, url).toBe(
				true,
			);
		}
	});

	it("calls the streamSimple network hook before invoking the provider", async () => {
		const api = `provider-network-stream-simple-${nextId++}`;
		let providerInvoked = false;
		let hookRequestHost = "";
		registerTextProvider(api, () => {
			providerInvoked = true;
		});

		const decision: ProviderNetworkDecision = {
			allowed: true,
			rule: "test.allow",
			reason: "allowed",
			mode: "enforce",
		};
		const response = await streamSimple(createModel(api), context, {
			beforeNetworkRequest: (request) => {
				expect(providerInvoked).toBe(false);
				hookRequestHost = request.host;
				return decision;
			},
		}).result();

		expect(response.stopReason).toBe("stop");
		expect(providerInvoked).toBe(true);
		expect(hookRequestHost).toBe("api.example.com");
	});

	it("returns a sanitized stream error and skips the provider when the hook denies", async () => {
		const api = `provider-network-stream-deny-${nextId++}`;
		let providerInvoked = false;
		registerTextProvider(api, () => {
			providerInvoked = true;
		});

		const response = await streamSimple(createModel(api), context, {
			beforeNetworkRequest: () => ({
				allowed: false,
				rule: "test.deny",
				reason: "denied without exposing request content",
				mode: "enforce",
			}),
		}).result();

		expect(providerInvoked).toBe(false);
		expect(response.stopReason).toBe("error");
		expect(response.errorMessage).toContain("Provider network access denied");
		expect(response.errorMessage).toContain("host=api.example.com");
		expect(response.errorMessage).not.toContain("sk-secret");
		expect(response.errorMessage).not.toContain("api_key");
	});

	it("runs streamSimple policy denial before provider lookup", async () => {
		const api = `provider-network-missing-stream-simple-${nextId++}`;

		const response = await streamSimple(createModel(api), context, {
			beforeNetworkRequest: () => ({
				allowed: false,
				rule: "test.deny-before-provider-lookup",
				reason: "denied before provider lookup",
				mode: "enforce",
			}),
		}).result();

		expect(response.stopReason).toBe("error");
		expect(response.errorMessage).toContain("Provider network access denied");
		expect(response.errorMessage).toContain("test.deny-before-provider-lookup");
		expect(response.errorMessage).not.toContain("No API provider registered");
	});

	it("calls the full stream network hook before invoking the provider", async () => {
		const api = `provider-network-stream-${nextId++}`;
		let providerInvoked = false;
		let hookCalled = false;
		registerTextProvider(api, () => {
			providerInvoked = true;
		});

		const response = await stream(createModel(api), context, {
			beforeNetworkRequest: () => {
				expect(providerInvoked).toBe(false);
				hookCalled = true;
				return { allowed: true, rule: "test.allow", reason: "allowed", mode: "enforce" };
			},
		}).result();

		expect(response.stopReason).toBe("stop");
		expect(hookCalled).toBe(true);
		expect(providerInvoked).toBe(true);
	});

	it("runs full stream policy denial before provider lookup", async () => {
		const api = `provider-network-missing-stream-${nextId++}`;

		const response = await stream(createModel(api), context, {
			beforeNetworkRequest: () => ({
				allowed: false,
				rule: "test.deny-stream-before-provider-lookup",
				reason: "denied before provider lookup",
				mode: "enforce",
			}),
		}).result();

		expect(response.stopReason).toBe("error");
		expect(response.errorMessage).toContain("Provider network access denied");
		expect(response.errorMessage).toContain("test.deny-stream-before-provider-lookup");
		expect(response.errorMessage).not.toContain("No API provider registered");
	});

	it("checks image generation before invoking the provider", async () => {
		const api = `provider-network-images-${nextId++}`;
		let providerInvoked = false;
		registerImageProvider(api, () => {
			providerInvoked = true;
		});

		const response = await generateImages(createImagesModel(api), imagesContext, {
			beforeNetworkRequest: (request) => {
				expect(providerInvoked).toBe(false);
				expect(request.purpose).toBe("images");
				expect(request.host).toBe("images.example.com");
				return { allowed: true, rule: "test.allow", reason: "allowed", mode: "enforce" };
			},
		});

		expect(response.stopReason).toBe("stop");
		expect(providerInvoked).toBe(true);
	});

	it("rejects image generation with a sanitized policy error when the hook denies", async () => {
		const api = `provider-network-images-deny-${nextId++}`;
		let providerInvoked = false;
		registerImageProvider(api, () => {
			providerInvoked = true;
		});

		await expect(
			generateImages(createImagesModel(api), imagesContext, {
				beforeNetworkRequest: () => ({
					allowed: false,
					rule: "test.deny",
					reason: "denied",
					mode: "enforce",
				}),
			}),
		).rejects.toThrow(ProviderNetworkPolicyError);
		expect(providerInvoked).toBe(false);
	});

	it("checks image policy denial before provider lookup", async () => {
		const api = `provider-network-missing-images-${nextId++}`;

		await expect(
			generateImages(createImagesModel(api), imagesContext, {
				beforeNetworkRequest: () => ({
					allowed: false,
					rule: "test.deny-images-before-provider-lookup",
					reason: "denied before provider lookup",
					mode: "enforce",
				}),
			}),
		).rejects.toMatchObject({
			name: "ProviderNetworkPolicyError",
			details: { rule: "test.deny-images-before-provider-lookup", host: "images.example.com" },
		});
	});
});
