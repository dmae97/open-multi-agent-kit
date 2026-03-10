import { describe, expect, it, vi } from "bun:test";
import { InputController } from "@oh-my-pi/pi-coding-agent/modes/controllers/input-controller";
import type { InteractiveModeContext } from "@oh-my-pi/pi-coding-agent/modes/types";

type FakeEditor = {
	onEscape?: () => void;
	onSubmit?: (text: string) => Promise<void>;
	shouldBypassAutocompleteOnEscape?: () => boolean;
	onCtrlC?: () => void;
	onCtrlD?: () => void;
	onCtrlZ?: () => void;
	onShiftTab?: () => void;
	onCtrlP?: () => void;
	onShiftCtrlP?: () => void;
	onAltP?: () => void;
	onCtrlL?: () => void;
	onCtrlR?: () => void;
	onQuestionMark?: () => void;
	onCtrlV?: () => void;
	onCopyPrompt?: () => void;
	onAltUp?: () => void;
	onChange?: (text: string) => void;
	setText(text: string): void;
	getText(): string;
	addToHistory(text: string): void;
	setCustomKeyHandler(key: string, handler: () => void): void;
};

function createContext(): {
	ctx: InteractiveModeContext;
	editor: FakeEditor;
	spies: {
		abort: ReturnType<typeof vi.fn>;
		addMessageToChat: ReturnType<typeof vi.fn>;
		clearQueue: ReturnType<typeof vi.fn>;
		ensureLoadingAnimation: ReturnType<typeof vi.fn>;
		onInputCallback: ReturnType<typeof vi.fn>;
		requestRender: ReturnType<typeof vi.fn>;
	};
} {
	let editorText = "";
	const abort = vi.fn();
	const addMessageToChat = vi.fn();
	const clearQueue = vi.fn(() => ({ steering: [], followUp: [] }));
	const onInputCallback = vi.fn();
	const requestRender = vi.fn();
	const editor: FakeEditor = {
		setText(text: string) {
			editorText = text;
		},
		getText() {
			return editorText;
		},
		addToHistory: vi.fn(),
		setCustomKeyHandler: vi.fn(),
	};

	let ctx!: InteractiveModeContext;
	const ensureLoadingAnimation = vi.fn(() => {
		ctx.loadingAnimation = {} as InteractiveModeContext["loadingAnimation"];
	});

	ctx = {
		editor: editor as unknown as InteractiveModeContext["editor"],
		ui: { requestRender } as unknown as InteractiveModeContext["ui"],
		loadingAnimation: undefined,
		autoCompactionLoader: undefined,
		retryLoader: undefined,
		autoCompactionEscapeHandler: undefined,
		retryEscapeHandler: undefined,
		session: {
			isStreaming: false,
			isCompacting: false,
			isGeneratingHandoff: false,
			isBashRunning: false,
			isPythonRunning: false,
			queuedMessageCount: 0,
			messages: [],
			extensionRunner: undefined,
			abort,
			clearQueue,
		} as unknown as InteractiveModeContext["session"],
		sessionManager: {
			getSessionName: () => "existing session",
		} as unknown as InteractiveModeContext["sessionManager"],
		keybindings: {
			getKeys: () => [],
		} as unknown as InteractiveModeContext["keybindings"],
		pendingImages: [],
		isBashMode: false,
		isPythonMode: false,
		optimisticUserMessageSignature: undefined,
		onInputCallback,
		addMessageToChat,
		ensureLoadingAnimation,
		flushPendingBashComponents: vi.fn(),
		updatePendingMessagesDisplay: vi.fn(),
		updateEditorBorderColor: vi.fn(),
		showDebugSelector: vi.fn(),
		toggleTodoExpansion: vi.fn(),
		handleHotkeysCommand: vi.fn(),
		handleSTTToggle: vi.fn(),
		showTreeSelector: vi.fn(),
		showUserMessageSelector: vi.fn(),
		showSessionSelector: vi.fn(),
	} as unknown as InteractiveModeContext;

	return {
		ctx,
		editor,
		spies: {
			abort,
			addMessageToChat,
			clearQueue,
			ensureLoadingAnimation,
			onInputCallback,
			requestRender,
		},
	};
}

describe("InputController escape behavior", () => {
	it("arms escape immediately for optimistic submissions", async () => {
		const { ctx, editor, spies } = createContext();
		const controller = new InputController(ctx);

		controller.setupKeyHandlers();
		controller.setupEditorSubmitHandler();
		await editor.onSubmit?.("hello");

		expect(spies.ensureLoadingAnimation).toHaveBeenCalledTimes(1);
		expect(spies.addMessageToChat).toHaveBeenCalledWith(
			expect.objectContaining({
				role: "user",
				attribution: "user",
				content: [{ type: "text", text: "hello" }],
			}),
		);
		expect(spies.onInputCallback).toHaveBeenCalledWith({ text: "hello", images: undefined });
		expect(spies.requestRender).toHaveBeenCalledTimes(1);
		expect(ctx.optimisticUserMessageSignature).toBe("hello\u00000");
		expect(editor.getText()).toBe("");
		expect(editor.shouldBypassAutocompleteOnEscape?.()).toBe(true);

		editor.onEscape?.();
		expect(spies.clearQueue).toHaveBeenCalledTimes(1);
		expect(spies.abort).toHaveBeenCalledTimes(1);
	});
});
