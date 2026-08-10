"use client";

import { BarChart2, TrendingUp, Layers, Info, ChevronDown } from "lucide-react";
import {
  ANALYSIS_FACTOR_ORDER,
  ANALYSIS_FACTOR_LABELS,
  ANALYSIS_FACTOR_METHODOLOGY,
  type AnalysisFactor,
} from "@/lib/scoring/weights";

const ICONS: Record<AnalysisFactor, typeof TrendingUp> = {
  teknikal: TrendingUp,
  flow_bandar: Layers,
  fundamental: BarChart2,
};

export function MethodologyInfo() {
  return (
    <details open className="card-sm group overflow-hidden">
      <summary
        className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-slate-600 marker:content-none transition-colors hover:bg-slate-50 dark:text-gray-300 dark:hover:bg-white/5"
      >
        <Info className="h-4 w-4 text-slate-400 dark:text-gray-500" />
        Metodologi skor — apa saja yang dihitung
        <ChevronDown className="ml-auto h-4 w-4 text-slate-400 transition-transform duration-200 group-open:rotate-180 dark:text-gray-500" />
      </summary>

      <div className="grid gap-3 border-t border-slate-100 px-4 py-4 dark:border-white/8 sm:grid-cols-3">
        {ANALYSIS_FACTOR_ORDER.map((factor, i) => {
          const Icon = ICONS[factor];
          const meta = ANALYSIS_FACTOR_METHODOLOGY[factor];
          return (
            <div key={factor} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-white/8 dark:bg-white/[0.03]">
              <div className="mb-1.5 flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-500 dark:bg-white/10 dark:text-gray-400">
                  {i + 1}
                </span>
                <Icon className="h-3.5 w-3.5 text-slate-400 dark:text-gray-500" />
                <span className="text-xs font-semibold text-slate-700 dark:text-gray-200">
                  {ANALYSIS_FACTOR_LABELS[factor]}
                </span>
              </div>
              <p className="mb-2 text-[11px] leading-relaxed text-slate-500 dark:text-gray-500">
                {meta.summary}
              </p>
              <ul className="space-y-1">
                {meta.poin.map((p) => (
                  <li key={p} className="flex gap-1.5 text-[11px] leading-relaxed text-slate-600 dark:text-gray-400">
                    <span className="text-slate-300 dark:text-gray-600">•</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </details>
  );
}
