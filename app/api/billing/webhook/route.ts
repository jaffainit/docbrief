import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { creditsForPlan } from "@/lib/plans";

export const runtime = "nodejs";


function planFromPriceId(priceId?: string | null): "starter" | "creator" | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_ID_CREATOR) return "creator";
  if (priceId === process.env.STRIPE_PRICE_ID_STARTER) return "starter";
  return null;
}

function planFromSubscription(subscription: Stripe.Subscription): "free" | "starter" | "creator" {
  if (subscription.status !== "active" && subscription.status !== "trialing") return "free";
  const meta = subscription.metadata?.plan;
  if (meta === "creator" || meta === "starter") return meta;
  const priceId = subscription.items?.data?.[0]?.price?.id;
  return planFromPriceId(priceId) || "starter";
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
      emailVerifiedAt: new Date(),
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

  const plan = planFromSubscription(subscription);
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


async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // Stripe API versions differ: subscription may be top-level or under parent.
  const inv = invoice as Stripe.Invoice & {
    subscription?: string | { id: string } | null;
    parent?: { subscription_details?: { subscription?: string | { id: string } | null } | null } | null;
  };
  const subRef =
    inv.subscription ??
    inv.parent?.subscription_details?.subscription ??
    null;
  const subscriptionId =
    typeof subRef === "string" ? subRef : subRef?.id ?? null;
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id ?? null;
  if (!subscriptionId && !customerId) return;

  const stripe = getStripe();
  if (!stripe || !subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const userId = await resolveUserId({
    userId: subscription.metadata?.userId ?? null,
    customerId,
    subscriptionId,
  });
  if (!userId) return;

  const plan = planFromSubscription(subscription);
  if (plan === "free") return;

  await prisma.user.update({
    where: { id: userId },
    data: {
      plan,
      credits: creditsForPlan(plan),
      stripeStatus: subscription.status,
      stripeSubscriptionId: subscription.id,
      ...(customerId ? { stripeCustomerId: customerId } : {}),
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
      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
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
