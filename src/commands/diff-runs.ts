import { diffRuns } from "../replay/differ.js";
import { style } from "../util/theme.js";

export async function diffRunsCommand(
  runA: string,
  runB: string,
  options: { json?: boolean }
): Promise<void> {
  const report = await diffRuns(runA, runB);

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log(style.purpleBold(`📊 Diff — ${runA} vs ${runB}`));
  console.log(`  DAG hash match:      ${report.dagHashMatch ? style.mint("✓") : style.red("✕")}`);
  console.log(`  Policy hash match:   ${report.policyHashMatch ? style.mint("✓") : style.red("✕")}`);
  console.log(`  Differences:         ${report.entries.length}`);
  console.log("");

  if (report.entries.length === 0) {
    console.log(style.mint("Runs are structurally identical."));
    return;
  }

  for (const entry of report.entries) {
    const icon = entry.kind === "node-added" || entry.kind === "node-removed"
      ? style.orange("⊘")
      : entry.kind === "status-changed" || entry.kind === "decision-changed"
      ? style.purple("↻")
      : entry.kind === "repair-changed"
      ? style.red("🔧")
      : entry.kind === "context-changed"
      ? style.cream("📦")
      : entry.kind === "evidence-changed"
      ? style.mint("📋")
      : style.gray("•");
    console.log(`${icon} ${style.cream(entry.nodeId)} ${style.gray(entry.kind)}`);
    console.log(`   ${entry.detail}`);
    if (entry.values) {
      console.log(`   ${style.gray(String(entry.values.a))} → ${style.gray(String(entry.values.b))}`);
    }
  }
}
