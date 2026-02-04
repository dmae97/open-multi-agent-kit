import { afterEach, beforeEach, describe, expect, it, vi } from "bun:test";
import { _resetSettingsForTest, Settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import { acquireSharedGateway } from "@oh-my-pi/pi-coding-agent/ipy/gateway-coordinator";
import * as shellSnapshot from "@oh-my-pi/pi-coding-agent/utils/shell-snapshot";
import { TempDir } from "@oh-my-pi/pi-utils";

class FakeWebSocket {
	static OPEN = 1;
	static CLOSED = 3;
	readyState = FakeWebSocket.OPEN;
	binaryType = "arraybuffer";
	url: string;
	onopen?: () => void;
	onerror?: (event: unknown) => void;
	onclose?: () => void;
	onmessage?: (event: { data: ArrayBuffer }) => void;

	constructor(url: string) {
		this.url = url;
		queueMicrotask(() => {
			this.onopen?.();
		});
	}

	send(_data: ArrayBuffer) {}

	close() {
		this.readyState = FakeWebSocket.CLOSED;
		this.onclose?.();
	}
}

describe("Shared Python gateway environment", () => {
	const originalEnv = { ...process.env };
	const originalFetch = globalThis.fetch;
	const originalWebSocket = globalThis.WebSocket;

	beforeEach(() => {
		_resetSettingsForTest();
		process.env.BUN_ENV = "test";
		delete process.env.OMP_PYTHON_GATEWAY_URL;
		delete process.env.OMP_PYTHON_GATEWAY_TOKEN;
		globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket;
	});

	afterEach(() => {
		for (const key of Object.keys(process.env)) {
			if (!(key in originalEnv)) {
				delete process.env[key];
			}
		}
		for (const [key, value] of Object.entries(originalEnv)) {
			process.env[key] = value;
		}
		globalThis.fetch = originalFetch;
		globalThis.WebSocket = originalWebSocket;
		vi.restoreAllMocks();
	});

	it("filters environment variables before spawning shared gateway", async () => {
		const fetchSpy = vi.fn(async (input: string | URL) => {
			const url = typeof input === "string" ? input : input.toString();
			if (url.endsWith("/api/kernelspecs")) {
				return new Response(JSON.stringify({}), { status: 200 });
			}
			return new Response("", { status: 200 });
		});
		globalThis.fetch = fetchSpy as unknown as typeof fetch;

		vi.spyOn(Settings.prototype, "getShellConfig").mockReturnValue({
			shell: "/bin/bash",
			args: ["-lc"],
			env: {
				PATH: "/bin",
				HOME: "/home/test",
				OPENAI_API_KEY: "secret",
				UNSAFE_TOKEN: "nope",
				OMP_CUSTOM: "1",
				LC_ALL: "en_US.UTF-8",
			},
			prefix: undefined,
		});
		const snapshotSpy = vi.spyOn(shellSnapshot, "getOrCreateSnapshot").mockResolvedValue(null);
		const whichSpy = vi.spyOn(Bun, "which").mockReturnValue("/usr/bin/python");

		let spawnEnv: Record<string, string | undefined> | undefined;
		let spawnArgs: string[] | undefined;
		const spawnSpy = vi.spyOn(Bun, "spawn").mockImplementation(((...args: unknown[]) => {
			const [cmd, options] = args as [string[] | { cmd: string[] }, { env?: Record<string, string | undefined> }?];
			spawnArgs = Array.isArray(cmd) ? cmd : cmd.cmd;
			spawnEnv = options?.env;
			return { pid: 1234, exited: Promise.resolve(0) } as unknown as Bun.Subprocess;
		}) as unknown as typeof Bun.spawn);

		using tempDir = TempDir.createSync("@python-kernel-env-");
		process.env.OMP_CODING_AGENT_DIR = tempDir.path();
		await acquireSharedGateway(tempDir.path());

		expect(spawnArgs).toContain("kernel_gateway");
		expect(spawnEnv?.PATH).toBe("/bin");
		expect(spawnEnv?.HOME).toBe("/home/test");
		expect(spawnEnv?.OMP_CUSTOM).toBe("1");
		expect(spawnEnv?.LC_ALL).toBe("en_US.UTF-8");
		expect(spawnEnv?.OPENAI_API_KEY).toBeUndefined();
		expect(spawnEnv?.UNSAFE_TOKEN).toBeUndefined();

		vi.restoreAllMocks();
		snapshotSpy.mockRestore();
		whichSpy.mockRestore();
		spawnSpy.mockRestore();
	});
});
