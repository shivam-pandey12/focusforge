"use client";

import { useEffect } from "react";

function getHashTarget(hash: string): HTMLElement | null {
  if (!hash || hash === "#") {
    return null;
  }

  const id = decodeURIComponent(hash.slice(1));
  return document.getElementById(id);
}

export default function SmoothAnchorScroll() {
  useEffect(() => {
    function handleAnchorClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href*='#']");

      if (!link || link.target || link.hasAttribute("download")) {
        return;
      }

      const nextUrl = new URL(link.href, window.location.href);

      if (nextUrl.origin !== window.location.origin || nextUrl.pathname !== window.location.pathname || nextUrl.search !== window.location.search) {
        return;
      }

      const target = getHashTarget(nextUrl.hash);

      if (!target) {
        return;
      }

      event.preventDefault();
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      target.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
        inline: "nearest"
      });

      window.history.pushState(null, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);

      if (!target.hasAttribute("tabindex")) {
        target.setAttribute("tabindex", "-1");
      }

      target.focus({ preventScroll: true });
    }

    document.addEventListener("click", handleAnchorClick);

    return () => {
      document.removeEventListener("click", handleAnchorClick);
    };
  }, []);

  return null;
}
