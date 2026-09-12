import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { GenerateAgainButton } from "@/components/GenerateAgainButton";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const { id } = await params;
  const project = await prisma.project.findFirst({
    where: { id, userId: user.id },
  });
  if (!project) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/dashboard" className="text-sm text-indigo-700 hover:underline">
        ← Dashboard
      </Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{project.title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Status: <span className="font-medium text-slate-700">{project.status}</span>
            {project.creditsUsed > 0 && ` · ${project.creditsUsed} credit used`}
          </p>
        </div>
        {project.status !== "running" && (
          <GenerateAgainButton projectId={project.id} credits={user.credits} />
        )}
      </div>

      {project.renderNote && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-700">
          {project.renderNote}
        </div>
      )}
      {project.errorMsg && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {project.errorMsg}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        {project.videoUrl && (
          <a
            href={project.videoUrl}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Download MP4
          </a>
        )}
        {project.zipUrl && (
          <a
            href={project.zipUrl}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Download asset zip
          </a>
        )}
        {project.audioUrl && (
          <a
            href={project.audioUrl}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Download audio
          </a>
        )}
      </div>

      {project.videoUrl && (
        <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-black">
          <video controls className="w-full" src={project.videoUrl} />
        </div>
      )}

      {project.scriptMd && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-slate-900">Polished script</h2>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-800">
            {project.scriptMd}
          </pre>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-slate-900">Original brief</h2>
        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          {project.brief}
        </pre>
      </section>
    </div>
  );
}
