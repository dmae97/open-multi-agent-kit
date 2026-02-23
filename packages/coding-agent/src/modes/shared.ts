import * as fs from "node:fs";
import * as path from "node:path";
import type { TabBarTheme } from "@oh-my-pi/pi-tui";
import { getProjectDir, isEnoent } from "@oh-my-pi/pi-utils";
import { theme } from "./theme/theme";

// ═══════════════════════════════════════════════════════════════════════════
// Text Sanitization
// ═══════════════════════════════════════════════════════════════════════════

/** Sanitize text for display in a single-line status. Replaces newlines/tabs with space, collapses runs, trims. */
export function sanitizeStatusText(text: string): string {
	return text
		.replace(/[\r\n\t]/g, " ")
		.replace(/ +/g, " ")
		.trim();
}

// ═══════════════════════════════════════════════════════════════════════════
// Tab Bar Theme
// ═══════════════════════════════════════════════════════════════════════════

/** Shared tab bar theme used by model-selector and settings-selector. */
export function getTabBarTheme(): TabBarTheme {
	return {
		label: (text: string) => theme.bold(theme.fg("accent", text)),
		activeTab: (text: string) => theme.bold(theme.bg("selectedBg", theme.fg("text", text))),
		inactiveTab: (text: string) => theme.fg("muted", text),
		hint: (text: string) => theme.fg("dim", text),
	};
}

export { parseCommandArgs } from "../utils/command-args";

// ═══════════════════════════════════════════════════════════════════════════
// Git HEAD Discovery
// ═══════════════════════════════════════════════════════════════════════════

/** Walk up from the project dir to find .git/HEAD. Returns path and content, or null. */
export async function findGitHeadPathAsync(): Promise<{ path: string; content: string } | null> {
	let dir = getProjectDir();
	while (true) {
		const gitHeadPath = path.join(dir, ".git", "HEAD");
		try {
			const content = await Bun.file(gitHeadPath).text();
			return { path: gitHeadPath, content };
		} catch (err) {
			if (!isEnoent(err)) throw err;
		}
		const parent = path.dirname(dir);
		if (parent === dir) {
			return null;
		}
		dir = parent;
	}
}

/** Walk up from the project dir to find .git/HEAD. Returns path, or null. */
export function findGitHeadPathSync(): string | null {
	let dir = getProjectDir();
	while (true) {
		const gitHeadPath = path.join(dir, ".git", "HEAD");
		if (fs.existsSync(gitHeadPath)) {
			return gitHeadPath;
		}
		const parent = path.dirname(dir);
		if (parent === dir) {
			return null;
		}
		dir = parent;
	}
}
