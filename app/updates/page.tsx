import type { Metadata } from "next";
import PoweredByMark from "@/components/PoweredByMark";
import PublicHeader from "@/components/PublicHeader";
import TrustFooter from "@/components/TrustFooter";

export const metadata: Metadata = {
  title: "Updates | FocusForge",
  description: "FocusForge changelog, launch notes, and upcoming improvements."
};

const updates = [
  { tag: "New", title: "FocusForge Beta Launch", detail: "A premium study workspace with dashboard, tasks, focus timer, notes, calendar, analytics, and PWA shell." },
  { tag: "New", title: "Revision Planner + Topic Tracker", detail: "Spaced revisions and syllabus progress bring exam planning into the core loop." },
  { tag: "New", title: "Phase 5 Performance Layer", detail: "Mock tests, heatmap, productivity score, weak areas, goals, and journal." },
  { tag: "Improved", title: "Launch Readiness", detail: "Onboarding, settings, templates, reminders, reviews, docs, support, feedback, legal pages, and data controls." },
  { tag: "Improved", title: "Pricing + Razorpay", detail: "Starter/Pro/Elite gates and server-verified Razorpay Orders for student pass access periods." },
  { tag: "Upcoming", title: "Production operations", detail: "Formal legal review, real support workflows, email delivery provider, and stronger distributed monitoring." }
];

export default function UpdatesPage() {
  return (
    <main className="min-h-screen">
      <PublicHeader subtitle="What's new" primaryCtaHref="/feedback" primaryCtaLabel="Share feedback" />

      <section className="page-shell space-y-8">
        <div className="docs-hero">
          <div className="docs-hero-grid" aria-hidden="true" />
          <div className="relative z-10 max-w-4xl">
            <p className="eyebrow">Updates</p>
            <h1 className="page-title">FocusForge changelog and launch notes.</h1>
            <p className="page-subtitle">A concise timeline of what is new, improved, fixed, and coming next.</p>
            <PoweredByMark className="mt-6" />
          </div>
        </div>

        <div className="grid gap-5">
          {updates.map((item, index) => (
            <article className="card p-6 sm:p-8" key={item.title}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="eyebrow">v1.2.{index}</p>
                  <h2 className="mt-2 text-2xl font-bold text-forge-text">{item.title}</h2>
                  <p className="mt-3 text-base leading-7 text-forge-muted">{item.detail}</p>
                </div>
                <span className="docs-audit-badge docs-audit-badge-ready">{item.tag}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
      <TrustFooter />
    </main>
  );
}
