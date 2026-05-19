"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import PoweredByMark from "@/components/PoweredByMark";
import PublicHeader from "@/components/PublicHeader";
import TrustFooter from "@/components/TrustFooter";
import { useAuth } from "@/hooks/useAuth";

type DocSection = {
  id: string;
  group: string;
  title: string;
  summary: string;
  bullets: string[];
};

const docSections: DocSection[] = [
  {
    id: "overview",
    group: "Start",
    title: "Product overview",
    summary: "FocusForge is a calm study workspace for planning the day, running focused sessions, tracking progress, and reviewing what to improve.",
    bullets: ["Use Dashboard for the next action.", "Use Focus for timed work.", "Use Reviews, Heatmap, Analytics, and Weak Areas to close the loop."]
  },
  {
    id: "getting-started",
    group: "Start",
    title: "Getting started",
    summary: "Complete onboarding, add subjects, set your daily target, create one task, and run the first focus session.",
    bullets: ["Keep the first setup small.", "Choose a realistic daily study target.", "Use Settings to change preferences later."]
  },
  {
    id: "dashboard",
    group: "Core",
    title: "Dashboard",
    summary: "The dashboard answers what to do right now with today tasks, study time, streak, today timeline, homework pressure, exam countdown, revision pressure, reminders, focus progress, and weekly planner overview.",
    bullets: ["Start from the highest-priority task.", "Use the Today Timeline for classes, homework, exams, revision, and reminders.", "Use focus progress for real completed-session minutes, not estimates."]
  },
  {
    id: "tasks-focus",
    group: "Core",
    title: "Tasks, focus timer, sessions, and streaks",
    summary: "Tasks define work, the timer records focused effort, sessions become history, and streaks update from completed study days.",
    bullets: ["Use Quick Focus for 25 minutes, Deep Work for 50 minutes, or a custom duration.", "Focus sessions can link to a task, revision item, homework item, subject, or topic.", "Completing a linked daily task can still complete the task; revision, homework, chapter, and topic links are context only."]
  },
  {
    id: "notes-calendar-analytics",
    group: "Study",
    title: "Notes, Calendar, and Analytics",
    summary: "Notes capture study context, Calendar brings planner events into monthly and weekly views, and Analytics turns sessions/tasks into weekly and monthly insight.",
    bullets: ["Search notes by title, content, and subject.", "Calendar days show classes, homework, exams, revision, reminders, filters, and secondary study activity.", "Free analytics focuses on a shorter window while paid plans unlock full history."]
  },
  {
    id: "planning",
    group: "Study",
    title: "Subjects, Timetable, Homework, Exams, Marks, Revision, Topics, Backlog, and Habits",
    summary: "Planning modules keep subjects, weekly structure, assignments, exam schedules, score tracking, manual revision, syllabus progress, backlog recovery, and daily consistency in one place.",
    bullets: ["Subjects are the shared source for planner modules.", "Timetable supports weekly basics, and Pro unlocks Week A/B, day cycles, profiles, and conflict warnings.", "Monthly and weekly calendar views normalize timetable, homework, exams, revision, backlog target dates, and reminders together."]
  },
  {
    id: "advanced-timetable",
    group: "Study",
    title: "Advanced timetable",
    summary: "The timetable can stay as a simple weekly schedule or expand into active schedule profiles for students with rotating weeks or coaching cycles.",
    bullets: ["Starter keeps the normal weekly timetable free.", "Advanced profiles can use Week A/B or manual cycle-day schedules without rewriting timetable entries.", "Calendar and dashboard show the active schedule with clear labels and safe fallbacks for old records."]
  },
  {
    id: "marks-progress",
    group: "Study",
    title: "Marks tracker and progress summary",
    summary: "The Marks page records basic test results for all students while keeping advanced mock-test analytics separate.",
    bullets: ["Add subject tests, full-syllabus tests, school exams, coaching tests, practice tests, and mistake tags.", "Subject averages only use marks entries linked to that subject.", "Forge Starter includes 20 marks entries; paid plans keep the tracker unlimited."]
  },
  {
    id: "backlog-battle-plan",
    group: "Study",
    title: "Backlog tracker and Daily Battle Plan",
    summary: "Backlog turns missed or weak topics into recovery items, while the Daily Battle Plan suggests a small rules-based list of today's best moves.",
    bullets: ["Backlog items can reference subjects, chapters, and topics while keeping snapshots so old cards stay readable.", "Topic statuses are manual; marking a topic Backlog only shows an explicit add/update backlog action.", "Starter includes 20 backlog items and 3 battle-plan moves per day through the same plan limit system."]
  },
  {
    id: "battle-plan-rules",
    group: "Study",
    title: "Battle Plan priority rules",
    summary: "The Battle Plan is transparent and local to your study data. It does not use AI, rank prediction, or automatic timetable generation.",
    bullets: ["Priority favors overdue homework, close exams, overdue revision, heavy backlog, weak subject marks, target dates, and tasks that fit available time.", "Available time can be 30 minutes, 1 hour, 2 hours, 3 hours, or custom, and overflow items are labeled extra if time remains.", "Starting focus from a plan records context only; it never silently clears homework, revision, backlog, topics, or marks."]
  },
  {
    id: "performance",
    group: "Performance",
    title: "Mock Tests, Goals, Heatmap, Weak Areas, and Journal",
    summary: "Performance modules connect detailed exam practice, consistency, goal progress, rule-based weak-area detection, and study reflection.",
    bullets: ["Mock tests are the advanced analytics area; basic marks entries remain separate lightweight score records.", "Heatmap is derived from sessions.", "Weak areas are rule-based signals, not AI certainty."]
  },
  {
    id: "mock-analytics",
    group: "Performance",
    title: "Mock test analytics and repair reports",
    summary: "Mock reports capture subject breakdowns, chapter/topic weakness, mistake tags, accuracy, time pressure, and transparent repair suggestions.",
    bullets: ["Add subject rows to calculate weakest mock subject and subject accuracy.", "Add Weak or Critical chapter/topic rows with mistake tags like Concept Error, Formula Forgotten, Misread Question, or Overthinking.", "Repair suggestions can create backlog or revision items only after you click the action; FocusForge never silently changes source records."]
  },
  {
    id: "reviews-reminders-templates",
    group: "Review",
    title: "Templates, Reminders, Daily Review, and Weekly Review",
    summary: "Launch modules help repeat useful study routines and reflect without turning progress tracking into homework.",
    bullets: ["Templates create real tasks/timetable/revision/habit items.", "Reminders are in-app first and can be Active, Done, or Dismissed.", "Reviews can be saved once per day or week and updated later."]
  },
  {
    id: "plans-billing",
    group: "Plans",
    title: "Free, Pro, Elite, billing, and Razorpay",
    summary: "Starter is a useful planner, Pro unlocks advanced study systems, and Elite is the competitive exam-prep layer.",
    bullets: ["Starter includes 5 subjects, normal timetable, homework, exams, calendar, basic revision/focus/reminders, 20 marks entries, 20 backlog items, and 3 battle-plan moves per day.", "Paid access is activated only after server-side Razorpay verification.", "If money was deducted but the plan did not activate, use Refresh billing status and contact support with Razorpay payment ID or order ID."]
  },
  {
    id: "payment-issues",
    group: "Plans",
    title: "Payment deducted but plan not active",
    summary: "Razorpay payments can succeed before the app receives verification. The support path is designed for careful review without exposing private billing records.",
    bullets: ["Open Billing and use Refresh billing status first.", "Confirm you are signed into the same FocusForge account used during checkout.", "If access still does not update, open Support with registered email, plan, payment date/time, Razorpay payment ID, and Razorpay order ID if available."]
  },
  {
    id: "limits-downgrades",
    group: "Plans",
    title: "Limits, expiry, and downgrade safety",
    summary: "Limits block new over-limit creation but never delete existing study data.",
    bullets: ["If Starter reaches a limit, you can still view and edit existing records where practical.", "Expired Pro or Elite access falls back to Starter automatically.", "Billing, payment, support, and audit records are not part of Clear Study Data."]
  },
  {
    id: "account-data",
    group: "Trust",
    title: "Account, sync, export, and clear data",
    summary: "FocusForge uses authenticated, owner-scoped Firebase data for study records and server-owned records for billing/support operations.",
    bullets: ["Login/signup keeps study data scoped to your account.", "Data export downloads local CSV/JSON files when unlocked.", "Clear Study Data removes study records, not payment, billing audit, support, or account-deletion records."]
  },
  {
    id: "support-feedback",
    group: "Trust",
    title: "Support, bugs, and feedback",
    summary: "Use Support for account/payment issues and Feedback for beta product bugs or suggestions.",
    bullets: ["Support tickets can include category, severity, related page, and payment/order IDs.", "Feedback can include route and device context so bugs are easier to reproduce.", "Admin views are email-gated and show sanitized recent ticket/feedback records."]
  },
  {
    id: "troubleshooting",
    group: "Support",
    title: "Troubleshooting",
    summary: "Most issues are setup, cache, permission, or pending-payment-verification states and should be handled calmly.",
    bullets: ["If calendar looks empty, check filters and confirm source pages have data with dates.", "If timetable entries do not appear, check active profile/week/cycle filters and old-record fallback labels.", "If billing access is wrong, refresh billing status and then submit a payment issue with Razorpay IDs."]
  }
];

