import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PLANS } from "@/lib/plans";

export default async function HomePage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <div>
      <section className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">
          DocBrief · WedgeWerks™
        </p>
        <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          Long-form YouTube documentaries without an editor or GPU film studio.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-slate-600">
          Faceless and solo creators: paste a topic or rough script. DocBrief polishes the
          voiceover, adds TTS (when configured), B-roll placeholders, burned-in captions, and a
          downloadable MP4. A zip of assets is secondary — zip-only only if ffmpeg fails hard.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/sign-up"
            className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-500"
          >
            Start free — 1 short render
          </Link>
          <Link
            href="/#pricing"
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-medium text-slate-800 hover:bg-slate-50"
          >
            See pricing
          </Link>
        </div>
        <p className="mt-4 text-sm text-slate-500">
          No character-consistent multi-cast GPU. No Seedance/Kling. No YouTube OAuth publish.
        </p>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-5xl gap-8 px-4 py-14 sm:grid-cols-3">
          {[
            {
              t: "Brief → polished script",
              d: "OpenAI polish when OPENAI_API_KEY is set; otherwise a clear template structure from your brief.",
            },
            {
              t: "Voice + burned-in captions + stills",
              d: "TTS voiceover (or honest beep-track placeholder), SRT/VTT plus captions burned into the MP4, and labeled B-roll placeholder PNGs.",
            },
            {
              t: "Downloadable MP4",
              d: "Slideshow of stills + audio + burned-in captions. Asset zip is a secondary download. Zip-only if ffmpeg is unavailable.",
            },
          ].map((f) => (
            <div key={f.t}>
              <h3 className="font-semibold text-slate-900">{f.t}</h3>
              <p className="mt-2 text-sm text-slate-600">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="text-center text-2xl font-semibold text-slate-900">Credits & pricing</h2>
        <p className="mt-2 text-center text-slate-600">
          Cost shown before every generate. Free users limited to 1 short render.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {(
            [
              ["free", PLANS.free],
              ["starter", PLANS.starter],
              ["creator", PLANS.creator],
            ] as const
          ).map(([id, p]) => (
            <div
              key={id}
              className={
                "rounded-2xl border bg-white p-6 shadow-sm " +
                (id === "starter" ? "border-2 border-indigo-600" : "border-slate-200")
              }
            >
              <h3
                className={
                  "text-lg font-semibold " + (id === "starter" ? "text-indigo-700" : "")
                }
              >
                {p.name}
              </h3>
              <p className="mt-1 text-3xl font-semibold">
                {p.price === 0 ? "$0" : `$${p.price}`}
                {p.price > 0 && (
                  <span className="text-base font-normal text-slate-500">/mo</span>
                )}
              </p>
              <p className="mt-1 text-sm text-slate-500">{p.blurb}</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                {p.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <Link
                href="/sign-up"
                className={
                  "mt-6 inline-block rounded-lg px-4 py-2 text-sm font-medium " +
                  (id === "starter"
                    ? "bg-indigo-600 text-white hover:bg-indigo-500"
                    : "border border-slate-300 hover:bg-slate-50")
                }
              >
                {id === "free" ? "Get started" : "Upgrade after signup"}
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
