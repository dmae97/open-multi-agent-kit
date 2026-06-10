# Theme Contract T3–T5 — Layer 2 Final Quality Gates + Cross-Lane Resync

- Date: 2026-06-10
- Lane: QA / tester (read-only verification + delegated staleness resync via bash only)
- Scope authorized: file-copy + asset regeneration only. No code/test edits.
- Skills applied: omk-quality-gate, omk-evidence-contract, omk-test-debug-loop.

## 1. Cross-lane resync actions + verification

(a) Brand snapshot drift-guard fix
- Command: `cp themes/night-city.theme.json src/brand/night-city.theme.json`
- Exit: 0
- Verify: `diff -q themes/night-city.theme.json src/brand/night-city.theme.json` -> identical (SYNCED).
- SHA-256(first12) of both files: `e5daf40d789d` (match).
- Note: files were already identical on entry (a prior lane had synced); the cp is idempotent and confirmed.

(b) readmeasset SVG provenance refresh
- Command: `npm run assets:build`
- Exit: 0
- Result: 5 SVGs regenerated, `derived-from: omk.theme.v1/night-city@e5daf40d789d`, 0 contrast failures.
- `git diff readmeasset/*.svg` shows ONLY the provenance comment line added per file (`+<!-- derived-from: ... -->`) — matches the expected "provenance hash line only" change.
- IMPORTANT FINDING: `scripts/assets-build.mjs` writes the 5 SVGs ONLY; it does NOT maintain `readmeasset/ASSET_PROVENANCE.md`. The md ledger (modified earlier by the T4 lane) is STALE vs the freshly regenerated SVGs:
  - md table SHA-256 rows do not match the current SVG files (all 5 mismatch).
  - md footer `derived-from` lines reference `@4218d8ab9c6d` (stale) vs current theme hash `@e5daf40d789d`.
  - No gate/test validates these md hashes (package-audit only checks file presence), so this does not fail any gate, but the ledger is stale. Owner: T4 (assets) — md is hand-maintained, out of `assets:build` and out of my regeneration scope.

## 2. Gate table (command -> exit code -> key output line)

| # | Command | Exit | Key output |
|---|---------|------|------------|
| 1a | cp themes/night-city.theme.json src/brand/night-city.theme.json | 0 | SYNCED (sha e5daf40d789d == e5daf40d789d) |
| 1b | npm run assets:build | 0 | 5 SVGs derived from themes/night-city.theme.json, 0 failures |
| 2 | npm run schema:check | 0 | validated 9 OMK JSON contract schemas |
| 3 | npm run theme:check | 0 | night-city: 80 pairs checked, 0 failed (contract: 32 truecolor + 32 xterm-256 + 16 VGA) |
| 4 | npm run color:gate | 0 | total: hex=131 sgr=4046 across 15 files; color:gate passed |
| 5 | npm run yaml:check | 0 | YAML validation passed: 13 file(s) checked |
| 6 | npm run lint (= eslint --max-warnings=0 src/) | 0 | clean, no warnings/errors |
| 7 | npm run build:clean (clean:dist + tsc + chmod-dist) | 0 | tsc compiled, dist rebuilt |
| 8 | node --test theme-degradation + theme-cli-surface + brand-theme + theme + v2-regression | 0 | tests 53, pass 53, fail 0 |
| 9 | npm test (FULL) | n/a | NOT run in full (prior full run = 671782 ms ~= 11.2 min > 10 min, and includes a 300s-timeout-prone file). Ran targeted subset instead — see 2b. |

### 2b. Step 9 targeted subset (full suite skipped: >10 min + timeout-prone)

| Test file | Exit | Result |
|-----------|------|--------|
| theme-degradation + theme-cli-surface + brand-theme + theme + v2-regression | 0 | 53/53 pass (incl. brand drift-guard `night-city snapshot stays in sync`) |
| test/package-audit.test.mjs (asset provenance area) | 0 | 58/58 pass |
| test/cockpit-scroll.test.mjs (cockpit area) | 0 | 15/15 pass |
| test/hud-branding.test.mjs (ui/branding area) | 0 | 1/1 pass |
| test/cockpit-render.test.mjs (cockpit area) | 1 | TIMEOUT — 18/18 executed subtests pass (incl. width-matrix border alignment); file exceeds timeout |
| test/no-legacy-identity-surface.test.mjs | 1 | FAIL — banned product token in theme proof + scripts/theme-check.mjs |
| test/omk-no-args-hud.test.mjs | 1 | FAIL — literal export string absent after util/fs barrel refactor |

Skipped vs full suite: ~160 non-theme test files not exercised (runtime budget). Rationale: full suite ~11.2 min exceeds the 10-min cap and `cockpit-render` alone consumes the 300s per-file timeout. Subset covers every theme/brand/ui/cockpit/asset-provenance surface touched by T3–T5 plus the three files that failed in the prior (pre-theme) full run, to classify them.

## 3. git diff --stat summary

- Overall: `32 files changed, 560 insertions(+), 4025 deletions(-)`
  (dominated by non-theme `src/util/fs.ts` barrel refactor: -2014 lines.)
