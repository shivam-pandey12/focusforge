import type { MetadataRoute } from "next";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://focusforge.app").replace(/\/+$/, "");

const publicRoutes = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/pricing", priority: 0.9, changeFrequency: "weekly" },
  { path: "/docs", priority: 0.85, changeFrequency: "weekly" },
  { path: "/support", priority: 0.75, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.75, changeFrequency: "monthly" },
  { path: "/privacy", priority: 0.55, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.55, changeFrequency: "yearly" },
  { path: "/refund-policy", priority: 0.55, changeFrequency: "yearly" },
  { path: "/cancellation-policy", priority: 0.55, changeFrequency: "yearly" },
  { path: "/refund-cancellation-policy", priority: 0.6, changeFrequency: "yearly" },
  { path: "/digital-delivery-policy", priority: 0.6, changeFrequency: "yearly" },
  { path: "/updates", priority: 0.6, changeFrequency: "monthly" },
  { path: "/feedback", priority: 0.45, changeFrequency: "monthly" },
  { path: "/signup", priority: 0.7, changeFrequency: "monthly" },
  { path: "/login", priority: 0.35, changeFrequency: "yearly" }
] satisfies Array<{
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}>;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return publicRoutes.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority
  }));
}
