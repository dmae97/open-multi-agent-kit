/**
 * Cockpit rail view types — slim sidebar status model.
 */

export interface CockpitRailModel {
  title: string;
  subtitle?: string;

  context: {
    tokens?: number;
    usedPercent?: number;
    costUsd?: number;
    elapsed?: string;
  };

  mcp: Array<{
    name: string;
    status: "connected" | "connecting" | "failed" | "disabled" | "unknown";
    detail?: string;
  }>;

  lsp: Array<{
    name: string;
    status: "connected" | "disabled" | "failed" | "unknown";
  }>;

  todos: Array<{
    title: string;
    status: string;
    agent?: string;
  }>;

  modifiedFiles: Array<{
    path: string;
    added?: number;
    deleted?: number;
    status: string;
  }>;

  providers?: Array<{ name: string; status: string; detail?: string }>;

  evidence?: { failedGates: number; skippedGates: number; latestVerification: string | null };

  tokenBurn?: { inputTokens: number; outputTokens: number; totalTokens: number };

  cwd: string;
  branch?: string;
  runtime: {
    name: string;
    version: string;
    provider?: string;
  };
}

export interface GitNumstatEntry {
  path: string;
  added: number | null;
  deleted: number | null;
}

export interface LspStatusEntry {
  name: string;
  status: "connected" | "disabled" | "failed" | "unknown";
  pid?: number;
  project?: string;
}
