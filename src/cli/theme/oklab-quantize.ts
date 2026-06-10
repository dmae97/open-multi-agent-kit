/**
 * CLI Theme — OKLab xterm-256 Quantizer
 * Precomputes an OKLab nearest-neighbor lookup mapping 24-bit theme colors to
 * xterm-256 indexes 16-255 ONLY. System colors 0-15 are never emitted because
 * users commonly remap them, which would break theme contrast guarantees.
 *
 * Pure functions, no I/O. OKLab math is self-contained, ported from
 * scripts/theme-check.mjs (Björn Ottosson sRGB → OKLab).
 */

export interface OklabColor {
  readonly L: number;
  readonly a: number;
  readonly b: number;
}

function linearize(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function channelsToOklab(r255: number, g255: number, b255: number): OklabColor {
  const r = linearize(r255 / 255);
  const g = linearize(g255 / 255);
  const b = linearize(b255 / 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

const HEX6_RE = /^#?[0-9A-Fa-f]{6}$/;

/** Normalize "#aabbcc" / "AABBCC" to canonical "#AABBCC". Throws on bad input. */
export function normalizeHex(hex: string): string {
  if (!HEX6_RE.test(hex)) {
    throw new Error(`oklab-quantize: invalid 24-bit hex color "${hex}"`);
  }
  const v = hex.startsWith("#") ? hex.slice(1) : hex;
  return `#${v.toUpperCase()}`;
}

/** Parse a normalized 6-digit hex color into 0-255 RGB channels. */
export function hexToRgb255(hex: string): readonly [number, number, number] {
  const v = normalizeHex(hex).slice(1);
  return [
    Number.parseInt(v.slice(0, 2), 16),
    Number.parseInt(v.slice(2, 4), 16),
    Number.parseInt(v.slice(4, 6), 16),
  ];
}

export function hexToOklab(hex: string): OklabColor {
  const [r, g, b] = hexToRgb255(hex);
  return channelsToOklab(r, g, b);
}

interface PaletteEntry {
  readonly index: number;
  readonly lab: OklabColor;
}

// xterm 6x6x6 color-cube channel levels (indexes 16-231).
const CUBE_LEVELS: readonly number[] = [0, 95, 135, 175, 215, 255];

/** Build the OKLab palette for xterm indexes 16-255 (cube + grayscale ramp). */
function buildXtermPalette(): readonly PaletteEntry[] {
  const entries: PaletteEntry[] = [];
  for (let r = 0; r < 6; r++) {
    for (let g = 0; g < 6; g++) {
      for (let b = 0; b < 6; b++) {
        entries.push({
          index: 16 + 36 * r + 6 * g + b,
          lab: channelsToOklab(CUBE_LEVELS[r], CUBE_LEVELS[g], CUBE_LEVELS[b]),
        });
      }
    }
  }
  // Grayscale ramp: indexes 232-255 map to gray levels 8, 18, ..., 238.
  for (let i = 0; i < 24; i++) {
    const v = 8 + 10 * i;
    entries.push({ index: 232 + i, lab: channelsToOklab(v, v, v) });
  }
  return entries;
}

// Precomputed once at module load — this is the "theme build/load time" cost.
const XTERM_PALETTE: readonly PaletteEntry[] = buildXtermPalette();

/**
 * Nearest xterm-256 index (16-255 only) for a 24-bit hex color, measured by
 * Euclidean distance in OKLab.
 */
export function nearestXterm256(hex: string): number {
  const lab = hexToOklab(hex);
  let bestIndex = 16;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const entry of XTERM_PALETTE) {
    const dL = lab.L - entry.lab.L;
    const da = lab.a - entry.lab.a;
    const db = lab.b - entry.lab.b;
    const dist = dL * dL + da * da + db * db;
    if (dist < bestDist) {
      bestDist = dist;
      bestIndex = entry.index;
    }
  }
  return bestIndex;
}

/**
 * Precompute a lookup table mapping each distinct theme color to its nearest
 * xterm-256 index. Keys are normalized hex ("#AABBCC").
 */
export function buildXterm256Lookup(hexes: readonly string[]): ReadonlyMap<string, number> {
  const lookup = new Map<string, number>();
  for (const hex of hexes) {
    const key = normalizeHex(hex);
    if (!lookup.has(key)) {
      lookup.set(key, nearestXterm256(key));
    }
  }
  return lookup;
}
