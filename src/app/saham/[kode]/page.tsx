import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSahamDetail } from "@/lib/db/queries/saham";
import { StockDetailTabs } from "@/components/detail/StockDetailTabs";
import { LiveChart } from "@/components/detail/LiveChart";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { HorizonSelector } from "@/components/dashboard/HorizonSelector";
import { Suspense } from "react";
import {
  formatHarga,
  formatPersen,
  watchlistBadgeClass,
  watchlistLabel,
} from "@/lib/utils/format";
import type { Horizon } from "@/types";

const VALID_HORIZONS: Horizon[] = ["harian", "3hari", "5hari"];

interface PageProps {
  params: { kode: string };
  searchParams: { horizon?: string };
}

export async function generateMetadata({ params }: PageProps) {
  return {
    title: `${params.kode.toUpperCase()} — IDX Screener`,
  };
}

export default async function SahamDetailPage({
  params,
  searchParams,
}: PageProps) {
  const kode = params.kode.toUpperCase();
  const rawHorizon = searchParams.horizon ?? "harian";
  const horizon = VALID_HORIZONS.includes(rawHorizon as Horizon)
    ? (rawHorizon as Horizon)
    : "harian";

  const detail = await getSahamDetail(kode, horizon);
  if (!detail) notFound();

  const { emiten, skor, teknikal } = detail;
  const lastPrice = teknikal.ohlcv_30hari.at(-1)?.close ?? null;
  const prevPrice = teknikal.ohlcv_30hari.at(-2)?.close ?? null;
  const perubahan =
    lastPrice !== null && prevPrice !== null && prevPrice !== 0
      ? ((lastPrice - prevPrice) / prevPrice) * 100
      : null;
  const isUp = perubahan !== null && perubahan >= 0;

  return (
    <div className="mx-auto max-w-[1680px] space-y-6">
      {/* Breadcrumb */}
      <Link
        href={`/?horizon=${horizon}`}
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-slate-800 dark:text-gray-500 dark:hover:text-gray-300"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Kembali ke Dashboard
      </Link>

      {/* Hero Card */}
      <div className="card p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          {/* Info kiri */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                {kode}
              </h1>
              {skor?.skor_komposit !== undefined && (
                <ScoreBadge skor={skor.skor_komposit} size="lg" />
              )}
              {detail.flow_bandar.watchlist_tier && (
                <span
                  className={`text-xs font-semibold ${watchlistBadgeClass(
                    detail.flow_bandar.watchlist_tier
                  )}`}
                >
                  {watchlistLabel(detail.flow_bandar.watchlist_tier)}
                </span>
              )}
            </div>

            <div>
              <p className="text-base font-medium text-slate-600 dark:text-gray-300">{emiten.nama_emiten}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                {emiten.sektor && (
                  <span className="badge-gray">{emiten.sektor}</span>
                )}
                {emiten.sub_sektor && (
                  <span className="badge-gray">{emiten.sub_sektor}</span>
                )}
                {emiten.is_syariah && (
                  <span className="badge-green">✓ Syariah</span>
                )}
              </div>
            </div>
          </div>

          {/* Harga kanan */}
          <div className="space-y-1 text-right">
            <div className="font-mono text-4xl font-black text-slate-900 dark:text-white">
              {formatHarga(lastPrice)}
            </div>
            {perubahan !== null && (
              <div
                className={`text-lg font-bold ${
                  isUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
                }`}
              >
                {isUp ? "▲" : "▼"} {formatPersen(perubahan)}
              </div>
            )}
          </div>
        </div>

        {/* Skor breakdown */}
        <div className="mt-6 grid grid-cols-3 divide-x divide-slate-100 rounded-xl border border-slate-100 bg-slate-50 dark:divide-white/8 dark:border-white/8 dark:bg-white/3">
          {[
            { label: "Fundamental", skor: skor?.skor_fundamental ?? null, color: "text-blue-600 dark:text-blue-400" },
            { label: "Teknikal", skor: skor?.skor_teknikal ?? null, color: "text-emerald-600 dark:text-emerald-400" },
            { label: "Flow Bandar", skor: skor?.skor_flow_bandar ?? null, color: "text-purple-600 dark:text-purple-400" },
          ].map(({ label, skor: s, color }) => (
            <div key={label} className="flex flex-col items-center gap-1.5 px-3 py-4">
              <div className={`text-xs font-semibold uppercase tracking-wider ${color}`}>
                {label}
              </div>
              <ScoreBadge skor={s} size="lg" />
            </div>
          ))}
        </div>
      </div>

      {/* Horizon selector */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500 dark:text-gray-400">Horizon Analisis</span>
        <Suspense>
          <HorizonSelector current={horizon} />
        </Suspense>
      </div>

      {/* Live chart (SB / TV toggle) */}
      <LiveChart kode={kode} />

      {/* Tabs detail */}
      <div className="card p-6">
        <StockDetailTabs detail={detail} horizon={horizon} />
      </div>
    </div>
  );
}
