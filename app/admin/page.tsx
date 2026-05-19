"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import EmptyState from "@/components/EmptyState";
import MetricCard from "@/components/MetricCard";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import SectionHeader from "@/components/SectionHeader";
import StatusMessage from "@/components/StatusMessage";
import { firebaseAuth } from "@/lib/firebase/config";
import { useAuth } from "@/hooks/useAuth";

type RecentItem = {
  id: string;
  userId?: string;
  name?: string;
  email?: string;
  status?: string;
  plan?: string;
  billingCycle?: string;
  category?: string;
  type?: string;
  severity?: string;
  subject?: string;
  title?: string;
  messagePreview?: string;
  relatedRoute?: string;
  paymentId?: string;
  orderId?: string;
  path?: string;
  deviceType?: string;
  amount?: number | null;
  createdAt?: string | null;
};

type AdminSummary = {
  counts: {
    totalUsers: number;
    profileCount: number;
    paidUsers: number;
    freeUsers: number;
    proUsers: number;
    eliteUsers: number;
    newUsersToday: number;
    newUsers7d: number;
    returningUsers7d: number;
  };
  traffic: {
    totalImpressions: number;
    todayImpressions: number;
    weekImpressions: number;
    uniqueVisitors7d: number;
    topRoutes: { path: string; count: number }[];
  };
  revenue: {
    totalRevenue: number;
    proRevenue: number;
    eliteRevenue: number;
    monthlyRevenue: number;
    seasonRevenue: number;
    yearlyRevenue: number;
    paidPayments: number;
  };
  recentPayments: RecentItem[];
  recentSupportTickets: RecentItem[];
  recentFeedback: RecentItem[];
  recentTraffic: RecentItem[];
};

type UserLookup = {
  user: {
    uid: string;
    email: string;
    displayName: string;
    disabled: boolean;
    createdAt: string;
    lastSignInAt: string;
  };
  profile: {
    displayName: string;
    studyGoal: string;
    plan: string;
    subscriptionStatus: string;
    billingCycle: string;
    planStartedAt: string | null;
    planExpiresAt: string | null;
    trialEndsAt: string | null;
    cancelAtPeriodEnd: boolean;
    dailyStudyTargetMinutes: number;
    preferredFocusDuration: number;
    notificationEnabled: boolean;
    emailNotificationsEnabled: boolean;
    onboardingCompleted: boolean;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    deletionRequested: boolean;
  };
};

type AdminEditForm = {
  displayName: string;
  disabled: boolean;
  studyGoal: string;
  plan: string;
  subscriptionStatus: string;
  billingCycle: string;
  planExpiresAt: string;
  trialEndsAt: string;
  cancelAtPeriodEnd: boolean;
  dailyStudyTargetMinutes: number;
  preferredFocusDuration: number;
  notificationEnabled: boolean;
  emailNotificationsEnabled: boolean;
  onboardingCompleted: boolean;
};

const PLAN_OPTIONS = ["free", "pro", "elite"];
const STATUS_OPTIONS = ["free", "trial", "active", "inactive", "expired", "manual"];
const CYCLE_OPTIONS = ["none", "monthly", "season", "yearly"];
const SUPPORT_STATUSES = ["open", "in_review", "resolved"];
const FEEDBACK_STATUSES = ["new", "reviewed", "planned", "fixed", "closed"];

