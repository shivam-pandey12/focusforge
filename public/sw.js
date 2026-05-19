const CACHE_NAME = "focusforge-v12";
const APP_SHELL = [
  "/",
  "/offline.html",
  "/icons/focusforge-logo.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-icon.png"
];
const ROUTE_ALLOWLIST = [
  "/dashboard",
  "/pricing",
  "/privacy",
  "/terms",
  "/refund-policy",
  "/cancellation-policy",
  "/contact",
  "/support",
  "/feedback",
  "/updates",
  "/focus",
  "/docs",
  "/notes",
  "/calendar",
  "/analytics",
  "/timetable",
  "/revision",
  "/topics",
  "/habits",
  "/mock-tests",
  "/heatmap",
  "/goals",
  "/weak-areas",
  "/journal",
  "/onboarding",
  "/settings",
  "/settings/billing",
  "/settings/data",
  "/templates",
  "/review/daily",
  "/review/weekly",
  "/reminders"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function navigationStaleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const fallback = await cache.match("/offline.html");

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }

      return response;
    })
    .catch(() => cached || fallback);

  return cached || fetchPromise;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }

      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(navigationStaleWhileRevalidate(request));
    return;
  }

  if (url.pathname.startsWith("/_next/") || url.pathname.startsWith("/icons/") || ROUTE_ALLOWLIST.includes(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
