import { afterEach, beforeEach, describe, expect, it, vi } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

vi.mock("../src/utils/oauth/kagi", () => ({
	loginKagi: vi.fn(),
}));

import { AuthCredentialStore, AuthStorage } from "../src/auth-storage";
import { loginKagi } from "../src/utils/oauth/kagi";

type MockedApiKeyLogin = {
	mockReset(): void;
	mockResolvedValueOnce(value: string): MockedApiKeyLogin;
};

const mockedLoginKagi = loginKagi as typeof loginKagi & MockedApiKeyLogin;

describe("AuthStorage api-key login replacement", () => {
	let tempDir = "";
	let store: AuthCredentialStore | null = null;
	let authStorage: AuthStorage | null = null;

	beforeEach(async () => {
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "pi-ai-auth-api-key-login-"));
		store = await AuthCredentialStore.open(path.join(tempDir, "agent.db"));
		authStorage = new AuthStorage(store);
		mockedLoginKagi.mockReset();
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		store?.close();
		store = null;
		authStorage = null;
		if (tempDir) {
			await fs.rm(tempDir, { recursive: true, force: true });
			tempDir = "";
		}
	});

	it("replaces the active api-key credential on re-login", async () => {
		if (!store || !authStorage) throw new Error("test setup failed");

		mockedLoginKagi.mockResolvedValueOnce("first-kagi-key").mockResolvedValueOnce("second-kagi-key");

		const controller = {
			onAuth: () => {},
			onPrompt: async () => "",
		};

		await authStorage.login("kagi", controller);
		await authStorage.login("kagi", controller);

		const credentials = store.listAuthCredentials("kagi");
		expect(credentials).toHaveLength(1);
		const [stored] = credentials;
		expect(stored?.credential.type).toBe("api_key");
		if (!stored || stored.credential.type !== "api_key") {
			throw new Error("expected stored api-key credential");
		}
		expect(stored.credential.key).toBe("second-kagi-key");
		expect(store.getApiKey("kagi")).toBe("second-kagi-key");
		expect(await authStorage.getApiKey("kagi", "session-kagi-relogin")).toBe("second-kagi-key");
	});
});
