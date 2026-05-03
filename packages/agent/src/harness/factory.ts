import { DefaultAgentHarness } from "./agent-harness.js";
import { DefaultSession } from "./session/session.js";
import type { AgentHarness, AgentHarnessOptions, Session, SessionMetadata, SessionStorage } from "./types.js";

export function createSession<TMetadata extends SessionMetadata>(
	storage: SessionStorage<TMetadata>,
): Session<TMetadata> {
	return new DefaultSession(storage);
}

export function createAgentHarness(options: AgentHarnessOptions): AgentHarness {
	return new DefaultAgentHarness(options);
}
