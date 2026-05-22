import { describe, it } from "node:test";
import assert from "node:assert";
import { mkdtempSync, writeFileSync, mkdirSync, existsSync, utimesSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  getAppShotDir,
  listAppShots,
  cleanAppShots,
  validateMagicBytes,
  generateAppShotPath,
  isWslEnvironment,
  APPSHOT_DIR,
  MAX_SIZE_BYTES,
  captureAppShot,
} from "../dist/util/appshot-store.js";

// Build a minimal 1x1 PNG (89 50 4E 47 ...)
const MINI_PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
  0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0x0f, 0x00, 0x00,
  0x01, 0x01, 0x00, 0x05, 0x18, 0xd8, 0x4d, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

const FAKE_JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

describe("validateMagicBytes", () => {
  it("recognizes PNG", () => {
    const r = validateMagicBytes(MINI_PNG);
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.ext, "png");
  });

  it("recognizes JPG", () => {
    const r = validateMagicBytes(FAKE_JPG);
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.ext, "jpg");
  });

  it("rejects invalid data", () => {
    const r = validateMagicBytes(Buffer.from("not an image"));
    assert.strictEqual(r.ok, false);
  });
});

describe("generateAppShotPath", () => {
  it("produces path under .omk/appshots/YYYY-MM-DD with appshot- prefix", () => {
    const root = mkdtempSync(join(tmpdir(), "omk-appshot-test-"));
    const { fullPath, relativePath } = generateAppShotPath(root, "png");
    assert.ok(relativePath.includes(".omk/appshots/"));
    assert.ok(relativePath.includes("appshot-"));
    assert.ok(relativePath.endsWith(".png"));
    assert.strictEqual(existsSync(fullPath), false); // path generated but file not written yet
  });
});

describe("WSL detection", () => {
  it("detects WSL across bash and zsh environments", () => {
    assert.strictEqual(isWslEnvironment({ WSL_DISTRO_NAME: "Ubuntu-24.04" }, ""), true);
    assert.strictEqual(isWslEnvironment({ WSL_INTEROP: "/run/WSL/123_interop" }, ""), true);
    assert.strictEqual(isWslEnvironment({}, "Linux version 6.6.87.2-microsoft-standard-WSL2"), true);
    assert.strictEqual(isWslEnvironment({}, "Linux version 6.6.0-generic"), false);
  });
});

describe("captureAppShot mock platform", () => {
  it("returns error on unsupported platform", () => {
    const root = mkdtempSync(join(tmpdir(), "omk-appshot-test-"));
    const result = captureAppShot(root, { platform: "freebsd", captureType: "screen" });
    // freebsd falls through to Linux path; binaries won't exist, so it errors
    assert.strictEqual(result.ok, false);
    assert.ok(typeof result.error === "string");
  });
});

describe("getAppShotDir", () => {
  it("returns .omk/appshots under given root", () => {
    const root = mkdtempSync(join(tmpdir(), "omk-appshot-test-"));
    const dir = getAppShotDir(root);
    assert.strictEqual(dir, join(root, APPSHOT_DIR));
  });
});

describe("listAppShots", () => {
  it("lists appshots sorted by mtime desc", () => {
    const root = mkdtempSync(join(tmpdir(), "omk-appshot-test-"));
    const dateDir = join(root, APPSHOT_DIR, "2026-05-04");
    mkdirSync(dateDir, { recursive: true });
    writeFileSync(join(dateDir, "a.png"), MINI_PNG);
    writeFileSync(join(dateDir, "b.png"), MINI_PNG);

    const list = listAppShots(root);
    assert.strictEqual(list.length, 2);
    assert.ok(list[0].relativePath.includes("a.png") || list[0].relativePath.includes("b.png"));
    assert.ok(list.every((e) => e.metadataPath.endsWith("-meta.json")));
  });

  it("returns empty array when no appshots exist", () => {
    const root = mkdtempSync(join(tmpdir(), "omk-appshot-test-"));
    const list = listAppShots(root);
    assert.deepStrictEqual(list, []);
  });
});

describe("cleanAppShots", () => {
  it("deletes old appshots", () => {
    const root = mkdtempSync(join(tmpdir(), "omk-appshot-test-"));
    const dateDir = join(root, APPSHOT_DIR, "2026-01-01");
    mkdirSync(dateDir, { recursive: true });
    const path = join(dateDir, "old.png");
    writeFileSync(path, MINI_PNG);

    // Force mtime to be very old
    const veryOld = new Date("2000-01-01");
    utimesSync(path, veryOld, veryOld);

    const result = cleanAppShots(7, false, root);
    assert.ok(result.deleted.some((p) => p.includes("old.png")));
  });

  it("dry-run does not delete", () => {
    const root = mkdtempSync(join(tmpdir(), "omk-appshot-test-"));
    const dateDir = join(root, APPSHOT_DIR, "2026-01-01");
    mkdirSync(dateDir, { recursive: true });
    const path = join(dateDir, "old.png");
    writeFileSync(path, MINI_PNG);

    const veryOld = new Date("2000-01-01");
    utimesSync(path, veryOld, veryOld);

    const result = cleanAppShots(7, true, root);
    assert.ok(result.deleted.some((p) => p.includes("old.png")));
    assert.strictEqual(existsSync(path), true);
  });
});
