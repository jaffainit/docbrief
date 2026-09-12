"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CREDITS_PER_RENDER } from "@/lib/plans";
import { CreditCostBanner } from "@/components/CreditCostBanner";

export function NewProjectForm({
  credits,
  plan,
}: {
  credits: number;
  plan: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const canAfford = credits >= CREDITS_PER_RENDER;
  const after = Math.max(0, credits - CREDITS_PER_RENDER);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!canAfford) {
      setError(
        `This generate costs ${CREDITS_PER_RENDER} credit. You have ${credits} on ${plan}. Upgrade on Billing.`,
      );
      return;
    }
    setLoading(true);
    const create = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, brief }),
    });
    const created = await create.json();
    if (!create.ok) {
      setLoading(false);
      setError(created.error || "Could not create project");
      return;
    }
    const id = created.project.id as string;
    const gen = await fetch(`/api/projects/${id}/generate`, { method: "POST" });
    const genData = await gen.json();
    setLoading(false);
    if (!gen.ok) {
      setError(genData.message || genData.error || "Generate failed");
      router.push(`/projects/${id}`);
      router.refresh();
      return;
    }
    router.push(`/projects/${id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <CreditCostBanner credits={credits} plan={plan} />
      <label className="block text-sm">
        <span className="text-slate-700">Title (optional)</span>
        <input
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Why Rome fell (short doc)"
        />
      </label>
      <label className="block text-sm">
        <span className="text-slate-700">Brief / rough script</span>
        <textarea
          required
          minLength={20}
          rows={10}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="Topic, beats, facts, tone… DocBrief will polish a voiceover script, add TTS (or a beep track), B-roll stills, burned-in captions, and a downloadable MP4."
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={loading || !canAfford}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading
            ? "Generating…"
            : canAfford
              ? `Generate now (−${CREDITS_PER_RENDER} → ${after} left)`
              : "Out of credits"}
        </button>
        {!canAfford && (
          <Link href="/billing" className="text-sm font-medium text-indigo-700 hover:underline">
            Go to Billing →
          </Link>
        )}
      </div>
      {canAfford && (
        <p className="text-xs text-slate-500">
          Confirm: this run costs {CREDITS_PER_RENDER} credit on your{" "}
          <span className="capitalize">{plan}</span> plan ({credits} → {after}).
        </p>
      )}
    </form>
  );
}
