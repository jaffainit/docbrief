import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { creditsForPlan } from "@/lib/plans";

export const runtime = "nodejs";

function planFromMeta(
  status: Stripe.Subscription.Status,
  metaPlan?: string | null,
): "free" | "starter" | "creator" {
  if (status !== "active" && status !== "trialing") return "free";
  if (metaPlan === "creator") return "creator";
  return "starter";
}

async function resolveUserId(opts: {
  userId?: string | null;
  customerId?: string | null;
  subscriptionId?: string | null;
}): Promise<string | null> {
  if (opts.userId) {
    const byId = await prisma.user.findUnique({
      where: { id: opts.userId },
      select: { id: true },
    });
    if (byId) return byId.id;
  }
  if (opts.customerId) {
    const byCustomer = await prisma.user.findFirst({
      where: { stripeCustomerId: opts.customerId },
      select: { id: true },
    });
    if (byCustomer) return byCustomer.id;
  }
  if (opts.subscriptionId) {
    const bySub = await prisma.user.findFirst({
      where: { stripeSubscriptionId: opts.subscriptionId },
      select: { id: true },
    });
    if (bySub) return bySub.id;
  }
  return null;
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== "subscription") return;

  const userIdMeta =
    session.metadata?.userId || session.client_reference_id || null;
  const planMeta = session.metadata?.plan || "starter";
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id ?? null;
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;

  const userId = await resolveUserId({
    userId: userIdMeta,
    customerId,
    subscriptionId,
  });
  if (!userId) {
    console.warn("[stripe webhook] checkout.session.completed: no user matched");
    return;
  }

  const plan = planMeta === "creator" ? "creator" : "starter";
  await prisma.user.update({
    where: { id: userId },
    data: {
      plan,
      credits: creditsForPlan(plan),
      stripeStatus: "active",
      ...(customerId ? { stripeCustomerId: customerId } : {}),
      ...(subscriptionId ? { stripeSubscriptionId: subscriptionId } : {}),
    },
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id ?? null;
  const userIdMeta = subscription.metadata?.userId ?? null;
  const userId = await resolveUserId({
    userId: userIdMeta,
    customerId,
    subscriptionId: subscription.id,
  });
  if (!userId) return;

  const plan = planFromMeta(subscription.status, subscription.metadata?.plan);
  await prisma.user.update({
    where: { id: userId },
    data: {
      plan,
      credits: creditsForPlan(plan),
      stripeStatus: subscription.status,
      ...(customerId ? { stripeCustomerId: customerId } : {}),
      stripeSubscriptionId: plan === "free" ? null : subscription.id,
    },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id ?? null;
  const userIdMeta = subscription.metadata?.userId ?? null;
  const userId = await resolveUserId({
    userId: userIdMeta,
    customerId,
    subscriptionId: subscription.id,
  });
  if (!userId) return;

  await prisma.user.update({
    where: { id: userId },
    data: {
      plan: "free",
      credits: creditsForPlan("free"),
      stripeSubscriptionId: null,
      stripeStatus: "canceled",
    },
  });
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not configured (STRIPE_SECRET_KEY missing)." },
      { status: 503 },
    );
  }
  if (!webhookSecret) {
    return NextResponse.json(
      {
        error:
          "STRIPE_WEBHOOK_SECRET is not set. Add a Stripe Dashboard webhook endpoint pointing at /api/billing/webhook, then set the signing secret.",
      },
      { status: 503 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      default:
        break;
    }
  } catch (err) {
    console.error("[stripe webhook] handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
