import { formatTanggal } from "@/lib/utils/format";
import type { TopSahamRow, DashboardStats } from "@/types";

interface Props {
  topSaham: TopSahamRow[];
  stats: DashboardStats;
}

function SidebarBar({
  label, count, total, color,
}: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-600 dark:text-gray-400">{label}</span>
        <span className="font-semibold text-slate-800 dark:text-gray-200">{count}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function AvgScore({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="w-20 shrink-0 text-right text-xs text-slate-500 dark:text-gray-500">{label}</div>
      <div className="flex flex-1 items-center gap-2">
        <div className="flex-1 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
          <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
        </div>
        <span className={`w-7 text-right text-xs font-bold font-mono ${color.replace("bg-", "text-").replace("500", "600").replace("600", "600")} dark:${color.replace("bg-", "text-").replace("500", "400")}`}>
          {pct}
        </span>
      </div>
    </div>
  );
}

export function ScoreSidebar({ topSaham, stats }: Props) {
  const valid = topSaham.filter((s) => s.skor_komposit !== null);
  const high  = valid.filter((s) => (s.skor_komposit ?? 0) >= 0.7).length;
  const med   = valid.filter((s) => (s.skor_komposit ?? 0) >= 0.5 && (s.skor_komposit ?? 0) < 0.7).length;
  const low   = valid.filter((s) => (s.skor_komposit ?? 0) < 0.5).length;

  const avg = (key: keyof TopSahamRow) => {
    const vals = valid.map((s) => s[key] as number | null).filter((v): v is number => v !== null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  };

  const avgF = avg("skor_fundamental");
  const avgT = avg("skor_teknikal");
  const avgFB = avg("skor_flow_bandar");
  const avgK = avg("skor_komposit");

  return (
    <div className="space-y-3">
      {/* Distribusi skor */}
      <div className="card px-5 py-4 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-gray-500">
          Distribusi Skor
        </h3>
        <div className="space-y-3">
          <SidebarBar label="Strong (≥70)" count={high} total={valid.length} color="bg-emerald-500" />
          <SidebarBar label="Medium (50–69)" count={med} total={valid.length} color="bg-blue-500" />
          <SidebarBar label="Weak (<50)" count={low} total={valid.length} color="bg-amber-400" />
        </div>
      </div>

      {/* Rata-rata skor */}
      <div className="card px-5 py-4 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-gray-500">
          Rata-rata Top 10
        </h3>
        <div className="space-y-2.5">
          <AvgScore label="Komposit" value={avgK} color="bg-slate-500" />
          <AvgScore label="Fundamental" value={avgF} color="bg-purple-500" />
          <AvgScore label="Teknikal" value={avgT} color="bg-blue-500" />
          <AvgScore label="Flow Bandar" value={avgFB} color="bg-emerald-500" />
        </div>
      </div>

      {/* Data freshness */}
      <div className="card px-5 py-4 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-gray-500">
          Status Data
        </h3>
        <dl className="space-y-2 text-xs">
          {[
            { label: "Teknikal", value: formatTanggal(stats.tanggal_update_teknikal) },
            { label: "Fundamental", value: formatTanggal(stats.tanggal_update_fundamental) },
            {
              label: "Pemegang >5%",
              value: formatTanggal(stats.tanggal_import_pemegang_saham) === "—"
                ? "Belum diimport"
                : formatTanggal(stats.tanggal_import_pemegang_saham),
            },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between gap-2">
              <dt className="text-slate-500 dark:text-gray-500">{label}</dt>
              <dd className="font-medium text-slate-800 dark:text-gray-300 text-right">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Disclaimer mini */}
      <p className="px-1 text-[10px] leading-relaxed text-slate-400 dark:text-gray-600">
        Bukan rekomendasi investasi. Data bersifat edukatif. Lakukan riset mandiri (DYOR) sebelum berinvestasi.
      </p>
    </div>
  );
}
