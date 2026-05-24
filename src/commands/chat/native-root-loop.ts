import type { TaskRunner } from "../../contracts/orchestration.js";
import type { RuntimeBootstrap } from "../../runtime/runtime-bootstrap.js";
import type { ChatLayout } from "./utils.js";
import { style } from "../../util/theme.js";
import { runShell } from "../../util/shell.js";
import type { DagNode } from "../../orchestration/dag.js";
import { applyCapabilityInjectionToRouting, buildCapabilityInjection } from "../../runtime/capability-injection.js";
import { buildPromptEnvelope, renderPromptEnvelope } from "../../runtime/prompt-envelope.js";

export interface NativeRootLoopInput {
  bootstrap: RuntimeBootstrap;
  taskRunner: TaskRunner;
  runId: string;
  root: string;
  env: Record<string, string>;
  layout: ChatLayout;
  agentFile: string;
  mcpAllowlist?: readonly string[];
  skillNames?: readonly string[];
  hookNames?: readonly string[];
  executionPrompt?: string;
  onData?: (data: string) => void;
  onTodoSync?: (output: string) => void;
}

interface SlashCommand {
  name: string;
  aliases: string[];
  help: string;
  handler: (args: string) => void | Promise<void>;
}

function splitSlashArgs(args: string): string[] {
  return args.split(/\s+/).map((arg) => arg.trim()).filter(Boolean);
}

function formatScopedNames(names: readonly string[] | undefined, empty = "none"): string {
  if (!names || names.length === 0) return empty;
  const preview = names.slice(0, 8).join(", ");
  return names.length > 8 ? `${preview}, … +${names.length - 8}` : preview;
}

