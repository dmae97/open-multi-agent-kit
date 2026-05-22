/**
 * Appshot store — programmatic screen/window capture with metadata sidecars.
 *
 * All images are saved under .omk/appshots/YYYY-MM-DD/ so they stay
 * gitignored and organized by date. Each capture writes a meta.json sidecar.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync, readFileSync, readdirSync, statSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { createHash } from "node:crypto";
import { getProjectRoot } from "./fs.js";

export const APPSHOT_DIR = ".omk/appshots";
export const MAX_SIZE_BYTES = 20 * 1024 * 1024;
const CAPTURE_TIMEOUT_MS = 15000;
const CAPTURE_MAX_BUFFER_BYTES = MAX_SIZE_BYTES * 2;

export interface AppShotResult {
  ok: boolean;
  path?: string;
  relativePath?: string;
  metadataPath?: string;
  error?: string;
}

export interface AppShotMetadata {
  schemaVersion: 1;
  capturedAt: string;
  platform: NodeJS.Platform;
  captureType: "active-window" | "screen" | "clipboard" | "selection";
  app?: { name?: string; bundleId?: string; pid?: number };
  window?: { title?: string; bounds?: { x: number; y: number; width: number; height: number } };
  cwd: string;
  runId?: string;
  goalId?: string;
  privacy?: { redactionApplied: boolean };
}

export interface CaptureAppShotOptions {
  captureType?: "active-window" | "screen" | "clipboard" | "selection";
  platform?: NodeJS.Platform | string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  runId?: string;
  goalId?: string;
  procVersion?: string;
}

const IMAGE_MAGIC = new Map<string, number[]>([
  ["png", [0x89, 0x50, 0x4e, 0x47]],
  ["jpg", [0xff, 0xd8, 0xff]],
  ["webp", [0x52, 0x49, 0x46, 0x46]], // RIFF
  ["gif", [0x47, 0x49, 0x46, 0x38]], // GIF8
]);

export function validateMagicBytes(buf: Buffer): { ok: boolean; ext: string } {
  for (const [ext, magic] of IMAGE_MAGIC) {
    if (buf.length >= magic.length && magic.every((b, i) => buf[i] === b)) {
      return { ok: true, ext };
    }
  }
  return { ok: false, ext: "" };
}

export function generateAppShotPath(projectRoot: string, ext: string): { fullPath: string; relativePath: string } {
  const now = new Date();
  const dateDir = now.toISOString().slice(0, 10);
  const timestamp = now.toISOString().replace(/[:.]/g, "").slice(0, 15);
  const hash = createHash("sha256").update(`${Date.now()}-${Math.random()}`).digest("hex").slice(0, 8);
  const fileName = `appshot-${timestamp}-${hash}.${ext}`;
  const dir = join(projectRoot, APPSHOT_DIR, dateDir);
  mkdirSync(dir, { recursive: true });
  const fullPath = join(dir, fileName);
  const relativePath = relative(projectRoot, fullPath).replace(/\\/g, "/");
  return { fullPath, relativePath };
}

function buildMetadata(options: CaptureAppShotOptions): AppShotMetadata {
  return {
    schemaVersion: 1,
    capturedAt: new Date().toISOString(),
    platform: (options.platform ?? process.platform) as NodeJS.Platform,
    captureType: options.captureType ?? "active-window",
    cwd: process.cwd(),
    runId: options.runId,
    goalId: options.goalId,
    privacy: { redactionApplied: false },
  };
}

function saveAppShot(data: Buffer, ext: string, projectRoot: string, metadata: AppShotMetadata): AppShotResult {
  if (data.length > MAX_SIZE_BYTES) {
    return { ok: false, error: `Image exceeds ${MAX_SIZE_BYTES / (1024 * 1024)} MB limit` };
  }
  const magic = validateMagicBytes(data);
  if (!magic.ok) {
    return { ok: false, error: "Capture does not contain a valid image (PNG/JPG/WebP/GIF)" };
  }
  const { fullPath, relativePath } = generateAppShotPath(projectRoot, magic.ext);
  writeFileSync(fullPath, data);

  const metaPath = fullPath.replace(/\.[^.]+$/, "") + "-meta.json";
  writeFileSync(metaPath, JSON.stringify(metadata, null, 2) + "\n", "utf-8");

  const result: AppShotResult = {
    ok: true,
    path: fullPath,
    relativePath: `./${relativePath}`,
    metadataPath: metaPath,
  };

  // Fire-and-forget hook emission
  const appshotId = fullPath.replace(/\\/g, "/").split("/").pop()?.replace(/\.[^.]+$/, "") ?? "unknown";
  import("../hooks/hook-bus.js")
    .then(({ emit }) =>
      emit({
        type: "appshot.captured",
        payload: {
          appshotId,
          imagePath: fullPath,
          metadataPath: metaPath,
          goalId: metadata.goalId,
          runId: metadata.runId,
        },
      })
    )
    .catch(() => {
      // ignore hook emission failures
    });

  return result;
}

// ---------------------------------------------------------------------------
// macOS provider
// ---------------------------------------------------------------------------

function readMacOSAppShot(projectRoot: string, options: CaptureAppShotOptions = {}): AppShotResult {
  const captureType = options.captureType ?? "active-window";
  const tmpPath = join(tmpdir(), `omk-appshot-${Date.now()}.png`);
  const metadata = buildMetadata(options);

  try {
    if (captureType === "active-window") {
      execFileSync("screencapture", ["-x", "-w", tmpPath], {
        timeout: options.timeoutMs ?? CAPTURE_TIMEOUT_MS,
        env: options.env ? { ...process.env, ...options.env } : process.env,
      });
    } else if (captureType === "screen") {
      execFileSync("screencapture", ["-x", tmpPath], {
        timeout: options.timeoutMs ?? CAPTURE_TIMEOUT_MS,
        env: options.env ? { ...process.env, ...options.env } : process.env,
      });
    } else if (captureType === "clipboard") {
      return readMacOSClipboardAppShot(projectRoot, options);
    } else {
      // selection — fallback to screen for programmatic capture
      execFileSync("screencapture", ["-x", tmpPath], {
        timeout: options.timeoutMs ?? CAPTURE_TIMEOUT_MS,
        env: options.env ? { ...process.env, ...options.env } : process.env,
      });
      metadata.captureType = "selection";
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  try {
    const buf = readFileSync(tmpPath);
    if (buf.length === 0) {
      return { ok: false, error: "Capture produced empty image" };
    }

    // Attempt to enrich metadata with window title via osascript
    if (captureType === "active-window") {
      try {
        const title = execFileSync("osascript", ["-e", "tell application \"System Events\" to get name of first application process whose frontmost is true"], {
          encoding: "utf-8",
          timeout: 3000,
        }).trim();
        metadata.window = { title };
      } catch {
        // ignore enrichment failure
      }
    }

    return saveAppShot(buf, "png", projectRoot, metadata);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function readMacOSClipboardAppShot(projectRoot: string, options: CaptureAppShotOptions = {}): AppShotResult {
  const metadata = buildMetadata({ ...options, captureType: "clipboard" });
  try {
    const tmpPath = join(tmpdir(), `omk-appshot-${Date.now()}.png`);
    const script = `
      set pngData to the clipboard as «class PNGf»
      set f to open for access POSIX file "${tmpPath}" with write permission
      write pngData to f
      close access f
    `;
    execFileSync("osascript", ["-e", script], { encoding: "utf-8", timeout: options.timeoutMs ?? CAPTURE_TIMEOUT_MS });
    const buf = readFileSync(tmpPath);
    if (buf.length === 0) {
      return { ok: false, error: "Clipboard does not contain an image" };
    }
    return saveAppShot(buf, "png", projectRoot, metadata);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ---------------------------------------------------------------------------
// Windows provider
// ---------------------------------------------------------------------------

function buildWindowsScreenCaptureScript(tmpPath: string): string {
  return `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bitmap = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
$bitmap.Save("${tmpPath}", [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()
`;
}

function buildWindowsActiveWindowCaptureScript(tmpPath: string): string {
  return `
$ErrorActionPreference = 'Stop'
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Drawing;
public class Win32AppShot {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdcBlt, uint nFlags);
  public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
}
"@
Add-Type -AssemblyName System.Drawing
$hwnd = [Win32AppShot]::GetForegroundWindow()
$rect = New-Object Win32AppShot+RECT
[void][Win32AppShot]::GetWindowRect($hwnd, [ref]$rect)
$w = $rect.Right - $rect.Left
$h = $rect.Bottom - $rect.Top
if ($w -le 0 -or $h -le 0) { exit 1 }
$bmp = New-Object System.Drawing.Bitmap($w, $h)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$ hdc = $g.GetHdc()
[void][Win32AppShot]::PrintWindow($hwnd, $hdc, 0)
$g.ReleaseHdc($hdc)
$g.Dispose()
$bmp.Save("${tmpPath}", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
`;
}

function getWindowsPowerShellCommands(env: NodeJS.ProcessEnv = process.env): string[] {
  const explicit = env.OMK_WINDOWS_POWERSHELL_PATH?.trim();
  const candidates = explicit
    ? [explicit]
    : [
        "powershell.exe",
        "pwsh.exe",
        "/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe",
      ];
  return [...new Set(candidates.filter((cmd) => cmd.length > 0))];
}

function execWindowsCaptureScript(command: string, script: string, options: CaptureAppShotOptions = {}): void {
  const encoded = Buffer.from(script, "utf16le").toString("base64");
  execFileSync(command, ["-NoProfile", "-STA", "-EncodedCommand", encoded], {
    encoding: "utf-8",
    timeout: options.timeoutMs ?? CAPTURE_TIMEOUT_MS,
    maxBuffer: CAPTURE_MAX_BUFFER_BYTES,
    windowsHide: true,
    env: options.env ? { ...process.env, ...options.env } : process.env,
  });
}

function readWindowsAppShot(projectRoot: string, options: CaptureAppShotOptions = {}): AppShotResult {
  const captureType = options.captureType ?? "active-window";
  const tmpPath = join(tmpdir(), `omk-appshot-${Date.now()}.png`).replace(/\//g, "\\");
  const metadata = buildMetadata(options);

  if (captureType === "clipboard") {
    return readWindowsClipboardAppShot(projectRoot, options);
  }

  const script = captureType === "active-window"
    ? buildWindowsActiveWindowCaptureScript(tmpPath)
    : buildWindowsScreenCaptureScript(tmpPath);

  let lastError = "Windows capture unavailable";
  for (const command of getWindowsPowerShellCommands(options.env)) {
    try {
      execWindowsCaptureScript(command, script, options);
      const buf = readFileSync(tmpPath);
      if (buf.length === 0) {
        lastError = "Capture produced empty image";
        continue;
      }
      return saveAppShot(buf, "png", projectRoot, metadata);
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  return { ok: false, error: lastError };
}

function readWindowsClipboardAppShot(projectRoot: string, options: CaptureAppShotOptions = {}): AppShotResult {
  const metadata = buildMetadata({ ...options, captureType: "clipboard" });
  const script = `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
if ([System.Windows.Forms.Clipboard]::ContainsImage()) {
  $img = [System.Windows.Forms.Clipboard]::GetImage()
  if ($null -ne $img) {
    $ms = New-Object System.IO.MemoryStream
    try {
      $img.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
      [Console]::Out.Write([Convert]::ToBase64String($ms.ToArray()))
    } finally {
      $ms.Dispose()
      $img.Dispose()
    }
  }
} else {
  exit 1
}
`;
  let lastError = "Clipboard does not contain an image";
  for (const command of getWindowsPowerShellCommands(options.env)) {
    try {
      const encoded = Buffer.from(script, "utf16le").toString("base64");
      const b64 = execFileSync(command, ["-NoProfile", "-STA", "-EncodedCommand", encoded], {
        encoding: "utf-8",
        timeout: options.timeoutMs ?? CAPTURE_TIMEOUT_MS,
        maxBuffer: CAPTURE_MAX_BUFFER_BYTES,
        windowsHide: true,
        env: options.env ? { ...process.env, ...options.env } : process.env,
      }).trim();
      const buf = Buffer.from(b64, "base64");
      if (buf.length === 0) {
        lastError = "Clipboard does not contain an image";
        continue;
      }
      return saveAppShot(buf, "png", projectRoot, metadata);
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  return { ok: false, error: lastError };
}

// ---------------------------------------------------------------------------
// Linux / WSL provider
// ---------------------------------------------------------------------------

export function isWslEnvironment(env: NodeJS.ProcessEnv = process.env, procVersion?: string): boolean {
  if (env.WSL_DISTRO_NAME || env.WSLENV || env.WSL_INTEROP) return true;
  const version = procVersion ?? (() => {
    try {
      return readFileSync("/proc/version", "utf-8");
    } catch {
      return "";
    }
  })();
  return /microsoft|wsl/i.test(version);
}

function readLinuxAppShot(projectRoot: string, options: CaptureAppShotOptions = {}): AppShotResult {
  const captureType = options.captureType ?? "active-window";
  const metadata = buildMetadata(options);

  let wslError: string | undefined;
  if (isWslEnvironment(options.env, options.procVersion)) {
    const windowsResult = readWindowsAppShot(projectRoot, options);
    if (windowsResult.ok) return windowsResult;
    wslError = windowsResult.error;
  }

  if (captureType === "clipboard") {
    return readLinuxClipboardAppShot(projectRoot, options);
  }

  const tmpPath = join(tmpdir(), `omk-appshot-${Date.now()}.png`);

  try {
    if (captureType === "active-window") {
      const commands: [string, string[]][] = [
        ["gnome-screenshot", ["-w", "-f", tmpPath]],
        ["spectacle", ["-a", "-b", "-o", tmpPath]],
        ["import", ["-window", "root", tmpPath]],
      ];
      let lastErr = "";
      for (const [cmd, args] of commands) {
        try {
          execFileSync(cmd, args, {
            timeout: options.timeoutMs ?? CAPTURE_TIMEOUT_MS,
            encoding: "utf-8",
            maxBuffer: CAPTURE_MAX_BUFFER_BYTES,
          });
          const buf = readFileSync(tmpPath);
          if (buf.length > 0) return saveAppShot(buf, "png", projectRoot, metadata);
        } catch (e) {
          lastErr = e instanceof Error ? e.message : String(e);
        }
      }
      const error = wslError ? `Windows capture unavailable (${wslError}); Linux capture unavailable (${lastErr})` : lastErr;
      return { ok: false, error };
    }

    // screen
    const commands: [string, string[]][] = [
      ["grim", [tmpPath]],
      ["import", ["-window", "root", tmpPath]],
    ];
    let lastErr = "";
    for (const [cmd, args] of commands) {
      try {
        execFileSync(cmd, args, {
          timeout: options.timeoutMs ?? CAPTURE_TIMEOUT_MS,
          encoding: "utf-8",
          maxBuffer: CAPTURE_MAX_BUFFER_BYTES,
        });
        const buf = readFileSync(tmpPath);
        if (buf.length > 0) return saveAppShot(buf, "png", projectRoot, metadata);
      } catch (e) {
        lastErr = e instanceof Error ? e.message : String(e);
      }
    }
    const error = wslError ? `Windows capture unavailable (${wslError}); Linux capture unavailable (${lastErr})` : lastErr;
    return { ok: false, error };
  } catch (e) {
    const linuxError = e instanceof Error ? e.message : String(e);
    const error = wslError ? `Windows capture unavailable (${wslError}); Linux capture unavailable (${linuxError})` : linuxError;
    return { ok: false, error };
  }
}

function readLinuxClipboardAppShot(projectRoot: string, options: CaptureAppShotOptions = {}): AppShotResult {
  const metadata = buildMetadata({ ...options, captureType: "clipboard" });
  try {
    let buf: Buffer;
    try {
      buf = execFileSync("wl-paste", ["--type", "image/png"], {
        timeout: options.timeoutMs ?? CAPTURE_TIMEOUT_MS,
        encoding: "buffer",
        maxBuffer: CAPTURE_MAX_BUFFER_BYTES,
      });
    } catch {
      buf = execFileSync("xclip", ["-selection", "clipboard", "-t", "image/png", "-o"], {
        timeout: options.timeoutMs ?? CAPTURE_TIMEOUT_MS,
        encoding: "buffer",
        maxBuffer: CAPTURE_MAX_BUFFER_BYTES,
      });
    }
    if (buf.length === 0) {
      return { ok: false, error: "Clipboard does not contain an image" };
    }
    return saveAppShot(buf, "png", projectRoot, metadata);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function captureAppShot(projectRoot?: string, options: CaptureAppShotOptions = {}): AppShotResult {
  const root = projectRoot ?? getProjectRoot();
  const platform = options.platform ?? process.platform;
  if (platform === "win32") {
    return readWindowsAppShot(root, options);
  }
  if (platform === "darwin") {
    return readMacOSAppShot(root, options);
  }
  return readLinuxAppShot(root, options);
}

export function getAppShotDir(projectRoot?: string): string {
  const root = projectRoot ?? getProjectRoot();
  return join(root, APPSHOT_DIR);
}

export interface AppShotEntry {
  relativePath: string;
  fullPath: string;
  metadataPath: string;
  size: number;
  mtimeMs: number;
}

export function listAppShots(projectRoot?: string): AppShotEntry[] {
  const root = projectRoot ?? getProjectRoot();
  const base = join(root, APPSHOT_DIR);
  if (!existsSync(base)) return [];

  const entries: AppShotEntry[] = [];
  for (const dateDir of readdirSync(base)) {
    const datePath = join(base, dateDir);
    const stat = statSync(datePath, { throwIfNoEntry: false });
    if (!stat || !stat.isDirectory()) continue;
    for (const file of readdirSync(datePath)) {
      if (file.endsWith("-meta.json")) continue;
      const fullPath = join(datePath, file);
      const s = statSync(fullPath, { throwIfNoEntry: false });
      if (!s || !s.isFile()) continue;
      const metaPath = fullPath.replace(/\.[^.]+$/, "") + "-meta.json";
      entries.push({
        relativePath: relative(root, fullPath).replace(/\\/g, "/"),
        fullPath,
        metadataPath: metaPath,
        size: s.size,
        mtimeMs: s.mtimeMs,
      });
    }
  }
  return entries.sort((a, b) => b.mtimeMs - a.mtimeMs);
}

export interface CleanResult {
  deleted: string[];
  skipped: string[];
}

export function cleanAppShots(days: number, dryRun: boolean, projectRoot?: string): CleanResult {
  const root = projectRoot ?? getProjectRoot();
  const base = join(root, APPSHOT_DIR);
  if (!existsSync(base)) return { deleted: [], skipped: [] };

  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const result: CleanResult = { deleted: [], skipped: [] };

  for (const dateDir of readdirSync(base)) {
    const datePath = join(base, dateDir);
    const stat = statSync(datePath, { throwIfNoEntry: false });
    if (!stat || !stat.isDirectory()) continue;

    for (const file of readdirSync(datePath)) {
      const fullPath = join(datePath, file);
      const s = statSync(fullPath, { throwIfNoEntry: false });
      if (!s || !s.isFile()) continue;

      if (s.mtimeMs < cutoff) {
        if (!dryRun) {
          rmSync(fullPath);
        }
        result.deleted.push(relative(root, fullPath).replace(/\\/g, "/"));
      } else {
        result.skipped.push(relative(root, fullPath).replace(/\\/g, "/"));
      }
    }

    // Remove empty date directories
    if (!dryRun && readdirSync(datePath).length === 0) {
      rmSync(datePath, { recursive: true });
    }
  }

  return result;
}
