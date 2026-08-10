import { TrendingUp, Calendar, Database, Layers } from "lucide-react";
import { formatTanggal } from "@/lib/utils/format";
import type { DashboardStats } from "@/types";

interface Props {
  stats: DashboardStats;
  topCount: number;
}

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent: string;
}

function KpiCard({ icon, label, value, sub, accent }: KpiCardProps) {
  return (
    <div className="card flex items-center gap-4 px-5 py-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 dark:text-gray-500">{label}</p>
        <p className="truncate text-lg font-bold text-slate-900 dark:text-white">{value}</p>
        {sub && <p className="text-xs text-slate-400 dark:text-gray-600">{sub}</p>}
      </div>
    </div>
  );
}

export function StatsBar({ stats, topCount }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <KpiCard
        icon={<Layers className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
        accent="bg-emerald-100 dark:bg-emerald-500/15"
        label="Universe Aktif"
        value={`${stats.jumlah_universe} emiten`}
        sub="Syariah non-bank"
      />
      <KpiCard
        icon={<Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
        accent="bg-blue-100 dark:bg-blue-500/15"
        label="Update Teknikal"
        value={formatTanggal(stats.tanggal_update_teknikal)}
        sub="Via tombol Update Data"
      />
      <KpiCard
        icon={<Database className="h-5 w-5 text-purple-600 dark:text-purple-400" />}
        accent="bg-purple-100 dark:bg-purple-500/15"
        label="Update Fundamental"
        value={formatTanggal(stats.tanggal_update_fundamental)}
        sub="Kuartalan"
      />
      <KpiCard
        icon={<TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
        accent="bg-amber-100 dark:bg-amber-500/15"
        label="Tampil Top Saham"
        value={`${topCount} saham`}
        sub="Skor komposit tertinggi"
      />
    </div>
  );
}
