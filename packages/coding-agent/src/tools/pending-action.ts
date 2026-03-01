import type { AgentToolResult } from "@oh-my-pi/pi-agent-core";

export interface PendingAction {
	label: string;
	sourceToolName: string;
	apply(reason: string): Promise<AgentToolResult<unknown>>;
	reject?(reason: string): Promise<AgentToolResult<unknown> | undefined>;
	details?: unknown;
}

export class PendingActionStore {
	#actions: PendingAction[] = [];
	#pushListeners = new Set<(action: PendingAction, count: number) => void>();

	push(action: PendingAction): void {
		this.#actions.push(action);
		const count = this.#actions.length;
		for (const listener of this.#pushListeners) {
			listener(action, count);
		}
	}

	peek(): PendingAction | null {
		return this.#actions.at(-1) ?? null;
	}

	pop(): PendingAction | null {
		return this.#actions.pop() ?? null;
	}

	subscribePush(listener: (action: PendingAction, count: number) => void): () => void {
		this.#pushListeners.add(listener);
		return () => {
			this.#pushListeners.delete(listener);
		};
	}

	clear(): void {
		this.#actions = [];
	}

	get count(): number {
		return this.#actions.length;
	}

	get hasPending(): boolean {
		return this.#actions.length > 0;
	}
}
