import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const CANONICAL = "docbrief.wedgewerks.win";

const REDIRECT_HOSTS = new Set([
  "www.docbrief.wedgewerks.win",
  "docbrief-peach.vercel.app",
]);

export function middleware(req: NextRequest) {
  const host = req.headers.get("host")?.split(":")[0]?.toLowerCase() || "";
  if (!REDIRECT_HOSTS.has(host)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.protocol = "https:";
  url.host = CANONICAL;
  url.port = "";
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
