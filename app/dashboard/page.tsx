import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { VerifyEmailBanner } from "@/components/VerifyEmailBanner";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const sp = await searchParams;

  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      {sp.verified === "1" && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Email confirmed — your free render credit is unlocked.
        </div>
      )}
      {!user.emailVerifiedAt && <VerifyEmailBanner productNoun="render" />}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Projects</h1>
          <p className="mt-1 text-slate-600">
            Plan <span className="capitalize">{user.plan}</span> · {user.credits} credit
            {user.credits === 1 ? "" : "s"} left
          </p>
        </div>
        <Link
          href="/projects/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          New project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-slate-600">No projects yet. Paste a brief and generate a short doc.</p>
          <Link
            href="/projects/new"
            className="mt-4 inline-block text-sm font-medium text-indigo-700 hover:underline"
          >
            Create your first project →
          </Link>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white shadow-sm">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/projects/${p.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 hover:bg-slate-50"
              >
                <div>
                  <p className="font-medium text-slate-900">{p.title}</p>
                  <p className="text-xs text-slate-500">
                    {p.status} · {p.creditsUsed} credit used ·{" "}
                    {new Date(p.createdAt).toLocaleString("en-GB", {
                      timeZone: "Europe/London",
                    })}{" "}
                    UK
                  </p>
                </div>
                <span className="text-sm text-indigo-700">Open →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