function buildSlashCommands(input: NativeRootLoopInput): SlashCommand[] {
  const b = input.bootstrap;
  return [
    { name: "/exit", aliases: ["/quit", ":q"], help: "Exit chat session", handler: () => {} },
    { name: "/help", aliases: ["/h", "/?"], help: "Show this help", handler: () => {
      console.log(style.phosphorBold("\n  Slash Commands:"));
      console.log(style.phosphorDim("  ─────────────────────────────────────────────"));
      console.log(`  ${style.phosphor("/exit")} ${style.phosphorDim("/quit :q")}   — Exit chat session`);
      console.log(`  ${style.phosphor("/help")} ${style.phosphorDim("/h /?")}     — Show this help`);
      console.log(`  ${style.phosphor("/auth")}                — Show provider auth status`);
      console.log(`  ${style.phosphor("/provider")} ${style.phosphorDim("<name>")}  — Switch provider (kimi/codex/deepseek)`);
      console.log(`  ${style.phosphor("/model")} ${style.phosphorDim("<name>")}    — Set model`);
      console.log(`  ${style.phosphor("/mcp")} ${style.phosphorDim("[--all]")}     — Show MCP Tool Plane status`);
      console.log(`  ${style.phosphor("/tools")}              — Show scoped MCP/skills/hooks`);
      console.log(`  ${style.phosphor("/status")}              — Show session status`);
      console.log(`  ${style.phosphor("/clear")} ${style.phosphorDim("/cls")}    — Clear screen`);
      console.log(`  ${style.phosphor("/runs")}                — List recent runs`);
      console.log(`  ${style.phosphor("/doctor")}              — Run omk doctor`);
      console.log(`  ${style.phosphor("/parallel")} ${style.phosphorDim("<prompt>")} — Run parallel orchestrator`);
      console.log(style.phosphorDim("  ─────────────────────────────────────────────\n"));
    }},
    { name: "/auth", aliases: ["/login"], help: "Show auth status", handler: () => {
      console.log(style.phosphorBold(`\n  Provider: ${b.provider}`));
      console.log(`  Model: ${style.phosphor(b.selectedModel ?? "auto")}`);
      console.log(`  Session: ${style.phosphorDim(b.sessionMode)}`);
      console.log(`  Runtime: ${style.phosphorDim(b.selectedRuntimeId ?? "none")}`);
      console.log(`  Auth OK: ${b.authOk ? style.green("✓") : style.metricsRed("✗")}\n`);
    }},
    { name: "/provider", aliases: ["/p"], help: "Switch provider", handler: (args) => {
      const p = args.trim().toLowerCase();
      const valid = ["kimi", "codex", "deepseek", "commandcode", "opencode", "auto"];
      if (p && valid.includes(p)) {
        console.log(style.phosphor(`\n  Provider '${p}' will apply after restart.\n`));
        console.log(style.phosphorDim(`  Current session remains: ${b.provider}`));
        console.log(style.phosphorDim(`  Restart: omk chat --provider ${p}\n`));
      } else {
        console.log(style.phosphorDim(`\n  Available: ${valid.join(", ")}`));
        console.log(style.phosphorDim("  Usage: /provider codex\n"));
      }
    }},
    { name: "/model", aliases: ["/m"], help: "Set model", handler: (args) => {
      const m = args.trim();
      if (m) {
        console.log(style.phosphor(`\n  Model '${m}' will apply after restart.\n`));
        console.log(style.phosphorDim(`  Current session remains: ${b.selectedModel ?? "auto"}`));
        console.log(style.phosphorDim(`  Restart: omk chat --provider ${b.provider} --model ${m}\n`));
      } else {
        console.log(style.phosphorDim(`\n  Current model: ${b.selectedModel ?? "auto"}`));
        console.log(style.phosphorDim("  Usage: /model deepseek-chat\n"));
      }
    }},
    { name: "/mcp", aliases: [":mcp"], help: "Show MCP Tool Plane status", handler: async (args) => {
      const tokens = splitSlashArgs(args);
      const wantsFullPreflight = tokens.includes("--all");
      const wantsFix = tokens.includes("--fix") || tokens.includes("fix") || tokens.includes("repair");
      const { runMcpAutoConnect, renderMcpAutoConnectBanner } = await import("../../mcp/autoconnect.js");
      const report = await runMcpAutoConnect({
        preflight: wantsFullPreflight ? "full" : "fast",
        env: {
          ...input.env,
          OMK_MCP_PREFLIGHT: wantsFullPreflight ? input.env.OMK_MCP_PREFLIGHT : "off",
        },
      });
      console.log("\n" + renderMcpAutoConnectBanner(report) + "\n");
      if (wantsFix) {
        console.log(style.phosphorDim("  Repairs are explicit CLI actions: omk mcp connect --fix\n"));
      }
    }},
    { name: "/tools", aliases: [":tools"], help: "Show scoped MCP/skills/hooks", handler: () => {
      console.log(style.phosphorBold("\n  Scoped Tool Plane:"));
      console.log(`  MCP:    ${style.phosphorDim(formatScopedNames(input.mcpAllowlist))}`);
      console.log(`  Skills: ${style.phosphorDim(formatScopedNames(input.skillNames))}`);
      console.log(`  Hooks:  ${style.phosphorDim(formatScopedNames(input.hookNames))}`);
      console.log(`  Runtime: ${style.phosphorDim(b.selectedRuntimeId ?? "none")} (${b.provider})`);
      console.log(`  Safety: ${style.phosphorDim(`execution=${input.executionPrompt ?? "auto"}; provider metadata is scoped per turn`)}`);
      console.log(style.phosphorDim("  Use /mcp for MCP status or `omk mcp connect --json` for the full contract.\n"));
    }},
    { name: "/status", aliases: ["/s"], help: "Show session status", handler: () => {
      const uptime = process.uptime();
      const mem = process.memoryUsage();
      console.log(style.phosphorBold(`\n  Session: ${input.runId}`));
      console.log(`  Provider: ${style.phosphor(b.provider)} | Model: ${style.phosphorDim(b.selectedModel ?? "auto")}`);
      console.log(`  Uptime: ${style.phosphorDim(Math.floor(uptime / 60) + "m " + Math.floor(uptime % 60) + "s")}`);
      console.log(`  Heap: ${style.phosphorDim((mem.heapUsed / 1024 / 1024).toFixed(1) + "M")} / ${style.phosphorDim((mem.heapTotal / 1024 / 1024).toFixed(1) + "M")}`);
      console.log(`  Layout: ${style.phosphorDim(input.layout)} | Root: ${style.phosphorDim(input.root)}\n`);
    }},
    { name: "/clear", aliases: ["/cls"], help: "Clear screen", handler: () => {
      process.stdout.write("\x1b[2J\x1b[H");
    }},
    { name: "/runs", aliases: ["/history"], help: "List recent runs", handler: async () => {
      try {
        const { readdir } = await import("fs/promises");
        const { join } = await import("path");
        const runsDir = join(input.root, ".omk", "runs");
        const entries = await readdir(runsDir, { withFileTypes: true });
        const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
        const recent = dirs.filter((d) => d.startsWith("chat-")).sort().reverse().slice(0, 10);
        console.log(style.phosphorBold("\n  Recent Chats:"));
        for (const r of recent) {
          console.log(style.phosphorDim(`    • ${r}`));
        }
        if (recent.length === 0) console.log(style.phosphorDim("    (none)"));
        console.log("");
      } catch {
        console.log(style.phosphorDim("\n  No runs found.\n"));
      }
    }},
    { name: "/doctor", aliases: [], help: "Run omk doctor", handler: async () => {
      console.log(style.phosphorDim("\n  Running doctor...\n"));
      try {
        const result = await runShell(process.execPath, ["dist/cli.js", "doctor", "--json"], {
          cwd: input.root,
          env: input.env,
          timeout: 30000,
        });
        const output = result.stdout || result.stderr || `doctor exited with code ${result.exitCode}`;
        console.log(output.slice(0, 2000));
        if (result.failed) {
          console.log(style.metricsRed(`Doctor exited with code ${result.exitCode}`));
        }
      } catch (err: unknown) {
        const m = err instanceof Error ? err.message : String(err);
        console.log(style.metricsRed(`Doctor failed: ${m}`));
      }
    }},
    { name: "/parallel", aliases: ["/pa"], help: "Run parallel orchestrator with prompt", handler: async (args) => {
      const prompt = args.trim();
      if (!prompt) {
        console.log(style.phosphorDim("\n  Usage: /parallel <prompt>\n"));
        return;
      }
      console.log(style.phosphorDim(`\n  Spawning parallel: "${prompt}"\n`));
      const result = await runShell(process.execPath, ["dist/cli.js", "parallel", prompt], {
        cwd: input.root,
        env: input.env,
        stdio: "inherit",
        timeout: 300000,
      });
      if (result.failed) {
        console.log(style.metricsRed(`Parallel exited with code ${result.exitCode}`));
      }
    }},
  ];
}

