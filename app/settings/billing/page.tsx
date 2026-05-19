"use client";

import Link from "next/link";
import { useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import FeatureLockedCard from "@/components/FeatureLockedCard";
import LoadingState from "@/components/LoadingState";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import PlanBadge from "@/components/PlanBadge";
import SectionHeader from "@/components/SectionHeader";
import StatusMessage from "@/components/StatusMessage";
import { CHECKOUT_BILLING_CYCLES, PAYMENT_ACTIVATION_MESSAGE, PAYMENTS_ACTIVE, getBillingCycleLabel } from "@/lib/billing/config";
import { firebaseAuth } from "@/lib/firebase/config";
import { FEATURE_LABELS, PLAN_ORDER, ROUTE_ACCESS_AUDIT, canUseFeature, formatLimit, getPlanDefinition, type CheckoutBillingCycle, type PaidPlanTier, type PlanTier } from "@/lib/plans";
import { useAuth } from "@/hooks/useAuth";
import { usePayments } from "@/hooks/usePayments";
import { usePlan } from "@/hooks/usePlan";
import { useRazorpayCheckout } from "@/hooks/useRazorpayCheckout";

interface TimestampLike {
  toDate: () => Date;
}

function isTimestampLike(value: unknown): value is TimestampLike {
  return (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as TimestampLike).toDate === "function"
  );
}

function formatDate(value: unknown): string {
  if (!value) {
    return "Not set";
  }

  if (isTimestampLike(value)) {
    return value.toDate().toLocaleDateString();
  }

  return "Not set";
}

