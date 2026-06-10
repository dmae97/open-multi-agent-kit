# Theme contract — acceptance checklist reconciliation (2026-06-10)

Mission prompt re-submitted after T0–T5 execution. This reconciles each acceptance
item against the actual tree (uncommitted working state, post Layer-2 gates).

## Checklist status

| # | Acceptance item | Status | Evidence |
|---|---|---|---|
| 1 | `schemas/omk.theme.v1.json` validates; night-city.theme.json only place brand hexes exist | ⚠️ PARTIAL | Schema **filename differs** (see D1). Hexes also exist in 4 sanctioned places (see D2) + 1 unsanctioned (see G1) |
| 2 | Grep gate green: zero color literals in src/ outside theme module | ⚠️ PARTIAL | `npm run color:gate` exit 0, but via **ratchet allowlist**: 10 burn-down files (107 hex / 14 SGR) + 5 permanent (init templates, ascii-art data) — not yet literal zero |
| 3 | theme:check in CI; full CR matrix in proof/; every pair ≥ gate | ✅ DONE | 80 pairs (32 truecolor + 32 xterm-256 + 16 VGA), 0 failed; CI step after schema:check; `proof/theme-check/contrast-matrix.{csv,md}` |
| 4 | Glyph pairing enforced by schema; NO_COLOR → zero escape codes | ✅ DONE | schema if/then mandates glyph for kind=state; no-color tier emits `""`; snapshot `proof/theme-2026-06-10/snapshots/no-color.txt` |
| 5 | OKLab 256-map precomputed (16–255); 16-color hand-authored + gated; 4-tier snapshots | ✅ DONE | `src/cli/theme/oklab-quantize.ts`; ansi16 in theme JSON, VGA-gated; `test/theme-degradation.test.mjs` 9/9 (note D3: `test/` not `tests/`) |
| 6 | README SVGs from tokens; provenance; light variant gated or ADR | ✅ DONE | `npm run assets:build`, 5 SVGs `derived-from: omk.theme.v1/night-city@e5daf40d789d`; dark-only ADR `docs/decisions/ADR-theme-dark-only-assets.md` (note D4) |
| 7 | `omk theme list/set/preview` + `omk doctor` reporting | ✅ DONE | `src/cli/v2/cli-v2-skeleton.ts` ThemeCommand/DoctorCommand; smoke evidence `proof/theme-2026-06-10/t5-cli-evidence.md` |

Additional prompt requirements verified this pass:

- **chalk gate**: `grep -rnE "chalk\.(red|...|hex)" src --include='*.ts'` → **0 matches**; chalk is not even a dependency. No gate extension needed.
- **Precedence chain**: implemented exactly as specified — `src/cli/theme/theme-resolver.ts:4`:
  `--theme flag → OMK_THEME env → project config → user config → terminal capability default`.

## Discrepancies (prompt vs real code)

- **D1 — schema path.** Prompt: `schemas/omk.theme.v1.json`. Real: `schemas/omk.theme.v1.schema.json` — follows the repo's existing `*.schema.json` contract-family convention (cf. `validate-json-contracts.mjs`, 9 contracts). Convention kept; prompt path not used.
- **D2 — "only place the brand hexes exist".** Sanctioned copies: (a) `src/brand/night-city.theme.json` — byte-identical snapshot, sha-drift-guarded by test, exists so the published package needs no `themes/`; (b) `scripts/assets-build.mjs:52` `"#9D4EDD": "purple"` — legacy→token lookup KEYS only, never emitted; (c) `scripts/theme-check.mjs:261` — self-test fixture input; (d) init template payloads (generated-project content, permanent allowlist).
- **D3 — test directory.** Prompt says `tests/`; repo convention migrated to `test/` (e.g. `tests/model-tabs.test.ts → test/model-tabs.test.ts` rename in this working tree). Snapshots live in `test/` + `proof/`.
- **D4 — "install card, provider-router card, evidence-gate card" are raster PNGs** (Pillow renders), not SVGs. Per the prompt's own rule ("raster … stays as curated art; any color-bearing SVG must be generated"), the 5 actual SVGs (badges, core-loop, evidence-ledger, logo-mark, provider-lanes) are generated; the named PNG cards remain curated.

## Open gaps (the honest delta to "checklist fully green")

- **G1 — burn-down to zero**: 10 files / 107 hex / 14 SGR remain (largest: `src/memory/graph-viewer.ts` 41h, `src/theme/parallel.ts` 20h incl. `#9D4EDD` brand hexes at lines 53–54/116/285, `src/commands/design.ts` 18h). Ratchet blocks increases; reaching literal zero is a sanctioned follow-up lane.
- **G2 — ascii-art data modules**: 2×2016 SGR kept verbatim (permanent, justified: escapes ARE the image bytes; zero importers). Deleting them (−4032 SGR) is a separate product decision.
- **G3 — provenance ledger automation**: `assets:build` writes SVGs but not `ASSET_PROVENANCE.md`; ledger was hand-refreshed. Follow-up: `assets:check` drift gate.
- **G4 — pre-existing non-theme failures**: `omk-no-args-hud` (fs barrel refactor lane), `cockpit-render` (suite timeout). Not theme-owned.

## Gate state at reconciliation time

schema:check ✅ · theme:check ✅ (80/0) · color:gate ✅ · yaml:check ✅ · lint ✅ ·
build:clean ✅ · legacy-identity ✅ (940 files) · theme suites 57/57 ✅
