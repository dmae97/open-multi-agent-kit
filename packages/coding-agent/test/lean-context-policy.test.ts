import { describe, expect, it } from "vitest";
import {
	createLeanContextPolicyState,
	decideLeanContextEmission,
	getLeanContextTrackingHash,
} from "../src/core/lean-context-policy.ts";

const DEFAULT_INPUT = {
	tool: "read",
	key: "src/example.ts",
	content: "line 1\nline 2\nline 3\nline 4\n",
	minStubTokens: 1,
};

describe("decideLeanContextEmission", () => {
	it("emits full output on the first pass and records the content hash by tool/key", () => {
		const state = createLeanContextPolicyState();
		const decision = decideLeanContextEmission({ ...DEFAULT_INPUT, state });

		expect(decision.emit).toBe("full");
		expect(decision.reason).toBe("first-pass");
		expect(getLeanContextTrackingHash(decision.nextState, "read", "src/example.ts")).toBe(decision.contentSha256);
	});

	it("emits an unchanged stub for a repeated tool/key with the same content hash", () => {
		const first = decideLeanContextEmission({ ...DEFAULT_INPUT, state: createLeanContextPolicyState() });
		const second = decideLeanContextEmission({ ...DEFAULT_INPUT, state: first.nextState });

		expect(second.emit).toBe("stub");
		expect(second.reason).toBe("unchanged");
		expect(second.stub).toContain("unchanged");
		expect(second.stub).toContain(second.contentSha256.slice(0, 12));
	});

	it("emits full output when tracked content changes for the same tool/key", () => {
		const first = decideLeanContextEmission({ ...DEFAULT_INPUT, state: createLeanContextPolicyState() });
		const changed = decideLeanContextEmission({
			...DEFAULT_INPUT,
			content: "line 1\nCHANGED\n",
			state: first.nextState,
		});

		expect(changed.emit).toBe("full");
		expect(changed.reason).toBe("changed");
		expect(changed.previousSha256).toBe(first.contentSha256);
		expect(changed.contentSha256).not.toBe(first.contentSha256);
	});

	it("never stubs parent instruction filenames even when unchanged", () => {
		const input = { ...DEFAULT_INPUT, key: "docs/AGENTS.md", content: "parent instruction text\n" };
		const first = decideLeanContextEmission({ ...input, state: createLeanContextPolicyState() });
		const second = decideLeanContextEmission({ ...input, state: first.nextState });

		expect(second.emit).toBe("full");
		expect(second.reason).toBe("never-stub-parent-instruction");
		expect(second.stub).toBeUndefined();
	});

	it("emits full output when secret patterns are present even if unchanged", () => {
		const secretContent = `diagnostic\n${"pass" + "word"}=example-placeholder-value\n`;
		const input = { ...DEFAULT_INPUT, key: "logs/tool.txt", content: secretContent };
		const first = decideLeanContextEmission({ ...input, state: createLeanContextPolicyState() });
		const second = decideLeanContextEmission({ ...input, state: first.nextState });

		expect(second.emit).toBe("full");
		expect(second.reason).toBe("secret-pattern");
		expect(second.stub).toBeUndefined();
	});

	it("keeps repeated small outputs full below the minimum token threshold", () => {
		const input = { ...DEFAULT_INPUT, content: "short", minStubTokens: 10 };
		const first = decideLeanContextEmission({ ...input, state: createLeanContextPolicyState() });
		const second = decideLeanContextEmission({ ...input, state: first.nextState });

		expect(second.emit).toBe("full");
		expect(second.reason).toBe("below-min-token-threshold");
	});
});
