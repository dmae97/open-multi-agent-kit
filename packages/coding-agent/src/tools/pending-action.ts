import type { AgentToolResult } from "@oh-my-pi/pi-agent-core";

export interface PendingAction {
	label: string;
	sourceToolName: string;
	apply(): Promise<AgentToolResult<unknown>>;
	details?: unknown;
}

export class PendingActionStore {
	#action: PendingAction | null = null;

	set(action: PendingAction): void {
		this.#action = action;
	}

	get(): PendingAction | null {
		return this.#action;
	}

	clear(): void {
		this.#action = null;
	}

	get hasPending(): boolean {
		return this.#action !== null;
	}
}
