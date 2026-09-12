/**
 * Welcome email stub.
 * When RESEND_API_KEY is set, sends via Resend.
 * Otherwise no-ops with a logged notice — signup still succeeds.
 */

const FROM =
  process.env.EMAIL_FROM || "DocBrief <onboarding@docbrief.wedgewerks.win>";

export type WelcomeEmailResult =
  | { sent: true; id?: string }
  | { sent: false; reason: string };

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
    "Your Free plan includes 1 short render. Upgrade anytime on Billing for more credits.",
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
