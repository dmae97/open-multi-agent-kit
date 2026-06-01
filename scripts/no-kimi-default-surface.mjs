#!/usr/bin/env node
import { readFileSync } from "node:fs";

const tokenPattern = /\b(?:kimi|KIMI|moonshot|Kimi\s+CLI|Kimi\s+HUD|kimi-cli|kimi-print|kimi-wire|kimi-api|kimi-native)\b/i;

const strictDefaultSurfaceFiles = [
  "src/runtime/runtime-router.ts",
  "src/runtime/debloat-nlp.ts",
  "src/providers/provider-router.ts",
  "src/providers/provider-stats.ts",
  "src/cli/v2/chat-repl.ts",
  "src/cli/v2/interactive-prompt.ts",
  "src/cli/v2/cli-v2-skeleton.ts",
  "src/cli/root.ts",
  "src/hud/render.ts",
  "src/commands/hud.ts",
];

const violations = [];

for (const file of strictDefaultSurfaceFiles) {
  const text = readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    if (tokenPattern.test(line)) {
      violations.push(`${file}:${index + 1}: ${line.trim()}`);
    }
  }
}

if (violations.length > 0) {
  console.error("Default control-plane surface contains legacy KIMI tokens:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log(`Default control-plane surface is provider-neutral (${strictDefaultSurfaceFiles.length} files checked).`);
