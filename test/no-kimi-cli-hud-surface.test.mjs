import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const forbidden = /\b(?:kimi|KIMI|moonshot|Kimi\s+CLI|Kimi\s+HUD|kimi-cli|kimi-print|kimi-wire|kimi-api|kimi-native)\b/i;

const cliHudFiles = [
  "src/cli/v2/chat-repl.ts",
  "src/cli/v2/interactive-prompt.ts",
  "src/cli/v2/cli-v2-skeleton.ts",
  "src/cli/root.ts",
  "src/hud/render.ts",
  "src/commands/hud.ts",
];

test("default CLI and HUD source surfaces are provider-neutral", async () => {
  for (const file of cliHudFiles) {
    const text = await readFile(file, "utf8");
    assert.doesNotMatch(text, forbidden, `${file} must not expose legacy provider tokens in default UI/HUD paths`);
  }
});
