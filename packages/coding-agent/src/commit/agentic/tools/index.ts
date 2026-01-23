import type { CommitAgentState } from "../../../commit/agentic/state";
import type { ControlledGit } from "../../../commit/git";
import type { ModelRegistry } from "../../../config/model-registry";
import type { SettingsManager } from "../../../config/settings-manager";
import type { CustomTool } from "../../../extensibility/custom-tools/types";
import type { AuthStorage } from "../../../session/auth-storage";
import { createAnalyzeFileTool } from "./analyze-file";
import { createGitFileDiffTool } from "./git-file-diff";
import { createGitHunkTool } from "./git-hunk";
import { createGitOverviewTool } from "./git-overview";
import { createProposeChangelogTool } from "./propose-changelog";
import { createProposeCommitTool } from "./propose-commit";
import { createRecentCommitsTool } from "./recent-commits";
import { createSplitCommitTool } from "./split-commit";

export interface CommitToolOptions {
	cwd: string;
	git: ControlledGit;
	authStorage: AuthStorage;
	modelRegistry: ModelRegistry;
	settingsManager: SettingsManager;
	spawns: string;
	state: CommitAgentState;
	changelogTargets: string[];
	enableAnalyzeFiles?: boolean;
}

export function createCommitTools(options: CommitToolOptions): Array<CustomTool<any, any>> {
	const tools: Array<CustomTool<any, any>> = [
		createGitOverviewTool(options.git, options.state),
		createGitFileDiffTool(options.git, options.state),
		createGitHunkTool(options.git),
		createRecentCommitsTool(options.git),
	];

	if (options.enableAnalyzeFiles ?? true) {
		tools.push(
			createAnalyzeFileTool({
				cwd: options.cwd,
				authStorage: options.authStorage,
				modelRegistry: options.modelRegistry,
				settingsManager: options.settingsManager,
				spawns: options.spawns,
				state: options.state,
			}),
		);
	}

	tools.push(
		createProposeChangelogTool(options.state, options.changelogTargets),
		createProposeCommitTool(options.git, options.state),
		createSplitCommitTool(options.git, options.state, options.changelogTargets),
	);

	return tools;
}
