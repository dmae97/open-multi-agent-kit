import { Editor, type KeyId, matchesKey, parseKittySequence } from "@oh-my-pi/pi-tui";
import type { AppAction } from "../../config/keybindings";

type ConfigurableEditorAction = Extract<
	AppAction,
	| "interrupt"
	| "clear"
	| "exit"
	| "suspend"
	| "cycleThinkingLevel"
	| "cycleModelForward"
	| "cycleModelBackward"
	| "selectModel"
	| "expandTools"
	| "toggleThinking"
	| "externalEditor"
	| "historySearch"
	| "dequeue"
	| "pasteImage"
	| "copyPrompt"
>;

const DEFAULT_ACTION_KEYS: Record<ConfigurableEditorAction, KeyId[]> = {
	interrupt: ["escape"],
	clear: ["ctrl+c"],
	exit: ["ctrl+d"],
	suspend: ["ctrl+z"],
	cycleThinkingLevel: ["shift+tab"],
	cycleModelForward: ["ctrl+p"],
	cycleModelBackward: ["shift+ctrl+p"],
	selectModel: ["ctrl+l"],
	expandTools: ["ctrl+o"],
	toggleThinking: ["ctrl+t"],
	externalEditor: ["ctrl+g"],
	historySearch: ["ctrl+r"],
	dequeue: ["alt+up"],
	pasteImage: ["ctrl+v"],
	copyPrompt: ["alt+shift+c"],
};

/**
 * Custom editor that handles configurable app-level shortcuts for coding-agent.
 */
export class CustomEditor extends Editor {
	onEscape?: () => void;
	shouldBypassAutocompleteOnEscape?: () => boolean;
	onClear?: () => void;
	onExit?: () => void;
	onCycleThinkingLevel?: () => void;
	onCycleModelForward?: () => void;
	onCycleModelBackward?: () => void;
	onSelectModel?: () => void;
	onExpandTools?: () => void;
	onToggleThinking?: () => void;
	onExternalEditor?: () => void;
	onHistorySearch?: () => void;
	onSuspend?: () => void;
	onShowHotkeys?: () => void;
	onQuickSelectModel?: () => void;
	/** Called when the configured copy-prompt shortcut is pressed. */
	onCopyPrompt?: () => void;
	/** Called when the configured image-paste shortcut is pressed. */
	onPasteImage?: () => Promise<boolean>;
	/** Called when the configured dequeue shortcut is pressed. */
	onDequeue?: () => void;
	/** Called when Caps Lock is pressed. */
	onCapsLock?: () => void;

	/** Custom key handlers from extensions and non-built-in app actions. */
	#customKeyHandlers = new Map<KeyId, () => void>();
	#actionKeys = new Map<ConfigurableEditorAction, KeyId[]>(
		Object.entries(DEFAULT_ACTION_KEYS).map(([action, keys]) => [action as ConfigurableEditorAction, [...keys]]),
	);

	setActionKeys(action: ConfigurableEditorAction, keys: KeyId[]): void {
		this.#actionKeys.set(action, [...keys]);
	}

	#matchesAction(data: string, action: ConfigurableEditorAction): boolean {
		const keys = this.#actionKeys.get(action);
		if (!keys) return false;
		for (const key of keys) {
			if (matchesKey(data, key)) return true;
		}
		return false;
	}

	/**
	 * Register a custom key handler. Extensions use this for shortcuts.
	 */
	setCustomKeyHandler(key: KeyId, handler: () => void): void {
		this.#customKeyHandlers.set(key, handler);
	}

	/**
	 * Remove a custom key handler.
	 */
	removeCustomKeyHandler(key: KeyId): void {
		this.#customKeyHandlers.delete(key);
	}

	/**
	 * Clear all custom key handlers.
	 */
	clearCustomKeyHandlers(): void {
		this.#customKeyHandlers.clear();
	}

	handleInput(data: string): void {
		const parsed = parseKittySequence(data);
		if (parsed && (parsed.modifier & 64) !== 0 && this.onCapsLock) {
			// Caps Lock is modifier bit 64
			this.onCapsLock();
			return;
		}

		// Intercept configured image paste (async - fires and handles result)
		if (this.#matchesAction(data, "pasteImage") && this.onPasteImage) {
			void this.onPasteImage();
			return;
		}

		// Intercept configured external editor shortcut
		if (this.#matchesAction(data, "externalEditor") && this.onExternalEditor) {
			this.onExternalEditor();
			return;
		}

		// Intercept Alt+P for quick model switching
		if (matchesKey(data, "alt+p") && this.onQuickSelectModel) {
			this.onQuickSelectModel();
			return;
		}

		// Intercept configured suspend shortcut
		if (this.#matchesAction(data, "suspend") && this.onSuspend) {
			this.onSuspend();
			return;
		}

		// Intercept configured thinking block visibility toggle
		if (this.#matchesAction(data, "toggleThinking") && this.onToggleThinking) {
			this.onToggleThinking();
			return;
		}

		// Intercept configured model selector shortcut
		if (this.#matchesAction(data, "selectModel") && this.onSelectModel) {
			this.onSelectModel();
			return;
		}

		// Intercept configured history search shortcut
		if (this.#matchesAction(data, "historySearch") && this.onHistorySearch) {
			this.onHistorySearch();
			return;
		}

		// Intercept configured tool output expansion shortcut
		if (this.#matchesAction(data, "expandTools") && this.onExpandTools) {
			this.onExpandTools();
			return;
		}

		// Intercept configured backward model cycling (check before forward cycling)
		if (this.#matchesAction(data, "cycleModelBackward") && this.onCycleModelBackward) {
			this.onCycleModelBackward();
			return;
		}

		// Intercept configured forward model cycling
		if (this.#matchesAction(data, "cycleModelForward") && this.onCycleModelForward) {
			this.onCycleModelForward();
			return;
		}

		// Intercept configured thinking level cycling
		if (this.#matchesAction(data, "cycleThinkingLevel") && this.onCycleThinkingLevel) {
			this.onCycleThinkingLevel();
			return;
		}

		// Intercept configured interrupt shortcut.
		// Default behavior keeps autocomplete dismissal, but parent can prioritize global interrupt handling.
		if (this.#matchesAction(data, "interrupt") && this.onEscape) {
			if (!this.isShowingAutocomplete() || this.shouldBypassAutocompleteOnEscape?.()) {
				this.onEscape();
				return;
			}
		}

		// Intercept configured clear shortcut
		if (this.#matchesAction(data, "clear") && this.onClear) {
			this.onClear();
			return;
		}

		// Intercept configured exit shortcut (only when editor is empty)
		if (this.#matchesAction(data, "exit")) {
			if (this.getText().length === 0 && this.onExit) {
				this.onExit();
			}
			// Always consume exit shortcut (don't pass to parent)
			return;
		}

		// Intercept configured dequeue shortcut (restore queued message to editor)
		if (this.#matchesAction(data, "dequeue") && this.onDequeue) {
			this.onDequeue();
			return;
		}

		// Intercept configured copy-prompt shortcut
		if (this.#matchesAction(data, "copyPrompt") && this.onCopyPrompt) {
			this.onCopyPrompt();
			return;
		}

		// Intercept ? when editor is empty to show hotkeys
		if (data === "?" && this.getText().length === 0 && this.onShowHotkeys) {
			this.onShowHotkeys();
			return;
		}

		// Check custom key handlers (extensions)
		for (const [keyId, handler] of this.#customKeyHandlers) {
			if (matchesKey(data, keyId)) {
				handler();
				return;
			}
		}

		// Pass to parent for normal handling
		super.handleInput(data);
	}
}
