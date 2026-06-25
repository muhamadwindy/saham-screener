"use client";

import { useEffect, useRef, useState } from "react";
import { BarChart2, ChevronUp, ChevronDown } from "lucide-react";

const STORAGE_KEY = "ihsg_chart_visible";

export function IHSGChart() {
  const [visible, setVisible] = useState(true);
  const [chartTheme, setChartTheme] = useState<"light" | "dark">("light");
  const widgetRef = useRef<HTMLDivElement>(null);

  // Sync collapsed state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) setVisible(stored === "true");
  }, []);

  // Detect and watch for theme changes
  useEffect(() => {
    const detect = () => {
      const isDark = document.documentElement.classList.contains("dark");
      setChartTheme(isDark ? "dark" : "light");
    };
    detect();
    const obs = new MutationObserver(detect);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  // Re-render TradingView widget when visible or theme changes
  useEffect(() => {
    if (!visible || !widgetRef.current) return;
    widgetRef.current.innerHTML = "";

    const isDark = chartTheme === "dark";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: "IDX:COMPOSITE",
      interval: "D",
      timezone: "Asia/Jakarta",
      theme: chartTheme,
      style: "1",
      locale: "id",
      backgroundColor: isDark ? "rgba(22,27,39,0)" : "rgba(255,255,255,0)",
      gridColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
      enable_publishing: false,
      allow_symbol_change: false,
      calendar: false,
      hide_side_toolbar: true,
      save_image: false,
    });
    widgetRef.current.appendChild(script);

    return () => {
      if (widgetRef.current) widgetRef.current.innerHTML = "";
    };
  }, [visible, chartTheme]);

  const toggle = () => {
    setVisible((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  return (
    <div className="card overflow-hidden">
      <button
        onClick={toggle}
        className="flex w-full items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-white/8 hover:bg-slate-50 dark:hover:bg-white/3 transition-colors"
        aria-expanded={visible}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 border border-blue-200 dark:bg-blue-500/20 dark:border-blue-500/30">
            <BarChart2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden />
          </div>
          <span className="text-sm font-semibold text-slate-800 dark:text-white">
            IHSG · IDX Composite
          </span>
          <span className="text-xs text-slate-400 dark:text-gray-500">Real-time via TradingView</span>
        </div>
        {visible
          ? <ChevronUp className="h-4 w-4 text-slate-400 dark:text-gray-500" />
          : <ChevronDown className="h-4 w-4 text-slate-400 dark:text-gray-500" />
        }
      </button>

      {visible && (
        <div className="relative h-[300px] w-full">
          <div className="tradingview-widget-container h-full w-full" ref={widgetRef} />
        </div>
      )}
    </div>
  );
}
