/**
 * Generate commit messages from diffs using a smol, fast model.
 * Follows the same pattern as title-generator.ts.
 */
import type { Api, Model } from "@oh-my-pi/pi-ai";
import { completeSimple } from "@oh-my-pi/pi-ai";
import { logger } from "@oh-my-pi/pi-utils";
import type { ModelRegistry } from "../config/model-registry";
import { parseModelString } from "../config/model-resolver";
import { renderPromptTemplate } from "../config/prompt-templates";
import MODEL_PRIO from "../priority.json" with { type: "json" };
import commitSystemPrompt from "../prompts/system/commit-message-system.md" with { type: "text" };

const COMMIT_SYSTEM_PROMPT = renderPromptTemplate(commitSystemPrompt);
const MAX_DIFF_CHARS = 4000;

function getSmolModelCandidates(registry: ModelRegistry, savedSmolModel?: string): Model<Api>[] {
	const availableModels = registry.getAvailable();
	if (availableModels.length === 0) return [];

	const candidates: Model<Api>[] = [];
	const addCandidate = (model?: Model<Api>): void => {
		if (!model) return;
		if (candidates.some(c => c.provider === model.provider && c.id === model.id)) return;
		candidates.push(model);
	};

	if (savedSmolModel) {
		const parsed = parseModelString(savedSmolModel);
		if (parsed) {
			const match = availableModels.find(m => m.provider === parsed.provider && m.id === parsed.id);
			addCandidate(match);
		}
	}

	for (const pattern of MODEL_PRIO.smol) {
		const needle = pattern.toLowerCase();
		addCandidate(availableModels.find(m => m.id.toLowerCase() === needle));
		addCandidate(availableModels.find(m => m.id.toLowerCase().includes(needle)));
	}

	for (const model of availableModels) {
		addCandidate(model);
	}

	return candidates;
}

/**
 * Generate a commit message from a unified diff.
 * Returns null if generation fails (caller should fall back to generic message).
 */
export async function generateCommitMessage(
	diff: string,
	registry: ModelRegistry,
	savedSmolModel?: string,
	sessionId?: string,
): Promise<string | null> {
	const candidates = getSmolModelCandidates(registry, savedSmolModel);
	if (candidates.length === 0) {
		logger.debug("commit-msg-generator: no smol model found");
		return null;
	}

	const truncatedDiff = diff.length > MAX_DIFF_CHARS ? `${diff.slice(0, MAX_DIFF_CHARS)}\n… (truncated)` : diff;
	const userMessage = `<diff>\n${truncatedDiff}\n</diff>`;

	for (const model of candidates) {
		const apiKey = await registry.getApiKey(model, sessionId);
		if (!apiKey) continue;

		try {
			const response = await completeSimple(
				model,
				{
					systemPrompt: COMMIT_SYSTEM_PROMPT,
					messages: [{ role: "user", content: userMessage, timestamp: Date.now() }],
				},
				{ apiKey, maxTokens: 60 },
			);

			if (response.stopReason === "error") {
				logger.debug("commit-msg-generator: error", { model: model.id, error: response.errorMessage });
				continue;
			}

			let msg = "";
			for (const content of response.content) {
				if (content.type === "text") msg += content.text;
			}
			msg = msg.trim();
			if (!msg) continue;

			// Clean up: remove wrapping quotes, backticks, trailing period
			msg = msg.replace(/^[`"']|[`"']$/g, "").replace(/\.$/, "");

			logger.debug("commit-msg-generator: generated", { model: model.id, msg });
			return msg;
		} catch (err) {
			logger.debug("commit-msg-generator: error", {
				model: model.id,
				error: err instanceof Error ? err.message : String(err),
			});
		}
	}

	return null;
}
