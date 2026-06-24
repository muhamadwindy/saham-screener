"use client";

import { useEffect, useRef, useState } from "react";
import { BarChart2, Eye, EyeOff } from "lucide-react";

const STORAGE_KEY = "ihsg_chart_visible";

export function IHSGChart() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === "true";
  });
  const widgetRef = useRef<HTMLDivElement>(null);

  const toggle = () => {
    setVisible((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  useEffect(() => {
    if (!visible || !widgetRef.current) return;
    widgetRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: "IDX:COMPOSITE",
      interval: "D",
      timezone: "Asia/Jakarta",
      theme: "dark",
      style: "1",
      locale: "id",
      backgroundColor: "rgba(22, 27, 39, 0)",
      gridColor: "rgba(255, 255, 255, 0.04)",
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
  }, [visible]);

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/20 border border-blue-500/30">
            <BarChart2 className="h-3.5 w-3.5 text-blue-400" aria-hidden />
          </div>
          <div>
            <span className="text-sm font-semibold text-white">IHSG · IDX Composite</span>
            <span className="ml-2 text-xs text-gray-500">Real-time via TradingView</span>
          </div>
        </div>
        <button
          onClick={toggle}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
            visible
              ? "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200"
              : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/25"
          }`}
          aria-pressed={visible}
        >
          {visible
            ? <><EyeOff className="h-3 w-3" /> Sembunyikan</>
            : <><Eye className="h-3 w-3" /> Tampilkan Chart</>
          }
        </button>
      </div>

      {visible && (
        <div className="relative h-[360px] w-full">
          <div
            className="tradingview-widget-container h-full w-full"
            ref={widgetRef}
          />
        </div>
      )}
    </div>
  );
}
