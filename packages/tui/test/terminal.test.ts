import assert from "node:assert";
import { describe, it, mock } from "node:test";
import { setKittyProtocolActive } from "../src/keys.ts";
import {
	normalizeAppleTerminalInput,
	ProcessTerminal,
	parseKeyboardProtocolNegotiationSequence,
} from "../src/terminal.ts";

describe("normalizeAppleTerminalInput", () => {
	it("rewrites Apple Terminal Return to CSI-u Shift+Enter when Shift is pressed", () => {
		assert.equal(normalizeAppleTerminalInput("\r", true, true), "\x1b[13;2u");
	});

	it("leaves Apple Terminal Return unchanged when Shift is not pressed", () => {
		assert.equal(normalizeAppleTerminalInput("\r", true, false), "\r");
	});

	it("leaves non-Apple Terminal Return unchanged when Shift is pressed", () => {
		assert.equal(normalizeAppleTerminalInput("\r", false, true), "\r");
	});

	it("leaves non-Return input unchanged", () => {
		assert.equal(normalizeAppleTerminalInput("\x1b[13;2u", true, true), "\x1b[13;2u");
		assert.equal(normalizeAppleTerminalInput("a", true, true), "a");
	});
});

describe("parseKeyboardProtocolNegotiationSequence", () => {
	it("parses Kitty keyboard protocol flag responses", () => {
		assert.deepEqual(parseKeyboardProtocolNegotiationSequence("\x1b[?7u"), { type: "kitty-flags", flags: 7 });
		assert.deepEqual(parseKeyboardProtocolNegotiationSequence("\x1b[?1u"), { type: "kitty-flags", flags: 1 });
		assert.deepEqual(parseKeyboardProtocolNegotiationSequence("\x1b[?0u"), { type: "kitty-flags", flags: 0 });
	});

	it("parses DA responses as the negotiation sentinel", () => {
		assert.deepEqual(parseKeyboardProtocolNegotiationSequence("\x1b[?62;4;52c"), { type: "device-attributes" });
		assert.deepEqual(parseKeyboardProtocolNegotiationSequence("\x1b[?1;2c"), { type: "device-attributes" });
	});

	it("ignores unrelated input", () => {
		assert.equal(parseKeyboardProtocolNegotiationSequence("\x1b[13;2u"), undefined);
		assert.equal(parseKeyboardProtocolNegotiationSequence("a"), undefined);
	});
});

