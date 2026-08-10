"use client";

import { useState } from "react";
import { AnalysisSelector } from "./AnalysisSelector";
import { MethodologyInfo } from "./MethodologyInfo";
import { TopStocksTable } from "./TopStocksTable";
import type { AnalysisFactor } from "@/lib/scoring/weights";
import type { TopSahamRow, Horizon } from "@/types";

interface Props {
  data: TopSahamRow[];
  horizon: Horizon;
}

export function TopStocksSection({ data, horizon }: Props) {
  const [activeFactors, setActiveFactors] = useState<Record<AnalysisFactor, boolean>>({
    teknikal: true,
    flow_bandar: true,
    fundamental: true,
  });

  const toggleFactor = (factor: AnalysisFactor) => {
    setActiveFactors((prev) => ({ ...prev, [factor]: !prev[factor] }));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-white">
            Top {data.length} Saham
          </h2>
          <span className="badge-gray">Skor Komposit Tertinggi</span>
          <span className="badge-gray capitalize">{horizon}</span>
        </div>
        <AnalysisSelector active={activeFactors} onToggle={toggleFactor} />
      </div>

      <MethodologyInfo />

      <TopStocksTable data={data} horizon={horizon} activeFactors={activeFactors} />
    </div>
  );
}
