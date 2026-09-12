import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ensureDb, prisma } from "@/lib/db";
import { setSession } from "@/lib/auth";

export async function POST(req: Request) {
  await ensureDb();
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }
  if (!password) {
    return NextResponse.json({ error: "Password required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  await setSession(user.id);
  return NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email, plan: user.plan, credits: user.credits },
  });
}
