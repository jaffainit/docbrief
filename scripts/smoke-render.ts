/**
 * Local MP4 smoke: brief → stills + beep + burned captions → docbrief.mp4
 * Does not load .env.local (no TTS spend). Exits 1 if mux fails.
 */
import fs from "fs";
import path from "path";
import { runGenerate } from "../lib/generate";
import { isRealMp4 } from "../lib/ffmpeg";

// Beep-track path only — do not spend TTS credits in CI/smoke.
delete process.env.OPENAI_API_KEY;

const projectId = "smoke-local";
const brief =
  "A short documentary about why the Thames Barrier exists. Cover the 1953 North Sea flood, the 1980s build across the Woolwich Reach, and what rising seas mean for London. Keep it under a minute.";

const result = await runGenerate({ projectId, brief });

const video = result.videoPath;
const ok = Boolean(video && isRealMp4(video));
const size = video && fs.existsSync(video) ? fs.statSync(video).size : 0;

console.log("videoPath", video);
console.log("zipPath", result.zipPath);
console.log("audioPath", result.audioPath);
console.log("size", size);
console.log("note", result.renderNote);
console.log("mp4", ok ? "OK" : "FAIL");

if (!ok) {
  process.exit(1);
}

const dest = path.resolve(video!);
if (!dest.endsWith(".mp4")) {
  console.error("FAIL: videoPath is not an .mp4");
  process.exit(1);
}
