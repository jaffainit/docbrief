/**
 * Transactional email via Resend.
 * When RESEND_API_KEY is set, sends via Resend.
 * Otherwise no-ops with a logged notice — signup still succeeds.
 */

import { randomBytes } from "crypto";

const CANONICAL_URL = "https://docbrief.wedgewerks.win";
const CUSTOM_HOST = ["wedgewerks", "win"].join(".");
const CUSTOM_FROM =
  process.env.EMAIL_FROM || `DocBrief <onboarding@${CUSTOM_HOST}>`;
const FALLBACK_HOST = ["resend", "dev"].join(".");
const FALLBACK_FROM = `DocBrief <onboarding@${FALLBACK_HOST}>`;

export type EmailResult =
  | { sent: true; id?: string }
  | { sent: false; reason: string };

export type WelcomeEmailResult = EmailResult;

export function appUrl(): string {
  const raw = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    ""
  ).replace(/\/$/, "");
  if (raw && !/^https?:\/\/(localhost|127\.0\.0\.1)(:|$)/i.test(raw)) {
    return raw;
  }
  return CANONICAL_URL;
}

export function createVerifyToken(): { token: string; expires: Date } {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return { token, expires };
}

async function sendResend(opts: {
  to: string;
  subject: string;
  text: string;
}): Promise<EmailResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return { sent: false, reason: "RESEND_API_KEY not set (stub)" };
  }

  async function post(from: string) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [opts.to],
        subject: opts.subject,
        text: opts.text,
      }),
    });
    const body = await res.text().catch(() => "");
    return { res, body };
  }

  try {
    let { res, body } = await post(CUSTOM_FROM);
    if (
      !res.ok &&
      (res.status === 403 || res.status === 422) &&
      /domain is not verified/i.test(body)
    ) {
      console.warn(
        "[docbrief] custom From domain unverified; retrying Resend onboarding fallback",
        res.status,
      );
      ({ res, body } = await post(FALLBACK_FROM));
    }
    if (!res.ok) {
      console.warn("[docbrief] email failed", res.status, body.slice(0, 200));
      return { sent: false, reason: `Resend ${res.status}` };
    }
    let data: { id?: string } = {};
    try {
      data = JSON.parse(body) as { id?: string };
    } catch {
      // ignore non-JSON success bodies
    }
    return { sent: true, id: data.id };
  } catch (err) {
    console.warn("[docbrief] email error", err);
    return { sent: false, reason: "send failed" };
  }
}

export async function sendWelcomeEmail(opts: {
  to: string;
  name?: string | null;
}): Promise<WelcomeEmailResult> {
  const first = (opts.name || "").trim().split(/\s+/)[0] || "there";
  const subject = "Welcome to DocBrief";
  const text = [
    `Hi ${first},`,
    "",
    "Welcome to DocBrief — a WedgeWerks™ product.",
    "Paste a brief, get a polished script, TTS, captions, and a downloadable MP4.",
    "",
    "Confirm your email to unlock your free render credit.",
    "",
    "→ https://docbrief.wedgewerks.win/projects/new",
    "",
    "— DocBrief",
  ].join("\n");

  if (!process.env.RESEND_API_KEY) {
    console.info(
      "[docbrief] welcome email stub: RESEND_API_KEY not set — skipped for",
      opts.to,
    );
    return { sent: false, reason: "RESEND_API_KEY not set (stub)" };
  }

  return sendResend({ to: opts.to, subject, text });
}

export async function sendVerifyEmail(opts: {
  to: string;
  name?: string | null;
  token: string;
}): Promise<EmailResult> {
  const first = (opts.name || "").trim().split(/\s+/)[0] || "there";
  const verifyUrl = `${appUrl()}/api/auth/verify?token=${encodeURIComponent(opts.token)}`;
  const friendlyUrl = `${appUrl()}/verify?token=${encodeURIComponent(opts.token)}`;
  const subject = "Confirm your DocBrief email";
  const text = [
    `Hi ${first},`,
    "",
    "Confirm your email to unlock your free DocBrief render credit.",
    "",
    `Confirm: ${verifyUrl}`,
    "",
    `Or open: ${friendlyUrl}`,
    "",
    "This link expires in 24 hours.",
    "",
    "— DocBrief",
  ].join("\n");

  if (!process.env.RESEND_API_KEY) {
    console.info(
      "[docbrief] verify email stub: RESEND_API_KEY not set — verify URL for",
      opts.to,
      "→",
      verifyUrl,
    );
    return { sent: false, reason: "RESEND_API_KEY not set (stub)" };
  }

  return sendResend({ to: opts.to, subject, text });
}
