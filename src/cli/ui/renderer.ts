import type { CliUiEvent } from "./event.js";

export interface CliRenderer {
  start(): Promise<void> | void;
  emit(event: CliUiEvent): void;
  stop(): Promise<void> | void;
}

