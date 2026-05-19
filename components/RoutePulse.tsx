"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function RoutePulse() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(true);
    const timeout = window.setTimeout(() => setActive(false), 720);

    return () => window.clearTimeout(timeout);
  }, [pathname]);

  return <div className={active ? "route-pulse route-pulse-active" : "route-pulse"} aria-hidden="true" />;
}
