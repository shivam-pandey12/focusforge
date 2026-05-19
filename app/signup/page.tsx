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
import { getFriendlyAuthError, signInWithGoogle, signUpWithEmail } from "@/lib/firebase/auth";

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
        <p className="eyebrow">Start focused</p>
        <h1 className="mt-3 max-w-xl text-5xl font-bold leading-[1.04] text-forge-text sm:text-6xl">
          Quiet focus. Real progress.
        </h1>
        <p className="mt-5 max-w-lg text-lg leading-8 text-forge-muted">
          Create a calm study workspace for tasks, sessions, revisions, habits, goals, and reviews.
        </p>
      </div>

      <div className="auth-focus-card">
        {["Create your workspace", "Set one study target", "Start the first session"].map((item, index) => (
          <div className="auth-focus-row" key={item}>
            <span>{index + 1}</span>
            <p>{item}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}

export default function SignupPage() {
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
      await signUpWithEmail(trimmedEmail, password);
      router.replace("/dashboard");
    } catch (currentError) {
      setError(getFriendlyAuthError(currentError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignup() {
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
    return <LoadingState label="Preparing your workspace" />;
  }

  return (
    <>
    <PublicHeader subtitle="Create account" primaryCtaHref="/login" primaryCtaLabel="Login" />
    <main className="auth-entry-shell">
      <section className="grid w-full max-w-6xl gap-6 lg:grid-cols-[0.96fr_0.84fr] lg:items-stretch">
        <AuthEntryPanel />

        <section className="auth-form-card">
          <Link href="/" className="mb-8 inline-flex items-center gap-3 text-sm font-bold text-forge-muted hover:text-forge-text">
            <BrandLogo className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-forge-line" />
            Back to FocusForge
          </Link>

          <p className="eyebrow">Create account</p>
          <h1 className="mt-3 text-4xl font-bold text-forge-text">Build your study system</h1>
          <p className="mt-4 text-base leading-7 text-forge-muted">
            Start with today&apos;s work, then let FocusForge track every finished focus session.
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
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            {(error ?? authStateError) ? <StatusMessage tone="error">{error ?? authStateError}</StatusMessage> : null}
            <button className="btn-primary w-full" type="submit" disabled={submitting}>
              {submitting ? "Creating account" : "Create account"}
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
            onClick={handleGoogleSignup}
          />

          <p className="mt-6 text-center text-base text-forge-muted">
            Already have an account?{" "}
            <Link className="font-semibold text-forge-gold hover:text-[#B98F54]" href="/login">
              Login
            </Link>
          </p>
        </section>
      </section>
    </main>
    </>
  );
}
