import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { AuthCredentialStore, AuthStorage, type OAuthCredential } from "../src/auth-storage";

function createCredential(args: { suffix: string; accountId: string; email: string }): OAuthCredential {
	return {
		type: "oauth",
		access: `access-${args.suffix}`,
		refresh: `refresh-${args.suffix}`,
		expires: Date.now() + 60_000,
		accountId: args.accountId,
		email: args.email,
	};
}

describe("AuthStorage openai-codex email dedupe", () => {
	let tempDir = "";
	let store: AuthCredentialStore | null = null;
	let authStorage: AuthStorage | null = null;

	beforeEach(async () => {
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "pi-ai-auth-email-dedupe-"));
		const dbPath = path.join(tempDir, "agent.db");
		store = await AuthCredentialStore.open(dbPath);
		authStorage = new AuthStorage(store);
	});

	afterEach(async () => {
		store?.close();
		store = null;
		authStorage = null;
		if (tempDir) {
			await fs.rm(tempDir, { recursive: true, force: true });
			tempDir = "";
		}
	});

	it("keeps both openai-codex credentials when accountId matches but emails differ", async () => {
		if (!authStorage || !store) throw new Error("test setup failed");

		await authStorage.set("openai-codex", [
			createCredential({ suffix: "first", accountId: "shared-team", email: "first.user@example.com" }),
			createCredential({ suffix: "second", accountId: "shared-team", email: "second.user@example.com" }),
		]);

		const credentials = store.listAuthCredentials("openai-codex");
		expect(credentials).toHaveLength(2);
	});

	it("dedupes openai-codex credentials when email matches", async () => {
		if (!authStorage || !store) throw new Error("test setup failed");

		await authStorage.set("openai-codex", [
			createCredential({ suffix: "first", accountId: "account-a", email: "shared.user@example.com" }),
			createCredential({ suffix: "second", accountId: "account-b", email: "shared.user@example.com" }),
		]);

		const credentials = store.listAuthCredentials("openai-codex");
		expect(credentials).toHaveLength(1);
		const [remaining] = credentials;
		expect(remaining?.credential.type).toBe("oauth");
		if (!remaining || remaining.credential.type !== "oauth") throw new Error("expected oauth credential");
		expect(remaining.credential.email).toBe("shared.user@example.com");
		expect(remaining.credential.accountId).toBe("account-b");
	});

	it("keeps both openai-codex credentials after reload when accountId matches but emails differ", async () => {
		if (!store) throw new Error("test setup failed");

		store.replaceAuthCredentialsForProvider("openai-codex", [
			createCredential({ suffix: "first", accountId: "shared-team", email: "first.user@example.com" }),
			createCredential({ suffix: "second", accountId: "shared-team", email: "second.user@example.com" }),
		]);

		const reloaded = new AuthStorage(store);
		await reloaded.reload();

		const credentials = store.listAuthCredentials("openai-codex");
		expect(credentials).toHaveLength(2);
	});
});
