import Stripe from "stripe";

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export function stripeConfigured() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_PRICE_ID_STARTER &&
      process.env.STRIPE_PRICE_ID_CREATOR,
  );
}

export function priceIdForPlan(plan: "starter" | "creator"): string | null {
  if (plan === "starter") return process.env.STRIPE_PRICE_ID_STARTER || null;
  if (plan === "creator") return process.env.STRIPE_PRICE_ID_CREATOR || null;
  return null;
}
