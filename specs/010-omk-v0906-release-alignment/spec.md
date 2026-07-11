---
description: "Align the shared working tree's version surface, docs, and spec-kit to the released OMK v0.90.6"
---

# Feature Specification: OMK v0.90.6 Release Alignment (docs + version surface)

**Feature Branch**: `docs/dmae97/readme-slash-skills-omkgirl` (stale, fully contained in `main`)
**Created**: 2026-07-11
**Status**: Implemented
**Input**: User description: "여기서 OMK v0.90.6으로좀 그리고 모든 docs, spec-kit 업데이트 부탁한다"
**OMK Preset**: `omk` (DAG-optimized, parallel-agent ready)

## Context

`v0.90.6` was already released from `main` on 2026-07-09 (tag `v0.90.6` = `44434d2c`, present on
`origin`, reachable from `main`). The local checkout sits on a docs branch that forked just before
that release, so its version surface (package.json lockstep, lockfiles, shrinkwrap, READMEs,
release notes, changelogs) still said `0.90.5` while other in-flight sessions had already brought
much of `src/**` past the release point. Re-bumping or re-tagging is forbidden (tag collision;
`specs/constitution.md` §Versioning and Release). The correct operation is **alignment**: adopt the
released v0.90.6 surface from `main` verbatim, without touching other sessions' uncommitted work.

## Agent-Oriented Requirements

### Requirement 1 - Version surface equals released v0.90.6 (Priority: P1)

**Agent**: coder
**Skills**: omk-loop, omk-agent-ops
**MCP**: none
**Evidence Gate**: command-pass
**Risk**: medium

**What**: Restore every clean-but-stale version-bearing file from `main` (the released state):
5× `packages/*/package.json`, root `package-lock.json`, `packages/coding-agent/npm-shrinkwrap.json`,
5× example-extension `package.json` + 4× example `package-lock.json`,
`packages/adaptorch-wpl/CHANGELOG.md`, `README.md`, `packages/coding-agent/README.md`,
`.github/RELEASE_NOTES_v0.90.6.md`, `scripts/check-release-consistency.mjs`,
`packages/coding-agent/test/release-consistency-check.test.ts`.
**Verify**: `git diff main --name-only -- <those paths>` is empty; all packages report `0.90.6`.

**Acceptance**:
1. All five workspace packages are lockstep `0.90.6`.
2. Restored files are byte-identical to `main`.
3. No file modified by another session (`git status` M/?? entries) was overwritten.

---

### Requirement 2 - Changelogs merge, never lose unreleased work (Priority: P1)

**Agent**: coder
**Skills**: omk-loop
**Evidence Gate**: diff-nonempty + command-pass
**Risk**: high

**What**: For `packages/{agent,ai,coding-agent,tui}/CHANGELOG.md` (locally modified by other
sessions): keep `main`'s content verbatim from `## [0.90.6] - 2026-07-09` downward, drop local
`[Unreleased]` bullets that were already released in `[0.90.6]` (exact block match), keep all
genuinely new local bullets under `## [Unreleased]`, and add `main`'s post-release `[Unreleased]`
bullets (npm trusted-publishing identity fix, README demo link).
**Verify**: `git diff main -- <changelog>` shows only added `[Unreleased]` bullets, no deletions
below `## [0.90.6]`.

**Acceptance**:
1. Each changelog's top section is `## [Unreleased]` followed by `## [0.90.6] - 2026-07-09`.
2. Zero released bullets lost or reworded; zero in-flight session bullets lost.

---

### Requirement 3 - Spec-kit capsule for this alignment (Priority: P2)

**Agent**: planner
**Skills**: none
**Evidence Gate**: file-exists
**Risk**: low

**What**: Record this operation as `specs/010-omk-v0906-release-alignment/{spec,plan,tasks}.md`
per `specs/templates/*`. `specs/constitution.md`, `.speckit/config.yaml`, and templates already
match `main` and need no edits.
**Verify**: three files exist and reference the real evidence commands.

---

### Requirement 4 - Verification and runtime application (Priority: P1)

**Agent**: qa
**Skills**: omk-loop
**Evidence Gate**: command-pass
**Risk**: medium

**What**: Run the full repo gate and rebuild the runtime so the installed launcher
(`/home/yu/.omk/agent/bin/omk` → `packages/coding-agent/dist/cli.js`) reports v0.90.6 in the
control panel after TUI restart (constitution §Runtime Change Rule; the user asked for the
running panel — "여기서" — to show 0.90.6).
**Verify**: `npm run check` passes from the repo root; `npm run build` completes; built CLI
reports `0.90.6`.

**Acceptance**:
1. `npm run check` exits 0 (warnings about tag-lineage drift are acceptable outside release mode).
2. `node packages/coding-agent/dist/cli.js --version` prints `0.90.6`.

## Out of Scope

- Committing, staging, tagging, pushing, or publishing anything (user did not request it).
- Editing any file owned by another in-flight session (`src/**`, `.github/workflows/build-binaries.yml`,
  `packages/coding-agent/docs/loadout-domains/frontend-ui.md`, `examples/extensions/preset.ts`,
  untracked new files, `pi-extensions/`).
- Re-releasing or re-tagging v0.90.6; bumping to 0.90.7.
