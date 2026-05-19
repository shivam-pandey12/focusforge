"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import BrandLogo from "@/components/BrandLogo";
import PlanBadge from "@/components/PlanBadge";
import PoweredByMark from "@/components/PoweredByMark";
import ProfileAvatar from "@/components/ProfileAvatar";
import ThemeToggle from "@/components/ThemeToggle";
import { logoutUser } from "@/lib/firebase/auth";
import { getRequiredPlan, getRouteFeature, getUserPlan, type PlanTier } from "@/lib/plans";
import { useAuth } from "@/hooks/useAuth";
import { useDeferredDataStart } from "@/hooks/useDeferredDataStart";
import { useUserProfile } from "@/hooks/useUserProfile";

interface NavbarProps {
  email?: string | null;
}

function getRequiredPlanForHref(href: string): PlanTier | null {
  const feature = getRouteFeature(href);

  if (!feature) {
    return null;
  }

  const plan = getRequiredPlan(feature);
  return plan === "free" ? null : plan;
}

function FeaturePlanTag({ plan }: { plan: PlanTier }) {
  return <span className={`side-nav-plan-tag side-nav-plan-tag-${plan}`}>{plan}</span>;
}

export default function Navbar({ email }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const profileReady = useDeferredDataStart(120);
  const profile = useUserProfile(profileReady ? user?.uid : undefined);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [sideOpen, setSideOpen] = useState(false);
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);
  const navGroups = useMemo(
    () => [
    {
      label: "Plan",
      items: [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/subjects", label: "Subjects" },
        { href: "/timetable", label: "Timetable" },
        { href: "/homework", label: "Homework" },
        { href: "/exams", label: "Exams" },
        { href: "/marks", label: "Marks" },
        { href: "/backlog", label: "Backlog" },
        { href: "/battle-plan", label: "Battle Plan" },
        { href: "/revision", label: "Revision" },
        { href: "/goals", label: "Goals" },
        { href: "/templates", label: "Templates" }
      ]
    },
    {
      label: "Study",
      items: [
        { href: "/focus", label: "Focus" },
        { href: "/notes", label: "Notes" },
        { href: "/topics", label: "Topics" },
        { href: "/journal", label: "Journal" }
      ]
    },
    {
      label: "Track",
      items: [
        { href: "/calendar", label: "Calendar" },
        { href: "/habits", label: "Habits" },
        { href: "/mock-tests", label: "Mock Tests" },
        { href: "/heatmap", label: "Heatmap" }
      ]
    },
    {
      label: "Review",
      items: [
        { href: "/review/daily", label: "Daily Review" },
        { href: "/review/weekly", label: "Weekly Review" },
        { href: "/reminders", label: "Reminders" }
      ]
    },
    {
      label: "Insights",
      items: [
        { href: "/analytics", label: "Analytics" },
        { href: "/weak-areas", label: "Weak Areas" }
      ]
    },
    {
      label: "Settings",
      items: [
        { href: "/settings", label: "Settings" },
        { href: "/settings/data", label: "Data Controls" },
        { href: "/settings/billing", label: "Billing" },
        { href: "/pricing", label: "Pricing" },
        { href: "/support", label: "Support" },
        { href: "/feedback", label: "Feedback" },
        { href: "/updates", label: "Updates" }
      ]
    }
    ],
    []
  );
  const quickLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/focus", label: "Focus" },
    { href: "/docs", label: "Docs" }
  ];
  const displayName = profile.profile?.displayName || user?.displayName || null;
  const profileImage = profile.profile?.profileImageDataUrl || user?.photoURL || null;
  const profileEmail = email ?? user?.email ?? null;
  const currentPlan = getUserPlan(profile.profile);

  useEffect(() => {
    setSideOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSideOpen(false);
      }
    }

    if (!sideOpen) {
      return;
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [sideOpen]);

  useEffect(() => {
    if (!confirmLogoutOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setConfirmLogoutOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [confirmLogoutOpen]);

  function requestLogoutConfirmation() {
    setConfirmLogoutOpen(true);
  }

  async function handleLogout() {
    setLoggingOut(true);
    setError(null);
    setConfirmLogoutOpen(false);

    try {
      await logoutUser();
      router.replace("/login");
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Logout failed.");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-forge-line/70 bg-white/88 shadow-[0_14px_36px_rgba(80,60,34,0.07)] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="group flex items-center gap-3">
            <BrandLogo className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white p-1.5 shadow-glow ring-1 ring-forge-line transition duration-300 group-hover:-translate-y-0.5 group-hover:rotate-3 sm:h-11 sm:w-11" />
            <span className="min-w-0">
              <span className="block truncate text-lg font-bold text-forge-text">FocusForge</span>
              <span className="hidden text-sm font-semibold text-forge-muted sm:block">Quiet focus. Real progress.</span>
              <PoweredByMark compact className="mt-1 hidden xl:inline-flex" />
            </span>
          </Link>
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <nav className="hidden items-center rounded-3xl border border-forge-line bg-white/82 p-1 shadow-soft lg:flex">
              {quickLinks.map((item) => {
                const active = pathname === item.href;

                return (
                  <Link
                    className={
                      active
                        ? "relative overflow-hidden rounded-2xl bg-forge-surfaceAlt px-4 py-2.5 text-sm font-bold text-forge-text transition duration-300 focus:outline-none focus:ring-2 focus:ring-forge-gold/40"
                        : "rounded-2xl px-4 py-2.5 text-sm font-bold text-forge-muted transition duration-300 hover:bg-forge-surfaceAlt/70 hover:text-forge-text focus:outline-none focus:ring-2 focus:ring-forge-gold/40"
                    }
                    href={item.href}
                    key={item.href}
                  >
                    {active ? <span className="nav-active-sheen" aria-hidden="true" /> : null}
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="profile-card group hidden items-center gap-3 rounded-3xl border border-forge-line bg-white/88 px-3 py-2 shadow-soft transition duration-300 hover:-translate-y-0.5 md:flex">
              <ProfileAvatar email={profileEmail} displayName={displayName} src={profileImage} showStatus />
              <span className="profile-info-stack hidden sm:block">
                <span className="profile-mini-badge">Profile</span>
                <span className="block text-sm font-bold text-forge-text">{displayName || "Signed in"}</span>
                <PlanBadge className="profile-plan-badge" plan={currentPlan} />
              </span>
            </div>
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            <button className="btn-secondary hidden md:inline-flex" onClick={requestLogoutConfirmation} disabled={loggingOut}>
              {loggingOut ? "Logging out" : "Logout"}
            </button>
          </div>
          {error ? <div className="error-box fixed left-1/2 top-24 z-[95] w-[min(40rem,calc(100vw-2rem))] -translate-x-1/2">{error}</div> : null}
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
        <aside className={`side-nav-panel ${sideOpen ? "side-nav-panel-open" : ""}`} aria-label="FocusForge navigation">
          <div className="side-nav-ambient" aria-hidden="true" />
          <div className="relative z-10 flex h-full flex-col">
            <div className="flex items-start justify-between gap-4 border-b border-forge-line/70 p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <ProfileAvatar className="h-12 w-12" email={profileEmail} displayName={displayName} src={profileImage} />
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-forge-muted">Workspace</p>
                  <p className="text-xl font-bold text-forge-text">FocusForge</p>
                  <p className="mt-1 text-sm font-semibold text-forge-muted">Signed in and ready.</p>
                  <PlanBadge className="mt-3" plan={currentPlan} />
                </div>
              </div>
              <button className="side-nav-close" type="button" aria-label="Close navigation panel" onClick={() => setSideOpen(false)}>
                <span aria-hidden="true">X</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-5">
              <div className="mb-5 grid grid-cols-2 gap-3">
                <ThemeToggle />
                <button className="btn-secondary" onClick={requestLogoutConfirmation} disabled={loggingOut}>
                  {loggingOut ? "Logging out" : "Logout"}
                </button>
              </div>
              <nav className="grid gap-4">
              {navGroups.map((group) => (
                <div className="side-nav-group" key={group.label}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="px-1 text-xs font-bold uppercase tracking-[0.2em] text-forge-muted">{group.label}</p>
                    <span className="h-px flex-1 bg-gradient-to-r from-forge-line to-transparent" />
                  </div>
                  <div className="grid gap-2">
                    {group.items.map((item) => {
                      const active = pathname === item.href;
                      const requiredPlan = getRequiredPlanForHref(item.href);

                      return (
                        <Link
                          className={
                            active
                              ? "side-nav-link side-nav-link-active"
                              : "side-nav-link"
                          }
                          href={item.href}
                          key={item.href}
                          onClick={() => setSideOpen(false)}
                        >
                          <span className="side-nav-link-mark" aria-hidden="true" />
                          <span className="side-nav-link-text">{item.label}</span>
                          {requiredPlan ? <FeaturePlanTag plan={requiredPlan} /> : null}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
              </nav>
            </div>
            <div className="border-t border-forge-line/70 p-5">
              <Link className="btn-primary w-full" href="/focus" onClick={() => setSideOpen(false)}>
                Start Focus Session
              </Link>
              <PoweredByMark className="mt-4 w-full justify-center" />
            </div>
          </div>
        </aside>
      </div>

      {confirmLogoutOpen ? (
        <div className="logout-confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="logout-confirm-title">
          <button
            aria-label="Cancel logout"
            className="logout-confirm-backdrop"
            type="button"
            onClick={() => setConfirmLogoutOpen(false)}
          />
          <section className="logout-confirm-card">
            <div className="flex items-start gap-4">
              <BrandLogo className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white p-2 shadow-glow ring-1 ring-forge-line" />
              <div>
                <p className="eyebrow">Confirm logout</p>
                <h2 id="logout-confirm-title" className="mt-2 text-2xl font-bold leading-tight text-forge-text">
                  Leave FocusForge?
                </h2>
                <p className="mt-3 text-base leading-7 text-forge-muted">
                  You will return to the login page. Unsaved text in open forms may be lost.
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button className="btn-secondary" type="button" onClick={() => setConfirmLogoutOpen(false)}>
                Stay signed in
              </button>
              <button className="btn-primary" type="button" onClick={handleLogout} disabled={loggingOut}>
                {loggingOut ? "Logging out" : "Logout"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
