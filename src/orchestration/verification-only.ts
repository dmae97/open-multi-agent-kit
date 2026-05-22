import { access, readFile } from "fs/promises";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { writeCompletionSentinel } from "./completion-sentinel.js";

const execAsync = promisify(exec);

export interface VerificationCheck {
  kind: "file-exists" | "grep" | "command";
  target: string;
  expected?: string;
}

export interface VerificationResult {
  check: VerificationCheck;
  passed: boolean;
  actual?: string;
  error?: string;
}

export interface VerificationOptions {
  root: string;
  runId?: string;
  goalId?: string;
  rawPrompt?: string;
  checks: VerificationCheck[];
}

export interface VerificationReport {
  runId?: string;
  goalId?: string;
  checkedAt: string;
  results: VerificationResult[];
  allPassed: boolean;
  summary: string;
}

export async function runVerificationOnly(options: VerificationOptions): Promise<VerificationReport> {
  const results: VerificationResult[] = [];

  for (const check of options.checks) {
    try {
      if (check.kind === "file-exists") {
        const path = join(options.root, check.target);
        await access(path);
        results.push({ check, passed: true });
      } else if (check.kind === "grep") {
        const path = join(options.root, check.target);
        const content = await readFile(path, "utf-8");
        if (check.expected === undefined) {
          results.push({ check, passed: content.length > 0, actual: content.slice(0, 200) });
        } else {
          const passed = content.includes(check.expected);
          results.push({ check, passed, actual: content.slice(0, 200) });
        }
      } else if (check.kind === "command") {
        const { stdout } = await execAsync(check.target, { cwd: options.root });
        results.push({ check, passed: true, actual: stdout.trim() });
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : String(err);
      let actual: string | undefined;
      if (err !== null && typeof err === "object") {
        const e = err as Record<string, unknown>;
        const out =
          typeof e.stdout === "string"
            ? e.stdout
            : typeof e.stderr === "string"
              ? e.stderr
              : undefined;
        actual = out?.trim();
      }
      results.push({ check, passed: false, actual, error });
    }
  }

  const allPassed = results.every((r) => r.passed);
  const passedCount = results.filter((r) => r.passed).length;

  const report: VerificationReport = {
    runId: options.runId,
    goalId: options.goalId,
    checkedAt: new Date().toISOString(),
    results,
    allPassed,
    summary: `${passedCount}/${results.length} checks passed`,
  };

  await writeCompletionSentinel({
    root: options.root,
    runId: options.runId,
    goalId: options.goalId,
    status: "completed",
    completedBy: "verification-only",
    evidence: results.map((r) => ({
      kind: r.check.kind,
      target: r.check.target,
      passed: r.passed,
      actual: r.actual,
      error: r.error,
    })),
  });

  return report;
}

export function formatVerificationReport(report: VerificationReport): string {
  const lines: string[] = ["검증 완료.\n"];

  for (const result of report.results) {
    const icon = result.passed ? "✅" : "❌";
    let line = `- ${result.check.kind} ${result.check.target}`;
    if (result.check.expected !== undefined) {
      line += ` "${result.check.expected}"`;
    }
    line += ` ${icon}`;

    if (!result.passed) {
      if (result.error) {
        line += `\n  오류: ${result.error}`;
      } else if (result.actual) {
        line += `\n  실제: ${result.actual}`;
      }
    }

    lines.push(line);
  }

  lines.push("\n추가 실행은 중단했습니다.");
  return lines.join("\n");
}
