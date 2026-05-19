import Link from "next/link";
import PoweredByMark from "@/components/PoweredByMark";
import PublicHeader from "@/components/PublicHeader";
import TrustFooter from "@/components/TrustFooter";

interface PublicInfoSection {
  title: string;
  body: string[];
  bullets?: string[];
}

interface PublicInfoPageProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  updatedLabel: string;
  sections: PublicInfoSection[];
  contactCta?: boolean;
}

export default function PublicInfoPage({
  eyebrow,
  title,
  subtitle,
  updatedLabel,
  sections,
  contactCta = false
}: PublicInfoPageProps) {
  return (
    <main className="min-h-screen">
      <PublicHeader />

      <section className="page-shell">
        <div className="docs-hero">
          <div className="docs-hero-grid" aria-hidden="true" />
          <div className="docs-orbit" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="relative z-10 max-w-4xl">
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="page-title">{title}</h1>
            <p className="page-subtitle">{subtitle}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="badge">Updated {updatedLabel}</span>
              <PoweredByMark compact />
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell pt-0">
        <div className="grid gap-5 lg:grid-cols-[0.72fr_1.28fr]">
          <aside className="card h-fit p-5 lg:sticky lg:top-24">
            <p className="eyebrow">Pages</p>
            <nav className="mt-4 grid gap-2">
              <Link className="side-nav-link" href="/docs">
                <span className="side-nav-link-mark" aria-hidden="true" />
                <span className="side-nav-link-text">Documentation</span>
              </Link>
              <Link className="side-nav-link" href="/support">
                <span className="side-nav-link-mark" aria-hidden="true" />
                <span className="side-nav-link-text">Support</span>
              </Link>
              <Link className="side-nav-link" href="/feedback">
                <span className="side-nav-link-mark" aria-hidden="true" />
                <span className="side-nav-link-text">Feedback</span>
              </Link>
              <Link className="side-nav-link" href="/privacy">
                <span className="side-nav-link-mark" aria-hidden="true" />
                <span className="side-nav-link-text">Privacy</span>
              </Link>
              <Link className="side-nav-link" href="/terms">
                <span className="side-nav-link-mark" aria-hidden="true" />
                <span className="side-nav-link-text">Terms</span>
              </Link>
              <Link className="side-nav-link" href="/contact">
                <span className="side-nav-link-mark" aria-hidden="true" />
                <span className="side-nav-link-text">Contact</span>
              </Link>
              <Link className="side-nav-link" href="/refund-cancellation-policy">
                <span className="side-nav-link-mark" aria-hidden="true" />
                <span className="side-nav-link-text">Refund / Cancellation</span>
              </Link>
              <Link className="side-nav-link" href="/refund-policy">
                <span className="side-nav-link-mark" aria-hidden="true" />
                <span className="side-nav-link-text">Refund Policy</span>
              </Link>
              <Link className="side-nav-link" href="/cancellation-policy">
                <span className="side-nav-link-mark" aria-hidden="true" />
                <span className="side-nav-link-text">Cancellation Policy</span>
              </Link>
              <Link className="side-nav-link" href="/digital-delivery-policy">
                <span className="side-nav-link-mark" aria-hidden="true" />
                <span className="side-nav-link-text">Digital Delivery</span>
              </Link>
              <Link className="side-nav-link" href="/updates">
                <span className="side-nav-link-mark" aria-hidden="true" />
                <span className="side-nav-link-text">Updates</span>
              </Link>
            </nav>
            {contactCta ? null : (
              <div className="mt-5 rounded-3xl border border-forge-line bg-white/70 p-4">
                <p className="text-base font-bold text-forge-text">Need help?</p>
                <p className="mt-1 text-sm font-semibold text-forge-muted">
                  Reach FocusForge support for account, billing, or product questions.
                </p>
                <Link className="btn-secondary mt-4 w-full" href="/support">Open Support</Link>
              </div>
            )}
          </aside>

          <div className="grid gap-5">
            {sections.map((section) => (
              <article className="card p-5 sm:p-7" key={section.title}>
                <h2 className="section-title">{section.title}</h2>
                <div className="mt-4 space-y-3 text-base leading-7 text-forge-muted">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                {section.bullets?.length ? (
                  <ul className="mt-5 grid gap-3">
                    {section.bullets.map((bullet) => (
                      <li className="flex gap-3 rounded-2xl border border-forge-line bg-white/70 p-4 text-base font-semibold text-forge-secondary" key={bullet}>
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-forge-gold shadow-glow" aria-hidden="true" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </section>
      <TrustFooter />
    </main>
  );
}
