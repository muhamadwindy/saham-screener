import { Clock, Database, Users, Layers } from "lucide-react";
import { formatTanggal } from "@/lib/utils/format";
import type { DashboardStats } from "@/types";

interface StatItem {
  icon: React.ReactNode;
  label: string;
  value: string;
  note?: string;
}

export function StatsBar({ stats }: { stats: DashboardStats }) {
  const items: StatItem[] = [
    {
      icon: <Clock className="h-3.5 w-3.5 text-emerald-400" />,
      label: "Teknikal & Flow",
      value: formatTanggal(stats.tanggal_update_teknikal),
    },
    {
      icon: <Database className="h-3.5 w-3.5 text-blue-400" />,
      label: "Fundamental",
      value: formatTanggal(stats.tanggal_update_fundamental),
      note: "kuartalan",
    },
    {
      icon: <Users className="h-3.5 w-3.5 text-purple-400" />,
      label: "Pemegang >5%",
      value:
        formatTanggal(stats.tanggal_import_pemegang_saham) === "—"
          ? "Belum diimport"
          : formatTanggal(stats.tanggal_import_pemegang_saham),
    },
    {
      icon: <Layers className="h-3.5 w-3.5 text-amber-400" />,
      label: "Universe",
      value: `${stats.jumlah_universe} emiten`,
    },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-xs backdrop-blur-sm"
        >
          {item.icon}
          <span className="text-gray-500">{item.label}:</span>
          <span className="font-medium text-gray-200">{item.value}</span>
          {item.note && (
            <span className="text-gray-600">({item.note})</span>
          )}
        </div>
      ))}
    </div>
  );
}
