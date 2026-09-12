import { NextResponse } from "next/server";
import { ensureDb, prisma } from "@/lib/db";

function appUrl(req: Request): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    new URL(req.url).origin
  ).replace(/\/$/, "");
}

export async function GET(req: Request) {
  await ensureDb();
  const url = new URL(req.url);
  const token = String(url.searchParams.get("token") || "").trim();
  const base = appUrl(req);

  if (!token) {
    return NextResponse.redirect(`${base}/verify?error=missing`);
  }

  const user = await prisma.user.findFirst({
    where: { emailVerifyToken: token },
  });

  if (!user || !user.emailVerifyExpires || user.emailVerifyExpires < new Date()) {
    return NextResponse.redirect(`${base}/verify?error=invalid`);
  }

  const grantFreeCredit =
    user.credits === 0 && (user.plan === "free" || !user.plan);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifiedAt: new Date(),
      emailVerifyToken: null,
      emailVerifyExpires: null,
      ...(grantFreeCredit ? { credits: 1 } : {}),
    },
  });

  return NextResponse.redirect(`${base}/dashboard?verified=1`);
}
