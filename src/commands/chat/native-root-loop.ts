import type { TaskRunner } from "../../contracts/orchestration.js";
import type { RuntimeBootstrap } from "../../runtime/runtime-bootstrap.js";
import type { ChatLayout } from "./utils.js";
import { style } from "../../util/theme.js";
import type { DagNode } from "../../orchestration/dag.js";

export interface NativeRootLoopInput {
  bootstrap: RuntimeBootstrap;
  taskRunner: TaskRunner;
  runId: string;
  root: string;
  env: Record<string, string>;
  layout: ChatLayout;
  agentFile: string;
  onData?: (data: string) => void;
  onTodoSync?: (output: string) => void;
}

export async function runNativeOmkRootLoop(input: NativeRootLoopInput): Promise<number> {
  const { bootstrap, taskRunner, runId, layout, onData } = input;

  if (layout !== "plain") {
    console.log(style.phosphor("Entering interactive mode. Type /exit to quit, /help for commands.\n"));
  }

  const { createInterface } = await import("readline");
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  let running = true;
  process.once("SIGINT", () => { running = false; rl.close(); });

  while (running) {
    const userInput = await new Promise<string>((resolve) => {
      rl.question(style.phosphorDim("omk> "), resolve);
    });

    const line = userInput.trim();
    if (!line) continue;
    if (line === "/exit" || line === "/quit" || line === ":q") { running = false; break; }
    if (line === "/help") {
      console.log(style.phosphorDim("/exit /quit :q — quit  |  /help — this help  |  /auth — show auth"));
      continue;
    }
    if (line === "/auth") {
      console.log(style.phosphor(`Provider: ${bootstrap.provider} | Model: ${bootstrap.selectedModel ?? "auto"} | Session: ${bootstrap.sessionMode}`));
      continue;
    }

    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 120_000);

    try {
      const node: DagNode = {
        id: `turn-${Date.now()}`,
        name: line,
        role: "coordinator",
        dependsOn: [],
        status: "running",
        retries: 0,
        maxRetries: 1,
        routing: {
          provider: bootstrap.provider,
        },
      } as DagNode;

      const result = await taskRunner.run(node, input.env, abort.signal);

      if (result.stdout) {
        process.stdout.write(result.stdout + "\n");
        onData?.(result.stdout);
      }
      if (result.stderr && result.exitCode !== 0) {
        process.stderr.write(style.metricsRed(result.stderr) + "\n");
      }
      if (input.onTodoSync && result.stdout) {
        input.onTodoSync(result.stdout);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(style.metricsRed(`Error: ${msg}`));
    } finally {
      clearTimeout(timeout);
    }
  }

  rl.close();
  console.log(style.phosphorDim("\nSession ended."));
  return 0;
}
