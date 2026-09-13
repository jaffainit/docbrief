import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ensureDb, prisma } from "@/lib/db";

export const runtime = "nodejs";

function bearerOk(req: Request, expected: string): boolean {
  const auth = req.headers.get("authorization") || "";
  const prefix = "Bearer ";
  if (!auth.startsWith(prefix)) return false;
  const got = auth.slice(prefix.length);
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const expected = process.env.GRANT_OWNER_TOKEN;
  if (!expected) {
    return NextResponse.json({ error: "disabled" }, { status: 404 });
  }
  if (!bearerOk(req, expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const password = String(body.password || "");
  if (password.length < 8) {
    return NextResponse.json({ error: "password too short" }, { status: 400 });
  }

  await ensureDb();
  const email = "jaffywaffeh91@gmail.com";
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: "Jaffa",
      passwordHash,
      plan: "owner",
      emailVerifiedAt: new Date(),
      credits: 1_000_000,
    },
    update: {
      passwordHash,
      plan: "owner",
      emailVerifiedAt: new Date(),
      emailVerifyToken: null,
      emailVerifyExpires: null,
      credits: 1_000_000,
    },
  });

  return NextResponse.json({
    ok: true,
    email: user.email,
    plan: user.plan,
    verified: Boolean(user.emailVerifiedAt),
    credits: user.credits,
  });
}
