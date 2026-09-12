/**
 * Transactional email via Resend.
 * When RESEND_API_KEY is set, sends via Resend.
 * Otherwise no-ops with a logged notice — signup still succeeds.
 */

import { randomBytes } from "crypto";

const FROM =
  process.env.EMAIL_FROM || "DocBrief <onboarding@docbrief.wedgewerks.win>";

export type EmailResult =
  | { sent: true; id?: string }
  | { sent: false; reason: string };

export type WelcomeEmailResult = EmailResult;

function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export function createVerifyToken(): { token: string; expires: Date } {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return { token, expires };
}

export async function sendWelcomeEmail(opts: {
  to: string;
  name?: string | null;
}): Promise<WelcomeEmailResult> {
  const key = process.env.RESEND_API_KEY;
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

  if (!key) {
    console.info(
      "[docbrief] welcome email stub: RESEND_API_KEY not set — skipped for",
      opts.to,
    );
    return { sent: false, reason: "RESEND_API_KEY not set (stub)" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [opts.to],
        subject,
        text,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn("[docbrief] welcome email failed", res.status, body.slice(0, 200));
      return { sent: false, reason: `Resend ${res.status}` };
    }
    const data = (await res.json()) as { id?: string };
    return { sent: true, id: data.id };
  } catch (err) {
    console.warn("[docbrief] welcome email error", err);
    return { sent: false, reason: "send failed" };
  }
}

export async function sendVerifyEmail(opts: {
  to: string;
  name?: string | null;
  token: string;
}): Promise<EmailResult> {
  const key = process.env.RESEND_API_KEY;
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

  if (!key) {
    console.info(
      "[docbrief] verify email stub: RESEND_API_KEY not set — verify URL for",
      opts.to,
      "→",
      verifyUrl,
    );
    return { sent: false, reason: "RESEND_API_KEY not set (stub)" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [opts.to],
        subject,
        text,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn("[docbrief] verify email failed", res.status, body.slice(0, 200));
      return { sent: false, reason: `Resend ${res.status}` };
    }
    const data = (await res.json()) as { id?: string };
    return { sent: true, id: data.id };
  } catch (err) {
    console.warn("[docbrief] verify email error", err);
    return { sent: false, reason: "send failed" };
  }
}
