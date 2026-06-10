/**
 * Theme contract T3 — four-tier terminal degradation snapshots.
 *
 * Renders ONE representative TUI status frame from themes/night-city.theme.json
 * through compileTheme() under truecolor / 256 / 16 / no-color and asserts
 * against inline snapshots. Also writes the four rendered frames as text
 * artifacts to proof/theme-2026-06-10/snapshots/{truecolor,256,16,no-color}.txt.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const { compileTheme } = await import("../dist/cli/theme/render-table.js");
const { renderStatusFrame } = await import("../dist/cli/theme/status-frame.js");
const { nearestXterm256, buildXterm256Lookup } = await import("../dist/cli/theme/oklab-quantize.js");
const { detectColorTier, colorTierForDepth } = await import("../dist/cli/theme/terminal-capability.js");

const theme = JSON.parse(
  await readFile(join(root, "themes", "night-city.theme.json"), "utf8"),
);

const TIERS = ["truecolor", "256", "16", "no-color"];
const SNAPSHOT_DIR = join(root, "proof", "theme-2026-06-10", "snapshots");

// The representative TUI status frame renderer is shared with the
// `omk theme preview` CLI surface: dist/cli/theme/status-frame.js.

// Inline four-tier snapshots. Independently spot-checked:
//   truecolor: control.accent purple #9D4EDD → 38;2;157;78;221
//   256:       cyan #00D6FF → 45, mint #00FFC2 → 49, amber #FFB000 → 214
//   16:        hand-authored fallback16 (brightMagenta=95, brightCyan=96, white=37, brightWhite=97)
const SNAPSHOTS = {
  truecolor:
    "\u001b[38;2;157;78;221m◆ OMK//CONTROL\u001b[0m \u001b[38;2;117;143;168m┊ night-city ops console\u001b[0m\n"
    + "\u001b[38;2;0;214;255m▶ lane compile\u001b[0m  \u001b[38;2;0;255;194m● lane schema\u001b[0m  \u001b[38;2;157;179;199m◌ lane docs\u001b[0m\n"
    + "\u001b[38;2;0;255;194m✓ contrast 48/48\u001b[0m  \u001b[38;2;255;176;0m◐ snapshots\u001b[0m  \u001b[38;2;255;176;0m↻ provider kimi\u001b[0m\n"
    + "\u001b[38;2;255;176;0m▲ headroom 81%\u001b[0m  \u001b[38;2;232;248;255mtier ready\u001b[0m",
  256:
    "\u001b[38;5;98m◆ OMK//CONTROL\u001b[0m \u001b[38;5;103m┊ night-city ops console\u001b[0m\n"
    + "\u001b[38;5;45m▶ lane compile\u001b[0m  \u001b[38;5;49m● lane schema\u001b[0m  \u001b[38;5;145m◌ lane docs\u001b[0m\n"
    + "\u001b[38;5;49m✓ contrast 48/48\u001b[0m  \u001b[38;5;214m◐ snapshots\u001b[0m  \u001b[38;5;214m↻ provider kimi\u001b[0m\n"
    + "\u001b[38;5;214m▲ headroom 81%\u001b[0m  \u001b[38;5;195mtier ready\u001b[0m",
  16:
    "\u001b[95m◆ OMK//CONTROL\u001b[0m \u001b[37m┊ night-city ops console\u001b[0m\n"
    + "\u001b[96m▶ lane compile\u001b[0m  \u001b[92m● lane schema\u001b[0m  \u001b[37m◌ lane docs\u001b[0m\n"
    + "\u001b[92m✓ contrast 48/48\u001b[0m  \u001b[93m◐ snapshots\u001b[0m  \u001b[93m↻ provider kimi\u001b[0m\n"
    + "\u001b[93m▲ headroom 81%\u001b[0m  \u001b[97mtier ready\u001b[0m",
  "no-color":
    "◆ OMK//CONTROL ┊ night-city ops console\n"
    + "▶ lane compile  ● lane schema  ◌ lane docs\n"
    + "✓ contrast 48/48  ◐ snapshots  ↻ provider kimi\n"
    + "▲ headroom 81%  tier ready",
};

const frames = {};
for (const tier of TIERS) {
  frames[tier] = renderStatusFrame(compileTheme(theme, tier));
}

// Write snapshot artifacts up front so evidence exists even if assertions fail.
await mkdir(SNAPSHOT_DIR, { recursive: true });
for (const tier of TIERS) {
  await writeFile(join(SNAPSHOT_DIR, `${tier}.txt`), `${frames[tier]}\n`);
}

const stripAnsi = (s) => s.replace(/\u001b\[[0-9;]*m/g, "");

test("four-tier degradation matches inline snapshots", () => {
  for (const tier of TIERS) {
    assert.equal(frames[tier], SNAPSHOTS[tier], `tier ${tier} frame drifted from snapshot`);
  }
});

test("all tiers render identical visible text", () => {
  const plain = stripAnsi(frames.truecolor);
  for (const tier of TIERS) {
    assert.equal(stripAnsi(frames[tier]), plain, `tier ${tier} changed visible text`);
  }
});

test("no-color frame contains no escape sequences", () => {
  assert.ok(!frames["no-color"].includes("\u001b"), "no-color frame must be plain text");
});

test("256 tier only emits xterm indexes 16-255 (never system colors 0-15)", () => {
  const indexes = [...frames["256"].matchAll(/\u001b\[38;5;(\d+)m/g)].map((m) => Number(m[1]));
  assert.ok(indexes.length > 0, "256 frame must contain 38;5 sequences");
  for (const idx of indexes) {
    assert.ok(idx >= 16 && idx <= 255, `index ${idx} outside 16-255`);
  }
  // The quantizer itself must hold the invariant for every theme primitive.
  for (const hex of Object.values(theme.primitives)) {
    const idx = nearestXterm256(hex);
    assert.ok(idx >= 16 && idx <= 255, `nearestXterm256(${hex}) = ${idx} outside 16-255`);
  }
});

test("oklab lookup precomputes one entry per distinct theme color", () => {
  const hexes = Object.values(theme.primitives);
  const lookup = buildXterm256Lookup(hexes);
  assert.equal(lookup.size, new Set(hexes.map((h) => h.toUpperCase())).size);
  assert.equal(lookup.get("#00D6FF"), 45);
  assert.equal(lookup.get("#FFB000"), 214);
});

test("16-color tier uses the theme's hand-authored ansi16 mapping", () => {
  const ct = compileTheme(theme, "16");
  // control.dim is hand-mapped to white (37), deliberately NOT brightBlack (90).
  assert.equal(ct.tokens["control.dim"].sgr, "\u001b[37m");
  assert.equal(ct.tokens["control.accent"].sgr, "\u001b[95m");
  assert.equal(ct.tokens["evidence.pass"].sgr, "\u001b[92m");
});

test("compileTheme exposes per-surface render tables", () => {
  const ct = compileTheme(theme, "truecolor");
  assert.equal(ct.surfaces.statusCard.border.role, "control.accent");
  assert.equal(ct.surfaces.evidenceGate.pass.role, "evidence.pass");
  assert.equal(ct.surfaces.dagLanes.running.sgr, "\u001b[38;2;0;214;255m");
});

test("--no-color flag and NO_COLOR env both force the no-color tier", () => {
  const saved = {
    NO_COLOR: process.env.NO_COLOR,
    COLORTERM: process.env.COLORTERM,
    FORCE_COLOR: process.env.FORCE_COLOR,
    TERM: process.env.TERM,
  };
  try {
    delete process.env.NO_COLOR;
    delete process.env.FORCE_COLOR;
    process.env.COLORTERM = "truecolor";
    process.env.TERM = "xterm-256color";
    assert.equal(detectColorTier(["node", "omk"]), "truecolor");
    assert.equal(detectColorTier(["node", "omk", "--no-color"]), "no-color");
    process.env.NO_COLOR = "1";
    assert.equal(detectColorTier(["node", "omk"]), "no-color");
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
});

test("colorTierForDepth maps all depths onto the four tiers", () => {
  assert.equal(colorTierForDepth(24), "truecolor");
  assert.equal(colorTierForDepth(8), "256");
  assert.equal(colorTierForDepth(4), "16");
  assert.equal(colorTierForDepth(1), "16");
  assert.equal(colorTierForDepth(0), "no-color");
});
