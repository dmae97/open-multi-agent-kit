import { mkdir, readFile, writeFile, rename, unlink, chmod } from "fs/promises";
import { dirname, join } from "path";

export interface McpQuarantineEntry {
  name: string;
  reason: "missing-env" | "http-fail" | "stdio-fail" | "timeout" | "npm-fail";
  detail: string;
  quarantinedAt: string;
  configSource: string;
}

const DEFAULT_QUARANTINE_DAYS = 7;

function quarantinePath(root: string): string {
  return join(root, ".omk", "mcp-quarantine.json");
}

function atomicWrite(filePath: string, content: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tempPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
    mkdir(dirname(filePath), { recursive: true })
      .then(() => writeFile(tempPath, content, "utf-8"))
      .then(() => rename(tempPath, filePath))
      .then(() => chmod(filePath, 0o600))
      .then(() => resolve())
      .catch(async (err) => {
        try {
          await unlink(tempPath);
        } catch {
          // ignore cleanup error
        }
        reject(err);
      });
  });
}

export async function readQuarantine(root: string): Promise<McpQuarantineEntry[]> {
  const filePath = quarantinePath(root);
  let raw: string;
  try {
    raw = await readFile(filePath, "utf-8");
  } catch {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  const days = parseInt(process.env.OMK_MCP_QUARANTINE_DAYS ?? String(DEFAULT_QUARANTINE_DAYS), 10);
  const maxAgeMs = (Number.isFinite(days) && days > 0 ? days : DEFAULT_QUARANTINE_DAYS) * 24 * 60 * 60 * 1000;
  const now = Date.now();

  return parsed.filter((entry): entry is McpQuarantineEntry => {
    if (!entry || typeof entry !== "object") return false;
    const e = entry as Record<string, unknown>;
    if (
      typeof e.name !== "string" ||
      typeof e.reason !== "string" ||
      typeof e.detail !== "string" ||
      typeof e.quarantinedAt !== "string" ||
      typeof e.configSource !== "string"
    ) {
      return false;
    }
    const quarantinedAt = new Date(e.quarantinedAt).getTime();
    if (Number.isNaN(quarantinedAt)) return false;
    return now - quarantinedAt <= maxAgeMs;
  });
}

export async function writeQuarantine(root: string, entries: McpQuarantineEntry[]): Promise<void> {
  const filePath = quarantinePath(root);
  await atomicWrite(filePath, JSON.stringify(entries, null, 2));
}

export function isQuarantined(name: string, entries: McpQuarantineEntry[]): boolean {
  return entries.some((e) => e.name === name);
}

export function addQuarantineEntry(
  entries: McpQuarantineEntry[],
  entry: Omit<McpQuarantineEntry, "quarantinedAt">
): McpQuarantineEntry[] {
  const next = entries.filter((e) => e.name !== entry.name);
  next.push({
    ...entry,
    quarantinedAt: new Date().toISOString(),
  });
  return next;
}
