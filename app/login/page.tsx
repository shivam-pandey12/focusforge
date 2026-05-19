"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import BrandLogo from "@/components/BrandLogo";
import GoogleAuthButton from "@/components/GoogleAuthButton";
import LoadingState from "@/components/LoadingState";
import PoweredByMark from "@/components/PoweredByMark";
import PublicHeader from "@/components/PublicHeader";
import StatusMessage from "@/components/StatusMessage";
import { useAuth } from "@/hooks/useAuth";
import { getFriendlyAuthError, loginWithEmail, signInWithGoogle } from "@/lib/firebase/auth";

function AuthEntryPanel() {
  return (
    <aside className="auth-entry-panel">
      <div className="auth-entry-brand">
        <BrandLogo className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white p-2 shadow-glow ring-1 ring-forge-line" />
        <div>
          <p className="text-xl font-bold text-forge-text">FocusForge</p>
          <p className="text-sm font-semibold text-forge-muted">Quiet focus. Real progress.</p>
          <PoweredByMark compact className="mt-2" />
        </div>
      </div>

      <div className="mt-10">
        <p className="eyebrow">Today&apos;s Focus</p>
        <h1 className="mt-3 max-w-xl text-5xl font-bold leading-[1.04] text-forge-text sm:text-6xl">
          Quiet focus. Real progress.
        </h1>
        <p className="mt-5 max-w-lg text-lg leading-8 text-forge-muted">
          Return to your planner, start one session, and let completed work stay visible.
        </p>
      </div>

      <div className="auth-focus-card">
        {["Open today's tasks", "Start a focused timer", "Save progress when finished"].map((item, index) => (
          <div className="auth-focus-row" key={item}>
            <span>{index + 1}</span>
            <p>{item}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, error: authStateError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, router, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError("Email is required.");
      return;
    }

    if (!password) {
      setError("Password is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await loginWithEmail(trimmedEmail, password);
      router.replace("/dashboard");
    } catch (currentError) {
      setError(getFriendlyAuthError(currentError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    setGoogleSubmitting(true);
    setError(null);

    try {
      await signInWithGoogle();
      router.replace("/dashboard");
    } catch (currentError) {
      setError(getFriendlyAuthError(currentError));
    } finally {
      setGoogleSubmitting(false);
    }
  }

  if (loading || user) {
    return <LoadingState label="Checking your account" />;
  }

  return (
    <>
    <PublicHeader subtitle="Login" primaryCtaHref="/signup" primaryCtaLabel="Start free" />
    <main className="auth-entry-shell">
      <section className="grid w-full max-w-6xl gap-6 lg:grid-cols-[0.96fr_0.84fr] lg:items-stretch">
        <AuthEntryPanel />

        <section className="auth-form-card">
          <Link href="/" className="mb-8 inline-flex items-center gap-3 text-sm font-bold text-forge-muted hover:text-forge-text">
            <BrandLogo className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-forge-line" />
            Back to FocusForge
          </Link>

          <p className="eyebrow">Login</p>
          <h1 className="mt-3 text-4xl font-bold text-forge-text">Welcome back</h1>
          <p className="mt-4 text-base leading-7 text-forge-muted">
            Login to see today&apos;s tasks and continue your study streak.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-2">
              <span className="label">Email</span>
              <input
                className="input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="label">Password</span>
              <input
                className="input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            {(error ?? authStateError) ? <StatusMessage tone="error">{error ?? authStateError}</StatusMessage> : null}
            <button className="btn-primary w-full" type="submit" disabled={submitting}>
              {submitting ? "Logging in" : "Login"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-forge-line" />
            <span className="text-sm font-bold uppercase tracking-[0.16em] text-forge-muted">or</span>
            <div className="h-px flex-1 bg-forge-line" />
          </div>

          <GoogleAuthButton
            label="Continue with Google"
            loading={googleSubmitting}
            onClick={handleGoogleLogin}
          />

          <p className="mt-6 text-center text-base text-forge-muted">
            New to FocusForge?{" "}
            <Link className="font-semibold text-forge-gold hover:text-[#B98F54]" href="/signup">
              Create account
            </Link>
          </p>
        </section>
      </section>
    </main>
    </>
  );
}
