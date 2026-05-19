"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import BrandLogo from "@/components/BrandLogo";
import LoadingState from "@/components/LoadingState";
import PoweredByMark from "@/components/PoweredByMark";
import PublicHeader from "@/components/PublicHeader";
import StatusMessage from "@/components/StatusMessage";
import { useAuth } from "@/hooks/useAuth";

const problems = [
  "Plans stay scattered",
  "Revision gets missed",
  "Study time is hard to track",
  "Progress feels invisible"
];

const solutionLoop = [
  { title: "Plan", detail: "Set today's tasks, routines, revisions, and habits in one calm workspace." },
  { title: "Focus", detail: "Pick one task and start a timed session without hunting through different tools." },
  { title: "Track", detail: "Sessions, streaks, heatmap, goals, and mock tests turn effort into visible progress." },
  { title: "Review", detail: "Daily and weekly reviews help you close the loop before tomorrow starts." },
  { title: "Improve", detail: "Weak areas and analytics point to the next useful action, not more noise." }
];

const features = [
  { title: "Daily planner", detail: "Create today's study tasks and know what to start next.", icon: "DP" },
  { title: "Focus timer", detail: "Run focused sessions, save progress, and keep tasks moving.", icon: "FT" },
  { title: "Notes", detail: "Capture study notes with subjects and linked tasks.", icon: "NT" },
  { title: "Calendar", detail: "See completed sessions, minutes, and activity by date.", icon: "CA" },
  { title: "Revision planner", detail: "Schedule spaced revisions and clear overdue topics.", icon: "RV" },
  { title: "Topic tracker", detail: "Track subjects, chapters, topics, and syllabus progress.", icon: "TP" },
  { title: "Habit tracker", detail: "Build daily consistency with weekly completion strips.", icon: "HB" },
  { title: "Analytics", detail: "Understand weekly time, task completion, streaks, and trends.", icon: "AN" },
  { title: "Mock test tracker", detail: "Record scores, accuracy, time, notes, and performance trend.", icon: "MT" },
  { title: "Offline/PWA", detail: "Install FocusForge and keep cached routes available offline.", icon: "PW" }
];

const howItWorks = [
  "Plan your study day",
  "Start focused sessions",
  "Track habits, revisions, and progress",
  "Review insights and improve"
];

const insightMetrics = [
  { label: "Study streak", value: "12 days", width: "86%" },
  { label: "Weekly study time", value: "14h 30m", width: "74%" },
  { label: "Completion rate", value: "82%", width: "82%" },
  { label: "Revision due", value: "3 topics", width: "42%" },
  { label: "Productivity score", value: "88/100", width: "88%" }
];

