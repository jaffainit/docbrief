import { NextResponse } from "next/server";
import path from "path";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CREDITS_PER_RENDER } from "@/lib/plans";
import { runGenerate } from "@/lib/generate";
import { publicUploadUrl } from "@/lib/paths";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const project = await prisma.project.findFirst({
    where: { id, userId: user.id },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (user.credits < CREDITS_PER_RENDER) {
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

    const audioUrl = result.audioPath
      ? publicUploadUrl(id, path.basename(result.audioPath))
      : null;
    const videoUrl = result.videoPath
      ? publicUploadUrl(id, path.basename(result.videoPath))
      : null;
    const zipUrl = result.zipPath
      ? publicUploadUrl(id, path.basename(result.zipPath))
      : null;

    const [updatedProject] = await prisma.$transaction([
      prisma.project.update({
        where: { id },
        data: {
          status: "done",
          scriptMd: result.scriptMd,
          audioUrl,
          videoUrl,
          zipUrl,
          renderNote: result.renderNote,
          creditsUsed: CREDITS_PER_RENDER,
        },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { credits: { decrement: CREDITS_PER_RENDER } },
      }),
    ]);

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
