---
description: "OMK DAG task list for the v0.90.6 release alignment"
---

# Tasks: OMK v0.90.6 Release Alignment

**Input**: Design documents from `/specs/010-omk-v0906-release-alignment/`
**Prerequisites**: plan.md (required), spec.md (required)
**Output**: OMK DAG-ready task list with execution metadata

## Phase 1: Recon

- [x] T001 Classify working-tree state: tag lineage (`git tag --list`, `git merge-base --is-ancestor v0.90.6 main`), dirty/untracked ownership (`git status --short`), 59-file `git diff main --name-only` partition into dirty vs clean-stale
  > role: explorer
  > deps: none
  > files: none (evidence in session log)
  > verify: `git merge-base --is-ancestor v0.90.6 main`
  > gate: command-pass
  > risk: low

## Phase 2: Restore version surface

- [x] T002 Restore clean-stale version surface from `main`: `packages/*/package.json` (5), `package-lock.json`, `packages/coding-agent/npm-shrinkwrap.json`, example extension `package.json`/`package-lock.json` (9), `packages/adaptorch-wpl/CHANGELOG.md`, `README.md`, `packages/coding-agent/README.md`, `.github/RELEASE_NOTES_v0.90.6.md`, `scripts/check-release-consistency.mjs`, `packages/coding-agent/test/release-consistency-check.test.ts`
  > role: coder
  > deps: T001
  > files: [`README.md`, `packages/coding-agent/README.md`, `.github/RELEASE_NOTES_v0.90.6.md`, `packages/coding-agent/npm-shrinkwrap.json`]
  > verify: `git diff main --name-only -- README.md packages/coding-agent/README.md package-lock.json packages/coding-agent/npm-shrinkwrap.json 'packages/*/package.json'` prints nothing
  > gate: command-pass
  > risk: medium

## Phase 3: Changelog merge

- [x] T003 Merge `packages/{agent,ai,coding-agent,tui}/CHANGELOG.md`: adopt `main` verbatim from `## [0.90.6] - 2026-07-09` down, drop local bullets already released in `[0.90.6]` (11 in coding-agent), keep new session bullets (1/3/3/4) plus `main` `[Unreleased]` bullets under `## [Unreleased]`
  > role: coder
  > deps: T002
  > files: [`packages/agent/CHANGELOG.md`, `packages/ai/CHANGELOG.md`, `packages/coding-agent/CHANGELOG.md`, `packages/tui/CHANGELOG.md`]
  > verify: `git diff main -- packages/agent/CHANGELOG.md packages/ai/CHANGELOG.md packages/coding-agent/CHANGELOG.md packages/tui/CHANGELOG.md` shows additions only
  > gate: diff-nonempty
  > risk: high

## Phase 4: Spec-kit

- [x] T004 [P] Write `specs/010-omk-v0906-release-alignment/{spec.md,plan.md,tasks.md}` from `specs/templates/*`; leave `specs/constitution.md`, `.speckit/config.yaml`, and templates untouched (already match `main`)
  > role: planner
  > deps: T001
  > files: [`specs/010-omk-v0906-release-alignment/spec.md`, `specs/010-omk-v0906-release-alignment/plan.md`, `specs/010-omk-v0906-release-alignment/tasks.md`]
  > verify: `ls specs/010-omk-v0906-release-alignment`
  > gate: file-exists
  > risk: low

## Phase 5: QA + runtime

- [ ] T005 Full repo gate after all edits — **blocked (foreign file)**: repo-wide `biome check` fails on another session's untracked `pi-extensions/biome.json` (nested root config, pre-existing). All remaining gates were run individually and pass: scoped biome on owned files, `check:pinned-deps`, `check:vendored-skills`, `check:ts-imports`, `check:release-consistency` (`ok: true`, expected `release_tag_not_merged` warning on this stale branch), `check:shrinkwrap`, `tsgo --noEmit` (exit 0), `check:browser-smoke`. Re-run `npm run check` after the owning session resolves `pi-extensions/`
  > role: qa
  > deps: T002, T003, T004
  > files: none
  > verify: `npm run check`
  > gate: command-pass
  > risk: medium

- [x] T006 Runtime application so the installed launcher control panel shows v0.90.6 after TUI restart
  > role: qa
  > deps: T005
  > files: [`packages/coding-agent/dist/cli.js`]
  > verify: `node packages/coding-agent/dist/cli.js --version` prints `0.90.6`
  > gate: command-pass
  > risk: medium

## Explicitly Not Tasks

- No `git add` / `git commit` / `git tag` / `git push` / lockfile staging (user did not request).
- No edits to other sessions' dirty/untracked paths (`src/**`, workflows, `frontend-ui.md`, `preset.ts`, `pi-extensions/`).
