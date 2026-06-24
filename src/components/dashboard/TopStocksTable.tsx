import Link from "next/link";
import { ExternalLink } from "lucide-react";
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

export function TopStocksTable({ data, horizon }: Props) {
  if (data.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-3 text-4xl">📊</div>
        <p className="text-sm text-gray-400">
          Tidak ada data. ETL belum dijalankan atau database masih kosong.
        </p>
        <p className="mt-1 text-xs text-gray-600">
          Jalankan <code className="text-emerald-500">python etl/fetch_ohlcv.py</code> untuk mulai.
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8 text-left">
              <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500">#</th>
              <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500">Emiten</th>
              <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500">Sektor</th>
              <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Harga</th>
              <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">F</th>
              <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">T</th>
              <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">FB</th>
              <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Total</th>
              <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
              <th className="px-4 py-3.5" />
            </tr>
          </thead>
          <tbody>
            {data.map((s, i) => {
              const isUp = s.perubahan_pct !== null && s.perubahan_pct >= 0;
              return (
                <tr
                  key={s.kode_saham}
                  className="group border-b border-white/5 transition-colors hover:bg-white/3 last:border-0"
                >
                  <td className="px-4 py-3.5 font-mono text-xs text-gray-600">{i + 1}</td>
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/saham/${s.kode_saham}?horizon=${horizon}`}
                      className="block"
                    >
                      <span className="font-bold text-white group-hover:text-emerald-400 transition-colors">
                        {s.kode_saham}
                      </span>
                      <div className="text-xs text-gray-500 truncate max-w-[140px]">
                        {s.nama_emiten}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs text-gray-500">
                      {s.sektor ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="font-mono text-sm font-medium text-gray-200">
                      {formatHarga(s.close)}
                    </div>
                    <div
                      className={`text-xs font-medium ${isUp ? "text-emerald-400" : "text-red-400"}`}
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
                      <span className="text-gray-700">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <a
                      href={`https://stockbit.com/symbol/${s.kode_saham}/chartbit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 whitespace-nowrap text-xs text-gray-600 opacity-0 group-hover:opacity-100 hover:text-emerald-400 transition-all"
                    >
                      Chart <ExternalLink className="h-3 w-3" aria-hidden />
                    </a>
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
