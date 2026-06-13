# Codex release-risk review

This is the landing-page demo shape for OMK: one natural-language task becomes a scoped, evidence-gated run plan before any source file is changed.

## 30-second dry run

From a repository checkout:

```bash
npx -y -p open-multi-agent-kit omk do "review this repo for release risk" --dry-run --json
```

Or, after installing globally:

```bash
omk do "review this repo for release risk" --dry-run --json
```

## Expected shape

A dry run should describe a bounded plan instead of claiming success:

```txt
goal
  review this repo for release risk

dag
  1. inspect package and version contract
  2. check security and secret-scan boundaries
  3. verify evidence and release gates
  4. synthesize release risk

artifacts
  .omk/runs/<run-id>/dag-compile-report.json
  .omk/runs/<run-id>/evidence-bundle.json
  .omk/runs/<run-id>/decision.json
```

Artifact filenames can evolve with the runtime contract; the invariant is that OMK should persist a run directory and evidence before a worker claims completion.

## What this proves

- OMK accepts a normal coding/release goal, not only a rigid workflow command.
- The first output is a plan and artifact contract, not a narrative "done" message.
- Provider choice and tool authority remain explicit and reviewable.

## What this does not prove

- It does not prove a provider has write authority.
- It does not prove the release is safe.
- It does not replace `npm run verify`, `npm run verify:no-kimi`, `npm run release:check`, or CI evidence.

## Stronger local verification

```bash
npm run verify:no-kimi
npm run proof:check
npm run secret:scan
npm run secret:scan:runtime
```

Use this showcase with [the proof index](../../../proof/PROOF_INDEX.md) when you need a verified local evidence trail.
