"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function SuccessInner() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState<"loading" | "ok" | "pending">("loading");
  const [plan, setPlan] = useState("…");

  useEffect(() => {
    async function run() {
      if (!sessionId) {
        setStatus("pending");
        return;
      }
      const res = await fetch("/api/billing/success", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (data.ok) {
        setPlan(data.plan);
        setStatus("ok");
      } else {
        setStatus("pending");
      }
    }
    run();
  }, [sessionId]);

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">Billing success</h1>
      {status === "loading" && <p className="mt-4 text-slate-600">Confirming Checkout…</p>}
      {status === "ok" && (
        <p className="mt-4 text-slate-600">
          Plan updated to <strong className="capitalize">{plan}</strong>. Credits refreshed.
        </p>
      )}
      {status === "pending" && (
        <p className="mt-4 text-slate-600">
          If you just paid, the webhook may still be processing — refresh Billing in a moment.
        </p>
      )}
      <div className="mt-8 flex justify-center gap-3">
        <Link
          href="/dashboard"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Dashboard
        </Link>
        <Link
          href="/billing"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Billing
        </Link>
      </div>
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-500">Loading…</div>}>
      <SuccessInner />
    </Suspense>
  );
}