export type NativeTurnRisk = "read" | "write" | "shell" | "merge";

export function inferNativeTurnRisk(prompt: string): NativeTurnRisk {
  const text = prompt.toLowerCase();
  if (/\b(push|publish|release|merge|tag|deploy)\b|푸시|퍼블리시|릴리즈|머지|배포/.test(text)) return "merge";
  if (/\b(run|test|build|exec|execute|shell|terminal|command|npm|pnpm|yarn|bun|pytest|cargo|go test|tsc|lint|verify|check)\b|테스트|빌드|실행|검증|쉘|터미널/.test(text)) return "shell";
  if (/\b(fix|edit|write|implement|modify|patch|refactor|add|create|delete|update|change)\b|수정|구현|패치|리팩터|추가|삭제|변경/.test(text)) return "write";
  return "read";
}

function nativeTurnRoutingPolicy(provider: string, risk: NativeTurnRisk): {
  capabilities: string[];
  readOnly: boolean;
  sandboxMode: "read-only" | "workspace-write";
  providerReasonSuffix?: string;
} {
  if (provider === "deepseek" && risk !== "read") {
    return {
      capabilities: ["read", "review"],
      readOnly: true,
      sandboxMode: "read-only",
      providerReasonSuffix: `; DeepSeek is advisory/read-only for ${risk} intent`,
    };
  }
  if (risk === "read") {
    return { capabilities: ["read"], readOnly: true, sandboxMode: "read-only" };
  }
  if (risk === "write") {
    return { capabilities: ["write", "patch"], readOnly: false, sandboxMode: "workspace-write" };
  }
  if (risk === "merge") {
    return { capabilities: ["write", "patch", "shell", "merge"], readOnly: false, sandboxMode: "workspace-write" };
  }
  return { capabilities: ["write", "patch", "shell"], readOnly: false, sandboxMode: "workspace-write" };
}

