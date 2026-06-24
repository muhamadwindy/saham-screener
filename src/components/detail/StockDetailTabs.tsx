"use client";

import { useState } from "react";
import { BarChart2, TrendingUp, Layers } from "lucide-react";
import { FundamentalTab } from "./FundamentalTab";
import { TechnicalTab } from "./TechnicalTab";
import { FlowBandarTab } from "./FlowBandarTab";
import type { SahamDetail, Horizon } from "@/types";

const TABS = [
  { id: "teknikal",    label: "Teknikal",    icon: TrendingUp },
  { id: "flow_bandar", label: "Flow Bandar", icon: Layers     },
  { id: "fundamental", label: "Fundamental", icon: BarChart2  },
] as const;

type Tab = (typeof TABS)[number]["id"];

interface Props {
  detail: SahamDetail;
  horizon: Horizon;
}

export function StockDetailTabs({ detail, horizon }: Props) {
  const [active, setActive] = useState<Tab>("teknikal");

  return (
    <div>
      {/* Tab header */}
      <div className="flex gap-1 border-b border-white/8 mb-6">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 border-b-2 -mb-px ${
                active === tab.id ? "tab-active" : "tab-inactive"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {active === "fundamental" && (
        <FundamentalTab
          metrics={detail.fundamental.metrics}
          laporan_terkini={detail.fundamental.laporan_terkini}
          laporan_historis={detail.fundamental.laporan_historis}
        />
      )}
      {active === "teknikal" && (
        <TechnicalTab
          snapshot={detail.teknikal.snapshot}
          ohlcv={detail.teknikal.ohlcv_30hari}
          horizon={horizon}
        />
      )}
      {active === "flow_bandar" && (
        <FlowBandarTab data={detail.flow_bandar} />
      )}
    </div>
  );
}
