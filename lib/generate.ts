/**
 * DocBrief generate pipeline (honest MVP):
 * 1. Polish script (OpenAI if key else template polish)
 * 2. TTS (OpenAI audio/speech if key else silent placeholder note)
 * 3. 3–5 B-roll placeholder stills (sharp gradient + caption)
 * 4. Captions .srt / .vtt from script sentences
 * 5. Mux MP4 with ffmpeg if available; else zip assets
 * 6. Caller deducts credits
 */
import fs from "fs";
import path from "path";
import JSZip from "jszip";
import sharp from "sharp";
import { projectDir } from "./paths";
import { ffmpegAvailable, runFfmpeg } from "./ffmpeg";

export type GenerateResult = {
  scriptMd: string;
  audioPath: string | null;
  videoPath: string | null;
  zipPath: string | null;
  renderNote: string;
  stillPaths: string[];
  captionSrt: string;
  captionVtt: string;
};

function sentencesFromScript(script: string): string[] {
  const body = script
    .replace(/^#.+$/gm, "")
    .replace(/\*\*/g, "")
    .replace(/\n+/g, " ")
    .trim();
  const parts = body
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);
  return parts.length ? parts : [body.slice(0, 200) || "DocBrief short documentary."];
}

function templatePolish(brief: string): string {
  const trimmed = brief.trim();
  const title =
    trimmed.split(/[.!?\n]/)[0]?.trim().slice(0, 80) || "Untitled documentary";
  return `# ${title}

## Hook
${trimmed.slice(0, 280)}${trimmed.length > 280 ? "…" : ""}

## Act 1 — Setup
We open on the core question behind this brief. The viewer needs context fast: who cares, why now, and what is at stake.

## Act 2 — Evidence
Walk through the strongest beats from the brief. Prefer concrete numbers, named places, and one surprising contrast. Keep each beat under two sentences for voiceover pacing.

## Act 3 — Payoff
Return to the hook with a clearer answer. Leave the viewer with one memorable takeaway they can repeat.

## Closing
Thanks for watching. If this topic matters to you, the full sources belong in the description — DocBrief does not invent citations.

---
*Polished by DocBrief template (set OPENAI_API_KEY for model polish).*
`;
}

async function openaiPolish(brief: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.6,
        messages: [
          {
            role: "system",
            content:
              "You are DocBrief, a documentary script polisher for faceless YouTube creators. Rewrite the user's rough brief into a clear short-documentary voiceover script in Markdown with Hook / Act 1 / Act 2 / Act 3 / Closing. Keep it under ~650 words. Do not invent fake sources. No multi-character dialogue casting.",
          },
          { role: "user", content: brief },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    return text || null;
  } catch {
    return null;
  }
}

async function openaiTts(text: string, outPath: string): Promise<boolean> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return false;
  try {
    const clipped = text.replace(/[#*_`]/g, "").slice(0, 4000);
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        voice: "onyx",
        input: clipped,
        response_format: "mp3",
      }),
    });
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(outPath, buf);
    return true;
  } catch {
    return false;
  }
}

/** Minimal silent WAV (~2s) so zip always has an audio slot. */
function writeSilentWav(outPath: string, seconds = 2) {
  const sampleRate = 22050;
  const numSamples = sampleRate * seconds;
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  // samples already zeroed
  fs.writeFileSync(outPath, buffer);
}

function formatSrtTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec % 1) * 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

function formatVttTime(sec: number): string {
  return formatSrtTime(sec).replace(",", ".");
}

function buildCaptions(sentences: string[]): { srt: string; vtt: string; duration: number } {
  const per = 3.5;
  let t = 0;
  const srtLines: string[] = [];
  const vttLines: string[] = ["WEBVTT", ""];
  sentences.forEach((sent, i) => {
    const start = t;
    const end = t + per;
    srtLines.push(String(i + 1));
    srtLines.push(`${formatSrtTime(start)} --> ${formatSrtTime(end)}`);
    srtLines.push(sent);
    srtLines.push("");
    vttLines.push(`${formatVttTime(start)} --> ${formatVttTime(end)}`);
    vttLines.push(sent);
    vttLines.push("");
    t = end;
  });
  return { srt: srtLines.join("\n"), vtt: vttLines.join("\n"), duration: Math.max(t, 6) };
}

