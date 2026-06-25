import Link from "next/link";
import { Trophy } from "lucide-react";
import { formatHarga, formatPersen } from "@/lib/utils/format";
import type { TopSahamRow, Horizon } from "@/types";

interface Props {
  saham: TopSahamRow;
  horizon: Horizon;
}

function ScoreBar({ label, value, color }: { label: string; value: number | null; color: string }) {
  const pct = value !== null ? Math.round(value * 100) : null;
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-xs text-slate-500 dark:text-gray-500">{label}</span>
      <div className="flex flex-1 items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
          <div
            className={`h-full rounded-full transition-all ${color}`}
            style={{ width: pct !== null ? `${pct}%` : "0%" }}
          />
        </div>
        <span className="w-6 text-right font-mono text-xs font-bold text-slate-600 dark:text-gray-300">
          {pct ?? "—"}
        </span>
      </div>
    </div>
  );
}

export function TopSahamCard({ saham, horizon }: Props) {
  const isUp = saham.perubahan_pct !== null && saham.perubahan_pct >= 0;
  const komposit = saham.skor_komposit !== null ? Math.round(saham.skor_komposit * 100) : null;
  const kompositColor =
    komposit !== null && komposit >= 70
      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/25"
      : komposit !== null && komposit >= 50
      ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/25"
      : "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/25";

  return (
    <div className="card overflow-hidden">
      {/* Header strip */}
      <div className="flex items-center gap-2.5 border-b border-slate-100 bg-amber-50/60 px-5 py-3 dark:border-white/8 dark:bg-amber-500/5">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/15">
          <Trophy className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
        </div>
        <span className="text-xs font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">
          #1 Top Screener
        </span>
        <span className="ml-auto text-[10px] text-slate-400 dark:text-gray-600 capitalize">{horizon}</span>
      </div>

      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:gap-6">
        {/* Left: ticker + name + scores */}
        <div className="flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/saham/${saham.kode_saham}?horizon=${horizon}`}
              className="text-2xl font-black tracking-tight text-slate-900 hover:text-emerald-600 transition-colors dark:text-white dark:hover:text-emerald-400"
            >
              {saham.kode_saham}
            </Link>
            {komposit !== null && (
              <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full border font-mono text-sm font-bold ${kompositColor}`}>
                {komposit}
              </span>
            )}
            {/* Platform links */}
            <div className="flex items-center gap-1.5">
              <a
                href={`https://stockbit.com/symbol/${saham.kode_saham}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500 transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-500 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400"
              >
                SB
              </a>
              <a
                href={`https://www.tradingview.com/chart/?symbol=IDX:${saham.kode_saham}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-500 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
              >
                TV
              </a>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-600 dark:text-gray-300">{saham.nama_emiten}</p>
            {saham.sektor && (
              <p className="mt-0.5 text-xs text-slate-400 dark:text-gray-600">{saham.sektor}</p>
            )}
          </div>

          {/* Score bars */}
          <div className="space-y-2">
            <ScoreBar label="Fundamental" value={saham.skor_fundamental} color="bg-blue-500" />
            <ScoreBar label="Teknikal" value={saham.skor_teknikal} color="bg-emerald-500" />
            <ScoreBar label="Flow Bandar" value={saham.skor_flow_bandar} color="bg-purple-500" />
          </div>
        </div>

        {/* Right: harga + perubahan */}
        <div className="flex flex-col items-end justify-between gap-4 sm:min-w-[140px]">
          <div className="text-right">
            <div className="font-mono text-3xl font-black text-slate-900 dark:text-white">
              {formatHarga(saham.close)}
            </div>
            {saham.perubahan_pct !== null && (
              <div className={`mt-0.5 text-base font-bold ${isUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                {isUp ? "▲" : "▼"} {formatPersen(saham.perubahan_pct)}
              </div>
            )}
          </div>
          <Link
            href={`/saham/${saham.kode_saham}?horizon=${horizon}`}
            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-slate-700 dark:bg-white/10 dark:hover:bg-white/20"
          >
            Lihat Detail →
          </Link>
        </div>
      </div>
    </div>
  );
}
