"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

const PUBLIC_ROUTES = [
  "/",
  "/pricing",
  "/docs",
  "/support",
  "/feedback",
  "/privacy",
  "/terms",
  "/refund-policy",
  "/cancellation-policy",
  "/contact",
  "/updates",
  "/login",
  "/signup"
];

const APP_ROUTE_GROUPS = [
  ["/dashboard", "/focus", "/docs", "/notes", "/calendar", "/analytics"],
  ["/subjects", "/timetable", "/homework", "/exams", "/marks", "/revision", "/topics", "/habits"],
  ["/mock-tests", "/heatmap", "/goals", "/weak-areas", "/journal"],
  ["/templates", "/review/daily", "/review/weekly", "/reminders", "/settings", "/settings/billing", "/settings/data", "/pricing"],
  ["/support", "/feedback", "/updates"]
];

const APP_ROUTES = Array.from(new Set(APP_ROUTE_GROUPS.flat()));

export default function RouteWarmup() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const warmedKey = useRef<string | null>(null);

  useEffect(() => {
    if (loading) {
      return;
    }

    const routes = user ? APP_ROUTES : PUBLIC_ROUTES;
    const key = user ? `app:${user.uid}` : "public";

    if (warmedKey.current === key) {
      return;
    }

    warmedKey.current = key;
    const timeoutIds: number[] = [];
    const animationFrameIds: number[] = [];
    let cancelled = false;

    const frameId = window.requestAnimationFrame(() => {
      routes.forEach((route, routeIndex) => {
        if (cancelled) {
          return;
        }

        router.prefetch(route);
        const timeoutId = window.setTimeout(() => {
          fetch(route, {
            cache: "force-cache",
            credentials: "same-origin",
            priority: "low"
          } as RequestInit & { priority?: "low" }).catch(() => undefined);
        }, routeIndex * 45);

        timeoutIds.push(timeoutId);
      });
    });

    animationFrameIds.push(frameId);

    return () => {
      cancelled = true;
      animationFrameIds.forEach((id) => window.cancelAnimationFrame(id));
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [loading, router, user]);

  return null;
}
