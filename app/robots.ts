import type { MetadataRoute } from "next";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://focusforge.app").replace(/\/+$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/analytics",
        "/api",
        "/backlog",
        "/battle-plan",
        "/billing",
        "/calendar",
        "/dashboard",
        "/exams",
        "/focus",
        "/goals",
        "/habits",
        "/heatmap",
        "/homework",
        "/journal",
        "/marks",
        "/mock-tests",
        "/notes",
        "/onboarding",
        "/reminders",
        "/review",
        "/revision",
        "/settings",
        "/subjects",
        "/templates",
        "/timetable",
        "/topics",
        "/weak-areas"
      ]
    },
    sitemap: `${SITE_URL}/sitemap.xml`
  };
}
