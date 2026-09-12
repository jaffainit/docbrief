"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [signupNotice, setSignupNotice] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSignupNotice("");
    const res = await fetch(mode === "signup" ? "/api/auth/signup" : "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong");
      return;
    }
    if (mode === "signup" && data.emailVerification?.required) {
      setSignupNotice(
        data.emailVerification.emailed === false
          ? "Check your email to confirm before using your free credit. (Email delivery not configured — contact support if you did not receive a message.)"
          : "Check your email to confirm before using your free credit.",
      );
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1800);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          {mode === "signup" ? "Create your DocBrief account" : "Sign in to DocBrief"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {mode === "signup"
            ? "Email + password (min 8 characters). Confirm email to unlock 1 free render."
            : "Sign in with your email and password."}
        </p>
      </div>
      {mode === "signup" && (
        <label className="block text-sm">
          <span className="text-slate-700">Name</span>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alex Creator"
          />
        </label>
      )}
      <label className="block text-sm">
        <span className="text-slate-700">Email</span>
        <input
          required
          type="email"
          autoComplete="email"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </label>
      <label className="block text-sm">
        <span className="text-slate-700">Password</span>
        <input
          required
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          minLength={8}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {signupNotice && <p className="text-sm text-indigo-700">{signupNotice}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
      >
        {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
      </button>
      <p className="text-center text-sm text-slate-500">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <Link className="text-indigo-700 hover:underline" href="/sign-in">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link className="text-indigo-700 hover:underline" href="/sign-up">
              Create an account
            </Link>
          </>
        )}
      </p>
      {mode === "signup" && (
        <p className="text-center text-xs text-slate-400">
          By creating an account you agree to our{" "}
          <Link className="hover:underline" href="/terms">
            Terms
          </Link>{" "}
          and{" "}
          <Link className="hover:underline" href="/privacy">
            Privacy Policy
          </Link>
          .
        </p>
      )}
    </form>
  );
}
