"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import PublicHeader from "@/components/PublicHeader";
import StatusMessage from "@/components/StatusMessage";
import TrustFooter from "@/components/TrustFooter";
import { firebaseAuth } from "@/lib/firebase/config";
import { SUPPORT_EMAIL } from "@/lib/support";
import { useAuth } from "@/hooks/useAuth";

const categories = [
  ["payment_issue", "Payment issue"],
  ["plan_not_active", "Plan not active"],
  ["bug_report", "Bug report"],
  ["feature_request", "Feature request"],
  ["account_data_issue", "Account/data issue"],
  ["other", "Other"]
] as const;

const severities = [
  ["low", "Low"],
  ["medium", "Medium"],
  ["high", "High"],
  ["critical", "Critical"]
] as const;

const supportEmail = SUPPORT_EMAIL;

export default function SupportPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: user?.email ?? "",
    category: "other",
    severity: "medium",
    subject: "",
    message: "",
    relatedRoute: "",
    paymentId: "",
    orderId: "",
    screenshotUrl: "",
    deviceInfo: ""
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const queryCategory = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("category") : "";
    setForm((current) => ({
      ...current,
      email: current.email || user?.email || "",
      category: queryCategory || current.category,
      relatedRoute: current.relatedRoute || (typeof window !== "undefined" ? window.location.pathname : "")
    }));
  }, [user?.email]);

  async function submitTicket() {
    setSaving(true);
    setSuccess(null);
    setError(null);

    try {
      const token = await firebaseAuth?.currentUser?.getIdToken().catch(() => undefined);
      const response = await fetch("/api/support/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          ...form,
          email: form.email || user?.email || "",
          browserInfo: typeof navigator !== "undefined" ? navigator.userAgent : ""
        })
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string; id?: string };

      if (!response.ok) {
        throw new Error(body.error || "Could not submit support request.");
      }

      setSuccess(`Support ticket ${body.id} created. Keep this ID for follow-up.`);
      setForm((current) => ({ ...current, subject: "", message: "", paymentId: "", orderId: "", screenshotUrl: "" }));
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Could not submit support request.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen">
      {user ? <Navbar email={user.email} /> : <PublicHeader subtitle="Support center" />}

      <section className="page-shell space-y-6">
        <PageHeader
          eyebrow="Support"
          title="Tell us what happened."
          subtitle="For payment, account, product, and beta issues, send enough context for a careful review."
          action={<Link className="btn-secondary" href="/docs#payment-issues">Payment help guide</Link>}
        />
        {success ? <StatusMessage tone="success">{success}</StatusMessage> : null}
        {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="card p-6 sm:p-8">
            <div className="grid gap-5">
              <label className="grid gap-2">
                <span className="label">Name optional</span>
                <input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Your name" />
              </label>
              <label className="grid gap-2">
                <span className="label">Email</span>
                <input className="input" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" />
              </label>
              <label className="grid gap-2">
                <span className="label">Category</span>
                <select className="input" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
                  {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
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
                  <input className="input" value={form.relatedRoute} onChange={(event) => setForm({ ...form, relatedRoute: event.target.value })} placeholder="/settings/billing" />
                </label>
              </div>
              <label className="grid gap-2">
                <span className="label">Subject</span>
                <input className="input" value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} placeholder="Short summary" />
              </label>
              <label className="grid gap-2">
                <span className="label">Message</span>
                <textarea className="input min-h-40" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder="What did you expect, what happened, and which page were you on?" />
              </label>
              <div className="grid gap-5 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="label">Razorpay payment ID optional</span>
                  <input className="input" value={form.paymentId} onChange={(event) => setForm({ ...form, paymentId: event.target.value })} />
                </label>
                <label className="grid gap-2">
                  <span className="label">Razorpay order ID optional</span>
                  <input className="input" value={form.orderId} onChange={(event) => setForm({ ...form, orderId: event.target.value })} />
                </label>
              </div>
              <label className="grid gap-2">
                <span className="label">Screenshot or link optional</span>
                <input className="input" value={form.screenshotUrl} onChange={(event) => setForm({ ...form, screenshotUrl: event.target.value })} placeholder="https://..." />
              </label>
              <label className="grid gap-2">
                <span className="label">Device/browser note optional</span>
                <input className="input" value={form.deviceInfo} onChange={(event) => setForm({ ...form, deviceInfo: event.target.value })} placeholder="Android Chrome, Windows Edge, iPhone Safari..." />
              </label>
              <button className="btn-primary w-full sm:w-fit" disabled={saving} type="button" onClick={submitTicket}>
                {saving ? "Submitting" : "Submit support request"}
              </button>
            </div>
          </div>

          <aside className="space-y-5">
            <section className="card-muted p-6">
              <p className="eyebrow">Payment help</p>
              <h2 className="mt-3 text-2xl font-bold text-forge-text">Money deducted but plan not active?</h2>
              <p className="mt-3 text-base leading-7 text-forge-muted">
                First refresh billing status, confirm you are using the same login account, then include your Razorpay payment ID or order ID. Your data is safe while the payment state is reviewed.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link className="btn-secondary" href="/settings/billing">Open billing</Link>
                <Link className="btn-ghost" href="/refund-policy">Refund policy</Link>
              </div>
            </section>
            <section className="card p-6">
              <p className="eyebrow">Email</p>
              <p className="mt-3 text-xl font-bold text-forge-text">{supportEmail}</p>
              <p className="mt-3 text-base leading-7 text-forge-muted">
                Do not send passwords, private keys, or sensitive personal documents.
              </p>
            </section>
          </aside>
        </section>
      </section>
      <TrustFooter />
    </main>
  );
}