async function makeStill(
  outPath: string,
  label: string,
  idx: number,
  colors: [string, string],
) {
  const w = 1280;
  const h = 720;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${colors[0]}"/>
      <stop offset="100%" stop-color="${colors[1]}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <rect x="40" y="40" width="${w - 80}" height="${h - 80}" rx="16" fill="rgba(0,0,0,0.35)" stroke="rgba(255,255,255,0.25)" stroke-width="2"/>
  <text x="${w / 2}" y="${h / 2 - 24}" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" fill="#94a3b8">B-roll placeholder ${idx}</text>
  <text x="${w / 2}" y="${h / 2 + 28}" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" font-weight="700" fill="#f8fafc">${escapeXml(label.slice(0, 60))}</text>
  <text x="${w / 2}" y="${h - 72}" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#cbd5e1">DocBrief · replace with your stock / footage</text>
</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(outPath);
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const STILL_COLORS: [string, string][] = [
  ["#0f172a", "#1e3a5f"],
  ["#1a1a2e", "#4a1942"],
  ["#0b3d2e", "#14532d"],
  ["#1c1917", "#7c2d12"],
  ["#172554", "#312e81"],
];

export async function runGenerate(opts: {
  projectId: string;
  brief: string;
}): Promise<GenerateResult> {
  const dir = projectDir(opts.projectId);
  const polished =
    (await openaiPolish(opts.brief)) || templatePolish(opts.brief);
  const scriptPath = path.join(dir, "script.md");
  fs.writeFileSync(scriptPath, polished, "utf8");

  const sentences = sentencesFromScript(polished);
  const { srt, vtt, duration } = buildCaptions(sentences);
  const srtPath = path.join(dir, "captions.srt");
  const vttPath = path.join(dir, "captions.vtt");
  fs.writeFileSync(srtPath, srt, "utf8");
  fs.writeFileSync(vttPath, vtt, "utf8");

  // Stills
  const stillCount = Math.min(5, Math.max(3, Math.ceil(sentences.length / 3)));
  const stillPaths: string[] = [];
  for (let i = 0; i < stillCount; i++) {
    const label = sentences[i % sentences.length].slice(0, 72);
    const p = path.join(dir, `still-${i + 1}.png`);
    await makeStill(p, label, i + 1, STILL_COLORS[i % STILL_COLORS.length]);
    stillPaths.push(p);
  }

  // Audio
  const mp3Path = path.join(dir, "voiceover.mp3");
  const wavPath = path.join(dir, "voiceover-silent.wav");
  let audioPath: string | null = null;
  let audioIsTts = false;
  const ttsOk = await openaiTts(polished, mp3Path);
  if (ttsOk) {
    audioPath = mp3Path;
    audioIsTts = true;
  } else {
    writeSilentWav(wavPath, Math.min(duration, 30));
    audioPath = wavPath;
  }

  // Try MP4 mux
  let videoPath: string | null = null;
  let zipPath: string | null = null;
  let renderNote = "";

  if (ffmpegAvailable() && stillPaths.length > 0 && audioPath) {
    try {
      const outMp4 = path.join(dir, "docbrief.mp4");
      const listFile = path.join(dir, "stills.txt");
      const perStill = Math.max(2, duration / stillPaths.length);
      const listBody = stillPaths
        .map((p) => `file '${p.replace(/'/g, "'\\''")}'\nduration ${perStill.toFixed(2)}`)
        .join("\n");
      // concat demuxer needs last file repeated without duration
      const last = stillPaths[stillPaths.length - 1].replace(/'/g, "'\\''");
      fs.writeFileSync(listFile, listBody + `\nfile '${last}'\n`, "utf8");

      await runFfmpeg([
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        listFile,
        "-i",
        audioPath,
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-shortest",
        "-movflags",
        "+faststart",
        outMp4,
      ]);
      if (fs.existsSync(outMp4) && fs.statSync(outMp4).size > 1000) {
        videoPath = outMp4;
        renderNote = audioIsTts
          ? "MP4 muxed with TTS voiceover + B-roll placeholder stills."
          : "MP4 muxed with silent/placeholder audio (no OPENAI_API_KEY TTS) + B-roll placeholder stills.";
      }
    } catch (e) {
      console.warn("[docbrief generate] ffmpeg mux failed:", e);
    }
  }

  // Always also build a zip of assets (and use as primary download if no MP4)
  const zip = new JSZip();
  zip.file("script.md", polished);
  zip.file("captions.srt", srt);
  zip.file("captions.vtt", vtt);
  zip.file(
    "README.txt",
    [
      "DocBrief asset pack",
      "===================",
      "",
      videoPath
        ? "An MP4 was also produced (docbrief.mp4 in the project download)."
        : "ffmpeg was unavailable or mux failed — this zip is your deliverable.",
      audioIsTts
        ? "voiceover.mp3 = OpenAI TTS"
        : "voiceover-silent.wav = silent placeholder (set OPENAI_API_KEY for TTS)",
      "still-N.png = B-roll PLACEHOLDERS (solid/gradient + caption) — replace with real footage",
      "",
      "DocBrief does not do character-consistent multi-cast GPU video, Seedance/Kling, or YouTube publish.",
      "A WedgeWerks™ product.",
    ].join("\n"),
  );
  if (audioPath && fs.existsSync(audioPath)) {
    zip.file(path.basename(audioPath), fs.readFileSync(audioPath));
  }
  for (const sp of stillPaths) {
    zip.file(path.basename(sp), fs.readFileSync(sp));
  }
  if (videoPath && fs.existsSync(videoPath)) {
    zip.file("docbrief.mp4", fs.readFileSync(videoPath));
  }
  const zipBuf = await zip.generateAsync({ type: "nodebuffer" });
  const zipOut = path.join(dir, "docbrief-assets.zip");
  fs.writeFileSync(zipOut, zipBuf);
  zipPath = zipOut;

  if (!videoPath) {
    renderNote = ffmpegAvailable()
      ? "ffmpeg present but mux failed — download the asset zip (script, audio, stills, captions)."
      : "ffmpeg not available — download the asset zip (script, audio/placeholder, stills, captions). Install @ffmpeg-installer/ffmpeg or system ffmpeg for MP4.";
  }

  return {
    scriptMd: polished,
    audioPath,
    videoPath,
    zipPath,
    renderNote,
    stillPaths,
    captionSrt: srt,
    captionVtt: vtt,
  };
}
