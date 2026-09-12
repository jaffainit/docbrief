"use client";

import { useState } from "react";

export function BillingClient({
  plan,
  credits,
  stripeReady,
}: {
  plan: string;
  credits: number;
  stripeReady: boolean;
}) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState<"starter" | "creator" | null>(null);

  async function checkout(target: "starter" | "creator") {
    setError("");
    setLoading(target);
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: target }),
    });
    const data = await res.json();
    setLoading(null);
    if (!res.ok) {
      setError(data.message || data.error || "Checkout unavailable");
      return;
    }
    if (data.url) window.location.href = data.url;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Current plan: <strong className="capitalize">{plan}</strong> · {credits} credit
        {credits === 1 ? "" : "s"} remaining
      </p>
      {!stripeReady && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Stripe is not configured. Set <code>STRIPE_SECRET_KEY</code>,{" "}
          <code>STRIPE_PRICE_ID_STARTER</code>, and <code>STRIPE_PRICE_ID_CREATOR</code> (plus{" "}
          <code>STRIPE_WEBHOOK_SECRET</code> for webhooks). Checkout returns 503 until then — no
          stub free upgrade.
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!stripeReady || loading !== null || plan === "starter"}
          onClick={() => checkout("starter")}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading === "starter" ? "Redirecting…" : "Upgrade Starter — $12/mo"}
        </button>
        <button
          type="button"
          disabled={!stripeReady || loading !== null || plan === "creator"}
          onClick={() => checkout("creator")}
          className="rounded-lg border border-indigo-600 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
        >
          {loading === "creator" ? "Redirecting…" : "Upgrade Creator — $36/mo"}
        </button>
      </div>
    </div>
  );
}
