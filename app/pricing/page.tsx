"use client";

import Link from "next/link";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import PlanComparisonCard from "@/components/PlanComparisonCard";
import PublicHeader from "@/components/PublicHeader";
import StatusMessage from "@/components/StatusMessage";
import TrustFooter from "@/components/TrustFooter";
import { useAuth } from "@/hooks/useAuth";
import { usePlan } from "@/hooks/usePlan";
import { useRazorpayCheckout } from "@/hooks/useRazorpayCheckout";
import { CHECKOUT_BILLING_CYCLES, PAYMENT_ACTIVATION_MESSAGE, PAYMENTS_ACTIVE, getBillingCycleLabel } from "@/lib/billing/config";
import { FEATURE_LABELS, PLAN_ORDER, canUseFeature, getPlanDefinition, type CheckoutBillingCycle, type FeatureKey } from "@/lib/plans";

const comparisonFeatures: FeatureKey[] = [
  "focusTimer",
  "notes",
  "subjects",
  "timetable",
  "advancedTimetable",
  "homework",
  "examPlanner",
  "marksTracker",
  "revisionPlanner",
  "topicTracker",
  "backlogTracker",
  "dailyBattlePlan",
  "heatmap",
  "advancedAnalytics",
  "habits",
  "goals",
  "templates",
  "dataExport",
  "mockTests",
  "advancedMockAnalytics",
  "weakAreas",
  "productivityScore",
  "journal",
  "dailyReview",
  "weeklyReview"
];

const faqs = [
  {
    question: "Can I use FocusForge for free?",
    answer: "Yes. Forge Starter includes the planner foundation, normal timetable, calendar, focus, revision, reminders, marks, backlog, and a small daily battle plan with clear limits."
  },
  {
    question: "How are payments verified?",
    answer: "Razorpay Checkout creates an order from the server, then FocusForge activates Pro or Elite only after server-side payment verification or a verified webhook event."
  },
  {
    question: "What happens if I downgrade?",
    answer: "Your data is not deleted. Premium data stays safe and becomes readable or locked until you upgrade again."
  }
];

const limitRows = [
  ["Subjects", "5", "Unlimited", "Unlimited"],
  ["Normal timetable", "Included", "Included", "Included"],
  ["Advanced timetable", "Locked", "Included", "Included"],
  ["Marks entries", "20", "Unlimited", "Unlimited"],
  ["Backlog items", "20", "Unlimited", "Unlimited"],
  ["Battle plan", "3 items/day", "6 items/day", "6 items/day"],
  ["Mock analytics", "Locked", "Included", "Full reports"],
  ["Data export", "Locked", "Included", "Included"]
];

