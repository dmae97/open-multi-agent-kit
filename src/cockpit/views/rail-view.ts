/**
 * Cockpit rail view — slim sidebar renderer without borders.
 */

import { style } from "../../util/theme.js";
import type { CockpitRailModel } from "../types.js";
import {
  visibleTerminalWidth,
  truncateLine,
  fitHeight,
  sectionHeader,
} from "../../util/terminal-layout.js";

export interface RailRenderOptions {
  width: number;
  height?: number;
}

function statusColor(status: string): (s: string) => string {
  const s = status.toLowerCase();
  if (s === "connected" || s === "done" || s === "completed") return style.mint;
  if (s === "failed") return style.red;
  if (s === "running" || s === "in_progress") return style.purpleBold;
  if (s === "blocked") return style.orange;
  if (s === "disabled" || s === "unknown") return style.gray;
  return style.gray;
}

function todoMarker(status: string): string {
  const s = status.toLowerCase();
  if (s === "running" || s === "in_progress") return style.purpleBold("▶");
  if (s === "done" || s === "completed") return style.mintBold("✓");
  if (s === "failed") return style.red("✕");
  if (s === "blocked") return style.orange("■");
  return style.gray("□");
}

const RAIL_LIMITS = {
  mcp: 18,
  lsp: 4,
  todos: 8,
  modifiedFiles: 12,
};

export function renderRailView(model: CockpitRailModel, options: RailRenderOptions): string {
  const width = Math.max(28, Math.min(options.width, 56));
  const lines: string[] = [];

  // Title
  lines.push(style.creamBold(truncateLine(model.title, width)));
  if (model.subtitle) {
    lines.push(style.gray(truncateLine(model.subtitle, width)));
  }
  lines.push("");

  // Context
  lines.push(sectionHeader("Context"));
  if (model.context.tokens != null) {
    lines.push(style.gray(`${model.context.tokens.toLocaleString()} tokens`));
  }
  if (model.context.usedPercent != null) {
    lines.push(style.gray(`${model.context.usedPercent}% used`));
  }
  if (model.context.costUsd != null) {
    lines.push(style.gray(`$${model.context.costUsd.toFixed(2)} spent`));
  }
  if (model.context.elapsed) {
    lines.push(style.gray(model.context.elapsed));
  }
  lines.push("");

  // Providers
  if (model.providers && model.providers.length > 0) {
    lines.push(sectionHeader("Providers"));
    for (const p of model.providers) {
      const statusStr = p.status.charAt(0).toUpperCase() + p.status.slice(1);
      const detail = p.detail ? ` ${style.gray(p.detail)}` : "";
      const bullet = `${style.gray("•")} ${p.name} ${statusColor(p.status)(statusStr)}${detail}`;
      lines.push(truncateLine(bullet, width));
    }
    lines.push("");
  }

  // MCP
  lines.push(sectionHeader("MCP"));
  for (const item of model.mcp.slice(0, RAIL_LIMITS.mcp)) {
    const statusStr = item.status.charAt(0).toUpperCase() + item.status.slice(1);
    const detail = item.detail ? ` ${style.gray(item.detail)}` : "";
    const bullet = `${style.gray("•")} ${item.name} ${statusColor(item.status)(statusStr)}${detail}`;
    lines.push(truncateLine(bullet, width));
  }
  if (model.mcp.length > RAIL_LIMITS.mcp) {
    lines.push(style.gray(`• ${model.mcp.length - RAIL_LIMITS.mcp} more ...`));
  }
  lines.push("");

  // LSP
  lines.push(sectionHeader("LSP"));
  if (model.lsp.length === 0) {
    lines.push(style.gray("LSPs are disabled"));
  } else {
    for (const item of model.lsp.slice(0, RAIL_LIMITS.lsp)) {
      const statusStr = item.status.charAt(0).toUpperCase() + item.status.slice(1);
      const bullet = `${style.gray("•")} ${item.name} ${statusColor(item.status)(statusStr)}`;
      lines.push(truncateLine(bullet, width));
    }
  }
  lines.push("");

  // Todo
  lines.push(sectionHeader("Todo"));
  for (const todo of model.todos.slice(0, RAIL_LIMITS.todos)) {
    const marker = todoMarker(todo.status);
    const agentBadge = todo.agent ? style.gray(`[${todo.agent}] `) : "";
    const line = `${marker} ${agentBadge}${truncateLine(todo.title, width - 4)}`;
    lines.push(truncateLine(line, width));
  }
  if (model.todos.length > RAIL_LIMITS.todos) {
    lines.push(style.gray(`□ ${model.todos.length - RAIL_LIMITS.todos} more ...`));
  }
  lines.push("");

  // Evidence Gates
  if (model.evidence && (model.evidence.failedGates > 0 || model.evidence.skippedGates > 0)) {
    lines.push(sectionHeader("Evidence"));
    if (model.evidence.failedGates > 0) {
      lines.push(`${style.red("✕")} ${style.gray(`${model.evidence.failedGates} failed`)}`);
    }
    if (model.evidence.skippedGates > 0) {
      lines.push(`${style.orange("■")} ${style.gray(`${model.evidence.skippedGates} skipped`)}`);
    }
    if (model.evidence.latestVerification) {
      lines.push(style.gray(truncateLine(model.evidence.latestVerification, width)));
    }
    lines.push("");
  }

  // Modified Files
  lines.push(sectionHeader("Modified Files"));
  for (const file of model.modifiedFiles.slice(0, RAIL_LIMITS.modifiedFiles)) {
    lines.push(renderModifiedFile(file, width));
  }
  if (model.modifiedFiles.length > RAIL_LIMITS.modifiedFiles) {
    lines.push(style.gray(`• ${model.modifiedFiles.length - RAIL_LIMITS.modifiedFiles} more ...`));
  }
  lines.push("");

  // cwd / branch
  lines.push(style.gray(truncateLine(model.cwd, width)));
  if (model.branch) {
    lines.push(style.cream(truncateLine(model.branch, width)));
  }
  lines.push("");

  // Runtime footer
  lines.push(`${style.mint("•")} ${style.gray(`${model.runtime.name} ${model.runtime.version}`)}`);

  return fitHeight(lines.map((l) => truncateLine(l, width)), options.height).join("\n");
}

function renderModifiedFile(file: CockpitRailModel["modifiedFiles"][number], width: number): string {
  let delta = "";
  if (file.added != null || file.deleted != null) {
    const addedPart = file.added != null ? style.mint(`+${file.added}`) : "";
    const deletedPart = file.deleted != null ? style.red(` -${file.deleted}`) : "";
    delta = `${addedPart}${deletedPart}`;
  } else if (file.status === "??" || file.status.includes("?")) {
    delta = style.blue("?");
  } else {
    delta = style.gray(file.status);
  }

  const deltaWidth = visibleTerminalWidth(delta);
  const pathWidth = Math.max(8, width - deltaWidth - 1);
  const pathPart = style.gray(truncateLine(file.path, pathWidth));
  return `${pathPart} ${delta}`;
}
