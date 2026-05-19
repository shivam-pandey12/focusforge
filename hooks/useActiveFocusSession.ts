"use client";

import { useEffect, useState } from "react";
import { readActiveFocusSession, type ActiveFocusSessionSnapshot } from "@/lib/activeFocusSession";

export function useActiveFocusSession(): ActiveFocusSessionSnapshot | null {
  const [activeSession, setActiveSession] = useState<ActiveFocusSessionSnapshot | null>(null);

  useEffect(() => {
    function refresh() {
      setActiveSession(readActiveFocusSession());
    }

    refresh();

    const interval = window.setInterval(refresh, 15000);
    window.addEventListener("storage", refresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return activeSession;
}
