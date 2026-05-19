"use client";

import { useEffect, useState } from "react";

export default function OfflineBanner() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(window.navigator.onLine);

    function handleOnline() {
      setOnline(true);
    }

    function handleOffline() {
      setOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (online) {
    return null;
  }

  return (
    <div className="status-box status-warning rounded-none border-x-0 border-t-0 px-4 py-3 text-center">
      Offline mode is on. Previously loaded pages stay available, and supported changes will sync when connection returns.
    </div>
  );
}
