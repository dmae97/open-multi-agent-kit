/**
 * Cross-platform clipboard image reader.
 *
 * Wraps the platform-specific clipboard reading from screenshot-store patterns
 * into a reusable utility for the chat REPL, goal commands, and any input
 * surface that needs Ctrl+V / paste image support.
 *
 * Platforms:
 * - macOS: `pngpaste -` (brew) or `osascript` with TIFF→PNG conversion
 * - Linux: `xclip -selection clipboard -target image/png`
 * - Windows: PowerShell System.Windows.Forms.Clipboard
 *
 * Output: PNG Buffer + saved file path under .omk/screenshots/
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync, unlinkSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, relative } from "node:path";

export const SCREENSHOT_DIR = ".omk/screenshots";
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const CLIPBOARD_TIMEOUT_MS = 5000;
const CLIPBOARD_MAX_BUFFER = MAX_IMAGE_BYTES * 2;

export interface ClipboardImage {
  ok: boolean;
  /** Absolute path to the saved PNG/JPG/WebP/GIF file. */
  path?: string;
  /** Project-relative path (e.g. .omk/screenshots/2026-06-08/screenshot-....png). */
  relativePath?: string;
  /** Base64 data URI suitable for wire protocol image_url. */
  dataUri?: string;
  /** Base64 raw (no prefix). */
  base64?: string;
  /** Detected extension: png, jpg, webp, gif. */
  ext?: string;
  /** Error message when ok=false. */
  error?: string;
}

const IMAGE_MAGIC: ReadonlyArray<[string, number[]]> = [
  ["png", [0x89, 0x50, 0x4e, 0x47]],
  ["jpg", [0xff, 0xd8, 0xff]],
  ["webp", [0x52, 0x49, 0x46, 0x46]],
  ["gif", [0x47, 0x49, 0x46, 0x38]],
];

export function detectImageExt(buf: Buffer): string | null {
  for (const [ext, magic] of IMAGE_MAGIC) {
    if (buf.length >= magic.length && magic.every((b, i) => buf[i] === b)) {
      return ext;
    }
  }
  return null;
}

function mimeTypeForExt(ext: string): string {
  switch (ext) {
    case "png": return "image/png";
    case "jpg": return "image/jpeg";
    case "webp": return "image/webp";
    case "gif": return "image/gif";
    default: return "application/octet-stream";
  }
}

export function toDataUri(base64: string, ext: string): string {
  return `data:${mimeTypeForExt(ext)};base64,${base64}`;
}

function generatePath(projectRoot: string, ext: string): { fullPath: string; relativePath: string } {
  const dateDir = new Date().toISOString().slice(0, 10);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "").slice(0, 15);
  const hash = createHash("sha256").update(`${Date.now()}-${Math.random()}`).digest("hex").slice(0, 8);
  const fileName = `screenshot-${timestamp}-${hash}.${ext}`;
  const dir = join(projectRoot, SCREENSHOT_DIR, dateDir);
  mkdirSync(dir, { recursive: true });
  const fullPath = join(dir, fileName);
  const relativePath = relative(projectRoot, fullPath).replace(/\\/g, "/");
  return { fullPath, relativePath };
}

// ── Platform readers ────────────────────────────────────────────────────────

function readMacClipboard(): Buffer | null {
  // Try pngpaste first (faster, more reliable)
  try {
    const out = execFileSync("pngpaste", ["-"], {
      timeout: CLIPBOARD_TIMEOUT_MS,
      maxBuffer: CLIPBOARD_MAX_BUFFER,
      stdio: ["pipe", "pipe", "pipe"],
    });
    if (out.length > 0) return out;
  } catch {
    // pngpaste not installed or clipboard empty
  }

  // Fallback: osascript (handles TIFF → PNG conversion)
  try {
    const script = `
      set theFile to (POSIX path of (path to temporary items) & "omk-clip-" & (random number from 100000 to 999999) & ".png")
      set img to the clipboard as «class PNGf»
      set fRef to open for access POSIX file theFile with write permission
      write img to fRef
      close access fRef
      return theFile
    `;
    const filePath = execFileSync("osascript", ["-e", script], {
      timeout: CLIPBOARD_TIMEOUT_MS,
      encoding: "utf-8",
    }).trim();
    if (filePath) {
      const buf = readFileSync(filePath);
      try { unlinkSync(filePath); } catch { /* ignore */ }
      if (buf.length > 0) return buf;
    }
  } catch {
    // osascript failed
  }

  return null;
}

function readLinuxClipboard(): Buffer | null {
  try {
    const out = execFileSync("xclip", ["-selection", "clipboard", "-target", "image/png", "-o"], {
      timeout: CLIPBOARD_TIMEOUT_MS,
      maxBuffer: CLIPBOARD_MAX_BUFFER,
      stdio: ["pipe", "pipe", "pipe"],
    });
    if (out.length > 0) return out;
  } catch {
    // xclip not available
  }

  // Fallback: wl-paste (Wayland)
  try {
    const out = execFileSync("wl-paste", ["--type", "image/png"], {
      timeout: CLIPBOARD_TIMEOUT_MS,
      maxBuffer: CLIPBOARD_MAX_BUFFER,
      stdio: ["pipe", "pipe", "pipe"],
    });
    if (out.length > 0) return out;
  } catch {
    // wl-paste not available
  }

  return null;
}

