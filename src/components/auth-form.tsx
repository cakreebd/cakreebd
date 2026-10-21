"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function AuthForm({
  mode,
  initialRole = "JOB_SEEKER",
}: {
  mode: "login" | "register";
  initialRole?: "JOB_SEEKER" | "EMPLOYER";
}) {
  const router = useRouter();
  const [role, setRole] = useState(initialRole);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const payload = mode === "login"
      ? { email: form.get("email"), password: form.get("password") }
      : {
          name: form.get("name"),
          email: form.get("email"),
          password: form.get("password"),
          role,
          ...(role === "EMPLOYER" ? { companyName: form.get("companyName") } : {}),
        };

    try {
      const response = await fetch(`/api/auth/${mode === "login" ? "login" : "register"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "We could not complete your request. Please try again.");
        return;
      }
      setSuccess(mode === "register" ? "Your account is ready. Taking you to your dashboard..." : "Welcome back. Signing you in...");
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-card">
      <p className="section-kicker">{mode === "login" ? "WELCOME BACK" : "GET STARTED WITH CAKREE"}</p>
      <h1>{mode === "login" ? "Good to see you again." : "Find your next move."}</h1>
      <p className="auth-intro">{mode === "login" ? "Sign in to continue to your Cakree account." : "Create an account to apply for jobs or meet your next great hire."}</p>
      {mode === "register" && (
        <div className="role-switch" aria-label="Choose account type">
          <button aria-pressed={role === "JOB_SEEKER"} onClick={() => setRole("JOB_SEEKER")} type="button">I’m looking for a job</button>
          <button aria-pressed={role === "EMPLOYER"} onClick={() => setRole("EMPLOYER")} type="button">I’m hiring</button>
        </div>
      )}
      <form className="stacked-form" onSubmit={handleSubmit}>
        {mode === "register" && (
          <label>
            Your name
            <input autoComplete="name" maxLength={80} minLength={2} name="name" placeholder="e.g. Ayesha Rahman" required />
          </label>
        )}
        {mode === "register" && role === "EMPLOYER" && (
          <label>
            Company name
            <input autoComplete="organization" maxLength={120} minLength={2} name="companyName" placeholder="e.g. Cakree Technologies" required />
          </label>
        )}
        <label>
          Email address
          <input autoComplete="email" maxLength={254} name="email" placeholder="you@example.com" required type="email" />
        </label>
        <label>
          Password
          <input autoComplete={mode === "login" ? "current-password" : "new-password"} maxLength={128} minLength={mode === "login" ? 1 : 10} name="password" placeholder={mode === "login" ? "Enter your password" : "At least 10 characters"} required type="password" />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        {success && <p className="form-success" role="status">{success}</p>}
        <button className="button button-primary auth-submit" disabled={busy} type="submit">
          {busy ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>
      <p className="auth-switch">
        {mode === "login" ? "New to Cakree?" : "Already have an account?"}{" "}
        <Link href={mode === "login" ? "/register" : "/login"}>{mode === "login" ? "Create an account" : "Sign in"}</Link>
      </p>
    </section>
  );
}
