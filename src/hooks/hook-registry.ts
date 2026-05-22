import { appendFile, mkdir } from "fs/promises";
import { join } from "path";
import { getProjectRoot } from "../util/fs.js";
import { on, getStats } from "./hook-bus.js";
import type { AwarenessEvent } from "./events.js";

let defaultRegistered = false;
const unsubscribers: Array<() => void> = [];

async function appendEvent(event: AwarenessEvent): Promise<void> {
  try {
    const root = getProjectRoot();
    const dir = join(root, ".omk", "awareness");
    await mkdir(dir, { recursive: true });
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      type: event.type,
      payload: event.payload,
    }) + "\n";
    await appendFile(join(dir, "events.jsonl"), line, "utf-8");
  } catch {
    // ignore persistence failures
  }
}

function maybeLogEvent(event: AwarenessEvent): void {
  if (process.env.OMK_DEBUG_HOOKS === "1") {
    console.log(`[hook] ${event.type}`, event.payload);
  }
}

function makeHandler<T extends AwarenessEvent["type"]>(
  _eventType: T
): (payload: Extract<AwarenessEvent, { type: T }>["payload"]) => Promise<void> {
  return async (payload) => {
    const event = { type: _eventType, payload } as AwarenessEvent;
    await appendEvent(event);
    maybeLogEvent(event);
  };
}

export function registerDefaultHooks(): void {
  if (defaultRegistered) return;
  defaultRegistered = true;

  const eventTypes: AwarenessEvent["type"][] = [
    "appshot.captured",
    "browser.feedback.submitted",
    "browser.console.error",
    "browser.network.failed",
    "browser.observation.captured",
    "goal.evidence.missing",
    "goal.wakeup",
    "run.stalled",
    "goal.drift.detected",
    "duplicate.work.detected",
  ];

  for (const eventType of eventTypes) {
    unsubscribers.push(on(eventType, makeHandler(eventType)));
  }
}

export function unregisterDefaultHooks(): void {
  for (const unsub of unsubscribers) {
    unsub();
  }
  unsubscribers.length = 0;
  defaultRegistered = false;
}

export function getHookStats(): { registeredHandlers: number; emittedEvents: number } {
  return getStats();
}
