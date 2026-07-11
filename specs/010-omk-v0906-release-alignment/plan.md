---
description: "Implementation plan for aligning the working tree to released OMK v0.90.6"
---

# Implementation Plan: OMK v0.90.6 Release Alignment

**Branch**: `docs/dmae97/readme-slash-skills-omkgirl` | **Date**: 2026-07-11 | **Spec**: [spec.md](spec.md)
**OMK Preset**: `omk`

## Summary

The v0.90.6 release already exists on `main`/`origin`; this checkout is a pre-release docs branch
whose commit is contained in the release. Other sessions hold 37 modified + 10 untracked files in
the same working tree. Alignment therefore proceeds as evidence-gated lanes that only touch
clean-but-stale, version-bearing files (restored byte-identical from `main`) plus a surgical
4-file changelog merge, followed by the full repo gate and a runtime rebuild. No git write
operations (commit/tag/push/stash/reset) are performed.

## Runtime Inventory

- **Harness**: not present (`.omk/runs/` has no active harness for this task)
- **MCP Scope**: none
- **Skills**: omk-loop, omk-agent-ops
- **Authority**: root session is the only writer for lane-owned paths; other sessions' files are read-only.

## Agent Routing

| Phase | Primary Role | Secondary Roles | Evidence Gate |
|-------|--------------|-----------------|---------------|
| Recon | explorer | planner | summary-present |
| Restore | coder | reviewer | command-pass |
| Changelog merge | coder | reviewer | diff-nonempty |
| Spec-kit | planner | — | file-exists |
| QA | qa | reviewer | command-pass |

## Key Decisions

1. **Align, don't re-bump.** `git tag v0.90.6` exists on origin and is reachable from `main`;
   recreating or moving it would collide (constitution §Versioning and Release). Bumping this
   stale branch independently would fabricate a fake 0.90.6 that differs from the released one.
2. **`main` is the single source of truth** for every restored file — no hand-written version
   strings anywhere except the merged `[Unreleased]` changelog sections.
3. **Ownership boundary**: any path in `git status` (M/??) belongs to other sessions, except the
   four CHANGELOG.md files where the task itself requires a merge that preserves their bullets.
4. **Lockfile/shrinkwrap changes** are restores of already-released, already-reviewed content from
   `main`, not new dependency edits; nothing is staged or committed.
5. **Runtime application**: constitution §Runtime Change Rule step 6 authorizes `npm run build`
   because the user asked for the live control panel to show v0.90.6.

## Failure Modes Considered

- Restore overwrites another session's file → prevented by classifying all 59 diff-to-main files
  against the 47-entry dirty/untracked set before any write.
- Changelog merge loses a bullet → exact-normalized block matching keeps any non-verbatim bullet
  in `[Unreleased]` (safe direction: duplication over loss), verified by reviewing the final diff.
- `npm run check` fails in other sessions' `src/**` → report as pre-existing with path evidence;
  do not "fix" foreign lanes.
