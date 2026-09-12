import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createVerifyToken, sendVerifyEmail } from "@/lib/email";

const RATE_MS = 60_000;

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.emailVerifiedAt) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  // Soft rate limit: if token expires > ~23h59m from now, it was issued < 1 min ago
  if (user.emailVerifyExpires) {
    const issuedAt =
      user.emailVerifyExpires.getTime() - 24 * 60 * 60 * 1000;
    if (Date.now() - issuedAt < RATE_MS) {
      return NextResponse.json(
        { error: "Please wait a minute before resending", code: "RATE_LIMIT" },
        { status: 429 },
      );
    }
  }

  const { token, expires } = createVerifyToken();
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifyToken: token, emailVerifyExpires: expires },
  });

  const result = await sendVerifyEmail({
    to: user.email,
    name: user.name,
    token,
  });

  return NextResponse.json({
    ok: true,
    emailed: result.sent,
    ...(result.sent ? {} : { message: "Email delivery not configured — contact support" }),
  });
}
