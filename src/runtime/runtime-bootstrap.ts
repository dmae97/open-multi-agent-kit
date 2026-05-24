import { checkCommand } from "../util/shell.js";

export type RuntimeSessionMode = "interactive-tty" | "one-shot-cli" | "api-turn" | "advisory-only";

export interface RuntimeBootstrap {
  ok: boolean;
  provider: string;
  selectedRuntimeId?: string;
  selectedModel?: string;
  sessionMode: RuntimeSessionMode;
  authOk: boolean;
  modelOk: boolean;
  runtimeOk: boolean;
  reason?: string;
  setupHints: string[];
}

function detectProvider(
  provider: string
): { bin?: string; envKey?: string; sessionMode: RuntimeSessionMode; installHint: string; authHint: string; modelHint: string } {
  switch (provider) {
    case "kimi":
      return {
        bin: "kimi",
        sessionMode: "interactive-tty",
        installHint: "npm install -g @anthropic-ai/kimi-code",
        authHint: "kimi login",
        modelHint: "kimi-code default",
      };
    case "codex":
      return {
        bin: "codex",
        sessionMode: "one-shot-cli",
        installHint: "npm install -g @openai/codex",
        authHint: "codex login",
        modelHint: "codex-cli default",
      };
    case "deepseek":
      return {
        envKey: "DEEPSEEK_API_KEY",
        sessionMode: "api-turn",
        installHint: "export DEEPSEEK_API_KEY=sk-...",
        authHint: "Set DEEPSEEK_API_KEY env var",
        modelHint: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
      };
    case "commandcode":
      return {
        bin: process.env.COMMANDCODE_BIN ?? "commandcode",
        sessionMode: "one-shot-cli",
        installHint: "npm install -g commandcode",
        authHint: "commandcode login",
        modelHint: "commandcode default",
      };
    case "opencode":
      return {
        bin: "opencode",
        sessionMode: "one-shot-cli",
        installHint: "cargo install opencode",
        authHint: "opencode login",
        modelHint: "opencode default",
      };
    default:
      return {
        sessionMode: "advisory-only",
        installHint: "omk auth",
        authHint: "omk auth",
        modelHint: "auto-detect",
      };
  }
}

export async function resolveRuntimeBootstrap(options: {
  provider: string;
  model?: string;
  cwd?: string;
}): Promise<RuntimeBootstrap> {
  const provider = options.provider;
  const info = detectProvider(provider);
  const hints: string[] = [];

  let runtimeOk = false;
  let authOk = false;
  let modelOk = false;
  const reasons: string[] = [];

  if (info.bin) {
    runtimeOk = await checkCommand(info.bin).catch(() => false);
    if (!runtimeOk) {
      reasons.push(`${info.bin} CLI not found`);
      hints.push(info.installHint);
    } else {
      authOk = true;
    }
  } else if (info.envKey) {
    runtimeOk = Boolean(process.env[info.envKey]);
    if (!runtimeOk) {
      reasons.push(`${info.envKey} is not set`);
      hints.push(info.installHint);
    } else {
      authOk = true;
    }
  }

  if (runtimeOk && provider !== "kimi") {
    modelOk = true;
  } else if (provider === "kimi" && runtimeOk) {
    modelOk = true;
  }

  if (provider === "auto") {
    runtimeOk = true;
    authOk = true;
    modelOk = true;
  }

  if (!runtimeOk) {
    hints.push(info.authHint);
    hints.push(`omk chat --provider ${provider} --model ${info.modelHint}`);
  }

  const ok = runtimeOk && authOk && modelOk;

  return {
    ok,
    provider,
    selectedRuntimeId: info.bin ?? info.envKey ?? "auto",
    selectedModel: options.model ?? info.modelHint,
    sessionMode: info.sessionMode,
    authOk,
    modelOk,
    runtimeOk,
    reason: reasons.length > 0 ? reasons.join("; ") : undefined,
    setupHints: hints,
  };
}
