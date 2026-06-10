# rust-forge theme promotion — proof / orchestration-2026-06-10

## Files changed

- `themes/rust-forge.theme.json` (new) — canonical omk.theme.v1 document
- `src/cli/theme/theme-registry.ts` — wired rust-forge palette to compile from the JSON
- `test/theme.test.mjs` — added validation + contrast-gate tests

## Final palette

| primitive | hex | usage |
|---|---|---|
| iron | #0E0B09 | background (primary) |
| forge | #1A1310 | background (secondary) |
| rust | #FF6A3D | route.active, dag.lane.running, control.accent |
| copper | #E08A4B | route.fallback, dag.lane.blocked |
| ember | #FFB454 | evidence.pending, telemetry.warn |
| oxide | #4FB39B | evidence.pass |
| verdigris | #6FD7B8 | dag.lane.done |
| crimson | #FF5468 | route.dead, evidence.fail, telemetry.error |
| steel | #9FB0BD | control.dim |
| ash | #C9B8A8 | (reserved, unused by semantic roles) |
| slag | #8F7B6D | dag.lane.queued |
| bone | #F2E4D6 | telemetry.info, control.fg |

## Semantic role mapping

All roles, components, glyphs, and fallback16 keys mirror night-city exactly for drop-in compatibility.

| role | primitive | glyph | kind | usage |
|---|---|---|---|---|
| route.active | rust | ▸ | state | text |
| route.fallback | copper | ↻ | state | text |
| route.dead | crimson | ✕ | state | text |
| evidence.pass | oxide | ✓ | state | text |
| evidence.fail | crimson | ✗ | state | text |
| evidence.pending | ember | ◐ | state | text |
| dag.lane.running | rust | ▶ | state | text |
| dag.lane.blocked | copper | ⏸ | state | text |
| dag.lane.done | verdigris | ● | state | text |
| dag.lane.queued | slag | ◌ | state | text |
| telemetry.info | bone | · | state | text |
| telemetry.warn | ember | ▲ | state | text |
| telemetry.error | crimson | ✖ | state | text |
| control.accent | rust | ◆ | chrome | indicator |
| control.dim | steel | ┊ | chrome | text |
| control.fg | bone | — | chrome | text |
| control.bg | iron | — | background | background |

## Contrast results

### Truecolor tier (all 30 pairs pass)

| role | fg | bg | CR |
|---|---|---|---|
| route.active | rust #FF6A3D | iron #0E0B09 | 6.89 |
| route.active | rust #FF6A3D | forge #1A1310 | 6.45 |
| route.fallback | copper #E08A4B | iron #0E0B09 | 7.39 |
| route.fallback | copper #E08A4B | forge #1A1310 | 6.91 |
| route.dead | crimson #FF5468 | iron #0E0B09 | 6.28 |
| route.dead | crimson #FF5468 | forge #1A1310 | 5.87 |
| evidence.pass | oxide #4FB39B | iron #0E0B09 | 7.71 |
| evidence.pass | oxide #4FB39B | forge #1A1310 | 7.21 |
| evidence.fail | crimson #FF5468 | iron #0E0B09 | 6.28 |
| evidence.fail | crimson #FF5468 | forge #1A1310 | 5.87 |
| evidence.pending | ember #FFB454 | iron #0E0B09 | 11.12 |
| evidence.pending | ember #FFB454 | forge #1A1310 | 10.40 |
| dag.lane.running | rust #FF6A3D | iron #0E0B09 | 6.89 |
| dag.lane.running | rust #FF6A3D | forge #1A1310 | 6.45 |
| dag.lane.blocked | copper #E08A4B | iron #0E0B09 | 7.39 |
| dag.lane.blocked | copper #E08A4B | forge #1A1310 | 6.91 |
| dag.lane.done | verdigris #6FD7B8 | iron #0E0B09 | 11.29 |
| dag.lane.done | verdigris #6FD7B8 | forge #1A1310 | 10.56 |
| dag.lane.queued | slag #8F7B6D | iron #0E0B09 | 4.88 |
| dag.lane.queued | slag #8F7B6D | forge #1A1310 | 4.56 |
| telemetry.info | bone #F2E4D6 | iron #0E0B09 | 15.73 |
| telemetry.info | bone #F2E4D6 | forge #1A1310 | 14.72 |
| telemetry.warn | ember #FFB454 | iron #0E0B09 | 11.12 |
| telemetry.warn | ember #FFB454 | forge #1A1310 | 10.40 |
| telemetry.error | crimson #FF5468 | iron #0E0B09 | 6.28 |
| telemetry.error | crimson #FF5468 | forge #1A1310 | 5.87 |
| control.accent | rust #FF6A3D | iron #0E0B09 | 6.89 (≥3) |
| control.accent | rust #FF6A3D | forge #1A1310 | 6.45 (≥3) |
| control.dim | steel #9FB0BD | iron #0E0B09 | 8.80 |
| control.dim | steel #9FB0BD | forge #1A1310 | 8.23 |
| control.fg | bone #F2E4D6 | iron #0E0B09 | 15.73 |
| control.fg | bone #F2E4D6 | forge #1A1310 | 14.72 |

