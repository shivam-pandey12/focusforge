"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import PublicHeader from "@/components/PublicHeader";
import StatusMessage from "@/components/StatusMessage";
import TrustFooter from "@/components/TrustFooter";
import { firebaseAuth } from "@/lib/firebase/config";
import { useAuth } from "@/hooks/useAuth";

const feedbackTypes = [
  ["bug", "Report a bug"],
  ["feature", "Suggest a feature"],
  ["rating", "Rate experience"],
  ["other", "Other feedback"]
] as const;

const severities = [
  ["low", "Low"],
  ["medium", "Medium"],
  ["high", "High"],
  ["critical", "Critical"]
] as const;

export default function FeedbackPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    type: "bug",
    title: "",
    description: "",
    severity: "medium",
    relatedRoute: "",
    deviceInfo: "",
    rating: 5,
    email: user?.email ?? ""
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      email: current.email || user?.email || "",
      relatedRoute: current.relatedRoute || (typeof window !== "undefined" ? window.location.pathname : "")
    }));
  }, [user?.email]);

  async function submitFeedback() {
    setSaving(true);
    setSuccess(null);
    setError(null);

    try {
      const token = await firebaseAuth?.currentUser?.getIdToken().catch(() => undefined);
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          ...form,
          email: form.email || user?.email || "",
          browserInfo: typeof navigator !== "undefined" ? navigator.userAgent : "",
          pageUrl: typeof window !== "undefined" ? window.location.href : "",
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : ""
        })
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string; id?: string };

      if (!response.ok) {
        throw new Error(body.error || "Could not submit feedback.");
      }

      setSuccess("Thanks for helping improve FocusForge.");
      setForm((current) => ({ ...current, title: "", description: "" }));
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Could not submit feedback.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen">
      {user ? <Navbar email={user.email} /> : <PublicHeader subtitle="Beta feedback" />}

      <section className="page-shell space-y-6">
        <PageHeader
          eyebrow="Feedback"
          title="Help make FocusForge sharper."
          subtitle="Report bugs, suggest improvements, or rate the current beta experience."
          action={<Link className="btn-secondary" href="/support">Need support?</Link>}
        />
        {success ? <StatusMessage tone="success">{success}</StatusMessage> : null}
        {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}

        <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <section className="card p-6 sm:p-8">
            <div className="grid gap-5">
              <label className="grid gap-2">
                <span className="label">Feedback type</span>
                <select className="input" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
                  {feedbackTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="label">Title</span>
                <input className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Short title" />
              </label>
              <div className="grid gap-5 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="label">Severity</span>
                  <select className="input" value={form.severity} onChange={(event) => setForm({ ...form, severity: event.target.value })}>
                    {severities.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="label">Related page optional</span>
                  <input className="input" value={form.relatedRoute} onChange={(event) => setForm({ ...form, relatedRoute: event.target.value })} placeholder="/calendar" />
                </label>
              </div>
              <label className="grid gap-2">
                <span className="label">Description</span>
                <textarea className="input min-h-40" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="What should we know?" />
              </label>
              <label className="grid gap-2">
                <span className="label">Device/browser note optional</span>
                <input className="input" value={form.deviceInfo} onChange={(event) => setForm({ ...form, deviceInfo: event.target.value })} placeholder="Android Chrome, laptop Edge, iPhone Safari..." />
              </label>
              {form.type === "rating" ? (
                <label className="grid gap-2">
                  <span className="label">Rating</span>
                  <input className="input" min={1} max={5} type="number" value={form.rating} onChange={(event) => setForm({ ...form, rating: Number(event.target.value) })} />
                </label>
              ) : null}
              <label className="grid gap-2">
                <span className="label">Email optional</span>
                <input className="input" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" />
              </label>
              <button className="btn-primary w-full sm:w-fit" disabled={saving} type="button" onClick={submitFeedback}>
                {saving ? "Submitting" : "Submit feedback"}
              </button>
            </div>
          </section>

          <aside className="card-muted p-6 sm:p-8">
            <p className="eyebrow">Beta note</p>
            <h2 className="mt-3 text-2xl font-bold text-forge-text">No public roadmap yet.</h2>
            <p className="mt-3 text-base leading-7 text-forge-muted">
              Feedback is private for now. We review issues and suggestions internally before marking them planned or fixed.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link className="btn-secondary" href="/docs">Read docs</Link>
              <Link className="btn-ghost" href="/support">Payment or account help</Link>
            </div>
          </aside>
        </div>
      </section>
      <TrustFooter />
    </main>
  );
}
