import type { AppAction, KeybindingsManager } from "../../config/keybindings";

export interface HotkeysMarkdownBindings {
	keybindings: Pick<KeybindingsManager, "getDisplayString">;
}

function appKey(bindings: HotkeysMarkdownBindings, action: AppAction): string {
	return bindings.keybindings.getDisplayString(action) || "Disabled";
}

export function buildHotkeysMarkdown(bindings: HotkeysMarkdownBindings): string {
	return [
		"**Navigation**",
		"| Key | Action |",
		"|-----|--------|",
		"| `Arrow keys` | Move cursor / browse history (Up when empty) |",
		"| `Option+Left/Right` | Move by word |",
		"| `Ctrl+A` / `Home` / `Cmd+Left` | Start of line |",
		"| `Ctrl+E` / `End` / `Cmd+Right` | End of line |",
		"",
		"**Editing**",
		"| Key | Action |",
		"|-----|--------|",
		"| `Enter` | Send message |",
		"| `Shift+Enter` / `Alt+Enter` | New line |",
		"| `Ctrl+W` / `Option+Backspace` | Delete word backwards |",
		"| `Ctrl+U` | Delete to start of line |",
		"| `Ctrl+K` | Delete to end of line |",
		`| \`${appKey(bindings, "copyLine")}\` | Copy current line |`,
		`| \`${appKey(bindings, "copyPrompt")}\` | Copy whole prompt |`,
		"",
		"**Other**",
		"| Key | Action |",
		"|-----|--------|",
		"| `Tab` | Path completion / accept autocomplete |",
		`| \`${appKey(bindings, "interrupt")}\` | Cancel autocomplete / interrupt active work |`,
		`| \`${appKey(bindings, "clear")}\` | Clear editor (first) / exit (second) |`,
		`| \`${appKey(bindings, "exit")}\` | Exit (when editor is empty) |`,
		`| \`${appKey(bindings, "suspend")}\` | Suspend to background |`,
		`| \`${appKey(bindings, "cycleThinkingLevel")}\` | Cycle thinking level |`,
		`| \`${appKey(bindings, "cycleModelForward")}\` | Cycle role models (slow/default/smol) |`,
		`| \`${appKey(bindings, "cycleModelBackward")}\` | Cycle role models (temporary) |`,
		"| `Alt+P` | Select model (temporary) |",
		`| \`${appKey(bindings, "selectModel")}\` | Select model (set roles) |`,
		`| \`${appKey(bindings, "togglePlanMode")}\` | Toggle plan mode |`,
		`| \`${appKey(bindings, "historySearch")}\` | Search prompt history |`,
		`| \`${appKey(bindings, "expandTools")}\` | Toggle tool output expansion |`,
		`| \`${appKey(bindings, "toggleThinking")}\` | Toggle thinking block visibility |`,
		`| \`${appKey(bindings, "externalEditor")}\` | Edit message in external editor |`,
		`| \`${appKey(bindings, "pasteImage")}\` | Paste image from clipboard |`,
		`| \`${appKey(bindings, "toggleSTT")}\` | Toggle speech-to-text recording |`,
		"| `#` | Open prompt actions |",
		"| `/` | Slash commands |",
		"| `!` | Run bash command |",
		"| `!!` | Run bash command (excluded from context) |",
		"| `$` | Run Python in shared kernel |",
		"| `$$` | Run Python (excluded from context) |",
	].join("\n");
}