### 256-color tier (all 30 pairs pass)

Worst margins: slag@244 #808080 on forge@233 #121212 = 4.74 (still ≥4.5).
All other text roles are well above 6.0.

### 16-color VGA tier (all 15 pairs pass)

| role | ansi | CR |
|---|---|---|
| route.active | brightRed #FF5555 | 6.68 |
| route.fallback | brightYellow #FFFF55 | 19.69 |
| route.dead | brightRed #FF5555 | 6.68 |
| evidence.pass | brightGreen #55FF55 | 15.82 |
| evidence.fail | brightRed #FF5555 | 6.68 |
| evidence.pending | brightYellow #FFFF55 | 19.69 |
| dag.lane.running | brightRed #FF5555 | 6.68 |
| dag.lane.blocked | brightYellow #FFFF55 | 19.69 |
| dag.lane.done | brightGreen #55FF55 | 15.82 |
| dag.lane.queued | white #AAAAAA | 9.04 |
| telemetry.info | brightWhite #FFFFFF | 21.00 |
| telemetry.warn | brightYellow #FFFF55 | 19.69 |
| telemetry.error | brightRed #FF5555 | 6.68 |
| control.accent | brightRed #FF5555 | 6.68 (≥3) |
| control.dim | white #AAAAAA | 9.04 |
| control.fg | brightWhite #FFFFFF | 21.00 |

## OKLCH adjustment log

Only one role required hue-preserving repair:

| role | original | adjusted | crBefore | crAfter |
|---|---|---|---|---|
| dag.lane.queued (slag) | #6E5B4E | #8F7B6D | 2.86 | 4.56 |

The slag primitive was lightened in OKLCH (hue held, L raised, chroma slightly compressed) to pass the text ≥4.5 gate on both iron and forge backgrounds. The adjusted field is recorded in the theme document.

## Wiring change

`src/cli/theme/theme-registry.ts` now loads `themes/rust-forge.theme.json` at module init, compiles it via `compileTheme(doc, "truecolor")`, and produces the `rustForgePalette` `ThemePalette` by mapping `SemanticToken`s to semantic roles:

- success → evidence.pass
- warning → telemetry.warn
- error → telemetry.error
- info → telemetry.info
- agent → control.accent
- task → control.fg
- tool → evidence.pass
- header → control.accent
- subheader → dag.lane.done
- dim / bold / reset → raw ANSI structural escapes
- separator → control.dim
- bullet → control.accent
- labelKey → control.dim
- labelValue → control.fg

Aliases `rust`, `cargo`, `oxide`, `forge`, `rust-native` still resolve to the same compiled palette via the existing registry map.

## Preview snapshot

```
  rust-forge [dark]
    success   ████████
    warning   ████████
    error     ████████
    agent     ████████
    header    ████████
```

Rendered SGR:
- header: `\u001b[38;2;255;106;61m` (rust)
- success: `\u001b[38;2;79;179;155m` (oxide)
- warning: `\u001b[38;2;255;180;84m` (ember)
- error: `\u001b[38;2;255;84;104m` (crimson)
- agent: `\u001b[38;2;255;106;61m` (rust)

## Gate results

| gate | command | result |
|---|---|---|
| schema validation | `npm run schema:check` | ✓ passed |
| theme contrast | `npm run theme:check` | ✓ 160 pairs, 0 failed |
| TypeScript | `npx tsc --noEmit` | ✓ 0 errors |
| lint | `npx eslint src/cli/theme/theme-registry.ts` | ✓ passed |
| tests | `node --test test/theme.test.mjs` | ✓ 11/11 passed |
| preview | `OMK_CLI_V2=1 node dist/cli.js theme preview rust-forge` | ✓ rendered |

## Meta

- `meta.omkVersion`: 0.78.6
- `tierAssumptions`: 16-color tier gated against stock VGA/xterm ANSI values; terminals with remapped ANSI-16 palettes are outside the contract — glyphs are the safety net.
