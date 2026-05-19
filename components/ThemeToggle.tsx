"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    setTheme(getInitialTheme());
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("focusforge-theme", nextTheme);
    setTheme(nextTheme);
  }

  const dark = theme === "dark";

  return (
    <button
      aria-label={`Switch to ${dark ? "light" : "dark"} theme`}
      aria-pressed={dark}
      className="theme-toggle"
      type="button"
      onClick={toggleTheme}
    >
      <span className="theme-toggle-track" aria-hidden="true">
        <span className="theme-toggle-thumb">{dark ? "D" : "L"}</span>
      </span>
      <span className="hidden text-sm font-bold text-forge-text sm:inline">{dark ? "Dark" : "Light"}</span>
    </button>
  );
}