function readWindowsClipboard(): Buffer | null {
  const script = `
$ErrorActionPreference = 'SilentlyContinue'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

function Emit-Bytes([byte[]]$Bytes) {
  if ($null -eq $Bytes -or $Bytes.Length -eq 0) { exit 1 }
  [Console]::OpenStandardOutput().Write($Bytes, 0, $Bytes.Length)
  exit 0
}

# Try PNG format first
$data = [System.Windows.Forms.Clipboard]::GetDataObject()
if ($null -ne $data) {
  foreach ($format in @('PNG', 'image/png')) {
    if ($data.GetDataPresent($format)) {
      $raw = $data.GetData($format)
      if ($raw -is [System.IO.MemoryStream]) { Emit-Bytes $raw.ToArray() }
      if ($raw -is [byte[]]) { Emit-Bytes $raw }
    }
  }
  # File drop (screenshot tool saves to file then copies path)
  if ($data.GetDataPresent([System.Windows.Forms.DataFormats]::FileDrop)) {
    $files = [string[]]$data.GetData([System.Windows.Forms.DataFormats]::FileDrop)
    foreach ($file in $files) {
      if ($file -match '[.](png|jpg|jpeg|webp|gif)$' -and [System.IO.File]::Exists($file)) {
        Emit-Bytes ([System.IO.File]::ReadAllBytes($file))
      }
    }
  }
}

# Fallback: GetImage
if ([System.Windows.Forms.Clipboard]::ContainsImage()) {
  $img = [System.Windows.Forms.Clipboard]::GetImage()
  if ($null -ne $img) {
    $ms = New-Object System.IO.MemoryStream
    try {
      $img.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
      Emit-Bytes $ms.ToArray()
    } finally {
      $ms.Dispose()
      $img.Dispose()
    }
  }
}
exit 1
`;
  try {
    const out = execFileSync("powershell.exe", ["-NoProfile", "-Command", "-"], {
      input: script,
      timeout: CLIPBOARD_TIMEOUT_MS,
      maxBuffer: CLIPBOARD_MAX_BUFFER,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    if (out.length > 0) return out;
  } catch {
    // PowerShell failed
  }
  return null;
}

/**
 * Read an image from the system clipboard. Returns null if clipboard is empty
 * or contains no image. Platform-specific: macOS (pngpaste/osascript), Linux
 * (xclip/wl-paste), Windows (PowerShell).
 */
export function readClipboardImage(platform: NodeJS.Platform = process.platform): Buffer | null {
  switch (platform) {
    case "darwin": return readMacClipboard();
    case "linux": return readLinuxClipboard();
    case "win32": return readWindowsClipboard();
    default: return null;
  }
}

// ── High-level API ──────────────────────────────────────────────────────────

/**
 * Read clipboard image, validate, save to .omk/screenshots/, and return
 * both the file path and base64 data URI for wire protocol use.
 */
export function pasteClipboardImage(projectRoot: string): ClipboardImage {
  const buf = readClipboardImage();
  if (!buf || buf.length === 0) {
    return { ok: false, error: "No image found in clipboard" };
  }
  if (buf.length > MAX_IMAGE_BYTES) {
    return { ok: false, error: `Clipboard image exceeds ${MAX_IMAGE_BYTES / (1024 * 1024)} MB` };
  }
  const ext = detectImageExt(buf);
  if (!ext) {
    return { ok: false, error: "Clipboard content is not a recognized image format (PNG/JPG/WebP/GIF)" };
  }

  const { fullPath, relativePath } = generatePath(projectRoot, ext);
  writeFileSync(fullPath, buf);
  const base64 = buf.toString("base64");

  return {
    ok: true,
    path: fullPath,
    relativePath: `./${relativePath}`,
    dataUri: toDataUri(base64, ext),
    base64,
    ext,
  };
}

/**
 * Read an image file from disk, validate, and return base64 data URI.
 * Used for --image <file> flag support.
 */
export function readImageFile(filePath: string): ClipboardImage {
  if (!existsSync(filePath)) {
    return { ok: false, error: `File not found: ${filePath}` };
  }
  const buf = readFileSync(filePath);
  if (buf.length > MAX_IMAGE_BYTES) {
    return { ok: false, error: `File exceeds ${MAX_IMAGE_BYTES / (1024 * 1024)} MB` };
  }
  const ext = detectImageExt(buf);
  if (!ext) {
    return { ok: false, error: "File is not a recognized image format (PNG/JPG/WebP/GIF)" };
  }
  const base64 = buf.toString("base64");
  return {
    ok: true,
    path: filePath,
    dataUri: toDataUri(base64, ext),
    base64,
    ext,
  };
}
