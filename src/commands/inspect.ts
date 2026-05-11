import { inspectRun } from "../replay/inspector.js";

export async function inspectCommand(
  runId: string,
  options: {
    node?: string;
    attempt?: string;
    json?: boolean;
    context?: boolean;
    evidence?: boolean;
    decisions?: boolean;
    repair?: boolean;
  }
): Promise<void> {
  await inspectRun(runId, {
    nodeId: options.node,
    attemptId: options.attempt,
    json: options.json,
    context: options.context,
    evidence: options.evidence,
    decisions: options.decisions,
    repair: options.repair,
  });
}
