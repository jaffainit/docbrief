"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CREDITS_PER_RENDER } from "@/lib/plans";

export function GenerateAgainButton({
  projectId,
  credits,
}: {
  projectId: string;
  credits: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onClick() {
    setError("");
    if (credits < CREDITS_PER_RENDER) {
      setError(`Need ${CREDITS_PER_RENDER} credit (you have ${credits}).`);
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/projects/${projectId}/generate`, { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.message || data.error || "Generate failed");
      return;
    }
    router.refresh();
  }

  return (
    <div className="text-right">
      <button
        type="button"
        disabled={loading}
        onClick={onClick}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
      >
        {loading ? "Generating…" : `Re-generate (−${CREDITS_PER_RENDER})`}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
