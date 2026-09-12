import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ensureDb, prisma } from "@/lib/db";
import { setSession } from "@/lib/auth";
import { creditsForPlan } from "@/lib/plans";
import { sendWelcomeEmail } from "@/lib/email";

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

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      plan: "free",
      credits: creditsForPlan("free"),
    },
  });
  await setSession(user.id);

  // Fire-and-forget style: await so we can report stub status, never fail signup.
  const welcome = await sendWelcomeEmail({ to: user.email, name: user.name });

  return NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email },
    welcomeEmail: welcome,
  });
}
