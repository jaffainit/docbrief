/**
 * DocBrief generate pipeline:
 * 1. Polish script (OpenAI if key else template polish)
 * 2. TTS (OpenAI audio/speech if key else beep+silence placeholder)
 * 3. 3–5 B-roll placeholder stills (sharp gradient + caption)
 * 4. Captions .srt / .vtt from script sentences
 * 5. Mux MP4 (stills + audio + burned-in captions) — primary success path
 * 6. Zip of assets is secondary; zip-only only if ffmpeg is completely unavailable
 * 7. Caller deducts credits
 */
import fs from "fs";
import path from "path";
import JSZip from "jszip";
import sharp from "sharp";
import { projectDir } from "./paths";
import { ffmpegAvailable, probeDuration } from "./ffmpeg";
import { renderSlideshowMp4 } from "./render";

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

const MAX_SENTENCES = 8;
const MAX_AUDIO_SEC = 45;

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
  const all = parts.length ? parts : [body.slice(0, 200) || "DocBrief short documentary."];
  return all.slice(0, MAX_SENTENCES);
}

function templatePolish(brief: string): string {
  const trimmed = brief.trim();
  const title =
    trimmed.split(/[.!?\n]/)[0]?.trim().slice(0, 80) || "Untitled documentary";
  return `# ${title}

## Hook
${trimmed.slice(0, 280)}${trimmed.length > 280 ? "…" : ""}

## Act 1 — Setup
We open on the core question behind this brief. The viewer needs context fast: who cares, why now, and what is at stake — staying inside the same topic and industry the brief names.

## Act 2 — Evidence
Walk through the strongest beats from the brief itself. Prefer concrete details the brief already gives. Keep each beat under two sentences for voiceover pacing. Do not invent a different industry.

## Act 3 — Payoff
Return to the hook with a clearer answer in the brief's own domain. Leave the viewer with one memorable takeaway they can repeat.

## Closing
Thanks for watching. If this topic matters to you, the full sources belong in the description — DocBrief does not invent citations.

---
*Polished by DocBrief template (stays close to your brief).*
`;
}

/** Domains the model sometimes invents when it misreads product metaphors. */
const DRIFT_TERMS = [
  "warehouse",
  "warehouses",
  "freight",
  "cargo",
  "shipping lane",
  "shipping lanes",
  "container ship",
  "container ships",
  "logistics hub",
  "logistics hubs",
  "supply chain",
  "supply-chain",
  "loading dock",
  "loading docks",
  "pallet",
  "pallets",
  "forklift",
  "forklifts",
  "seaport",
  "seaports",
  "ocean freight",
  "truck fleet",
  "trucking company",
];

function normalizeForMatch(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, " ");
}

/** True when polished script invents logistics/freight scenery the brief never asked for. */
function scriptDriftsFromBrief(brief: string, polished: string): boolean {
  const b = normalizeForMatch(brief);
  const p = normalizeForMatch(polished);
  const invented: string[] = [];
  for (const term of DRIFT_TERMS) {
    if (p.includes(term) && !b.includes(term)) invented.push(term);
  }
  // Soft product/startup brief signals — if present, inventing logistics is almost always drift
  const productish =
    /\b(saas|startup|software|app|platform|api|code|developer|product|wedge|b2b|mvp|founder)\b/.test(
      b,
    );
  if (invented.length >= 2) return true;
  if (productish && invented.length >= 1) return true;
  return false;
}

const POLISH_SYSTEM =
  "You are DocBrief, a documentary script polisher for faceless YouTube creators. Rewrite the user's rough brief into a clear short-documentary voiceover script in Markdown with Hook / Act 1 / Act 2 / Act 3 / Closing. Keep it under ~650 words. Do not invent fake sources. No multi-character dialogue casting.\n\nGROUNDING (critical): Stay strictly on the user's brief topic, industry, and domain. If the brief is about software, startups, products, SaaS, wedges, platforms, or builders, keep that domain — do NOT reinterpret product/startup metaphors as literal logistics, shipping, freight, warehouses, cargo, trucks, ports, or supply-chain operations unless the brief is actually about those. Figurative language ('wedge', 'ship it', 'pipeline', 'freight' as metaphor) must stay figurative in the brief's real industry. Prefer the brief's own nouns and verbs over inventing a new setting.";

const STRICT_POLISH_SYSTEM =
  "You are DocBrief. Rewrite ONLY the user's brief into a short documentary voiceover in Markdown (Hook / Act 1 / Act 2 / Act 3 / Closing), under ~650 words. FAIL CLOSED ON DOMAIN: every act must use the same industry and subject as the brief. Do not introduce warehouses, freight, shipping lanes, cargo, ports, trucks, logistics hubs, or supply-chain scenery unless those words appear as literal topics in the brief. If the brief uses startup/product metaphors, keep the script in that product/startup domain. Do not invent fake sources. Quote or paraphrase the brief's own terms heavily.";

