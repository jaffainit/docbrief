export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    credits: 1,
    blurb: "1 short render — try the pipeline",
    features: [
      "1 short documentary render",
      "Polished script + captions",
      "TTS or silent audio placeholder",
      "B-roll still placeholders",
      "Downloadable MP4 (stills + audio + burned-in captions)",
    ],
  },
  starter: {
    name: "Starter",
    price: 12,
    credits: 10,
    blurb: "10 short renders / month",
    features: [
      "10 credits / month",
      "Everything in Free",
      "Email support",
    ],
  },
  creator: {
    name: "Creator",
    price: 36,
    credits: 40,
    blurb: "40 short renders / month",
    features: [
      "40 credits / month",
      "Everything in Starter",
      "Priority when OpenAI keys are set",
    ],
  },
  owner: {
    name: "Owner",
    price: 0,
    credits: 1_000_000,
    blurb: "Internal",
    features: ["Unlimited renders"],
  },
} as const;

export type PlanId = keyof typeof PLANS;

/** Credits charged per short generate job. */
export const CREDITS_PER_RENDER = 1;

export function planOf(plan: string) {
  return PLANS[(plan as PlanId) in PLANS ? (plan as PlanId) : "free"];
}

export function creditsForPlan(plan: string): number {
  return planOf(plan).credits;
}

export function isPaidPlan(plan: string): boolean {
  return plan === "starter" || plan === "creator";
}
