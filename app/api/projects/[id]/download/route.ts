import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { projectDir } from "@/lib/paths";
import { isRemoteUrl } from "@/lib/blob";

const ALLOWED = new Set([
  "script.md",
  "captions.srt",
  "captions.vtt",
  "voiceover.mp3",
  "voiceover-silent.wav",
  "voiceover-beep.wav",
  "docbrief.mp4",
  "docbrief-assets.zip",
  "still-1.png",
  "still-2.png",
  "still-3.png",
  "still-4.png",
  "still-5.png",
  "README.txt",
]);

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const project = await prisma.project.findFirst({
    where: { id, userId: user.id },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const url = new URL(req.url);
  const file = url.searchParams.get("file") || "docbrief-assets.zip";
  const base = path.basename(file);
  if (!ALLOWED.has(base) && !/^still-\d+\.png$/.test(base) && !/^captioned-\d+\.png$/.test(base)) {
    return NextResponse.json({ error: "File not allowed" }, { status: 400 });
  }

  // Prefer durable Blob URLs stored on the project when local FS is gone.
  const remoteCandidates = [project.videoUrl, project.audioUrl, project.zipUrl].filter(
    (u): u is string => Boolean(u && isRemoteUrl(u)),
  );
  for (const remote of remoteCandidates) {
    if (remote.includes(encodeURIComponent(base)) || remote.endsWith("/" + base) || remote.includes("/" + base)) {
      return NextResponse.redirect(remote);
    }
  }

  const full = path.join(projectDir(id), base);
  if (!fs.existsSync(full)) {
    return NextResponse.json({ error: "File missing" }, { status: 404 });
  }

  const buf = fs.readFileSync(full);
  const ext = path.extname(base).toLowerCase();
  const types: Record<string, string> = {
    ".md": "text/markdown; charset=utf-8",
    ".srt": "application/x-subrip; charset=utf-8",
    ".vtt": "text/vtt; charset=utf-8",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".mp4": "video/mp4",
    ".zip": "application/zip",
    ".png": "image/png",
    ".txt": "text/plain; charset=utf-8",
  };
  return new NextResponse(buf, {
    headers: {
      "Content-Type": types[ext] || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${base}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
