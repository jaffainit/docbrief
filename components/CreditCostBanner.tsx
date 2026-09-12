import Link from "next/link";
import { CREDITS_PER_RENDER } from "@/lib/plans";

export function CreditCostBanner({
  credits,
  plan,
  actionLabel = "Generate",
}: {
  credits: number;
  plan: string;
  actionLabel?: string;
}) {
  const canAfford = credits >= CREDITS_PER_RENDER;
  const after = Math.max(0, credits - CREDITS_PER_RENDER);

  return (
    <div
      className={
        canAfford
          ? "rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-950"
          : "rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
      }
    >
      <p className="font-medium">Before you {actionLabel.toLowerCase()}</p>
      <dl className="mt-2 grid gap-1 sm:grid-cols-3">
        <div>
          <dt className="text-xs uppercase tracking-wide opacity-70">Cost</dt>
          <dd>
            <strong>{CREDITS_PER_RENDER}</strong> credit / short render
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide opacity-70">Balance</dt>
          <dd>
            <strong>{credits}</strong> on <span className="capitalize">{plan}</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide opacity-70">After</dt>
          <dd>
            {canAfford ? (
              <>
                <strong>{after}</strong> credit{after === 1 ? "" : "s"} left
              </>
            ) : (
              <strong>Not enough credits</strong>
            )}
          </dd>
        </div>
      </dl>
      {!canAfford && (
        <p className="mt-2">
          Upgrade on{" "}
          <Link href="/billing" className="font-medium underline underline-offset-2">
            Billing
          </Link>{" "}
          (Starter 10 / Creator 40) before generating.
        </p>
      )}
    </div>
  );
}
