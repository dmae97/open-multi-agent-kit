/**
 * Generate session titles using a smol, fast model.
 */
import type { ThinkingLevel } from "@oh-my-pi/pi-agent-core";
import type { Api, Model } from "@oh-my-pi/pi-ai";
import { completeSimple } from "@oh-my-pi/pi-ai";
import { logger } from "@oh-my-pi/pi-utils";
import type { ModelRegistry } from "../config/model-registry";
import { resolveModelRoleValue } from "../config/model-resolver";
import { renderPromptTemplate } from "../config/prompt-templates";
import type { Settings } from "../config/settings";
import titleSystemPrompt from "../prompts/system/title-system.md" with { type: "text" };
import { toReasoningEffort } from "../thinking";

const TITLE_SYSTEM_PROMPT = renderPromptTemplate(titleSystemPrompt);

const MAX_INPUT_CHARS = 2000;

function getTitleModel(
	registry: ModelRegistry,
	settings: Settings,
	currentModel?: Model<Api>,
): { model: Model<Api>; thinkingLevel?: ThinkingLevel } | undefined {
	const availableModels = registry.getAvailable();
	if (availableModels.length === 0) return undefined;

	const matchPreferences = { usageOrder: settings.getStorage()?.getModelUsageOrder() };
	const configuredSmol = resolveModelRoleValue(settings.getModelRole("smol"), availableModels, {
		settings,
		matchPreferences,
	});
	if (configuredSmol.model) {
		return { model: configuredSmol.model, thinkingLevel: configuredSmol.thinkingLevel };
	}

	if (currentModel) {
		return { model: currentModel };
	}

	return undefined;
}

/**
 * Generate a title for a session based on the first user message.
 *
 * @param firstMessage The first user message
 * @param registry Model registry
 * @param settings Settings used to resolve the smol role, including per-role thinking
 * @param sessionId Optional session id for sticky API key selection
 */
export async function generateSessionTitle(
	firstMessage: string,
	registry: ModelRegistry,
	settings: Settings,
	sessionId?: string,
	currentModel?: Model<Api>,
): Promise<string | null> {
	const candidate = getTitleModel(registry, settings, currentModel);
	if (!candidate) {
		logger.debug("title-generator: no title model found");
		return null;
	}

	// Truncate message if too long
	const truncatedMessage =
		firstMessage.length > MAX_INPUT_CHARS ? `${firstMessage.slice(0, MAX_INPUT_CHARS)}…` : firstMessage;
	const userMessage = `<user-message>
${truncatedMessage}
</user-message>`;

	const apiKey = await registry.getApiKey(candidate.model, sessionId);
	if (!apiKey) {
		logger.debug("title-generator: no API key for smol model", {
			provider: candidate.model.provider,
			id: candidate.model.id,
		});
		return null;
	}

	const request = {
		model: `${candidate.model.provider}/${candidate.model.id}`,
		systemPrompt: TITLE_SYSTEM_PROMPT,
		userMessage,
		maxTokens: 30,
	};
	logger.debug("title-generator: request", request);

	try {
		const response = await completeSimple(
			candidate.model,
			{
				systemPrompt: request.systemPrompt,
				messages: [{ role: "user", content: request.userMessage, timestamp: Date.now() }],
			},
			{
				apiKey,
				maxTokens: 30,
				reasoning: toReasoningEffort(candidate.thinkingLevel),
			},
		);

		if (response.stopReason === "error") {
			logger.debug("title-generator: response error", {
				model: request.model,
				stopReason: response.stopReason,
				errorMessage: response.errorMessage,
			});
			return null;
		}

		let title = "";
		for (const content of response.content) {
			if (content.type === "text") {
				title += content.text;
			}
		}
		title = title.trim();

		logger.debug("title-generator: response", {
			model: request.model,
			title,
			usage: response.usage,
			stopReason: response.stopReason,
		});

		if (!title) {
			return null;
		}

		return title.replace(/^["']|["']$/g, "").replace(/[.!?]$/, "");
	} catch (err) {
		logger.debug("title-generator: error", {
			model: request.model,
			error: err instanceof Error ? err.message : String(err),
		});
		return null;
	}
}

/**
 * Set the terminal title using ANSI escape sequences.
 */
export function setTerminalTitle(title: string): void {
	// OSC 2 sets the window title
	process.stdout.write(`]2;${title}`);
}
