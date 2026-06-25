import { Suspense } from "react";
import { getDashboard } from "@/lib/db/queries/dashboard";
import { IHSGChart } from "@/components/dashboard/IHSGChart";
import { HorizonSelector } from "@/components/dashboard/HorizonSelector";
import { TopStocksTable } from "@/components/dashboard/TopStocksTable";
import { WatchlistSection } from "@/components/dashboard/WatchlistSection";
import { StatsBar } from "@/components/dashboard/StatsBar";
import { ScoreSidebar } from "@/components/dashboard/ScoreSidebar";
import type { Horizon } from "@/types";

const VALID_HORIZONS: Horizon[] = ["harian", "3hari", "5hari"];

interface PageProps {
  searchParams: { horizon?: string };
}

async function DashboardData({ horizon }: { horizon: Horizon }) {
  const data = await getDashboard(horizon);

  return (
    <>
      {/* KPI cards */}
      <StatsBar stats={data.stats} topCount={data.top_saham.length} />

      {/* Watchlist (bila ada) */}
      {data.watchlist.length > 0 && (
        <WatchlistSection items={data.watchlist} horizon={horizon} />
      )}

      {/* 2-column: table + sidebar */}
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
        {/* Left — main content */}
        <div className="min-w-0 flex-1 space-y-4">
          <IHSGChart />
          <div>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-white">
                Top {data.top_saham.length} Saham
              </h2>
              <span className="badge-gray">Skor Komposit Tertinggi</span>
              <span className="badge-gray capitalize">{horizon}</span>
            </div>
            <TopStocksTable data={data.top_saham} horizon={horizon} />
          </div>
        </div>

        {/* Right sidebar — sticky on xl */}
        <div className="w-full xl:w-[300px] xl:shrink-0 xl:sticky xl:top-[68px]">
          <ScoreSidebar topSaham={data.top_saham} stats={data.stats} />
        </div>
      </div>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <>
      {/* KPI skeletons */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card animate-pulse flex items-center gap-4 px-5 py-4">
            <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-white/10 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-16 rounded bg-slate-200 dark:bg-white/10" />
              <div className="h-5 w-24 rounded bg-slate-200 dark:bg-white/10" />
            </div>
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="card overflow-hidden animate-pulse">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex gap-4 border-b border-slate-50 dark:border-white/5 px-4 py-4 last:border-0">
            <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-white/10" />
            <div className="h-4 w-28 rounded bg-slate-200 dark:bg-white/10 self-center" />
            <div className="ml-auto flex gap-3">
              <div className="h-4 w-20 rounded bg-slate-200 dark:bg-white/10 self-center" />
              <div className="h-4 w-20 rounded bg-slate-200 dark:bg-white/10 self-center" />
              <div className="h-4 w-20 rounded bg-slate-200 dark:bg-white/10 self-center" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default function DashboardPage({ searchParams }: PageProps) {
  const rawHorizon = searchParams.horizon ?? "harian";
  const horizon = VALID_HORIZONS.includes(rawHorizon as Horizon)
    ? (rawHorizon as Horizon)
    : "harian";

  return (
    <div className="mx-auto max-w-[1680px] space-y-5">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="gradient-text text-3xl font-bold tracking-tight">
            IDX Stock Screener
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-gray-500">
            Saham non-bank syariah · Fundamental · Teknikal · Flow Bandar
          </p>
        </div>
        <Suspense>
          <HorizonSelector current={horizon} />
        </Suspense>
      </div>

      {/* Async dashboard content */}
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardData horizon={horizon} />
      </Suspense>
    </div>
  );
}
