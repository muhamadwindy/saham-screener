"use client";

import { BarChart2, TrendingUp, Layers } from "lucide-react";
import {
  ANALYSIS_FACTOR_ORDER,
  ANALYSIS_FACTOR_LABELS,
  type AnalysisFactor,
} from "@/lib/scoring/weights";

const ICONS: Record<AnalysisFactor, typeof TrendingUp> = {
  teknikal: TrendingUp,
  flow_bandar: Layers,
  fundamental: BarChart2,
};

interface Props {
  active: Record<AnalysisFactor, boolean>;
  onToggle: (factor: AnalysisFactor) => void;
}

export function AnalysisSelector({ active, onToggle }: Props) {
  const activeCount = ANALYSIS_FACTOR_ORDER.filter((f) => active[f]).length;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-0.5 text-xs font-medium text-slate-400 dark:text-gray-500">
        Analisa aktif:
      </span>
      {ANALYSIS_FACTOR_ORDER.map((factor, i) => {
        const Icon = ICONS[factor];
        const isActive = active[factor];
        const isLastActive = isActive && activeCount === 1;

        return (
          <button
            key={factor}
            type="button"
            onClick={() => !isLastActive && onToggle(factor)}
            disabled={isLastActive}
            title={isLastActive ? "Minimal satu analisa harus aktif" : undefined}
            aria-pressed={isActive}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all duration-200 ${
              isActive
                ? "border-emerald-200 bg-emerald-100 text-emerald-700 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300"
                : "border-slate-200 bg-white text-slate-400 hover:text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-600 dark:hover:text-gray-400"
            } ${isLastActive ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}
          >
            <span
              className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                isActive
                  ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                  : "bg-slate-200 text-slate-400 dark:bg-white/10 dark:text-gray-600"
              }`}
            >
              {i + 1}
            </span>
            <Icon className="h-3.5 w-3.5" />
            {ANALYSIS_FACTOR_LABELS[factor]}
          </button>
        );
      })}
    </div>
  );
}
