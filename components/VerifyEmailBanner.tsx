"use client";

import { useState } from "react";

export function VerifyEmailBanner({
  productNoun = "render",
}: {
  productNoun?: string;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error" | "noconfig">("idle");
  const [message, setMessage] = useState("");

  async function resend() {
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Could not resend");
        return;
      }
      if (data.alreadyVerified) {
        setStatus("sent");
        setMessage("Already verified — refresh the page.");
        return;
      }
      if (!data.emailed) {
        setStatus("noconfig");
        setMessage(data.message || "Email delivery not configured — contact support");
        return;
      }
      setStatus("sent");
      setMessage("Verification email sent. Check your inbox.");
    } catch {
      setStatus("error");
      setMessage("Network error");
    }
  }

  return (
    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <p className="font-medium">
        Confirm your email to unlock your free {productNoun}. Check your inbox.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={resend}
          disabled={status === "loading"}
          className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-500 disabled:opacity-60"
        >
          {status === "loading" ? "Sending…" : "Resend email"}
        </button>
        {message && <span className="text-xs text-amber-800">{message}</span>}
      </div>
    </div>
  );
}