describe("ProcessTerminal Kitty keyboard protocol negotiation", () => {
	type NegotiationHarness = {
		terminal: ProcessTerminal;
		writes: string[];
		send(data: string): void;
		getInput(): string | undefined;
		cleanup(): void;
	};

	function setupNegotiation(): NegotiationHarness {
		const terminal = new ProcessTerminal();
		const writes: string[] = [];
		let input: string | undefined;
		let dataHandler: ((data: string) => void) | undefined;
		let cleaned = false;
		const previousWrite = process.stdout.write;
		const previousOn = process.stdin.on;

		process.stdout.write = ((chunk: string | Uint8Array) => {
			writes.push(String(chunk));
			return true;
		}) as typeof process.stdout.write;
		process.stdin.on = ((event: string | symbol, listener: (...args: unknown[]) => void) => {
			if (event === "data") dataHandler = listener as (data: string) => void;
			return process.stdin;
		}) as typeof process.stdin.on;

		(
			terminal as unknown as {
				inputHandler?: (data: string) => void;
				queryAndEnableKittyProtocol(): void;
			}
		).inputHandler = (data) => {
			input = data;
		};
		(terminal as unknown as { queryAndEnableKittyProtocol(): void }).queryAndEnableKittyProtocol();

		return {
			terminal,
			writes,
			send(data: string): void {
				dataHandler?.(data);
			},
			getInput(): string | undefined {
				return input;
			},
			cleanup(): void {
				if (cleaned) return;
				cleaned = true;
				try {
					terminal.stop();
				} finally {
					process.stdout.write = previousWrite;
					process.stdin.on = previousOn;
					setKittyProtocolActive(false);
				}
			},
		};
	}

	function runNegotiation(response: string): { kittyProtocolActive: boolean; writes: string[]; input?: string } {
		const harness = setupNegotiation();
		try {
			harness.send(response);
			return {
				kittyProtocolActive: harness.terminal.kittyProtocolActive,
				writes: [...harness.writes],
				input: harness.getInput(),
			};
		} finally {
			harness.cleanup();
		}
	}

	it("requests flags before querying and uses DA as unsupported sentinel", () => {
		const { kittyProtocolActive, writes, input } = runNegotiation("\x1b[?0u\x1b[?62;4;52c");

		assert.equal(writes[0], "\x1b[>7u\x1b[?u\x1b[c");
		assert.equal(writes.at(-1), "\x1b[>4;2m");
		assert.equal(kittyProtocolActive, false);
		assert.equal(input, undefined);
	});

	it("tracks delayed Kitty flags after DA sentinel", () => {
		const harness = setupNegotiation();
		try {
			harness.send("\x1b[?62;4;52c");
			harness.send("\x1b[?7u");

			assert.equal(harness.writes[0], "\x1b[>7u\x1b[?u\x1b[c");
			assert.equal(harness.writes.includes("\x1b[>4;2m"), true);
			assert.equal(harness.getInput(), undefined);
			assert.equal(harness.terminal.kittyProtocolActive, true);

			harness.cleanup();
			assert.equal(harness.writes.filter((write) => write === "\x1b[<u").length, 1);
			assert.equal(harness.writes.filter((write) => write === "\x1b[>4;0m").length, 1);
		} finally {
			harness.cleanup();
		}
	});

	it("activates Kitty mode for non-zero negotiated flags", () => {
		const { kittyProtocolActive, writes, input } = runNegotiation("\x1b[?1u\x1b[?62;4;52c");

		assert.equal(writes[0], "\x1b[>7u\x1b[?u\x1b[c");
		assert.equal(writes.includes("\x1b[>4;2m"), false);
		assert.equal(kittyProtocolActive, true);
		assert.equal(input, undefined);
	});

	it("does not fall back after Kitty mode activates", () => {
		mock.timers.enable({ apis: ["setTimeout"] });
		const harness = setupNegotiation();
		try {
			harness.send("\x1b[?1u");
			mock.timers.tick(150);

			assert.equal(harness.writes.includes("\x1b[>4;2m"), false);
			assert.equal(harness.terminal.kittyProtocolActive, true);
		} finally {
			harness.cleanup();
			mock.timers.reset();
		}
	});

	it("forwards Escape input after Kitty mode activates without DA sentinel", () => {
		mock.timers.enable({ apis: ["setTimeout"] });
		const harness = setupNegotiation();
		try {
			harness.send("\x1b[?1u");
			mock.timers.tick(150);
			harness.send("\x1b");
			mock.timers.tick(10);

			assert.equal(harness.writes.includes("\x1b[>4;2m"), false);
			assert.equal(harness.getInput(), "\x1b");
			assert.equal(harness.terminal.kittyProtocolActive, true);
		} finally {
			harness.cleanup();
			mock.timers.reset();
		}
	});

	it("swallows delayed DA sentinel after Kitty mode activates", () => {
		mock.timers.enable({ apis: ["setTimeout"] });
		const harness = setupNegotiation();
		try {
			harness.send("\x1b[?1u");
			mock.timers.tick(150);
			harness.send("\x1b[?62;4;52c");

			assert.equal(harness.writes.includes("\x1b[>4;2m"), false);
			assert.equal(harness.getInput(), undefined);
			assert.equal(harness.terminal.kittyProtocolActive, true);
		} finally {
			harness.cleanup();
			mock.timers.reset();
		}
	});

	it("pops optimistic Kitty mode on stop while negotiation is pending", () => {
		const harness = setupNegotiation();
		harness.cleanup();

		assert.equal(harness.writes.filter((write) => write === "\x1b[<u").length, 1);
	});

	it("pops optimistic Kitty mode from drainInput while negotiation is pending", async () => {
		const harness = setupNegotiation();
		try {
			await harness.terminal.drainInput(0);
			harness.cleanup();

			assert.equal(harness.writes.filter((write) => write === "\x1b[<u").length, 1);
		} finally {
			harness.cleanup();
		}
	});

	it("falls back to modifyOtherKeys when no negotiation response arrives", () => {
		mock.timers.enable({ apis: ["setTimeout"] });
		const harness = setupNegotiation();
		try {
			mock.timers.tick(150);

			assert.equal(harness.writes[0], "\x1b[>7u\x1b[?u\x1b[c");
			assert.equal(harness.writes.includes("\x1b[>4;2m"), true);
			assert.equal(harness.terminal.kittyProtocolActive, false);
		} finally {
			harness.cleanup();
			mock.timers.reset();
		}
	});

	it("replays Escape input buffered during pending negotiation", () => {
		mock.timers.enable({ apis: ["setTimeout"] });
		const harness = setupNegotiation();
		try {
			harness.send("\x1b");
			mock.timers.tick(10);

			assert.equal(harness.getInput(), undefined);

			mock.timers.tick(140);

			assert.equal(harness.writes.includes("\x1b[>4;2m"), true);
			assert.equal(harness.getInput(), "\x1b");
		} finally {
			harness.cleanup();
			mock.timers.reset();
		}
	});

	it("replays CSI prefix input buffered during pending negotiation", () => {
		mock.timers.enable({ apis: ["setTimeout"] });
		const harness = setupNegotiation();
		try {
			harness.send("\x1b[");
			mock.timers.tick(10);

			assert.equal(harness.getInput(), undefined);

			mock.timers.tick(140);

			assert.equal(harness.writes.includes("\x1b[>4;2m"), true);
			assert.equal(harness.getInput(), undefined);

			mock.timers.tick(150);

			assert.equal(harness.getInput(), "\x1b[");
		} finally {
			harness.cleanup();
			mock.timers.reset();
		}
	});

	it("forwards Escape input after no-response fallback", () => {
		mock.timers.enable({ apis: ["setTimeout"] });
		const harness = setupNegotiation();
		try {
			mock.timers.tick(150);
			harness.send("\x1b");
			mock.timers.tick(10);

			assert.equal(harness.getInput(), "\x1b");
		} finally {
			harness.cleanup();
			mock.timers.reset();
		}
	});

	it("replays CSI prefix input after no-response fallback", () => {
		mock.timers.enable({ apis: ["setTimeout"] });
		const harness = setupNegotiation();
		try {
			mock.timers.tick(150);
			harness.send("\x1b[");
			mock.timers.tick(10);

			assert.equal(harness.getInput(), undefined);

			mock.timers.tick(150);

			assert.equal(harness.getInput(), "\x1b[");
		} finally {
			harness.cleanup();
			mock.timers.reset();
		}
	});

	it("tracks late Kitty confirmation after modifyOtherKeys fallback", () => {
		mock.timers.enable({ apis: ["setTimeout"] });
		const harness = setupNegotiation();
		try {
			mock.timers.tick(150);
			harness.send("\x1b[?7u");

			assert.equal(harness.writes.includes("\x1b[>4;2m"), true);
			assert.equal(harness.terminal.kittyProtocolActive, true);

			harness.cleanup();
			assert.equal(harness.writes.filter((write) => write === "\x1b[<u").length, 1);
			assert.equal(harness.writes.filter((write) => write === "\x1b[>4;0m").length, 1);
		} finally {
			harness.cleanup();
			mock.timers.reset();
		}
	});

	it("keeps fallback active for delayed DA responses", () => {
		mock.timers.enable({ apis: ["setTimeout"] });
		const harness = setupNegotiation();
		try {
			mock.timers.tick(150);
			harness.send("\x1b[?62;4;52c");

			assert.equal(harness.writes.filter((write) => write === "\x1b[>4;2m").length, 1);
			assert.equal(harness.getInput(), undefined);
			assert.equal(harness.terminal.kittyProtocolActive, false);
		} finally {
			harness.cleanup();
			mock.timers.reset();
		}
	});

	it("swallows and reassembles split DA responses flushed incomplete", () => {
		mock.timers.enable({ apis: ["setTimeout"] });
		const harness = setupNegotiation();
		try {
			harness.send("\x1b[?62;");
			mock.timers.tick(10);

			assert.equal(harness.getInput(), undefined);

			harness.send("4;52c");
			mock.timers.tick(140);

			assert.equal(harness.writes.includes("\x1b[>4;2m"), true);
			assert.equal(harness.getInput(), undefined);
			assert.equal(harness.terminal.kittyProtocolActive, false);
		} finally {
			harness.cleanup();
			mock.timers.reset();
		}
	});

	it("swallows and reassembles split late DA responses after fallback", () => {
		mock.timers.enable({ apis: ["setTimeout"] });
		const harness = setupNegotiation();
		try {
			mock.timers.tick(150);
			harness.send("\x1b[?62;");
			mock.timers.tick(10);

			assert.equal(harness.getInput(), undefined);

			harness.send("4;52c");

			assert.equal(harness.writes.filter((write) => write === "\x1b[>4;2m").length, 1);
			assert.equal(harness.getInput(), undefined);
			assert.equal(harness.terminal.kittyProtocolActive, false);
		} finally {
			harness.cleanup();
			mock.timers.reset();
		}
	});

	it("swallows and reassembles split late Kitty responses after fallback", () => {
		mock.timers.enable({ apis: ["setTimeout"] });
		const harness = setupNegotiation();
		try {
			mock.timers.tick(150);
			harness.send("\x1b[?7");
			mock.timers.tick(10);

			assert.equal(harness.getInput(), undefined);

			harness.send("u");

			assert.equal(harness.writes.includes("\x1b[>4;2m"), true);
			assert.equal(harness.getInput(), undefined);
			assert.equal(harness.terminal.kittyProtocolActive, true);
		} finally {
			harness.cleanup();
			mock.timers.reset();
		}
	});
});

