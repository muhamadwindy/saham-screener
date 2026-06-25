"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme") || "light";
    const isDark = stored === "dark";
    setDark(isDark);
    if (isDark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("theme", next ? "dark" : "light");
    if (next) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  };

  return (
    <button
      onClick={toggle}
      title={dark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-600 transition-all hover:bg-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10"
    >
      {dark ? (
        <Sun className="h-4 w-4" aria-hidden />
      ) : (
        <Moon className="h-4 w-4" aria-hidden />
      )}
      <span className="sr-only">{dark ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
