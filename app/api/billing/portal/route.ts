import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { appUrl } from "@/lib/email";

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!stripeConfigured()) {
    return NextResponse.json(
      {
        error: "Stripe not configured",
        message: "Set STRIPE_SECRET_KEY + price IDs to enable the Customer Portal.",
      },
      { status: 503 },
    );
  }

  if (!user.stripeCustomerId) {
    return NextResponse.json(
      {
        error: "No Stripe customer",
        message: "Upgrade to Starter or Creator first — then you can manage billing here.",
      },
      { status: 400 },
    );
  }

  const origin = appUrl();
  const stripe = getStripe()!;
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: origin + "/billing",
  });

  return NextResponse.json({ url: session.url });
}
