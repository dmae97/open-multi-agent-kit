import { describe, expect, it } from "bun:test";
import { buildRemoteCommand } from "../../src/ssh/connection-manager";

describe("buildRemoteCommand", () => {
	it("includes -n to bind stdin to /dev/null for mux channel opens", async () => {
		const args = await buildRemoteCommand(
			{
				name: "host",
				host: "192.168.3.146",
			},
			"ls -la",
		);

		expect(args[0]).toBe("-n");
		expect(args).toContain("ControlMaster=auto");
		expect(args.at(-2)).toBe("192.168.3.146");
		expect(args.at(-1)).toBe("ls -la");
	});
});
