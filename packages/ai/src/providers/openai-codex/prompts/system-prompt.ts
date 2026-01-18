export interface CodexSystemPrompt {
	instructions: string;
	developerMessages: string[];
}

export function buildCodexSystemPrompt(args: {
	codexInstructions: string;
	userSystemPrompt?: string;
}): CodexSystemPrompt {
	const { codexInstructions, userSystemPrompt } = args;
	const developerMessages: string[] = [];

	if (userSystemPrompt && userSystemPrompt.trim().length > 0) {
		developerMessages.push(userSystemPrompt.trim());
	}

	return {
		instructions: codexInstructions.trim(),
		developerMessages,
	};
}
