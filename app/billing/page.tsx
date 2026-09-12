import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { BillingClient } from "@/components/BillingClient";
import { planOf } from "@/lib/plans";
import { stripeConfigured } from "@/lib/stripe";

export default async function BillingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const limits = planOf(user.plan);
  const live = stripeConfigured();

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-semibold text-slate-900">Billing</h1>
      <p className="mt-2 text-slate-600">
        Free: 1 short render. Starter $12/mo (10 credits). Creator $36/mo (40 credits).
      </p>
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">
          Your plan includes up to {limits.credits} credit{limits.credits === 1 ? "" : "s"} (
          {limits.name}).
        </p>
        <div className="mt-4">
          <BillingClient plan={user.plan} credits={user.credits} stripeReady={live} />
        </div>
      </div>
    </div>
  );
}
