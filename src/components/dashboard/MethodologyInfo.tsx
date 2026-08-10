"use client";

import { BarChart2, TrendingUp, Layers, Info } from "lucide-react";
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
    <details className="card-sm group px-4 py-2.5 open:pb-4">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-slate-500 marker:content-none dark:text-gray-400">
        <Info className="h-3.5 w-3.5" />
        Metodologi skor — apa saja yang dihitung
        <span className="ml-auto text-slate-300 transition-transform group-open:rotate-180 dark:text-gray-600">
          ⌄
        </span>
      </summary>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
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
