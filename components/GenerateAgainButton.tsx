"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CREDITS_PER_RENDER } from "@/lib/plans";
import { CreditCostBanner } from "@/components/CreditCostBanner";

export function GenerateAgainButton({
  projectId,
  credits,
  plan,
}: {
  projectId: string;
  credits: number;
  plan: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const canAfford = credits >= CREDITS_PER_RENDER;
  const after = Math.max(0, credits - CREDITS_PER_RENDER);

  async function onClick() {
    setError("");
    if (!canAfford) {
      setError(
        `Re-generate costs ${CREDITS_PER_RENDER} credit. You have ${credits}. Upgrade on Billing.`,
      );
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
    <div className="space-y-3 text-left">
      <CreditCostBanner credits={credits} plan={plan} actionLabel="Re-generate" />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={loading || !canAfford}
          onClick={onClick}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
        >
          {loading
            ? "Generating…"
            : canAfford
              ? `Re-generate (−${CREDITS_PER_RENDER} → ${after} left)`
              : "Out of credits"}
        </button>
        {!canAfford && (
          <Link href="/billing" className="text-sm font-medium text-indigo-700 hover:underline">
            Billing →
          </Link>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
