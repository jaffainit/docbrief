import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { LogoutButton } from "./LogoutButton";

export async function Nav() {
  const user = await getSessionUser();
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href={user ? "/dashboard" : "/"} className="font-semibold tracking-tight text-indigo-700">
          DocBrief
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          {!user && (
            <>
              <Link href="/#pricing" className="text-slate-600 hover:text-slate-900">
                Pricing
              </Link>
              <Link href="/sign-in" className="text-slate-600 hover:text-slate-900">
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="rounded-lg bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-500"
              >
                Start free
              </Link>
            </>
          )}
          {user && (
            <>
              <Link href="/dashboard" className="text-slate-600 hover:text-slate-900">
                Projects
              </Link>
              <Link href="/projects/new" className="text-slate-600 hover:text-slate-900">
                New
              </Link>
              <Link href="/billing" className="text-slate-600 hover:text-slate-900">
                Billing
              </Link>
              <span className="hidden text-slate-400 sm:inline">
                {user.credits} credit{user.credits === 1 ? "" : "s"} · {user.plan}
              </span>
              <LogoutButton />
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