- Theme/brand/ui/cockpit/scripts/ci/assets subset: 18 files changed, 244 insertions(+), 98 deletions(-):
  - src/brand/palette.ts, src/brand/theme.ts (compiled-from-theme)
  - src/cli/theme/{index.ts,terminal-capability.ts} (+ new oklab-quantize/render-table/status-frame/tier-explain/theme-doc)
  - src/cli/ui/{green-rain,neon-grid,rust-forge,system24}-renderer.ts
  - src/commands/cockpit/render.ts, src/util/chat-cockpit.ts
  - scripts/validate-json-contracts.mjs, .github/workflows/ci.yml
  - readmeasset/*.svg (+1 provenance line each), readmeasset/ASSET_PROVENANCE.md
  - themes/night-city.theme.json -> src/brand/night-city.theme.json (snapshot)

## 4. Failures — diagnostics + likely owner lane

F1. test/no-legacy-identity-surface.test.mjs — exit 1 (THEME-RELATED + cross-lane)
- Gate scans the public surface for the banned product identity token (charcodes 80,105) as `\b<token>\b` / `\b<TOKEN>\b`.
- Matches found:
  - `scripts/theme-check.mjs:268` uses the JavaScript circle constant (the 3.14159 namespace value); its UPPERCASE identifier trips the `\b<TOKEN>\b` rule. This is a THEME-lane file (contrast checker authored by T3/qa). False-positive-ish but the gate is strict.
  - `proof/theme-2026-06-10/{t3-a11y-review.md, t3-t5-orchestration-result.json, t5-cli-evidence.md}` contain the banned token in "<token>+OMK ..." lane/orchestration phrasing — THEME-lane evidence text.
  - `proof/rust-lane-2026-06-10/kill-execution/orchestration-result.json` — RUST lane evidence.
- Owner lane: theme T3 / qa-grep-gate (scripts/theme-check.mjs + theme proof) and the rust lane (rust proof). Fix requires a code/text edit (rename the constant usage or add an allowlist entry, and sanitize proof token strings) — OUT of my authorized scope (cp/regenerate only). Reported, not patched.

F2. test/omk-no-args-hud.test.mjs — exit 1 (NON-THEME / unrelated)
- Subtest "keeps root runtime discovery on OMK and portable agent paths" slices `dist/util/fs.js` for the literal `export async function collectMcpConfigs`.
- After the util refactor, `src/util/fs.ts` became a barrel (`export * from "./fs/mcp-runtime-config.js"` etc., -2014 lines); `collectMcpConfigs` now lives in `src/util/fs/mcp-runtime-config.js`. tsc/build pass (re-export resolves), but the literal string is gone from `dist/util/fs.js`, so the string-coupled test fails.
- Area touched: `src/util/fs.ts` + `src/commands/mcp*` — NOT in the theme goal (verified). Pre-existing failure in the prior 05:08 (pre-theme) full run.
- Owner lane: util/MCP fs-barrel refactor lane (non-theme). Test needs to read `dist/util/fs/mcp-runtime-config.js`. No theme action.

F3. test/cockpit-render.test.mjs — exit 1 (TIMEOUT / pre-existing)
- File-level timeout (300s in the runner; reproduced at 120s here). All 18 executed subtests PASS (incl. "width matrix: every rendered line satisfies visibleTerminalWidth <= requestedWidth and borders align"); the 19th was cancelled by the file timeout.
- Already timed out (300.1s) in the prior 05:08 full run, BEFORE the theme lanes landed -> pre-existing performance/timeout, not a theme correctness regression. cockpit area was touched by theme, but the failure mode is duration, not assertion.
- Owner lane: cockpit / test-infra (suite is too heavy for the per-file timeout). No theme correctness defect observed.

MCP lane note: omk-project and memory MCP servers were not reachable from this tester subagent's tool surface (only local read/grep/find/ls/bash were available). Evidence is from local commands; MCP-backed memory writes were not performed (limitation reported per instructions).

## 5. Ouroboros-style QA verdict (PASS/FAIL per criterion)

| Criterion | Verdict | Evidence |
|-----------|---------|----------|
| schema | PASS | schema:check exit 0 — 9 contracts validated |
| contrast 3-tier | PASS | theme:check exit 0 — 80 pairs / 0 failed (32 truecolor + 32 xterm-256 + 16 VGA) |
| color ratchet | PASS | color:gate exit 0 — hex=131 / sgr=4046 (at lowered ratchet ceilings) |
| yaml | PASS | yaml:check exit 0 — 13 files (CI workflow edit valid) |
| lint | PASS | eslint --max-warnings=0 src/ exit 0 |
| build | PASS | build:clean exit 0 — tsc clean rebuild |
| tests (theme) | PASS | 53/53 named theme tests + cockpit-scroll 15/15 + hud-branding 1/1 + package-audit 58/58; brand drift-guard green |
| tests (full suite) | FAIL | 3 non-passing files in subset: F1 no-legacy-identity (theme+rust), F2 omk-no-args-hud (fs/MCP refactor, non-theme), F3 cockpit-render (timeout, pre-existing). Full suite not run end-to-end (>10 min). |
| asset provenance freshness | PARTIAL | SVG embedded provenance FRESH (@e5daf40d789d == theme SHA); ASSET_PROVENANCE.md ledger STALE (table hashes + footer @4218d8ab9c6d). Not gated. Owner T4. |
| brand snapshot sync | PASS | src/brand/night-city.theme.json == themes/night-city.theme.json; drift-guard test passes |

### Overall verdict
- Theme contract gates (schema, contrast 3-tier, color ratchet, yaml, lint, build, theme/brand/ui/cockpit tests, brand snapshot sync): PASS.
- Blocking outside theme correctness: F2 (fs/MCP barrel refactor — non-theme owner) and F3 (cockpit-render timeout — pre-existing, all assertions pass).
- Theme-owned cleanup required before a clean full `verify`: F1 (theme-check.mjs constant + theme proof token strings trip the legacy-identity gate) and the stale ASSET_PROVENANCE.md ledger (T4). Both require text/code edits outside the authorized cp/regenerate scope and are reported for the owning lanes.

Verdict: CONDITIONAL PASS for theme T3–T5 quality gates (steps 1–8 all exit 0; theme-specific tests green). Full-suite gate (step 9) FAIL with 3 documented files — 2 non-theme/pre-existing, 1 theme-related (legacy-identity) flagged to T3/qa.
