import { Suspense } from "react";
import { getDashboard } from "@/lib/db/queries/dashboard";
import { IHSGChart } from "@/components/dashboard/IHSGChart";
import { HorizonSelector } from "@/components/dashboard/HorizonSelector";
import { TopStocksTable } from "@/components/dashboard/TopStocksTable";
import { WatchlistSection } from "@/components/dashboard/WatchlistSection";
import { StatsBar } from "@/components/dashboard/StatsBar";
import type { Horizon } from "@/types";

const VALID_HORIZONS: Horizon[] = ["harian", "3hari", "5hari"];

interface PageProps {
  searchParams: { horizon?: string };
}

async function DashboardContent({ horizon }: { horizon: Horizon }) {
  const data = await getDashboard(horizon);

  return (
    <div className="space-y-6">
      <StatsBar stats={data.stats} />
      {data.watchlist.length > 0 && (
        <WatchlistSection items={data.watchlist} horizon={horizon} />
      )}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-semibold text-white">Top 10 Saham</h2>
          <span className="badge-gray">Skor Komposit Tertinggi</span>
        </div>
        <TopStocksTable data={data.top_saham} horizon={horizon} />
      </div>
    </div>
  );
}

function TableFallback() {
  return (
    <div className="card overflow-hidden animate-pulse">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex gap-4 border-b border-white/5 px-4 py-4 last:border-0">
          <div className="h-4 w-4 rounded bg-white/10" />
          <div className="h-4 w-24 rounded bg-white/10" />
          <div className="ml-auto h-4 w-16 rounded bg-white/10" />
          <div className="h-4 w-12 rounded bg-white/10" />
          <div className="h-4 w-12 rounded bg-white/10" />
          <div className="h-4 w-12 rounded bg-white/10" />
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage({ searchParams }: PageProps) {
  const rawHorizon = searchParams.horizon ?? "harian";
  const horizon = VALID_HORIZONS.includes(rawHorizon as Horizon)
    ? (rawHorizon as Horizon)
    : "harian";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="gradient-text text-2xl font-bold">IDX Stock Screener</h1>
          <p className="mt-1 text-sm text-gray-500">
            Saham non-bank syariah · Fundamental + Teknikal + Flow Bandar
          </p>
        </div>
        <Suspense>
          <HorizonSelector current={horizon} />
        </Suspense>
      </div>

      {/* IHSG Chart */}
      <IHSGChart />

      {/* Dashboard content */}
      <Suspense fallback={<TableFallback />}>
        <DashboardContent horizon={horizon} />
      </Suspense>
    </div>
  );
}
