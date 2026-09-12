"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function VerifyInner() {
  const params = useSearchParams();
  const token = params.get("token");
  const error = params.get("error");
  const [status, setStatus] = useState<"idle" | "redirecting" | "error">(
    error ? "error" : token ? "redirecting" : "idle",
  );

  useEffect(() => {
    if (!token || error) return;
    // Hit the API verify endpoint (sets cookie session already; grants credit)
    window.location.href = `/api/auth/verify?token=${encodeURIComponent(token)}`;
  }, [token, error]);

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-xl font-semibold text-slate-900">Confirm email</h1>
      {status === "redirecting" && (
        <p className="mt-3 text-sm text-slate-600">Confirming your email…</p>
      )}
      {(status === "error" || error) && (
        <p className="mt-3 text-sm text-red-600">
          {error === "missing"
            ? "Missing verification token."
            : "This link is invalid or expired. Sign in and resend from the dashboard."}
        </p>
      )}
      {!token && !error && (
        <p className="mt-3 text-sm text-slate-600">
          Open the link from your email, or sign in and use Resend on the dashboard.
        </p>
      )}
      <Link href="/dashboard" className="mt-6 inline-block text-sm font-medium text-indigo-700 hover:underline">
        Go to dashboard →
      </Link>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="p-16 text-center text-sm text-slate-500">Loading…</div>}>
      <VerifyInner />
    </Suspense>
  );
}
