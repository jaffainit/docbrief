import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ensureDb, prisma } from "@/lib/db";
import { setSession } from "@/lib/auth";
import { createVerifyToken, sendVerifyEmail, sendWelcomeEmail } from "@/lib/email";

const BCRYPT_COST = 12;

export async function POST(req: Request) {
  await ensureDb();
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const name = String(body.name || "").trim() || null;
  const password = String(body.password || "");

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    if (existing.passwordHash) {
      return NextResponse.json(
        { error: "Account exists — sign in instead" },
        { status: 409 },
      );
    }
    const user = await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash, ...(name ? { name } : {}) },
    });
    await setSession(user.id);
    return NextResponse.json({ ok: true, user: { id: user.id, email: user.email } });
  }

  const { token, expires } = createVerifyToken();
  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      plan: "free",
      credits: 0, // granted on email verify
      emailVerifyToken: token,
      emailVerifyExpires: expires,
    },
  });
  await setSession(user.id);

  const verify = await sendVerifyEmail({ to: user.email, name: user.name, token });
  // Optional welcome (non-blocking for unlock — verify is what matters)
  await sendWelcomeEmail({ to: user.email, name: user.name }).catch(() => null);

  return NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email },
    emailVerification: { required: true, emailed: verify.sent },
  });
}
