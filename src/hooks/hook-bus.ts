import type { AwarenessEvent } from "./events.js";

type UntypedHandler = (payload: unknown) => void | Promise<void>;

const handlers = new Map<string, Set<UntypedHandler>>();
let emitCount = 0;

function addHandler(eventType: string, handler: UntypedHandler): () => void {
  const set = handlers.get(eventType) ?? new Set<UntypedHandler>();
  if (!handlers.has(eventType)) {
    handlers.set(eventType, set);
  }
  set.add(handler);
  return () => {
    set.delete(handler);
    if (set.size === 0) {
      handlers.delete(eventType);
    }
  };
}

export function on<T extends AwarenessEvent["type"]>(
  eventType: T,
  handler: (payload: Extract<AwarenessEvent, { type: T }>["payload"]) => void | Promise<void>
): () => void {
  return addHandler(eventType, handler as UntypedHandler);
}

export function once<T extends AwarenessEvent["type"]>(
  eventType: T,
  handler: (payload: Extract<AwarenessEvent, { type: T }>["payload"]) => void | Promise<void>
): () => void {
  let fired = false;
  const wrapped: UntypedHandler = (payload) => {
    if (fired) return;
    fired = true;
    return (handler as UntypedHandler)(payload);
  };
  const unsubscribe = addHandler(eventType, wrapped);
  const combined = (): void => {
    fired = true;
    unsubscribe();
  };
  return combined;
}

export async function emit(event: AwarenessEvent): Promise<void> {
  const set = handlers.get(event.type);
  if (!set || set.size === 0) return;
  emitCount++;
  for (const handler of set) {
    try {
      await handler(event.payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[hook-bus] Handler error for ${event.type}: ${message}`);
    }
  }
}

export function getStats(): { registeredHandlers: number; emittedEvents: number } {
  let registeredHandlers = 0;
  for (const set of handlers.values()) {
    registeredHandlers += set.size;
  }
  return { registeredHandlers, emittedEvents: emitCount };
}

export function clearHandlers(): void {
  handlers.clear();
  emitCount = 0;
}
