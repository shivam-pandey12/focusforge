"use client";

import { useEffect, useState } from "react";

export function useDeferredDataStart(delayMs = 0): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let timeoutId: number | undefined;
    const frameId = window.requestAnimationFrame(() => {
      timeoutId = window.setTimeout(() => setReady(true), delayMs);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [delayMs]);

  return ready;
}
