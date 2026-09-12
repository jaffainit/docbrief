"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CREDITS_PER_RENDER } from "@/lib/plans";

export function NewProjectForm({ credits }: { credits: number }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const canAfford = credits >= CREDITS_PER_RENDER;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!canAfford) {
      setError(`Need ${CREDITS_PER_RENDER} credit. You have ${credits}. Upgrade on Billing.`);
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
      <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
        Cost: <strong>{CREDITS_PER_RENDER} credit</strong> per short render. You have{" "}
        <strong>{credits}</strong>. Shown before generate — Free users are limited.
      </div>
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
          placeholder="Topic, beats, facts, tone… DocBrief will polish into a voiceover script, add captions, placeholder B-roll stills, and TTS when OPENAI_API_KEY is set."
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading || !canAfford}
        className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
      >
        {loading ? "Generating…" : canAfford ? `Generate (−${CREDITS_PER_RENDER} credit)` : "Out of credits"}
      </button>
    </form>
  );
}
