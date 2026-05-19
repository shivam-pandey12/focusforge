"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import BrandLogo from "@/components/BrandLogo";
import PoweredByMark from "@/components/PoweredByMark";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";

interface PublicHeaderLink {
  href: string;
  label: string;
}

interface PublicHeaderProps {
  subtitle?: string;
  links?: PublicHeaderLink[];
  primaryCtaHref?: string;
  primaryCtaLabel?: string;
}

const defaultLinks: PublicHeaderLink[] = [
  { href: "/docs", label: "Docs" },
  { href: "/pricing", label: "Pricing" },
  { href: "/support", label: "Support" }
];

const trustLinks: PublicHeaderLink[] = [
  { href: "/docs", label: "Documentation" },
  { href: "/support", label: "Support" },
  { href: "/feedback", label: "Feedback" },
  { href: "/updates", label: "Updates" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/refund-policy", label: "Refund Policy" },
  { href: "/cancellation-policy", label: "Cancellation Policy" },
  { href: "/contact", label: "Contact" }
];

function isSameRoute(pathname: string, href: string): boolean {
  if (href.includes("#")) {
    return false;
  }

  return pathname === href;
}

export default function PublicHeader({
  subtitle = "Quiet focus. Real progress.",
  links = defaultLinks,
  primaryCtaHref = "/signup",
  primaryCtaLabel = "Start free"
}: PublicHeaderProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [sideOpen, setSideOpen] = useState(false);
  const accountLinks = useMemo<PublicHeaderLink[]>(
    () =>
      user
        ? [
            { href: "/dashboard", label: "Dashboard" },
            { href: "/settings", label: "Settings" },
            { href: "/settings/billing", label: "Billing" }
          ]
        : [
            { href: "/login", label: "Login" },
            { href: "/signup", label: "Create Account" }
          ],
    [user]
  );
  const sideGroups = useMemo(
    () => [
      { label: "Start", items: [{ href: "/", label: "Home" }, ...links] },
      { label: "Account", items: accountLinks },
      { label: "Trust", items: trustLinks }
    ],
    [accountLinks, links]
  );

  useEffect(() => {
    setSideOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!sideOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSideOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [sideOpen]);

  return (
    <>
      <header className="public-nav">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="group flex min-w-0 items-center gap-3">
            <BrandLogo className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white p-1.5 shadow-glow ring-1 ring-forge-line transition duration-300 group-hover:-translate-y-0.5 group-hover:rotate-3 sm:h-11 sm:w-11" />
            <span className="min-w-0">
              <span className="block truncate text-lg font-bold text-forge-text">FocusForge</span>
              <span className="hidden text-sm font-semibold text-forge-muted sm:block">{subtitle}</span>
              <PoweredByMark compact className="mt-1 hidden xl:inline-flex" />
            </span>
          </Link>

          <nav className="hidden items-center gap-1 rounded-full border border-forge-line bg-white/80 p-1 shadow-soft lg:flex">
            {links.map((item) => (
              <Link
                className={isSameRoute(pathname, item.href) ? "public-nav-link bg-forge-surfaceAlt text-forge-text" : "public-nav-link"}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex min-w-0 items-center gap-2">
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            {user ? (
              <Link className="btn-primary" href="/dashboard">Dashboard</Link>
            ) : (
              <>
                <Link className="btn-ghost hidden sm:inline-flex" href="/login">Login</Link>
                <Link className="btn-primary" href={primaryCtaHref}>{primaryCtaLabel}</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <button
        aria-expanded={sideOpen}
        aria-label={sideOpen ? "Close navigation panel" : "Open navigation panel"}
        className={`floating-side-tab ${sideOpen ? "floating-side-tab-open" : ""}`}
        type="button"
        onClick={() => setSideOpen((current) => !current)}
      >
        <span className="floating-side-tab-glow" aria-hidden="true" />
        <span className="floating-side-tab-label">Nav</span>
        <span className="floating-side-tab-arrow" aria-hidden="true">{sideOpen ? "<" : ">"}</span>
      </button>

      <div className={`side-nav-overlay ${sideOpen ? "side-nav-overlay-open" : ""}`} aria-hidden={!sideOpen}>
        <button className="absolute inset-0 h-full w-full cursor-default" type="button" aria-label="Close navigation panel" onClick={() => setSideOpen(false)} />
        <aside className={`side-nav-panel ${sideOpen ? "side-nav-panel-open" : ""}`} aria-label="FocusForge public navigation">
          <div className="side-nav-ambient" aria-hidden="true" />
          <div className="relative z-10 flex h-full flex-col">
            <div className="flex items-start justify-between gap-4 border-b border-forge-line/70 p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <BrandLogo className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white p-2 shadow-glow ring-1 ring-forge-line" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-forge-muted">FocusForge</p>
                  <p className="text-xl font-bold text-forge-text">{user ? "Workspace ready" : "Student planner"}</p>
                  <p className="mt-1 text-sm font-semibold text-forge-muted">{subtitle}</p>
                </div>
              </div>
              <button className="side-nav-close" type="button" aria-label="Close navigation panel" onClick={() => setSideOpen(false)}>
                <span aria-hidden="true">X</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-5">
              <div className="mb-5">
                <ThemeToggle />
              </div>
              <nav className="grid gap-4">
                {sideGroups.map((group) => (
                  <div className="side-nav-group" key={group.label}>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="px-1 text-xs font-bold uppercase tracking-[0.2em] text-forge-muted">{group.label}</p>
                      <span className="h-px flex-1 bg-gradient-to-r from-forge-line to-transparent" />
                    </div>
                    <div className="grid gap-2">
                      {group.items.map((item) => (
                        <Link
                          className={isSameRoute(pathname, item.href) ? "side-nav-link side-nav-link-active" : "side-nav-link"}
                          href={item.href}
                          key={`${group.label}-${item.href}`}
                          onClick={() => setSideOpen(false)}
                        >
                          <span className="side-nav-link-mark" aria-hidden="true" />
                          <span className="side-nav-link-text">{item.label}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </nav>
            </div>

            <div className="border-t border-forge-line/70 p-5">
              <Link className="btn-primary w-full" href={user ? "/dashboard" : primaryCtaHref} onClick={() => setSideOpen(false)}>
                {user ? "Open Dashboard" : primaryCtaLabel}
              </Link>
              <PoweredByMark className="mt-4 w-full justify-center" />
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
