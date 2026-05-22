import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { getProjectRoot, pathExists } from "../util/fs.js";
import type { Notice } from "./notice.js";

const STORE_DIR = ".omk/awareness";
const STORE_FILE = "notices.jsonl";

function getStorePath(): string {
  return join(getProjectRoot(), STORE_DIR, STORE_FILE);
}

async function ensureStoreDir(): Promise<void> {
  const dir = join(getProjectRoot(), STORE_DIR);
  await mkdir(dir, { recursive: true });
}

function generateId(): string {
  return `ntc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function readLines(): Promise<Notice[]> {
  const path = getStorePath();
  if (!(await pathExists(path))) return [];
  try {
    const content = await readFile(path, "utf-8");
    const lines = content.split("\n").filter((line) => line.trim().length > 0);
    const notices: Notice[] = [];
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line) as unknown;
        if (isNotice(parsed)) notices.push(parsed);
      } catch {
        // skip corrupt lines
      }
    }
    return notices;
  } catch {
    return [];
  }
}

function isNotice(value: unknown): value is Notice {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === "string" &&
    typeof obj.createdAt === "string" &&
    typeof obj.source === "string" &&
    typeof obj.type === "string" &&
    typeof obj.severity === "string" &&
    typeof obj.confidence === "number" &&
    typeof obj.summary === "string" &&
    Array.isArray(obj.evidenceRefs) &&
    typeof obj.suggestedAction === "string"
  );
}

export async function saveNotice(notice: Omit<Notice, "id" | "createdAt">): Promise<Notice> {
  const full: Notice = {
    ...notice,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  await ensureStoreDir();
  const path = getStorePath();
  const line = JSON.stringify(full) + "\n";
  await writeFile(path, line, { flag: "a", encoding: "utf-8" });
  return full;
}

export async function listNotices(): Promise<Notice[]> {
  return readLines();
}

export async function getNotice(id: string): Promise<Notice | undefined> {
  const notices = await readLines();
  return notices.find((n) => n.id === id);
}

export async function resolveNotice(id: string): Promise<Notice | undefined> {
  const path = getStorePath();
  const notices = await readLines();
  const target = notices.find((n) => n.id === id);
  if (!target) return undefined;

  const updated: Notice = {
    ...target,
    resolved: true,
    resolvedAt: new Date().toISOString(),
  };

  const lines = notices.map((n) => (n.id === id ? JSON.stringify(updated) : JSON.stringify(n)));
  await writeFile(path, lines.join("\n") + "\n", "utf-8");
  return updated;
}

export async function listActiveNotices(): Promise<Notice[]> {
  const notices = await readLines();
  return notices.filter((n) => !n.resolved);
}
