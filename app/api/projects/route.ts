import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ projects });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const brief = String(body.brief || "").trim();
  const title =
    String(body.title || "").trim() ||
    brief.split(/[.!?\n]/)[0]?.trim().slice(0, 60) ||
    "Untitled brief";

  if (brief.length < 20) {
    return NextResponse.json(
      { error: "Brief must be at least 20 characters" },
      { status: 400 },
    );
  }

  const project = await prisma.project.create({
    data: {
      userId: user.id,
      title,
      brief,
      status: "draft",
    },
  });
  return NextResponse.json({ project });
}
