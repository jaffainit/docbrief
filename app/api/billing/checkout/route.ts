import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getStripe, stripeConfigured, priceIdForPlan } from "@/lib/stripe";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const origin = new URL(req.url).origin;
  const body = await req.json().catch(() => ({}));
  const plan = String(body.plan || "starter") as "starter" | "creator";
  if (plan !== "starter" && plan !== "creator") {
    return NextResponse.json({ error: "plan must be starter or creator" }, { status: 400 });
  }

  if (!stripeConfigured()) {
    return NextResponse.json(
      {
        error: "Stripe not configured",
        message:
          "Stripe keys are not configured. Set STRIPE_SECRET_KEY + STRIPE_PRICE_ID_STARTER + STRIPE_PRICE_ID_CREATOR (+ STRIPE_WEBHOOK_SECRET) to enable Checkout. No stub free upgrade.",
      },
      { status: 503 },
    );
  }

  const priceId = priceIdForPlan(plan);
  if (!priceId) {
    return NextResponse.json(
      { error: "Stripe not configured", message: `Missing price id for ${plan}` },
      { status: 503 },
    );
  }

  const stripe = getStripe()!;
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: origin + "/billing/success?session_id={CHECKOUT_SESSION_ID}",
    cancel_url: origin + "/billing",
    metadata: { userId: user.id, plan },
    subscription_data: {
      description: `DocBrief ${plan === "creator" ? "Creator" : "Starter"}`,
      metadata: { userId: user.id, plan },
    },
  });

  return NextResponse.json({ url: session.url });
}
