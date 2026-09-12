import { cookies } from "next/headers";
import { ensureDb, prisma } from "./db";

const COOKIE = process.env.AUTH_COOKIE_NAME || "docbrief_uid";
const MAX_AGE_DAYS = Number(process.env.SESSION_MAX_AGE_DAYS || 30);

export async function getSessionUser() {
  await ensureDb();
  const jar = await cookies();
  const uid = jar.get(COOKIE)?.value;
  if (!uid) return null;
  return prisma.user.findUnique({ where: { id: uid } });
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function setSession(userId: string) {
  const jar = await cookies();
  jar.set(COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * MAX_AGE_DAYS,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}
