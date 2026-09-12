/**
 * Bundled caption font (Liberation Sans, SIL OFL).
 * Copied to /tmp on serverless so libass/drawtext can read it.
 */
import fs from "fs";
import os from "os";
import path from "path";

const FONT_NAME = "LiberationSans-Regular.ttf";

function candidates(): string[] {
  return [
    path.join(process.cwd(), "assets", "fonts", FONT_NAME),
    path.join(__dirname, "..", "assets", "fonts", FONT_NAME),
  ];
}

export function getFontFile(): string | null {
  let src: string | null = null;
  for (const c of candidates()) {
    try {
      if (fs.existsSync(c)) {
        src = c;
        break;
      }
    } catch {
      /* skip */
    }
  }
  if (!src) return null;

  const onServerless =
    process.env.VERCEL === "1" ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
    process.env.VERCEL_ENV != null;

  if (!onServerless) return src;

  const destDir = path.join(os.tmpdir(), "docbrief-fonts");
  const dest = path.join(destDir, FONT_NAME);
  try {
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    const srcStat = fs.statSync(src);
    if (!(fs.existsSync(dest) && fs.statSync(dest).size === srcStat.size)) {
      fs.copyFileSync(src, dest);
    }
    return dest;
  } catch {
    return src;
  }
}

export function getFontDir(): string | null {
  const f = getFontFile();
  return f ? path.dirname(f) : null;
}