function ProductPreview() {
  return (
    <div className="landing-preview-wrap" aria-label="Static FocusForge dashboard preview">
      <div className="landing-preview-orbit" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="landing-floating-chip landing-floating-chip-one">
        <span />
        Revision due today
      </div>
      <div className="landing-floating-chip landing-floating-chip-two">
        <span />
        88 productivity
      </div>
      <div className="landing-floating-chip landing-floating-chip-three">
        <span />
        Offline ready
      </div>

      <div className="landing-preview" aria-hidden="true">
        <div className="landing-preview-top">
          <div>
            <p className="eyebrow">Today&apos;s Focus</p>
            <h2 className="mt-2 text-2xl font-bold text-forge-text">What should I do right now?</h2>
          </div>
          <span className="docs-audit-badge docs-audit-badge-ready">Live loop</span>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            ["Study time", "2h 15m"],
            ["Sessions", "4"],
            ["Streak", "12 days"]
          ].map(([label, value]) => (
            <div className="landing-preview-stat" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>

        <div className="landing-focus-lens">
          <div>
            <p>Focus Session</p>
            <strong>24:32</strong>
          </div>
          <span>Physics</span>
        </div>

        <div className="mt-5 space-y-3">
          {["Physics chapter review", "Chemistry revision cards", "Mock test analysis"].map((task, index) => (
            <div className="landing-preview-task" key={task}>
              <span>{index + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold text-forge-text">{task}</p>
                <p className="text-sm font-semibold text-forge-muted">{index === 0 ? "25 min focus" : index === 1 ? "Due today" : "Improve weak area"}</p>
              </div>
              <div className="h-2 w-16 rounded-full bg-forge-surfaceAlt">
                <div className="h-full rounded-full bg-forge-gold" style={{ width: `${72 - index * 18}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="landing-preview-footer">
          <span>Next action</span>
          <strong>Start Focus Session</strong>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const heroRef = useRef<HTMLElement | null>(null);
  const { user, loading, error } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, router, user]);

  useEffect(() => {
    if (loading || user) {
      return;
    }

    const currentHero = heroRef.current;

    if (!currentHero || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const heroElement: HTMLElement = currentHero;
    let frame = 0;

    function updateScroll() {
      frame = 0;
      const rect = heroElement.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, -rect.top / Math.max(rect.height, 1)));
      heroElement.style.setProperty("--hero-scroll", progress.toFixed(3));
    }

    function queueScrollUpdate() {
      if (!frame) {
        frame = window.requestAnimationFrame(updateScroll);
      }
    }

    function handlePointerMove(event: PointerEvent) {
      const rect = heroElement.getBoundingClientRect();

      if (!rect.width || !rect.height) {
        return;
      }

      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      heroElement.style.setProperty("--hero-x", x.toFixed(3));
      heroElement.style.setProperty("--hero-y", y.toFixed(3));
    }

    function handlePointerLeave() {
      heroElement.style.setProperty("--hero-x", "0");
      heroElement.style.setProperty("--hero-y", "0");
    }

    updateScroll();
    window.addEventListener("scroll", queueScrollUpdate, { passive: true });
    window.addEventListener("resize", queueScrollUpdate);
    heroElement.addEventListener("pointermove", handlePointerMove);
    heroElement.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      window.removeEventListener("scroll", queueScrollUpdate);
      window.removeEventListener("resize", queueScrollUpdate);
      heroElement.removeEventListener("pointermove", handlePointerMove);
      heroElement.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [loading, user]);

  if (loading) {
    return <LoadingState label="Opening FocusForge" />;
  }

  if (user) {
    return <LoadingState label="Redirecting to dashboard" />;
  }

  return (
    <main className="min-h-screen">
      <PublicHeader
        links={[
          { href: "/#features", label: "Features" },
          { href: "/#how-it-works", label: "How it works" },
          { href: "/#insights", label: "Insights" },
          { href: "/pricing", label: "Pricing" }
        ]}
      />

      <section className="landing-hero" ref={heroRef}>
        <div className="landing-hero-reveal" aria-hidden="true" />
        <div className="landing-hero-constellation" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="page-shell grid min-h-[calc(100dvh-5rem)] gap-10 py-12 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:py-16">
          <div className="landing-hero-copy">
            <div className="landing-pill">
              <span className="landing-pill-dot" />
              Study operating system for serious students
            </div>
            <h1 className="mt-7 max-w-4xl text-5xl font-bold leading-[1.02] text-forge-text sm:text-6xl lg:text-7xl">
              <span className="landing-title-line">Forge focus.</span>{" "}
              <span className="landing-title-line landing-title-line-delay">Track progress.</span>{" "}
              <span className="landing-title-line landing-title-line-last">Study with clarity.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-forge-muted sm:text-xl sm:leading-9">
              FocusForge brings your planner, focus timer, revision system, notes, habits, analytics, and study
              progress into one calm workspace.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link className="btn-primary w-full sm:w-auto" href="/signup">Start free</Link>
              <Link className="btn-secondary w-full sm:w-auto" href="/login">Login</Link>
            </div>
            <div className="landing-hero-proof">
              {["Planner", "Timer", "Review", "Offline"].map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
            {error ? <StatusMessage className="mt-6 max-w-2xl" tone="error">{error}</StatusMessage> : null}
          </div>

          <ProductPreview />
        </div>
      </section>

      <section className="landing-section">
        <div className="page-shell">
          <div className="mx-auto max-w-3xl text-center">
            <p className="eyebrow">The student problem</p>
            <h2 className="mt-3 text-4xl font-bold leading-tight text-forge-text sm:text-5xl">
              Studying gets harder when the system is split.
            </h2>
            <p className="mt-4 text-lg leading-8 text-forge-muted">
              FocusForge removes the scattered-tool feeling and gives each day one clear place to plan, focus, and review.
            </p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {problems.map((problem, index) => (
              <article className="landing-problem-card" key={problem}>
                <span>{`0${index + 1}`}</span>
                <h3>{problem}</h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-section-soft">
        <div className="page-shell">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="eyebrow">The solution</p>
              <h2 className="mt-3 text-4xl font-bold leading-tight text-forge-text sm:text-5xl">
                A complete study operating system.
              </h2>
              <p className="mt-4 text-lg leading-8 text-forge-muted">
                Plan, focus, track, review, and improve without turning study into a noisy dashboard.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {solutionLoop.map((item) => (
                <article className="landing-solution-card" key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="landing-section scroll-mt-24">
        <div className="page-shell">
          <div className="section-header">
            <div>
              <p className="eyebrow">Features</p>
              <h2 className="section-title">Everything a serious study routine needs.</h2>
              <p className="section-subtitle">
                A focused collection of planning, deep work, tracking, and review tools.
              </p>
            </div>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <article className="landing-feature-card" key={feature.title}>
                <span>{feature.icon}</span>
                <h3>{feature.title}</h3>
                <p>{feature.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="landing-section landing-section-soft scroll-mt-24">
        <div className="page-shell">
          <div className="mx-auto max-w-3xl text-center">
            <p className="eyebrow">How it works</p>
            <h2 className="mt-3 text-4xl font-bold leading-tight text-forge-text sm:text-5xl">
              Four steps. One calm loop.
            </h2>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-4">
            {howItWorks.map((step, index) => (
              <article className="landing-step-card" key={step}>
                <span>{index + 1}</span>
                <h3>{step}</h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="insights" className="landing-section scroll-mt-24">
        <div className="page-shell grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="eyebrow">Insights preview</p>
            <h2 className="mt-3 text-4xl font-bold leading-tight text-forge-text sm:text-5xl">
              Progress should be visible, not stressful.
            </h2>
            <p className="mt-4 text-lg leading-8 text-forge-muted">
              The homepage preview is static, but inside the app these insights come from your sessions, tasks, habits,
              revisions, mock tests, and goals.
            </p>
          </div>
          <div className="landing-insights-panel">
            {insightMetrics.map((metric) => (
              <article className="landing-insight-card" key={metric.label}>
                <div className="flex items-center justify-between gap-4">
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                </div>
                <div className="mt-3 h-2 rounded-full bg-forge-surfaceAlt">
                  <div className="h-full rounded-full bg-forge-gold" style={{ width: metric.width }} />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="page-shell">
          <div className="landing-final-cta">
            <p className="eyebrow">Start today</p>
            <h2>Start small. Stay consistent. Build real progress.</h2>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link className="btn-primary" href="/signup">Create account</Link>
              <Link className="btn-secondary" href="/login">Login</Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-forge-line/70">
        <div className="page-shell flex flex-col gap-5 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-forge-line" />
            <div>
              <p className="text-lg font-bold text-forge-text">FocusForge</p>
              <p className="text-sm font-semibold text-forge-muted">Quiet focus. Real progress.</p>
              <PoweredByMark compact className="mt-2" />
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm font-bold text-forge-muted">
            <Link className="transition hover:text-forge-text" href="/docs">Documentation</Link>
            <Link className="transition hover:text-forge-text" href="/support">Support</Link>
            <Link className="transition hover:text-forge-text" href="/feedback">Feedback</Link>
            <Link className="transition hover:text-forge-text" href="/privacy">Privacy</Link>
            <Link className="transition hover:text-forge-text" href="/terms">Terms</Link>
            <Link className="transition hover:text-forge-text" href="/refund-policy">Refund Policy</Link>
            <Link className="transition hover:text-forge-text" href="/cancellation-policy">Cancellation Policy</Link>
            <Link className="transition hover:text-forge-text" href="/updates">Updates</Link>
            <Link className="transition hover:text-forge-text" href="/contact">Contact</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
