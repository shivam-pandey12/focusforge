"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { firebaseAuth } from "@/lib/firebase/config";

function getStoredId(storage: Storage, key: string): string {
  const existing = storage.getItem(key);

  if (existing) {
    return existing;
  }

  const nextId = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  storage.setItem(key, nextId);
  return nextId;
}

export default function TrafficTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined" || !pathname) {
      return;
    }

    const timeout = window.setTimeout(async () => {
      try {
        const visitorId = getStoredId(window.localStorage, "focusforge-visitor-id");
        const sessionId = getStoredId(window.sessionStorage, "focusforge-session-id");
        const token = await firebaseAuth?.currentUser?.getIdToken().catch(() => null);

        await fetch("/api/traffic", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            path: pathname,
            visitorId,
            sessionId,
            referrer: document.referrer || "",
            viewportWidth: window.innerWidth
          }),
          keepalive: true
        });
      } catch {
        // Traffic diagnostics are intentionally silent; product flows must never depend on them.
      }
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [pathname]);

  return null;
}
