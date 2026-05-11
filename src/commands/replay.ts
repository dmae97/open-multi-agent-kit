import { replayRun } from "../replay/replay-engine.js";

export async function replayCommand(runId: string, options: {
  json?: boolean;
  context?: boolean;
  evidence?: boolean;
  decisions?: boolean;
  repair?: boolean;
}): Promise<void> {
  await replayRun(runId, {
    json: options.json,
    context: options.context,
    evidence: options.evidence,
    decisions: options.decisions,
    repair: options.repair,
  });
}
