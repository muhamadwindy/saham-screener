"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Maximize2, Minimize2 } from "lucide-react";

type Source = "sb" | "tv";

interface Props {
  kode: string;
}

export function LiveChart({ kode }: Props) {
  const [source, setSource] = useState<Source>("sb");
  const [expanded, setExpanded] = useState(false);
  const [chartTheme, setChartTheme] = useState<"light" | "dark">("light");
  const tvRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const detect = () => {
      setChartTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    };
    detect();
    const obs = new MutationObserver(detect);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (source !== "tv" || !tvRef.current) return;
    tvRef.current.innerHTML = "";
    const isDark = chartTheme === "dark";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: `IDX:${kode}`,
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
      hide_side_toolbar: false,
      save_image: false,
      studies: ["Volume@tv-basicstudies"],
      show_popup_button: true,
    });
    tvRef.current.appendChild(script);
    return () => { if (tvRef.current) tvRef.current.innerHTML = ""; };
  }, [source, chartTheme, kode]);

  const height = expanded ? "h-[640px]" : "h-[420px]";
  const sbUrl = `https://stockbit.com/symbol/${kode}/chartbit`;
  const tvUrl = `https://www.tradingview.com/chart/?symbol=IDX:${kode}`;

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 dark:border-white/8">
        <div className="flex items-center gap-3">
          {/* Source toggle */}
          <div className="flex overflow-hidden rounded-lg border border-slate-200 dark:border-white/10">
            <button
              onClick={() => setSource("sb")}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                source === "sb"
                  ? "bg-emerald-500 text-white"
                  : "bg-white text-slate-500 hover:bg-slate-50 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10"
              }`}
            >
              Stockbit
            </button>
            <button
              onClick={() => setSource("tv")}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                source === "tv"
                  ? "bg-blue-500 text-white"
                  : "bg-white text-slate-500 hover:bg-slate-50 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10"
              }`}
            >
              TradingView
            </button>
          </div>
          <span className="text-sm font-semibold text-slate-800 dark:text-white">
            {kode} · Live Chart
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500 transition-all hover:bg-slate-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10"
          >
            {expanded ? <><Minimize2 className="h-3 w-3" /> Perkecil</> : <><Maximize2 className="h-3 w-3" /> Perbesar</>}
          </button>
          <a
            href={source === "sb" ? sbUrl : tvUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
              source === "sb"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25"
                : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-300 dark:hover:bg-blue-500/25"
            }`}
          >
            Buka {source === "sb" ? "Stockbit" : "TradingView"}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Chart area */}
      <div className={`w-full transition-all duration-300 ${height}`}>
        {source === "sb" ? (
          <iframe
            src={sbUrl}
            title={`Chart ${kode} - Stockbit`}
            className="h-full w-full border-0"
            loading="lazy"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        ) : (
          <div className="tradingview-widget-container h-full w-full" ref={tvRef} />
        )}
      </div>
    </div>
  );
}