const quickHelp = [
  { href: "#payment-issues", label: "Payment issue", detail: "Deducted but inactive" },
  { href: "#plans-billing", label: "Plan limits", detail: "Starter, Pro, Elite" },
  { href: "#notes-calendar-analytics", label: "Calendar help", detail: "Events and filters" },
  { href: "#backlog-battle-plan", label: "Battle Plan", detail: "Why items show up" },
  { href: "#mock-analytics", label: "Mock Analytics", detail: "Reports and repair" }
];

export default function DocsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const groups = Array.from(new Set(docSections.map((section) => section.group)));
  const filteredSections = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return docSections;
    }

    return docSections.filter((section) =>
      [section.group, section.title, section.summary, ...section.bullets].join(" ").toLowerCase().includes(term)
    );
  }, [search]);

  return (
    <>
      {user ? <Navbar email={user.email} /> : <PublicHeader subtitle="Documentation hub" />}
      <main className="page-shell space-y-8">
        <section className="docs-hero">
          <div className="docs-hero-grid" aria-hidden="true" />
          <div className="docs-orbit" aria-hidden="true"><span /><span /><span /></div>
          <div className="relative z-10 grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
            <div>
              <p className="eyebrow">Documentation</p>
              <h1 className="mt-4 max-w-4xl text-4xl font-bold leading-[1.04] text-forge-text sm:text-5xl lg:text-6xl">
                Learn FocusForge from first task to weekly review.
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-forge-muted">
                Search the product surface, understand plan access and billing, and find the support path when something feels unclear.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link className="btn-primary" href="/support">Need help?</Link>
                <Link className="btn-secondary" href="/feedback">Report issue</Link>
              </div>
            </div>
            <div className="docs-health-card">
              <p className="eyebrow">Product map</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {["Core loop", "Study system", "Performance", "Trust"].map((item) => (
                  <div className="docs-mini-stat" key={item}>
                    <span>Docs</span>
                    <strong>{item}</strong>
                  </div>
                ))}
              </div>
              <PoweredByMark className="mt-5" />
            </div>
          </div>
        </section>

        <section className="docs-toc" aria-label="Documentation groups">
          {groups.map((group) => <a href={`#${group.toLowerCase()}`} key={group}>{group}</a>)}
        </section>

        <section className="grid gap-4 md:grid-cols-5" aria-label="Popular help">
          {quickHelp.map((item) => (
            <a className="interactive-card p-5" href={item.href} key={item.href}>
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-forge-muted">{item.label}</p>
              <p className="mt-2 text-base font-bold text-forge-text">{item.detail}</p>
            </a>
          ))}
        </section>

        <section className="card p-5 sm:p-6">
          <label className="grid gap-2">
            <span className="label">Search documentation</span>
            <input
              className="input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search billing, heatmap, export, reminders..."
            />
          </label>
        </section>

        {groups.map((group) => {
          const sections = filteredSections.filter((section) => section.group === group);

          if (!sections.length) {
            return null;
          }

          return (
            <section className="space-y-5 scroll-mt-28" id={group.toLowerCase()} key={group}>
              <PageHeader eyebrow={group} title={`${group} documentation`} subtitle="Focused, readable notes for this part of FocusForge." />
              <div className="docs-section-grid">
                {sections.map((section, index) => (
                  <article
                    className={`docs-feature-card${sections.length === 1 ? " docs-feature-card-wide" : ""}`}
                    id={section.id}
                    key={section.id}
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <div>
                      <p className="eyebrow">{section.group}</p>
                      <h2 className="mt-3 text-2xl font-bold leading-tight text-forge-text">{section.title}</h2>
                      <p className="mt-4 text-base leading-7 text-forge-muted">{section.summary}</p>
                    </div>
                    <ul className="mt-5 grid gap-3">
                      {section.bullets.map((item) => (
                        <li className="docs-check-row" key={item}>
                          <span aria-hidden="true" />
                          <p>{item}</p>
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </section>
          );
        })}

        <section className="docs-final-panel">
          <div>
            <p className="eyebrow">Support path</p>
            <h2 className="section-title">Payment deducted but plan not active?</h2>
            <p className="section-subtitle">
              Include your Razorpay payment ID or order ID in a support ticket. Your study data is safe while we verify the payment state.
            </p>
          </div>
          <Link className="btn-primary" href="/support">Open Support</Link>
        </section>
      </main>
      <TrustFooter />
    </>
  );
}
