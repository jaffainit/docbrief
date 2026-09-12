import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const Stripe = require("stripe");

const prisma = new PrismaClient();
const whsec = process.env.STRIPE_WEBHOOK_SECRET;
const sk = process.env.STRIPE_SECRET_KEY;
const base = process.env.SMOKE_BASE || "https://docbrief-peach.vercel.app";
const stripe = new Stripe(sk, { apiVersion: "2024-06-20" });

const email = `webhook-smoke-${crypto.randomBytes(4).toString("hex")}@docbrief.test`;
const user = await prisma.user.create({
  data: {
    email,
    passwordHash: await bcrypt.hash("smoke-test-pass", 10),
    plan: "free",
    credits: 1,
  },
});
console.log("created", user.id);

const now = Math.floor(Date.now() / 1000);
const event = {
  id: `evt_smoke_${now}`,
  object: "event",
  api_version: "2024-06-20",
  created: now,
  type: "checkout.session.completed",
  livemode: false,
  pending_webhooks: 1,
  request: { id: null, idempotency_key: null },
  data: {
    object: {
      id: `cs_test_smoke_${user.id.slice(0, 8)}`,
      object: "checkout.session",
      mode: "subscription",
      status: "complete",
      payment_status: "paid",
      client_reference_id: user.id,
      customer: "cus_smoke_docbrief",
      subscription: "sub_smoke_docbrief",
      metadata: { userId: user.id, plan: "creator" },
    },
  },
};
const payload = JSON.stringify(event);
const header = stripe.webhooks.generateTestHeaderString({ payload, secret: whsec });
stripe.webhooks.constructEvent(payload, header, whsec);
console.log("local_sign_ok");

const res = await fetch(`${base}/api/billing/webhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "stripe-signature": header },
  body: payload,
});
console.log("webhook", res.status, await res.text());

const after = await prisma.user.findUnique({ where: { id: user.id } });
console.log("after", {
  plan: after?.plan,
  credits: after?.credits,
  stripeStatus: after?.stripeStatus,
  sub: after?.stripeSubscriptionId,
  customer: after?.stripeCustomerId,
});
const pass =
  after?.plan === "creator" &&
  after?.credits === 40 &&
  after?.stripeSubscriptionId === "sub_smoke_docbrief";
console.log(pass ? "PASS" : "FAIL");

await prisma.user.deleteMany({ where: { email: { endsWith: "@docbrief.test" } } });
await prisma.$disconnect();
process.exit(pass ? 0 : 1);
