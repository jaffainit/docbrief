import { NextResponse } from "next/server";
import path from "path";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CREDITS_PER_RENDER } from "@/lib/plans";
import { runGenerate } from "@/lib/generate";
import { publicUploadUrl } from "@/lib/paths";
import { blobEnabled, putLocalFile } from "@/lib/blob";

export const runtime = "nodejs";
export const maxDuration = 120;

function contentTypeFor(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const types: Record<string, string> = {
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".mp4": "video/mp4",
    ".zip": "application/zip",
    ".png": "image/png",
    ".md": "text/markdown; charset=utf-8",
  };
  return types[ext] || "application/octet-stream";
}

async function durableUrl(
  projectId: string,
  localPath: string | null,
): Promise<string | null> {
  if (!localPath) return null;
  const base = path.basename(localPath);
  if (blobEnabled()) {
    return putLocalFile(
      `docbrief/${projectId}/${base}`,
      localPath,
      contentTypeFor(base),
    );
  }
  return publicUploadUrl(projectId, base);
}

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.emailVerifiedAt) {
    return NextResponse.json(
      { error: "Confirm your email first", code: "EMAIL_UNVERIFIED" },
      { status: 403 },
    );
  }
  const { id } = await ctx.params;

  const project = await prisma.project.findFirst({
    where: { id, userId: user.id },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ownerUnlimited = user.plan === "owner";
  if (!ownerUnlimited && user.credits < CREDITS_PER_RENDER) {
    return NextResponse.json(
      {
        error: "Insufficient credits",
        message: `This render costs ${CREDITS_PER_RENDER} credit. You have ${user.credits}. Upgrade on Billing.`,
        credits: user.credits,
        cost: CREDITS_PER_RENDER,
      },
      { status: 402 },
    );
  }

  if (project.status === "running") {
    return NextResponse.json({ error: "Already generating" }, { status: 409 });
  }

  await prisma.project.update({
    where: { id },
    data: { status: "running", errorMsg: null },
  });

  try {
    const result = await runGenerate({ projectId: id, brief: project.brief });

    const [audioUrl, videoUrl, zipUrl] = await Promise.all([
      durableUrl(id, result.audioPath),
      durableUrl(id, result.videoPath),
      durableUrl(id, result.zipPath),
    ]);

    const updatedProject = await prisma.$transaction(async (tx) => {
      const projectUpdate = await tx.project.update({
        where: { id },
        data: {
          status: "done",
          scriptMd: result.scriptMd,
          audioUrl,
          videoUrl,
          zipUrl,
          renderNote: result.renderNote,
          creditsUsed: ownerUnlimited ? 0 : CREDITS_PER_RENDER,
        },
      });
      if (!ownerUnlimited) {
        await tx.user.update({
          where: { id: user.id },
          data: { credits: { decrement: CREDITS_PER_RENDER } },
        });
      }
      return projectUpdate;
    });

    const fresh = await prisma.user.findUnique({ where: { id: user.id } });
    return NextResponse.json({
      project: updatedProject,
      creditsRemaining: fresh?.credits ?? 0,
      cost: CREDITS_PER_RENDER,
      renderNote: result.renderNote,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Generate failed";
    await prisma.project.update({
      where: { id },
      data: { status: "failed", errorMsg: msg },
    });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