export function buildNativeRootLoopTurnNode(input: {
  bootstrap: RuntimeBootstrap;
  prompt: string;
  nodeId?: string;
  mcpAllowlist?: readonly string[];
  skillNames?: readonly string[];
  hookNames?: readonly string[];
  executionPrompt?: string;
}): DagNode {
  const id = input.nodeId ?? `turn-${Date.now()}`;
  const turnRisk = inferNativeTurnRisk(input.prompt);
  const routingPolicy = nativeTurnRoutingPolicy(input.bootstrap.provider, turnRisk);
  const capabilityInjection = buildCapabilityInjection({
    mcpAllowlist: input.mcpAllowlist,
    skillNames: input.skillNames,
    hookNames: input.hookNames,
  });
  const envelope = buildPromptEnvelope({
    bootstrap: input.bootstrap,
    prompt: input.prompt,
    capabilities: capabilityInjection,
    role: "root-coordinator",
    nodeId: id,
    executionPrompt: input.executionPrompt,
    turnRisk,
    sandboxMode: routingPolicy.sandboxMode,
  });
  return {
    id,
    name: renderPromptEnvelope(envelope),
    role: "coordinator",
    dependsOn: [],
    status: "running",
    retries: 0,
    maxRetries: 1,
    routing: applyCapabilityInjectionToRouting({
      provider: input.bootstrap.provider,
      providerModel: input.bootstrap.selectedModel,
      providerReason: `native-root-loop selected ${input.bootstrap.selectedRuntimeId ?? input.bootstrap.sessionMode}${routingPolicy.providerReasonSuffix ?? ""}`,
      assignedProviderCapabilities: routingPolicy.capabilities,
      contextBudget: "normal",
      readOnly: routingPolicy.readOnly,
      risk: turnRisk,
      executionPrompt: input.executionPrompt,
      approvalPolicy: input.executionPrompt,
      sandboxMode: routingPolicy.sandboxMode,
      rationale: "native-root-loop turn; OMK retains root orchestration and passes scoped MCP/skills/hooks metadata to the selected runtime",
    }, capabilityInjection),
  };
}

export async function runNativeOmkRootLoop(input: NativeRootLoopInput): Promise<number> {
  const { bootstrap, taskRunner, layout, onData } = input;
  const turnTimeoutMs = Number.parseInt(input.env.OMK_TURN_TIMEOUT_MS ?? "120000", 10);
  const safeTurnTimeoutMs = Number.isFinite(turnTimeoutMs) && turnTimeoutMs > 0 ? turnTimeoutMs : 120_000;
  const commands = buildSlashCommands(input);

  if (layout !== "plain") {
    console.log(style.phosphor("Entering interactive mode. Type /help for commands.\n"));
  }

  const { createInterface } = await import("readline");
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  let running = true;
  let readlineClosed = false;
  rl.once("close", () => {
    readlineClosed = true;
    running = false;
  });
  process.once("SIGINT", () => { running = false; rl.close(); });

  while (running) {
    const userInput = await new Promise<string | undefined>((resolve, reject) => {
      if (readlineClosed) {
        resolve(undefined);
        return;
      }
      let settled = false;
      const finish = (value: string | undefined): void => {
        if (settled) return;
        settled = true;
        rl.off("close", onClose);
        resolve(value);
      };
      const onClose = (): void => {
        finish(undefined);
      };
      rl.once("close", onClose);
      try {
        rl.question(style.phosphorDim("omk> "), finish);
      } catch (err: unknown) {
        if (err instanceof Error && "code" in err && err.code === "ERR_USE_AFTER_CLOSE") {
          finish(undefined);
          return;
        }
        rl.off("close", onClose);
        reject(err);
      }
    });
    if (userInput === undefined) break;

    const line = userInput.trim();
    if (!line) continue;

    if (["exit", "quit", ":q", "/exit", "/quit"].includes(line.toLowerCase())) {
      running = false;
      break;
    }

    if (line.startsWith("/") || line.startsWith(":")) {
      const spaceIdx = line.indexOf(" ");
      const cmd = spaceIdx > 0 ? line.slice(0, spaceIdx) : line;
      const args = spaceIdx > 0 ? line.slice(spaceIdx + 1) : "";
      const handler = commands.find((c) => c.name === cmd || c.aliases.includes(cmd));

      if (handler) {
        if (handler.name === "/exit") {
          running = false;
          break;
        }
        try {
          await handler.handler(args);
        } catch (err: unknown) {
          const m = err instanceof Error ? err.message : String(err);
          console.error(style.metricsRed(`Command error: ${m}`));
        }
        continue;
      }
      console.log(style.phosphorDim(`Unknown command: ${cmd}. Type /help for commands.`));
      continue;
    }

    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), safeTurnTimeoutMs);

    try {
      const node = buildNativeRootLoopTurnNode({
        bootstrap,
        prompt: line,
        mcpAllowlist: input.mcpAllowlist,
        skillNames: input.skillNames,
        hookNames: input.hookNames,
        executionPrompt: input.executionPrompt,
      });

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
      const msg = abort.signal.aborted
        ? `Turn timed out after ${safeTurnTimeoutMs}ms`
        : err instanceof Error
        ? err.message
        : String(err);
      console.error(style.metricsRed(`Error: ${msg}`));
    } finally {
      clearTimeout(timeout);
    }
  }

  if (!readlineClosed) rl.close();
  console.log(style.phosphorDim("\nSession ended."));
  return 0;
}