function BillingContent() {
  const { user, loading: authLoading } = useAuth();
  const planState = usePlan(user?.uid);
  const paymentsState = usePayments(user?.uid);
  const checkout = useRazorpayCheckout();
  const [switching, setSwitching] = useState<PlanTier | null>(null);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isDevelopment = process.env.NODE_ENV === "development";
  const profile = planState.profile;
  const definition = getPlanDefinition(planState.plan);
  const latestPayment = paymentsState.payments[0];

  if (authLoading || !user) {
    return <LoadingState label="Loading billing" />;
  }

  async function handleManualPlanSwitch(nextPlan: PlanTier) {
    if (!user) {
      return;
    }

    setSwitching(nextPlan);
    setMessage(null);
    setError(null);

    try {
      const token = await firebaseAuth?.currentUser?.getIdToken();

      if (!token) {
        throw new Error("Login is required before switching plans.");
      }

      const response = await fetch("/api/billing/dev-switch-plan", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ plan: nextPlan })
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error || "Could not switch plan.");
      }

      setMessage(`Developer testing plan switched to ${getPlanDefinition(nextPlan).displayName}.`);
      await Promise.all([planState.refreshProfile(), paymentsState.refreshPayments()]);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Could not switch plan.");
    } finally {
      setSwitching(null);
    }
  }

  async function handleUpgrade(nextPlan: PaidPlanTier, cycle: CheckoutBillingCycle) {
    if (!PAYMENTS_ACTIVE) {
      setMessage(null);
      setError(null);
      return;
    }

    setUpgrading(`${nextPlan}-${cycle}`);
    setMessage(null);
    setError(null);

    try {
      await checkout.startCheckout(nextPlan, cycle);
      await Promise.all([planState.refreshProfile(), paymentsState.refreshPayments()]);
    } finally {
      setUpgrading(null);
    }
  }

  async function handleRefreshBilling() {
    setMessage(null);
    setError(null);

    try {
      const token = await firebaseAuth?.currentUser?.getIdToken();

      if (token) {
        const response = await fetch("/api/billing/refresh-status", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        });
        const body = (await response.json().catch(() => ({}))) as { error?: string };

        if (!response.ok) {
          throw new Error(body.error || "Could not refresh billing status.");
        }
      }

      await Promise.all([planState.refreshProfile(), paymentsState.refreshPayments()]);
      setMessage("Billing status refreshed.");
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Could not refresh billing status.");
    }
  }

  return (
    <>
      <Navbar email={user.email} />
      <main className="page-shell space-y-6">
        <PageHeader
          eyebrow="Billing"
          title="Your FocusForge plan."
          subtitle="Manage Razorpay upgrades, billing status, and plan access. Paid plans activate only after secure server verification."
          action={
            <div className="flex flex-wrap gap-2">
              <button className="btn-secondary" type="button" onClick={handleRefreshBilling}>
                Refresh billing status
              </button>
              <Link className="btn-secondary" href="/support?category=payment_issue">Payment issue? Get help</Link>
              <Link className="btn-secondary" href="/pricing">View pricing</Link>
            </div>
          }
        />

        {planState.error || paymentsState.error || error ? <StatusMessage tone="error">{error ?? planState.error ?? paymentsState.error}</StatusMessage> : null}
        {message ? <StatusMessage tone="success">{message}</StatusMessage> : null}
        {!PAYMENTS_ACTIVE ? <StatusMessage tone="warning">{PAYMENT_ACTIVATION_MESSAGE}</StatusMessage> : null}
        {checkout.message ? <StatusMessage tone={checkout.status === "verified" ? "success" : "info"}>{checkout.message}</StatusMessage> : null}
        {checkout.error ? <StatusMessage tone="error">{checkout.error}</StatusMessage> : null}
        <StatusMessage tone="info">
          Razorpay payments are verified server-side. If money was deducted but your plan did not activate, refresh billing status, confirm the same login account, then contact support with your Razorpay payment ID or order ID.
        </StatusMessage>
        {planState.expired ? (
          <StatusMessage tone="warning">
            Your paid access has expired. Your data is safe, and effective access is currently Forge Starter.
          </StatusMessage>
        ) : null}

        {!planState.ready || planState.loading ? (
          <LoadingState label="Loading plan" mode="inline" />
        ) : (
          <>
            <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
              <article className="card p-6 sm:p-8">
                <PlanBadge plan={planState.plan} />
                <h2 className="mt-5 text-4xl font-bold text-forge-text">{definition.displayName}</h2>
                <p className="mt-3 text-base leading-7 text-forge-muted">{definition.description}</p>
                <dl className="mt-6 grid gap-3 text-base">
                  <div className="billing-row"><dt>Stored plan</dt><dd>{getPlanDefinition(planState.storedPlan).displayName}</dd></div>
                  <div className="billing-row"><dt>Effective access</dt><dd>{definition.displayName}</dd></div>
                  <div className="billing-row"><dt>Status</dt><dd>{profile?.subscriptionStatus ?? "free"}</dd></div>
                  <div className="billing-row"><dt>Billing cycle</dt><dd>{profile?.billingCycle && profile.billingCycle !== "none" ? getBillingCycleLabel(profile.billingCycle) : "none"}</dd></div>
                  <div className="billing-row"><dt>Plan started</dt><dd>{formatDate(profile?.planStartedAt)}</dd></div>
                  <div className="billing-row"><dt>Plan expires</dt><dd>{formatDate(profile?.planExpiresAt)}</dd></div>
                  <div className="billing-row"><dt>Trial ends</dt><dd>{formatDate(profile?.trialEndsAt)}</dd></div>
                  <div className="billing-row"><dt>Cancel at period end</dt><dd>{profile?.cancelAtPeriodEnd ? "Yes" : "No"}</dd></div>
                  <div className="billing-row"><dt>Last payment ID</dt><dd>{profile?.razorpayPaymentId ?? latestPayment?.razorpayPaymentId ?? "Not set"}</dd></div>
                </dl>
              </article>

              <article className="card p-6 sm:p-8">
                <SectionHeader title="Current plan limits" subtitle="Downgrades never delete your data. Locked data can be unlocked again by upgrading." />
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {Object.entries(planState.limits).map(([key, value]) => (
                    <div className="rounded-2xl border border-forge-line bg-white/75 px-4 py-3" key={key}>
                      <p className="text-sm font-bold uppercase tracking-[0.14em] text-forge-muted">{key.replace(/([A-Z])/g, " $1")}</p>
                      <p className="mt-1 text-xl font-bold text-forge-text">{formatLimit(value)}</p>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
              <article className="card p-6 sm:p-8">
                <SectionHeader
                  title="Upgrade or change plan"
                  subtitle={PAYMENTS_ACTIVE ? "Orders are created server-side and verified before access changes." : "Checkout is visible for plan review, but payments are waiting for Razorpay live activation."}
                />
                <div className="mt-6 grid gap-4">
                  {(["pro", "elite"] as PaidPlanTier[]).map((tier) => (
                    <div className="rounded-3xl border border-forge-line bg-white/75 p-4" key={tier}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <PlanBadge plan={tier} />
                          <p className="mt-2 text-sm font-semibold text-forge-muted">{getPlanDefinition(tier).description}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {CHECKOUT_BILLING_CYCLES.map((cycle) => (
                            <button
                              className={tier === "pro" ? "btn-primary" : "btn-secondary"}
                              disabled={!PAYMENTS_ACTIVE || checkout.busy || Boolean(upgrading)}
                              key={cycle}
                              type="button"
                              onClick={() => handleUpgrade(tier, cycle)}
                            >
                              {!PAYMENTS_ACTIVE ? "Activation waiting" : upgrading === `${tier}-${cycle}` ? "Preparing" : getBillingCycleLabel(cycle)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="card p-6 sm:p-8">
                <SectionHeader title="Recent real payments" subtitle="Only your own payment records are readable from the client." />
                {paymentsState.loading ? (
                  <LoadingState label="Loading payments" mode="inline" />
                ) : paymentsState.payments.length === 0 ? (
                  <p className="mt-6 rounded-2xl border border-forge-line bg-white/75 p-4 text-base font-semibold text-forge-muted">
                    No Razorpay orders yet. Your first verified payment will appear here.
                  </p>
                ) : (
                  <div className="mt-6 grid gap-3">
                    {paymentsState.payments.map((payment) => (
                      <div className="rounded-2xl border border-forge-line bg-white/75 p-4" key={payment.id}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-bold text-forge-text">{getPlanDefinition(payment.plan).displayName}</p>
                            <p className="text-sm font-semibold text-forge-muted">{payment.razorpayOrderId}</p>
                          </div>
                          <span className={payment.status === "verified" ? "badge badge-done" : "badge"}>
                            {payment.status}
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-semibold text-forge-muted">
                          {(payment.amount / 100).toLocaleString("en-IN", { style: "currency", currency: "INR" })} - {getBillingCycleLabel(payment.billingCycle)}
                        </p>
                      </div>
                    ))}
                    {paymentsState.hasMore ? (
                      <button className="btn-secondary w-full" type="button" onClick={paymentsState.loadMore}>
                        Load more payments
                      </button>
                    ) : null}
                  </div>
                )}
              </article>
            </section>

            <section className="card p-6 sm:p-8">
              <SectionHeader title="Feature access audit" subtitle="Internal entitlement map for future Razorpay and backend validation." />
              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {Object.entries(ROUTE_ACCESS_AUDIT).map(([route, feature]) => (
                  <div className="rounded-2xl border border-forge-line bg-white/75 px-4 py-3" key={route}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-bold text-forge-text">{route}</span>
                      <span className={canUseFeature(planState.plan, feature) ? "badge badge-done" : "badge"}>{canUseFeature(planState.plan, feature) ? "Unlocked" : "Locked"}</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-forge-muted">{FEATURE_LABELS[feature]}</p>
                  </div>
                ))}
              </div>
            </section>

            {isDevelopment ? (
              <section className="card p-6 sm:p-8">
                <SectionHeader
                  eyebrow="Developer testing only"
                  title="Manual plan switch"
                  subtitle="This control is hidden in production and exists only for local entitlement testing."
                />
                <div className="mt-5 flex flex-wrap gap-3">
                  {PLAN_ORDER.map((tier) => (
                    <button
                      className={tier === planState.plan ? "btn-primary" : "btn-secondary"}
                      disabled={Boolean(switching)}
                      key={tier}
                      type="button"
                      onClick={() => handleManualPlanSwitch(tier)}
                    >
                      {switching === tier ? "Switching" : getPlanDefinition(tier).displayName}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            {!canUseFeature(planState.plan, "dataExport") ? (
              <FeatureLockedCard
                feature="dataExport"
                title="Data export is ready when you upgrade"
                description="Your data stays safe. Upgrade to Forge Pro to export sessions, tasks, notes, analytics, and full FocusForge data."
              />
            ) : null}
          </>
        )}
      </main>
    </>
  );
}

export default function BillingPage() {
  return (
    <AuthGuard>
      <BillingContent />
    </AuthGuard>
  );
}
