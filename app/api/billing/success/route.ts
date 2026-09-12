import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { creditsForPlan } from "@/lib/plans";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const sessionId = String(body.sessionId || "");

  if (!stripeConfigured() || !sessionId) {
    return NextResponse.json({ ok: true, plan: user.plan, credits: user.credits });
  }

  const stripe = getStripe()!;
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status === "paid" || session.status === "complete") {
    const planMeta = (session.metadata?.plan || "starter") as "starter" | "creator";
    const plan = planMeta === "creator" ? "creator" : "starter";
    const customerId =
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id ?? undefined;
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id ?? undefined;
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        plan,
        credits: creditsForPlan(plan),
        stripeStatus: "active",
        ...(customerId ? { stripeCustomerId: customerId } : {}),
        ...(subscriptionId ? { stripeSubscriptionId: subscriptionId } : {}),
      },
    });
    return NextResponse.json({ ok: true, plan: updated.plan, credits: updated.credits });
  }
  return NextResponse.json({ ok: false, plan: user.plan, credits: user.credits });
}