export default function PricingPage() {
  const { user, loading, error } = useAuth();
  const plan = usePlan(user?.uid);
  const checkout = useRazorpayCheckout();
  const [billingCycle, setBillingCycle] = useState<CheckoutBillingCycle>("monthly");
  const currentPlan = user ? plan.plan : undefined;

  return (
    <main className="min-h-screen">
      {user ? (
        <Navbar email={user.email} />
      ) : (
        <PublicHeader subtitle="Plans and billing" />
      )}

      <section className="page-shell space-y-8">
        <div className="pricing-hero">
          <p className="eyebrow">Pricing</p>
          <h1 className="mt-3 max-w-4xl text-5xl font-bold leading-[1.04] text-forge-text sm:text-6xl">
            Start free. Upgrade when FocusForge becomes your study system.
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-forge-muted">
            Free includes real value. Pro unlocks serious planning depth. Elite adds exam-performance and reflection tools.
          </p>
          {error ? <StatusMessage className="mt-6" tone="error">{error}</StatusMessage> : null}
          {!PAYMENTS_ACTIVE ? <StatusMessage className="mt-6" tone="warning">{PAYMENT_ACTIVATION_MESSAGE}</StatusMessage> : null}
          {checkout.message ? <StatusMessage className="mt-6" tone={checkout.status === "verified" ? "success" : "info"}>{checkout.message}</StatusMessage> : null}
          {checkout.error ? <StatusMessage className="mt-6" tone="error">{checkout.error}</StatusMessage> : null}
        </div>

        <div className="flex justify-center">
          <div className="rounded-full border border-forge-line bg-white/82 p-1 shadow-soft">
            {CHECKOUT_BILLING_CYCLES.map((cycle) => (
              <button
                className={billingCycle === cycle ? "rounded-full bg-forge-surfaceAlt px-5 py-2.5 text-sm font-bold text-forge-text" : "rounded-full px-5 py-2.5 text-sm font-bold text-forge-muted"}
                key={cycle}
                type="button"
                onClick={() => setBillingCycle(cycle)}
              >
                {getBillingCycleLabel(cycle)}
              </button>
            ))}
          </div>
        </div>

        <section className="grid gap-5 lg:grid-cols-3">
          {PLAN_ORDER.map((tier) => (
            <PlanComparisonCard
              billingCycle={billingCycle}
              currentPlan={currentPlan}
              key={tier}
              loggedIn={Boolean(user) && !loading}
              busy={checkout.busy}
              paymentsActive={PAYMENTS_ACTIVE}
              onUpgrade={(nextPlan) => checkout.startCheckout(nextPlan, billingCycle)}
              plan={tier}
            />
          ))}
        </section>

        <section className="card overflow-hidden p-6 sm:p-8">
          <div className="section-header">
            <div>
              <p className="eyebrow">Compare</p>
              <h2 className="section-title">Plan limits that matter</h2>
            </div>
          </div>
          <div className="mt-6">
            <div className="w-full sm:min-w-[44rem]">
              <div className="hidden grid-cols-[1.4fr_repeat(3,1fr)] gap-2 text-sm font-bold uppercase tracking-[0.14em] text-forge-muted sm:grid">
                <span>Limit</span>
                <span>Starter</span>
                <span>Pro</span>
                <span>Elite</span>
              </div>
              <div className="mt-3 grid gap-2">
                {limitRows.map(([label, starter, pro, elite]) => (
                  <div className="grid gap-2 rounded-2xl border border-forge-line bg-white/75 px-4 py-3 sm:grid-cols-[1.4fr_repeat(3,1fr)] sm:items-center" key={label}>
                    <span className="font-bold text-forge-text">{label}</span>
                    <span className="flex items-center justify-between gap-3 rounded-xl bg-forge-surfaceAlt/60 px-3 py-2 font-bold text-forge-muted sm:block sm:bg-transparent sm:px-0 sm:py-0">
                      <span className="text-xs uppercase tracking-[0.14em] sm:hidden">Starter</span>
                      {starter}
                    </span>
                    <span className="flex items-center justify-between gap-3 rounded-xl bg-forge-surfaceAlt/60 px-3 py-2 font-bold text-forge-gold sm:block sm:bg-transparent sm:px-0 sm:py-0">
                      <span className="text-xs uppercase tracking-[0.14em] text-forge-muted sm:hidden">Pro</span>
                      {pro}
                    </span>
                    <span className="flex items-center justify-between gap-3 rounded-xl bg-forge-surfaceAlt/60 px-3 py-2 font-bold text-forge-gold sm:block sm:bg-transparent sm:px-0 sm:py-0">
                      <span className="text-xs uppercase tracking-[0.14em] text-forge-muted sm:hidden">Elite</span>
                      {elite}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="card overflow-hidden p-6 sm:p-8">
          <div className="section-header">
            <div>
              <p className="eyebrow">Access</p>
              <h2 className="section-title">Feature access by plan</h2>
            </div>
          </div>
          <div className="mt-6">
            <div className="w-full sm:min-w-[44rem]">
              <div className="hidden grid-cols-[1.4fr_repeat(3,1fr)] gap-2 text-sm font-bold uppercase tracking-[0.14em] text-forge-muted sm:grid">
                <span>Feature</span>
                <span>Starter</span>
                <span>Pro</span>
                <span>Elite</span>
              </div>
              <div className="mt-3 grid gap-2">
                {comparisonFeatures.map((feature) => (
                  <div className="grid gap-2 rounded-2xl border border-forge-line bg-white/75 px-4 py-3 sm:grid-cols-[1.4fr_repeat(3,1fr)] sm:items-center" key={feature}>
                    <span className="font-bold text-forge-text">{FEATURE_LABELS[feature]}</span>
                    {PLAN_ORDER.map((tier) => (
                      <span
                        className={
                          canUseFeature(tier, feature)
                            ? "flex items-center justify-between gap-3 rounded-xl bg-forge-surfaceAlt/60 px-3 py-2 font-bold text-forge-gold sm:block sm:bg-transparent sm:px-0 sm:py-0"
                            : "flex items-center justify-between gap-3 rounded-xl bg-forge-surfaceAlt/60 px-3 py-2 text-forge-muted sm:block sm:bg-transparent sm:px-0 sm:py-0"
                        }
                        key={tier}
                      >
                        <span className="text-xs uppercase tracking-[0.14em] text-forge-muted sm:hidden">{getPlanDefinition(tier).displayName}</span>
                        {canUseFeature(tier, feature) ? "Included" : "Locked"}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          {faqs.map((item) => (
            <article className="interactive-card" key={item.question}>
              <h3 className="text-xl font-bold text-forge-text">{item.question}</h3>
              <p className="mt-3 text-base leading-7 text-forge-muted">{item.answer}</p>
            </article>
          ))}
        </section>

        <section className="docs-final-panel">
          <div>
            <p className="eyebrow">Before checkout</p>
            <h2 className="section-title">Payments use Razorpay and fixed access periods.</h2>
            <p className="section-subtitle">
              Read plan terms, refund guidance, and support steps before upgrading. If a payment succeeds but access does not activate, use Billing refresh and Support.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="btn-primary" href="/support">Payment help</Link>
            <Link className="btn-secondary" href="/refund-policy">Refund policy</Link>
          </div>
        </section>
      </section>
      <TrustFooter />
    </main>
  );
}