async function callOpenAiPolish(
  brief: string,
  system: string,
  temperature: number,
): Promise<string | null> {
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
        temperature,
        max_tokens: 1800,
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content:
              "Polish this brief into a narrated documentary voiceover script. Stay in the brief's real industry — do not invent a different setting:\n\n" +
              brief.slice(0, 6000),
          },
        ],
      }),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.warn(
        "[docbrief] openaiPolish failed",
        res.status,
        errBody.slice(0, 200),
      );
      return null;
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text || text.length < 80) {
      console.warn("[docbrief] openaiPolish empty/short response");
      return null;
    }
    return text;
  } catch (err) {
    console.warn("[docbrief] openaiPolish error", err);
    return null;
  }
}

/**
 * Polish with OpenAI, ground-check for industry drift, retry once stricter,
 * then fail closed to templatePolish (prefer correct domain over wrong film).
 */
async function openaiPolish(brief: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.warn("[docbrief] OPENAI_API_KEY missing — template polish");
    return null;
  }

  const first = await callOpenAiPolish(brief, POLISH_SYSTEM, 0.55);
  if (!first) return null;

  if (!scriptDriftsFromBrief(brief, first)) {
    return first + "\n\n---\n\n*Polished by DocBrief · gpt-4o-mini.*";
  }

  console.warn(
    "[docbrief] openaiPolish drift detected — retrying with stricter grounding",
  );
  const retry = await callOpenAiPolish(brief, STRICT_POLISH_SYSTEM, 0.2);
  if (retry && !scriptDriftsFromBrief(brief, retry)) {
    return (
      retry +
      "\n\n---\n\n*Polished by DocBrief · gpt-4o-mini (grounded retry).*"
    );
  }

  console.warn(
    "[docbrief] openaiPolish still drifted — failing closed to templatePolish",
  );
  return null;
}