function formatCurrency(paise: number): string {
  return `INR ${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

function formatDate(value?: string | null): string {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function toDateTimeInput(value?: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 16);
}

function buildEditForm(result: UserLookup): AdminEditForm {
  return {
    displayName: result.profile.displayName || result.user.displayName || "",
    disabled: result.user.disabled,
    studyGoal: result.profile.studyGoal || "",
    plan: result.profile.plan || "free",
    subscriptionStatus: result.profile.subscriptionStatus || "free",
    billingCycle: result.profile.billingCycle || "none",
    planExpiresAt: toDateTimeInput(result.profile.planExpiresAt),
    trialEndsAt: toDateTimeInput(result.profile.trialEndsAt),
    cancelAtPeriodEnd: result.profile.cancelAtPeriodEnd,
    dailyStudyTargetMinutes: result.profile.dailyStudyTargetMinutes || 120,
    preferredFocusDuration: result.profile.preferredFocusDuration || 25,
    notificationEnabled: result.profile.notificationEnabled,
    emailNotificationsEnabled: result.profile.emailNotificationsEnabled,
    onboardingCompleted: result.profile.onboardingCompleted
  };
}

function RecentList({
  title,
  items,
  collection,
  updatingId,
  onStatusChange
}: {
  title: string;
  items: RecentItem[];
  collection?: "supportTickets" | "feedback";
  updatingId?: string | null;
  onStatusChange?: (collection: "supportTickets" | "feedback", id: string, status: string) => void;
}) {
  const statusOptions = collection === "supportTickets" ? SUPPORT_STATUSES : FEEDBACK_STATUSES;

  return (
    <section className="card p-6">
      <SectionHeader title={title} subtitle="Recent sanitized records only." />
      <div className="mt-5 grid gap-3">
        {items.length ? items.map((item) => (
          <article className="rounded-2xl border border-forge-line bg-white/72 p-4" key={item.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-bold text-forge-text">{item.subject || item.title || item.path || item.email || item.id}</p>
              <span className="badge">{item.status || item.plan || item.type || item.deviceType || "record"}</span>
            </div>
            <p className="mt-2 text-sm font-semibold text-forge-muted">
              {[item.category, item.billingCycle, item.type, item.severity, item.amount ? formatCurrency(item.amount) : "", item.createdAt ? formatDate(item.createdAt) : ""].filter(Boolean).join(" / ")}
            </p>
            {item.messagePreview ? <p className="mt-3 text-sm leading-6 text-forge-muted">{item.messagePreview}</p> : null}
            {item.relatedRoute || item.paymentId || item.orderId ? (
              <p className="mt-2 break-all text-xs font-bold uppercase tracking-[0.12em] text-forge-muted">
                {[item.relatedRoute, item.paymentId, item.orderId].filter(Boolean).join(" / ")}
              </p>
            ) : null}
            {collection && onStatusChange ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {statusOptions.map((status) => (
                  <button
                    className={item.status === status ? "btn-primary" : "btn-ghost"}
                    disabled={updatingId === item.id}
                    key={status}
                    type="button"
                    onClick={() => onStatusChange(collection, item.id, status)}
                  >
                    {updatingId === item.id && item.status !== status ? "Saving" : status.replace("_", " ")}
                  </button>
                ))}
              </div>
            ) : null}
          </article>
        )) : <EmptyState title="No records yet" description="Recent records will appear after users submit activity." />}
      </div>
    </section>
  );
}

function FieldRow({ label, value }: { label: string; value: string | number | boolean }) {
  return (
    <div className="rounded-2xl border border-forge-line bg-white/70 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-forge-muted">{label}</p>
      <p className="mt-2 break-words text-base font-bold text-forge-text">{String(value)}</p>
    </div>
  );
}

function AdminContent() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [lookup, setLookup] = useState("");
  const [lookupResult, setLookupResult] = useState<UserLookup | null>(null);
  const [editForm, setEditForm] = useState<AdminEditForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [supportStatusUpdating, setSupportStatusUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const getToken = useCallback(async () => {
    const token = await firebaseAuth?.currentUser?.getIdToken();

    if (!token) {
      throw new Error("Login is required.");
    }

    return token;
  }, []);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const response = await fetch("/api/admin/summary", { headers: { Authorization: `Bearer ${token}` } });
      const body = (await response.json().catch(() => ({}))) as AdminSummary & { error?: string };

      if (!response.ok) {
        throw new Error(body.error || "Could not load admin summary.");
      }

      setSummary(body);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Could not load admin summary.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  const runLookup = useCallback(async () => {
    setError(null);
    setSuccess(null);
    setLookupResult(null);
    setEditForm(null);

    try {
      const token = await getToken();
      const response = await fetch("/api/admin/user-lookup", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ query: lookup })
      });
      const body = (await response.json().catch(() => ({}))) as UserLookup & { error?: string };

      if (!response.ok) {
        throw new Error(body.error || "Could not find user.");
      }

      setLookupResult(body);
      setEditForm(buildEditForm(body));
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Could not find user.");
    }
  }, [getToken, lookup]);

  const saveUserChanges = useCallback(async () => {
    if (!lookupResult || !editForm) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const token = await getToken();
      const response = await fetch("/api/admin/user-update", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          uid: lookupResult.user.uid,
          ...editForm
        })
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error || "Could not save user changes.");
      }

      setSuccess("User controls saved. Profile and billing audit were updated safely.");
      await runLookup();
      await loadSummary();
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Could not save user changes.");
    } finally {
      setSaving(false);
    }
  }, [editForm, getToken, loadSummary, lookupResult, runLookup]);

  const updateSupportStatus = useCallback(async (collection: "supportTickets" | "feedback", id: string, status: string) => {
    setSupportStatusUpdating(id);
    setError(null);
    setSuccess(null);

    try {
      const token = await getToken();
      const response = await fetch("/api/admin/support-status", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ collection, id, status })
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error || "Could not update status.");
      }

      setSuccess("Support status updated.");
      await loadSummary();
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Could not update support status.");
    } finally {
      setSupportStatusUpdating(null);
    }
  }, [getToken, loadSummary]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const routeRows = useMemo(() => summary?.traffic.topRoutes ?? [], [summary]);

  return (
    <>
      <Navbar email={user?.email} />
      <main className="page-shell space-y-6">
        <PageHeader eyebrow="Admin only" title="FocusForge control dashboard." subtitle="A server-verified command center for support, traffic, revenue, users, and safe profile controls." />
        {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage tone="success">{success}</StatusMessage> : null}
        <button className="btn-secondary w-fit" type="button" onClick={loadSummary} disabled={loading}>
          {loading ? "Refreshing" : "Refresh admin summary"}
        </button>

        {summary ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Total users" value={summary.counts.totalUsers} detail={`${summary.counts.profileCount} profiles`} tone="gold" />
              <MetricCard label="New users today" value={summary.counts.newUsersToday} detail={`${summary.counts.newUsers7d} in 7 days`} />
              <MetricCard label="Returned users" value={summary.counts.returningUsers7d} detail="Signed in again in 7 days" tone="success" />
              <MetricCard label="Total revenue" value={formatCurrency(summary.revenue.totalRevenue)} detail={`${summary.revenue.paidPayments} paid payments`} tone="gold" />
            </section>

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Traffic impressions" value={summary.traffic.totalImpressions} detail={`${summary.traffic.todayImpressions} today`} />
              <MetricCard label="7-day impressions" value={summary.traffic.weekImpressions} detail={`${summary.traffic.uniqueVisitors7d} unique visitors`} />
              <MetricCard label="Pro revenue" value={formatCurrency(summary.revenue.proRevenue)} detail={`${summary.counts.proUsers} Pro users`} />
              <MetricCard label="Elite revenue" value={formatCurrency(summary.revenue.eliteRevenue)} detail={`${summary.counts.eliteUsers} Elite users`} />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <article className="card p-6">
                <SectionHeader title="Plan and revenue mix" subtitle="Revenue uses verified or paid payment documents, stored in paise." />
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <FieldRow label="Free users" value={summary.counts.freeUsers} />
                  <FieldRow label="Paid users" value={summary.counts.paidUsers} />
                  <FieldRow label="Monthly revenue" value={formatCurrency(summary.revenue.monthlyRevenue)} />
                  <FieldRow label="Season revenue" value={formatCurrency(summary.revenue.seasonRevenue)} />
                  <FieldRow label="Yearly revenue" value={formatCurrency(summary.revenue.yearlyRevenue)} />
                </div>
              </article>

              <article className="card p-6">
                <SectionHeader title="Top routes" subtitle="Recent traffic events only; no raw request bodies are stored." />
                <div className="mt-5 grid gap-3">
                  {routeRows.length ? routeRows.map((route) => (
                    <div className="flex items-center justify-between gap-4 rounded-2xl border border-forge-line bg-white/72 p-4" key={route.path}>
                      <span className="break-all text-sm font-bold text-forge-text">{route.path}</span>
                      <span className="badge">{route.count}</span>
                    </div>
                  )) : <EmptyState title="No traffic yet" description="Traffic appears after users browse with the server env configured." />}
                </div>
              </article>
            </section>

            <section className="card p-6">
              <SectionHeader title="User control lookup" subtitle="Search by email or UID. Results are styled and editable; no raw JSON panel." />
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <input className="input" value={lookup} onChange={(event) => setLookup(event.target.value)} placeholder="email@example.com or uid" />
                <button className="btn-primary" type="button" onClick={runLookup}>Check user</button>
              </div>

              {lookupResult && editForm ? (
                <div className="mt-6 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
                  <aside className="rounded-3xl border border-forge-line bg-forge-surfaceAlt/70 p-5 shadow-soft">
                    <p className="eyebrow">User identity</p>
                    <h2 className="mt-3 break-words text-3xl font-bold text-forge-text">{lookupResult.user.displayName || lookupResult.user.email}</h2>
                    <p className="mt-2 break-all text-base font-semibold text-forge-muted">{lookupResult.user.email}</p>
                    <div className="mt-5 grid gap-3">
                      <FieldRow label="UID" value={lookupResult.user.uid} />
                      <FieldRow label="Created" value={formatDate(lookupResult.user.createdAt)} />
                      <FieldRow label="Last sign in" value={formatDate(lookupResult.user.lastSignInAt)} />
                      <FieldRow label="Payment ID" value={lookupResult.profile.razorpayPaymentId || "Not set"} />
                      <FieldRow label="Deletion requested" value={lookupResult.profile.deletionRequested} />
                    </div>
                  </aside>

                  <section className="rounded-3xl border border-forge-line bg-white/78 p-5 shadow-soft">
                    <SectionHeader title="Editable admin controls" subtitle="Safe profile and plan fields only. No user deletion controls are exposed here." />
                    <div className="mt-5 grid gap-4 lg:grid-cols-2">
                      <label className="grid gap-2">
                        <span className="label">Display name</span>
                        <input className="input" value={editForm.displayName} onChange={(event) => setEditForm({ ...editForm, displayName: event.target.value })} />
                      </label>
                      <label className="grid gap-2">
                        <span className="label">Study goal</span>
                        <input className="input" value={editForm.studyGoal} onChange={(event) => setEditForm({ ...editForm, studyGoal: event.target.value })} />
                      </label>
                      <label className="grid gap-2">
                        <span className="label">Plan</span>
                        <select className="input" value={editForm.plan} onChange={(event) => setEditForm({ ...editForm, plan: event.target.value })}>
                          {PLAN_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                      </label>
                      <label className="grid gap-2">
                        <span className="label">Subscription status</span>
                        <select className="input" value={editForm.subscriptionStatus} onChange={(event) => setEditForm({ ...editForm, subscriptionStatus: event.target.value })}>
                          {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                      </label>
                      <label className="grid gap-2">
                        <span className="label">Billing cycle</span>
                        <select className="input" value={editForm.billingCycle} onChange={(event) => setEditForm({ ...editForm, billingCycle: event.target.value })}>
                          {CYCLE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                      </label>
                      <label className="grid gap-2">
                        <span className="label">Plan expiry</span>
                        <input className="input" type="datetime-local" value={editForm.planExpiresAt} onChange={(event) => setEditForm({ ...editForm, planExpiresAt: event.target.value })} />
                      </label>
                      <label className="grid gap-2">
                        <span className="label">Trial ends</span>
                        <input className="input" type="datetime-local" value={editForm.trialEndsAt} onChange={(event) => setEditForm({ ...editForm, trialEndsAt: event.target.value })} />
                      </label>
                      <label className="grid gap-2">
                        <span className="label">Daily target minutes</span>
                        <input className="input" type="number" min={1} max={1440} value={editForm.dailyStudyTargetMinutes} onChange={(event) => setEditForm({ ...editForm, dailyStudyTargetMinutes: Number(event.target.value) })} />
                      </label>
                      <label className="grid gap-2">
                        <span className="label">Focus duration</span>
                        <input className="input" type="number" min={5} max={180} value={editForm.preferredFocusDuration} onChange={(event) => setEditForm({ ...editForm, preferredFocusDuration: Number(event.target.value) })} />
                      </label>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {[
                        ["disabled", "Disable login"],
                        ["cancelAtPeriodEnd", "Cancel at period end"],
                        ["notificationEnabled", "In-app reminders"],
                        ["emailNotificationsEnabled", "Email notifications"],
                        ["onboardingCompleted", "Onboarding completed"]
                      ].map(([key, label]) => (
                        <label className="flex items-center gap-3 rounded-2xl border border-forge-line bg-forge-surfaceAlt/60 p-4 text-sm font-bold text-forge-text" key={key}>
                          <input
                            checked={Boolean(editForm[key as keyof AdminEditForm])}
                            onChange={(event) => setEditForm({ ...editForm, [key]: event.target.checked })}
                            type="checkbox"
                          />
                          {label}
                        </label>
                      ))}
                    </div>

                    <button className="btn-primary mt-6" type="button" onClick={saveUserChanges} disabled={saving}>
                      {saving ? "Saving user controls" : "Save user controls"}
                    </button>
                  </section>
                </div>
              ) : null}
            </section>

            <div className="grid gap-6 xl:grid-cols-4">
              <RecentList title="Recent payments" items={summary.recentPayments} />
              <RecentList collection="supportTickets" title="Recent support tickets" items={summary.recentSupportTickets} onStatusChange={updateSupportStatus} updatingId={supportStatusUpdating} />
              <RecentList collection="feedback" title="Recent feedback" items={summary.recentFeedback} onStatusChange={updateSupportStatus} updatingId={supportStatusUpdating} />
              <RecentList title="Recent traffic" items={summary.recentTraffic} />
            </div>
          </>
        ) : loading ? (
          <section className="card p-8 text-base font-bold text-forge-muted">Loading admin summary...</section>
        ) : null}
      </main>
    </>
  );
}

export default function AdminPage() {
  return (
    <AuthGuard>
      <AdminContent />
    </AuthGuard>
  );
}
