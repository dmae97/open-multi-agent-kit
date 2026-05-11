#!/usr/bin/env node

function shouldRunOpenDesignSmoke(argv: readonly string[]): boolean {
  const commandIndex = argv.findIndex((arg, index) => index >= 2 && arg === "open-design-agent");
  return commandIndex >= 2 && argv.slice(commandIndex + 1).includes("--smoke");
}

if (shouldRunOpenDesignSmoke(process.argv)) {
  process.stdout.write("ok\n");
  process.exit(0);
}

const { runCli } = await import("./cli/main.js");
await runCli(process.argv);
