import Link from "next/link";
import { formatHarga, formatPersen, watchlistLabel, watchlistBadgeClass } from "@/lib/utils/format";
import type { TopSahamRow, Horizon } from "@/types";

interface Props {
  data: TopSahamRow[];
  horizon: Horizon;
}

function MiniBar({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="font-mono text-xs text-slate-300 dark:text-gray-700">—</span>;
  }
  const pct = Math.round(value * 100);
  const fill =
    pct >= 70 ? "bg-emerald-500" :
    pct >= 50 ? "bg-blue-500" :
    pct >= 30 ? "bg-amber-400" : "bg-red-400";
  const text =
    pct >= 70 ? "text-emerald-700 dark:text-emerald-400" :
    pct >= 50 ? "text-blue-700 dark:text-blue-400" :
    pct >= 30 ? "text-amber-700 dark:text-amber-400" : "text-red-600 dark:text-red-400";

  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
        <div className={`h-full rounded-full ${fill}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`w-6 text-right font-mono text-xs font-bold ${text}`}>{pct}</span>
    </div>
  );
}

function KompositRing({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-300 dark:text-gray-700">—</span>;
  const pct = Math.round(value * 100);
  const color =
    pct >= 70 ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/25" :
    pct >= 50 ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/25" :
    "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/25";

  return (
    <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full border font-mono text-sm font-bold ${color}`}>
      {pct}
    </span>
  );
}

export function TopStocksTable({ data, horizon }: Props) {
  if (data.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-3 text-4xl">📊</div>
        <p className="text-sm text-slate-500 dark:text-gray-400">
          Tidak ada data. ETL belum dijalankan atau database masih kosong.
        </p>
        <p className="mt-1 text-xs text-slate-400 dark:text-gray-600">
          Jalankan{" "}
          <code className="text-emerald-600 dark:text-emerald-500">python etl/fetch_ohlcv.py</code>{" "}
          untuk mulai.
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-white/8">
              <th className="w-10 px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-500">#</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-500">Emiten</th>
              <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-500">Harga</th>
              <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-500">Fundamental</th>
              <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-500">Teknikal</th>
              <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-500">Flow Bandar</th>
              <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-500">Total</th>
              <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-500">Status</th>
              <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-500">Chart</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-white/5">
            {data.map((s, i) => {
              const isUp = s.perubahan_pct !== null && s.perubahan_pct >= 0;
              const rankColor =
                i === 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400" :
                i === 1 ? "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-gray-400" :
                i === 2 ? "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400" :
                "bg-slate-50 text-slate-500 dark:bg-white/5 dark:text-gray-600";

              return (
                <tr
                  key={s.kode_saham}
                  className="group transition-colors hover:bg-slate-50/80 dark:hover:bg-white/3"
                >
                  {/* Rank */}
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${rankColor}`}>
                      {i + 1}
                    </span>
                  </td>

                  {/* Emiten */}
                  <td className="px-4 py-3.5">
                    <Link href={`/saham/${s.kode_saham}?horizon=${horizon}`} className="block">
                      <span className="font-bold text-slate-900 transition-colors group-hover:text-emerald-600 dark:text-white dark:group-hover:text-emerald-400">
                        {s.kode_saham}
                      </span>
                      <div className="mt-0.5 max-w-[160px] truncate text-xs text-slate-400 dark:text-gray-500">
                        {s.nama_emiten}
                      </div>
                      {s.sektor && (
                        <div className="mt-0.5 text-[10px] text-slate-300 dark:text-gray-700 truncate max-w-[160px]">
                          {s.sektor}
                        </div>
                      )}
                    </Link>
                  </td>

                  {/* Harga */}
                  <td className="px-4 py-3.5 text-right">
                    <div className="font-mono text-sm font-semibold text-slate-800 dark:text-gray-200">
                      {formatHarga(s.close)}
                    </div>
                    <div className={`text-xs font-medium ${isUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                      {formatPersen(s.perubahan_pct)}
                    </div>
                  </td>

                  {/* Score bars */}
                  <td className="px-4 py-3.5"><MiniBar value={s.skor_fundamental} /></td>
                  <td className="px-4 py-3.5"><MiniBar value={s.skor_teknikal} /></td>
                  <td className="px-4 py-3.5"><MiniBar value={s.skor_flow_bandar} /></td>

                  {/* Komposit ring */}
                  <td className="px-4 py-3.5 text-center">
                    <KompositRing value={s.skor_komposit} />
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3.5 text-center">
                    {s.watchlist_tier ? (
                      <span className={`text-xs font-medium ${watchlistBadgeClass(s.watchlist_tier)}`}>
                        {watchlistLabel(s.watchlist_tier)}
                      </span>
                    ) : (
                      <span className="text-slate-200 dark:text-gray-700">—</span>
                    )}
                  </td>

                  {/* Platform links */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`https://stockbit.com/symbol/${s.kode_saham}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Stockbit"
                        className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-500 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
                      >
                        SB
                      </a>
                      <a
                        href={`https://www.tradingview.com/chart/?symbol=IDX:${s.kode_saham}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="TradingView"
                        className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500 transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-500 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400"
                      >
                        TV
                      </a>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