async function openaiTts(text: string, outPath: string): Promise<boolean> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return false;
  try {
    const clipped = text.replace(/[#*_`]/g, "").slice(0, 900);
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

/** Beep every ~4s plus silence so the MP4 has an honest placeholder track. */
function writeBeepWav(outPath: string, seconds: number) {
  const sampleRate = 22050;
  const numSamples = Math.max(sampleRate * 2, Math.round(sampleRate * seconds));
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
  const beepHz = 880;
  const beepLen = Math.round(sampleRate * 0.12);
  const period = Math.round(sampleRate * 4);
  for (let i = 0; i < numSamples; i++) {
    const pos = i % period;
    let sample = 0;
    if (pos < beepLen) {
      sample = Math.round(
        Math.sin((2 * Math.PI * beepHz * pos) / sampleRate) * 0.32 * 32767,
      );
    }
    buffer.writeInt16LE(sample, 44 + i * 2);
  }
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

function buildCaptions(
  sentences: string[],
  totalDuration: number,
): { srt: string; vtt: string; duration: number } {
  const weights = sentences.map((s) => Math.max(s.length, 16));
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const duration = Math.max(totalDuration, 6);
  let t = 0;
  const srtLines: string[] = [];
  const vttLines: string[] = ["WEBVTT", ""];
  sentences.forEach((sent, i) => {
    const start = t;
    const slice = duration * (weights[i] / sum);
    const end = i === sentences.length - 1 ? duration : t + slice;
    srtLines.push(String(i + 1));
    srtLines.push(`${formatSrtTime(start)} --> ${formatSrtTime(end)}`);
    srtLines.push(sent);
    srtLines.push("");
    vttLines.push(`${formatVttTime(start)} --> ${formatVttTime(end)}`);
    vttLines.push(sent);
    vttLines.push("");
    t = end;
  });
  return { srt: srtLines.join("\n"), vtt: vttLines.join("\n"), duration };
}

function wrapCaption(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > maxChars && cur) {
      lines.push(cur);
      cur = w;
      if (lines.length >= maxLines) {
        cur = "";
        break;
      }
    } else {
      cur = next;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  return lines.slice(0, maxLines);
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

async function burnCaptionBar(srcPng: string, destPng: string, caption: string) {
  const lines = wrapCaption(caption, 52, 2);
  const barH = 64 + (lines.length - 1) * 28;
  const lineSvg = lines
    .map(
      (ln, i) =>
        `<text x="640" y="${720 - barH + 38 + i * 28}" text-anchor="middle" font-family="Arial, Liberation Sans, sans-serif" font-size="22" font-weight="600" fill="#f8fafc">${escapeXml(ln)}</text>`,
    )
    .join("");
  const overlay = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
  <rect x="80" y="${720 - barH - 24}" width="1120" height="${barH}" rx="8" fill="rgba(0,0,0,0.72)"/>
  ${lineSvg}
</svg>`;
  const overlayPng = await sharp(Buffer.from(overlay)).png().toBuffer();
  await sharp(srcPng).composite([{ input: overlayPng, top: 0, left: 0 }]).png().toFile(destPng);
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
  const openaiScript = await openaiPolish(opts.brief);
  const polishSource = openaiScript ? "openai" : "template";
  const polished = openaiScript || templatePolish(opts.brief);
  console.info("[docbrief] script polish:", polishSource);
  const scriptPath = path.join(dir, "script.md");
  fs.writeFileSync(scriptPath, polished, "utf8");

  const sentences = sentencesFromScript(polished);
  const estimated = Math.min(MAX_AUDIO_SEC, Math.max(6, sentences.length * 3.5));

  const stillCount = Math.min(5, Math.max(3, Math.ceil(sentences.length / 2)));
  const stillPaths: string[] = [];
  for (let i = 0; i < stillCount; i++) {
    const label = sentences[i % sentences.length].slice(0, 72);
    const p = path.join(dir, `still-${i + 1}.png`);
    await makeStill(p, label, i + 1, STILL_COLORS[i % STILL_COLORS.length]);
    stillPaths.push(p);
  }

  const mp3Path = path.join(dir, "voiceover.mp3");
  const wavPath = path.join(dir, "voiceover-beep.wav");
  let audioPath: string | null = null;
  let audioIsTts = false;
  const voText = sentences.join(" ");
  const ttsOk = await openaiTts(voText, mp3Path);
  if (ttsOk) {
    audioPath = mp3Path;
    audioIsTts = true;
  } else {
    writeBeepWav(wavPath, estimated);
    audioPath = wavPath;
  }

  let audioDur = (await probeDuration(audioPath)) ?? estimated;
  if (!Number.isFinite(audioDur) || audioDur < 2) audioDur = estimated;
  audioDur = Math.min(Math.max(audioDur, 6), MAX_AUDIO_SEC);
  if (!audioIsTts) {
    writeBeepWav(wavPath, audioDur);
    audioPath = wavPath;
  }

  const { srt, vtt, duration } = buildCaptions(sentences, audioDur);
  const srtPath = path.join(dir, "captions.srt");
  const vttPath = path.join(dir, "captions.vtt");
  fs.writeFileSync(srtPath, srt, "utf8");
  fs.writeFileSync(vttPath, vtt, "utf8");

  let videoPath: string | null = null;
  let zipPath: string | null = null;
  let renderNote = "";
  let muxMethod = "";

  if (ffmpegAvailable() && stillPaths.length > 0 && audioPath) {
    const outMp4 = path.join(dir, "docbrief.mp4");
    let mux = await renderSlideshowMp4({
      stillPaths,
      audioPath,
      srtPath,
      outPath: outMp4,
      durationSec: duration,
      workDir: dir,
      drawtextCaption: sentences[0],
    });

    if (!mux.ok || mux.method === "concat+audio") {
      const captioned: string[] = [];
      for (let i = 0; i < sentences.length; i++) {
        const src = stillPaths[i % stillPaths.length];
        const dest = path.join(dir, `captioned-${i + 1}.png`);
        await burnCaptionBar(src, dest, sentences[i]);
        captioned.push(dest);
      }
      mux = await renderSlideshowMp4({
        stillPaths: captioned,
        audioPath,
        srtPath,
        outPath: outMp4,
        durationSec: duration,
        workDir: dir,
      });
      if (mux.ok) muxMethod = `${mux.method}+sharp-captions`;
    } else if (mux.ok) {
      muxMethod = mux.method;
    }

    if (mux.ok) {
      videoPath = outMp4;
      const captionHow = muxMethod.includes("subtitles")
        ? "burned-in captions (ffmpeg subtitles)"
        : muxMethod.includes("drawtext")
          ? "burned-in captions (ffmpeg drawtext)"
          : muxMethod.includes("sharp")
            ? "burned-in captions (composited on stills)"
            : "captions (see SRT in the asset zip)";
      renderNote = audioIsTts
        ? `MP4 with TTS voiceover, B-roll placeholder stills, and ${captionHow}.`
        : `MP4 with placeholder beep track (no OPENAI_API_KEY TTS), B-roll placeholder stills, and ${captionHow}.`;
    } else {
      console.warn("[docbrief generate] mux failed:", mux.error);
    }
  }

  const zip = new JSZip();
  zip.file("script.md", polished);
  zip.file("captions.srt", srt);
  zip.file("captions.vtt", vtt);
  zip.file(
    "README.txt",
    [
      "DocBrief asset pack (secondary download)",
      "======================================",
      "",
      videoPath
        ? "Primary deliverable is docbrief.mp4 (also on the project page)."
        : "ffmpeg was unavailable or every mux attempt failed — this zip is the fallback.",
      audioIsTts
        ? "voiceover.mp3 = OpenAI TTS"
        : "voiceover-beep.wav = placeholder beep track (set OPENAI_API_KEY for TTS)",
      "still-N.png = B-roll PLACEHOLDERS (gradient + label) — replace with real footage",
      "captions.srt / captions.vtt = timed captions (also burned into the MP4 when ffmpeg works)",
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
      ? "ffmpeg present but every mux attempt failed — download the asset zip (script, audio, stills, captions). MP4 is the intended primary path."
      : "ffmpeg not available — download the asset zip only. Install @ffmpeg-installer/ffmpeg or system ffmpeg for MP4.";
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
