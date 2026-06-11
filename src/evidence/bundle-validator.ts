import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve, isAbsolute, relative } from "node:path";
import { OMK_EVIDENCE_BUNDLE_SCHEMA_VERSION } from "../version.js";
import type {
  EvidenceBundle,
  EvidenceBundleIssue,
  EvidenceBundleValidationResult,
} from "../contracts/evidence-bundle.js";

export interface ValidateEvidenceBundleOptions {
  root?: string;
  currentCommit?: string;
  requireDecisionRef?: boolean;
}

function issue(
  kind: EvidenceBundleIssue["kind"],
  message: string,
  details: Partial<Omit<EvidenceBundleIssue, "kind" | "message" | "severity">> & { severity?: EvidenceBundleIssue["severity"] } = {}
): EvidenceBundleIssue {
  return {
    kind,
    severity: details.severity ?? "error",
    message,
    ...(details.path ? { path: details.path } : {}),
    ...(details.expected ? { expected: details.expected } : {}),
    ...(details.actual ? { actual: details.actual } : {}),
  };
}

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateEvidenceBundle(
  bundle: EvidenceBundle,
  options: ValidateEvidenceBundleOptions = {}
): EvidenceBundleValidationResult {
  const issues: EvidenceBundleIssue[] = [];
  const root = resolve(options.root ?? process.cwd());

  if (bundle.schemaVersion !== OMK_EVIDENCE_BUNDLE_SCHEMA_VERSION) {
    issues.push(issue("unsupported_schema", "Evidence bundle schemaVersion is unsupported", {
      expected: OMK_EVIDENCE_BUNDLE_SCHEMA_VERSION,
      actual: String(bundle.schemaVersion),
    }));
  }

  const requiredFields: Array<[string, unknown]> = [
    ["runId", bundle.runId],
    ["commit", bundle.commit],
    ["provider", bundle.provider],
    ["runtimeVersion", bundle.runtimeVersion],
    ["command.value", bundle.command?.value],
    ["verifier.version", bundle.verifier?.version],
    ["redaction.summary", bundle.redaction?.summary],
  ];
  for (const [field, value] of requiredFields) {
    if (!hasText(value)) {
      issues.push(issue("missing_required_field", `Evidence bundle is missing ${field}`));
    }
  }

  if (typeof bundle.command?.exitCode !== "number" || !Number.isInteger(bundle.command.exitCode)) {
    issues.push(issue("missing_required_field", "Evidence bundle command.exitCode must be an integer"));
  }

  if (!Array.isArray(bundle.artifacts) || bundle.artifacts.length === 0) {
    issues.push(issue("missing_artifact", "Evidence bundle must link at least one artifact"));
  } else {
    for (const artifact of bundle.artifacts) {
      if (!hasText(artifact.path)) {
        issues.push(issue("missing_artifact", "Evidence artifact is missing a path"));
        continue;
      }
      if (isAbsolute(artifact.path) || artifact.path.split(/[\\/]+/u).includes("..")) {
        issues.push(issue("missing_artifact", "Evidence artifact path must stay inside the validation root", { path: artifact.path }));
        continue;
      }
      const artifactPath = resolve(root, artifact.path);
      const rel = relative(root, artifactPath);
      if (rel.startsWith("..") || isAbsolute(rel)) {
        issues.push(issue("missing_artifact", "Evidence artifact path escapes the validation root", { path: artifact.path }));
        continue;
      }
      try {
        const actual = sha256File(artifactPath);
        if (actual !== artifact.sha256) {
          issues.push(issue("hash_mismatch", "Evidence artifact sha256 mismatch", {
            path: artifact.path,
            expected: artifact.sha256,
            actual,
          }));
        }
      } catch {
        issues.push(issue("missing_artifact", "Evidence artifact file is missing", { path: artifact.path }));
      }
    }
  }

  if (options.currentCommit && bundle.commit !== options.currentCommit) {
    issues.push(issue("stale_commit", "Evidence bundle commit does not match current commit", {
      expected: options.currentCommit,
      actual: bundle.commit,
    }));
  }

  if (options.requireDecisionRef && (!bundle.decisionRefs || bundle.decisionRefs.length === 0)) {
    issues.push(issue("unlinked_decision", "Evidence bundle has no linked decision reference"));
  }

  if (bundle.redaction?.leakedSecretPatterns && bundle.redaction.leakedSecretPatterns.length > 0) {
    issues.push(issue("redaction_violation", "Evidence bundle reports leaked secret patterns", {
      actual: bundle.redaction.leakedSecretPatterns.join(","),
    }));
  }

  const errors = issues.filter((item) => item.severity === "error");
  const verifierVerdict = bundle.verifier?.verdict ?? "fail";
  const verdict = errors.length > 0 || verifierVerdict === "fail"
    ? "fail"
    : issues.length > 0 || verifierVerdict === "warn"
      ? "warn"
      : "pass";
  return { ok: verdict !== "fail", verdict, issues };
}
