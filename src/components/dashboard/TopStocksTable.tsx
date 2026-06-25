import Link from "next/link";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import {
  formatHarga,
  formatPersen,
  watchlistLabel,
  watchlistBadgeClass,
} from "@/lib/utils/format";
import type { TopSahamRow, Horizon } from "@/types";

interface Props {
  data: TopSahamRow[];
  horizon: Horizon;
}

function StockbitIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current" aria-hidden>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
    </svg>
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
          Jalankan <code className="text-emerald-600 dark:text-emerald-500">python etl/fetch_ohlcv.py</code> untuk mulai.
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left dark:border-white/8">
              <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-500">#</th>
              <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-500">Emiten</th>
              <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-500">Sektor</th>
              <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-500">Harga</th>
              <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-500">F</th>
              <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-500">T</th>
              <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-500">FB</th>
              <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-500">Total</th>
              <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-500">Status</th>
              <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-500">Chart</th>
            </tr>
          </thead>
          <tbody>
            {data.map((s, i) => {
              const isUp = s.perubahan_pct !== null && s.perubahan_pct >= 0;
              return (
                <tr
                  key={s.kode_saham}
                  className="group border-b border-slate-50 transition-colors hover:bg-slate-50 last:border-0 dark:border-white/5 dark:hover:bg-white/3"
                >
                  <td className="px-4 py-3.5 font-mono text-xs text-slate-400 dark:text-gray-600">{i + 1}</td>
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/saham/${s.kode_saham}?horizon=${horizon}`}
                      className="block"
                    >
                      <span className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors dark:text-white dark:group-hover:text-emerald-400">
                        {s.kode_saham}
                      </span>
                      <div className="text-xs text-slate-400 truncate max-w-[140px] dark:text-gray-500">
                        {s.nama_emiten}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs text-slate-400 dark:text-gray-500">
                      {s.sektor ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="font-mono text-sm font-medium text-slate-800 dark:text-gray-200">
                      {formatHarga(s.close)}
                    </div>
                    <div
                      className={`text-xs font-medium ${isUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}
                    >
                      {formatPersen(s.perubahan_pct)}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <ScoreBadge skor={s.skor_fundamental} size="sm" />
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <ScoreBadge skor={s.skor_teknikal} size="sm" />
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <ScoreBadge skor={s.skor_flow_bandar} size="sm" />
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <ScoreBadge skor={s.skor_komposit} size="md" />
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {s.watchlist_tier ? (
                      <span className={`text-xs font-medium ${watchlistBadgeClass(s.watchlist_tier)}`}>
                        {watchlistLabel(s.watchlist_tier)}
                      </span>
                    ) : (
                      <span className="text-slate-300 dark:text-gray-700">—</span>
                    )}
                  </td>
                  {/* Platform links */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`https://stockbit.com/symbol/${s.kode_saham}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Lihat di Stockbit"
                        className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-500 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
                      >
                        SB
                      </a>
                      <a
                        href={`https://www.tradingview.com/chart/?symbol=IDX:${s.kode_saham}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Lihat di TradingView"
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
