/**
 * Slideshow MP4 mux: stills + audio + burned-in captions.
 * Primary: ffmpeg concat + libass subtitles (bundled Liberation Sans).
 * Fallbacks: drawtext, plain concat, single still loop.
 * Zip-only is the caller's last resort when this returns ok:false.
 */
import fs from "fs";
import path from "path";
import { escapeFilterPath, ffmpegAvailable, isRealMp4, runFfmpeg } from "./ffmpeg";
import { getFontDir, getFontFile } from "./font";

export type RenderResult = {
  ok: boolean;
  method: string;
  error?: string;
};

function writeConcatList(listFile: string, stills: string[], perStill: number) {
  const lines: string[] = [];
  for (const p of stills) {
    const esc = p.replace(/'/g, "'\\''");
    lines.push(`file '${esc}'`);
    lines.push(`duration ${Math.max(0.4, perStill).toFixed(3)}`);
  }
  const last = stills[stills.length - 1].replace(/'/g, "'\\''");
  lines.push(`file '${last}'`);
  fs.writeFileSync(listFile, lines.join("\n") + "\n", "utf8");
}

function subtitlesVf(srtPath: string): string | null {
  if (!fs.existsSync(srtPath)) return null;
  const srtEsc = escapeFilterPath(srtPath);
  const fontDir = getFontDir();
  const style =
    "FontName=Liberation Sans,FontSize=22,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=1,Alignment=2,MarginV=48";
  if (fontDir) {
    return `fps=25,format=yuv420p,subtitles='${srtEsc}':fontsdir='${escapeFilterPath(fontDir)}':force_style='${style}'`;
  }
  return `fps=25,format=yuv420p,subtitles='${srtEsc}':force_style='${style}'`;
}

function drawtextVf(caption: string): string | null {
  const font = getFontFile();
  if (!font) return null;
  const text = caption
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\u2019")
    .replace(/:/g, "\\:")
    .replace(/\n/g, " ")
    .slice(0, 140);
  return `fps=25,format=yuv420p,drawtext=fontfile='${escapeFilterPath(font)}':text='${text}':fontsize=22:fontcolor=white:borderw=2:bordercolor=black:x=(w-text_w)/2:y=h-72`;
}

async function muxConcat(opts: {
  listFile: string;
  audioPath: string;
  outPath: string;
  vf: string;
}): Promise<void> {
  if (fs.existsSync(opts.outPath)) fs.unlinkSync(opts.outPath);
  await runFfmpeg(
    [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      opts.listFile,
      "-i",
      opts.audioPath,
      "-vf",
      opts.vf,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-ac",
      "2",
      "-ar",
      "44100",
      "-shortest",
      "-movflags",
      "+faststart",
      opts.outPath,
    ],
    110000,
  );
}

async function muxSingle(opts: {
  still: string;
  audioPath: string;
  outPath: string;
  vf: string;
  durationSec: number;
}): Promise<void> {
  if (fs.existsSync(opts.outPath)) fs.unlinkSync(opts.outPath);
  await runFfmpeg(
    [
      "-y",
      "-loop",
      "1",
      "-i",
      opts.still,
      "-i",
      opts.audioPath,
      "-vf",
      opts.vf,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-tune",
      "stillimage",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-ac",
      "2",
      "-ar",
      "44100",
      "-shortest",
      "-t",
      String(Math.max(2, opts.durationSec + 0.3)),
      "-movflags",
      "+faststart",
      opts.outPath,
    ],
    110000,
  );
}

export async function renderSlideshowMp4(opts: {
  stillPaths: string[];
  audioPath: string;
  srtPath: string;
  outPath: string;
  durationSec: number;
  workDir: string;
  /** Optional first-line caption for drawtext fallback. */
  drawtextCaption?: string;
}): Promise<RenderResult> {
  if (!ffmpegAvailable()) {
    return { ok: false, method: "unavailable", error: "ffmpeg not available" };
  }
  const stills = opts.stillPaths.filter((p) => fs.existsSync(p));
  if (!stills.length || !fs.existsSync(opts.audioPath)) {
    return { ok: false, method: "missing-inputs", error: "stills or audio missing" };
  }

  const duration = Math.max(opts.durationSec, 4);
  const perStill = duration / stills.length;
  const listFile = path.join(opts.workDir, "stills.txt");
  writeConcatList(listFile, stills, perStill);

  const attempts: { method: string; run: () => Promise<void> }[] = [];

  const subVf = subtitlesVf(opts.srtPath);
  if (subVf) {
    attempts.push({
      method: "concat+subtitles",
      run: () =>
        muxConcat({
          listFile,
          audioPath: opts.audioPath,
          outPath: opts.outPath,
          vf: subVf,
        }),
    });
  }

  const dtVf = opts.drawtextCaption ? drawtextVf(opts.drawtextCaption) : null;
  if (dtVf) {
    attempts.push({
      method: "concat+drawtext",
      run: () =>
        muxConcat({
          listFile,
          audioPath: opts.audioPath,
          outPath: opts.outPath,
          vf: dtVf,
        }),
    });
  }

  attempts.push({
    method: "concat+audio",
    run: () =>
      muxConcat({
        listFile,
        audioPath: opts.audioPath,
        outPath: opts.outPath,
        vf: "fps=25,format=yuv420p",
      }),
  });

  const singleVf = subVf || dtVf || "fps=25,format=yuv420p";
  attempts.push({
    method: "single-still",
    run: () =>
      muxSingle({
        still: stills[0],
        audioPath: opts.audioPath,
        outPath: opts.outPath,
        vf: singleVf,
        durationSec: duration,
      }),
  });

  let lastError = "";
  for (const attempt of attempts) {
    try {
      await attempt.run();
      if (isRealMp4(opts.outPath)) {
        return { ok: true, method: attempt.method };
      }
      lastError = `${attempt.method}: output was not a valid MP4`;
    } catch (e) {
      const err = e as { stderr?: string; message?: string };
      lastError = `${attempt.method}: ${String(err.stderr || err.message || e).slice(-400)}`;
      console.warn("[docbrief render]", lastError);
    }
  }

  return { ok: false, method: "failed", error: lastError || "all mux attempts failed" };
}
