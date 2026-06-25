import Link from "next/link";
import { ShieldCheck, Star, Shield } from "lucide-react";
import { formatTanggal, formatSkor, watchlistBadgeClass } from "@/lib/utils/format";
import type { WatchlistItem, Horizon } from "@/types";

const TIER_CONFIG = {
  high_confidence: {
    icon: <ShieldCheck className="h-4 w-4 text-purple-500 dark:text-purple-400" />,
    label: "High Confidence",
    glow: "shadow-purple-100 border-purple-200 dark:shadow-purple-500/10 dark:border-purple-500/20",
    dot: "bg-purple-400",
  },
  priority: {
    icon: <Star className="h-4 w-4 text-blue-500 dark:text-blue-400" />,
    label: "Priority",
    glow: "shadow-blue-100 border-blue-200 dark:shadow-blue-500/10 dark:border-blue-500/20",
    dot: "bg-blue-400",
  },
  base: {
    icon: <Shield className="h-4 w-4 text-amber-500 dark:text-amber-400" />,
    label: "Watchlist",
    glow: "shadow-amber-100 border-amber-200 dark:shadow-amber-500/10 dark:border-amber-500/20",
    dot: "bg-amber-400",
  },
};

interface Props {
  items: WatchlistItem[];
  horizon: Horizon;
}

export function WatchlistSection({ items, horizon }: Props) {
  if (items.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Watchlist Bandar</h2>
        <span className="badge-gray">7 hari terakhir</span>
        <span className="badge-gray">{items.length} saham</span>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const cfg = TIER_CONFIG[item.tingkat];
          return (
            <Link
              key={`${item.kode_saham}-${item.tanggal}-${item.tingkat}`}
              href={`/saham/${item.kode_saham}?horizon=${horizon}`}
              className={`group card-sm border flex items-start gap-3 p-4 shadow-lg transition-all duration-200 hover:scale-[1.01] hover:shadow-xl ${cfg.glow}`}
            >
              <div className="mt-0.5 shrink-0">{cfg.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors dark:text-white dark:group-hover:text-emerald-300">
                    {item.kode_saham}
                  </span>
                  <span className={`text-xs font-medium ${watchlistBadgeClass(item.tingkat)}`}>
                    {cfg.label}
                  </span>
                </div>
                <div className="text-xs text-slate-400 truncate dark:text-gray-500">{item.nama_emiten}</div>
                {item.keterangan && (
                  <div className="mt-1.5 text-xs text-slate-400 line-clamp-2 dark:text-gray-600">
                    {item.keterangan}
                  </div>
                )}
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-slate-400 dark:text-gray-600">{formatTanggal(item.tanggal)}</span>
                  {item.skor_komposit !== null && (
                    <span className="font-mono text-xs font-bold text-slate-600 dark:text-gray-300">
                      Skor {formatSkor(item.skor_komposit)}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
