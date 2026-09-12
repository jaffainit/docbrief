/**
 * Resolve a runnable ffmpeg binary (bundled via @ffmpeg-installer/ffmpeg).
 * Same pattern as VecClip: on serverless, copy to /tmp and chmod +x.
 */
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import os from "os";
import path from "path";

const execFileAsync = promisify(execFile);

let resolvedPath: string | null = null;
let available: boolean | null = null;

function installerPath(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg") as {
      path?: string;
      default?: { path: string };
    };
    return ffmpegInstaller.path || ffmpegInstaller.default?.path || null;
  } catch {
    return null;
  }
}

export function getFfmpegPath(): string | null {
  if (resolvedPath) return resolvedPath;
  const src = installerPath();
  if (!src || !fs.existsSync(/*turbopackIgnore: true*/ src)) {
    resolvedPath = null;
    return null;
  }

  const onServerless =
    process.env.VERCEL === "1" ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
    process.env.VERCEL_ENV != null;

  if (!onServerless) {
    resolvedPath = src;
    return resolvedPath;
  }

  const dest = path.join(os.tmpdir(), "docbrief-ffmpeg");
  try {
    const srcStat = fs.statSync(/*turbopackIgnore: true*/ src);
    let needsCopy = true;
    if (fs.existsSync(/*turbopackIgnore: true*/ dest)) {
      const destStat = fs.statSync(/*turbopackIgnore: true*/ dest);
      if (destStat.size === srcStat.size) needsCopy = false;
    }
    if (needsCopy) fs.copyFileSync(/*turbopackIgnore: true*/ src, /*turbopackIgnore: true*/ dest);
    fs.chmodSync(/*turbopackIgnore: true*/ dest, 0o755);
    resolvedPath = dest;
  } catch {
    resolvedPath = src;
  }
  return resolvedPath;
}

export function ffmpegAvailable(): boolean {
  if (available != null) return available;
  available = Boolean(getFfmpegPath());
  return available;
}

export async function runFfmpeg(args: string[], timeoutMs = 180000) {
  const bin = getFfmpegPath();
  if (!bin) throw new Error("ffmpeg not available");
  return execFileAsync(bin, args, {
    timeout: timeoutMs,
    maxBuffer: 40 * 1024 * 1024,
  });
}

/** Escape a filesystem path for use inside an ffmpeg filtergraph. */
export function escapeFilterPath(p: string): string {
  return p.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'");
}

/** Probe duration from ffmpeg stderr (no ffprobe binary). */
export async function probeDuration(filePath: string): Promise<number | null> {
  try {
    await runFfmpeg(["-i", filePath], 20000);
  } catch (e: unknown) {
    const err = e as { stderr?: string; message?: string };
    const stderr = String(err.stderr || err.message || "");
    const m = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
    if (m) {
      const sec = Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
      if (Number.isFinite(sec) && sec > 0) return sec;
    }
  }
  return null;
}

export function isRealMp4(filePath: string): boolean {
  if (!fs.existsSync(filePath)) return false;
  if (fs.statSync(filePath).size < 2000) return false;
  const fd = fs.openSync(filePath, "r");
  const buf = Buffer.alloc(12);
  fs.readSync(fd, buf, 0, 12, 0);
  fs.closeSync(fd);
  return buf.toString("ascii", 4, 8) === "ftyp";
}
