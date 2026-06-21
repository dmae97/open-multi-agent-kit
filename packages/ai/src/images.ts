import "./providers/images/register-builtins.ts";

import { getImagesApiProvider } from "./images-api-registry.ts";
import { assertProviderNetworkRequestAllowed } from "./provider-network.ts";
import type { AssistantImages, ImagesApi, ImagesContext, ImagesModel, ProviderImagesOptions } from "./types.ts";

function resolveImagesApiProvider(api: ImagesApi) {
	const provider = getImagesApiProvider(api);
	if (!provider) {
		throw new Error(`No API provider registered for api: ${api}`);
	}
	return provider;
}

export async function generateImages<TApi extends ImagesApi>(
	model: ImagesModel<TApi>,
	context: ImagesContext,
	options?: ProviderImagesOptions,
): Promise<AssistantImages> {
	await assertProviderNetworkRequestAllowed(
		{ model, purpose: "images", transport: "http", source: "model.baseUrl" },
		options?.beforeNetworkRequest,
	);
	const provider = resolveImagesApiProvider(model.api);
	return provider.generateImages(model, context, options);
}