describe("ProcessTerminal dimensions", () => {
	it("falls back to COLUMNS and LINES before default dimensions", () => {
		const previousColumnsDescriptor = Object.getOwnPropertyDescriptor(process.stdout, "columns");
		const previousRowsDescriptor = Object.getOwnPropertyDescriptor(process.stdout, "rows");
		const previousColumns = process.env.COLUMNS;
		const previousLines = process.env.LINES;

		try {
			Object.defineProperty(process.stdout, "columns", { value: undefined, configurable: true });
			Object.defineProperty(process.stdout, "rows", { value: undefined, configurable: true });
			process.env.COLUMNS = "123";
			process.env.LINES = "45";

			const terminal = new ProcessTerminal();

			assert.equal(terminal.columns, 123);
			assert.equal(terminal.rows, 45);
		} finally {
			if (previousColumnsDescriptor) {
				Object.defineProperty(process.stdout, "columns", previousColumnsDescriptor);
			} else {
				Reflect.deleteProperty(process.stdout, "columns");
			}
			if (previousRowsDescriptor) {
				Object.defineProperty(process.stdout, "rows", previousRowsDescriptor);
			} else {
				Reflect.deleteProperty(process.stdout, "rows");
			}
			if (previousColumns === undefined) {
				delete process.env.COLUMNS;
			} else {
				process.env.COLUMNS = previousColumns;
			}
			if (previousLines === undefined) {
				delete process.env.LINES;
			} else {
				process.env.LINES = previousLines;
			}
		}
	});
});
