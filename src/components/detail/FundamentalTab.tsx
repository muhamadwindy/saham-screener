import { SignalBadge } from "@/components/ui/SignalBadge";
import {
  formatPersen,
  formatRupiah,
  formatTanggal,
} from "@/lib/utils/format";
import type { FundamentalMetrics, LaporanKeuangan } from "@/types";

interface Props {
  metrics: FundamentalMetrics | null;
  laporan_terkini: LaporanKeuangan | null;
  laporan_historis: LaporanKeuangan[];
}

function MetricRow({
  label,
  value,
  note,
}: {
  label: string;
  value: React.ReactNode;
  note?: string;
}) {
  return (
    <div className="metric-row">
      <div>
        <span className="text-sm text-gray-300">{label}</span>
        {note && <div className="text-xs text-gray-600">{note}</div>}
      </div>
      <div className="text-right text-sm font-mono font-medium text-gray-100">
        {value}
      </div>
    </div>
  );
}

export function FundamentalTab({
  metrics,
  laporan_terkini,
  laporan_historis,
}: Props) {
  if (!metrics || !laporan_terkini) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-4xl mb-3">📋</div>
        <p className="text-sm text-gray-500">
          Data fundamental belum tersedia.
        </p>
        <p className="text-xs text-gray-600 mt-1">
          Import laporan keuangan via ETL untuk mengaktifkan tab ini.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sinyal grid */}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "EPS Growth", signal: metrics.skor_eps_growth },
          { label: "Revenue Growth", signal: metrics.skor_revenue_growth },
          { label: "Margin Trend", signal: metrics.skor_margin },
          { label: "Struktur Utang", signal: metrics.skor_utang },
        ].map(({ label, signal }) => (
          <div
            key={label}
            className="flex flex-col gap-2.5 rounded-xl border border-white/8 bg-white/3 px-4 py-3.5"
          >
            <span className="text-xs text-gray-500">{label}</span>
            <SignalBadge signal={signal} />
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Pertumbuhan */}
        <section>
          <p className="section-title">Pertumbuhan</p>
          <div className="card-sm px-4">
            <MetricRow label="EPS Growth YoY" value={formatPersen(metrics.eps_growth_yoy)} note="Baik: > +15%" />
            <MetricRow label="EPS Growth QoQ" value={formatPersen(metrics.eps_growth_qoq)} />
            <MetricRow label="Revenue Growth YoY" value={formatPersen(metrics.revenue_growth_yoy)} note="Baik: > 0%" />
            <MetricRow label="Revenue Growth QoQ" value={formatPersen(metrics.revenue_growth_qoq)} />
          </div>
        </section>

        {/* Margin & Utang */}
        <div className="space-y-4">
          <section>
            <p className="section-title">Margin (Kuartal Terkini)</p>
            <div className="card-sm px-4">
              <MetricRow label="Gross Margin" value={formatPersen(metrics.gross_margin, 2)} />
              <MetricRow label="Operating Margin" value={formatPersen(metrics.operating_margin, 2)} />
              <MetricRow label="Net Profit Margin" value={formatPersen(metrics.net_margin, 2)} />
            </div>
          </section>

          <section>
            <p className="section-title">Struktur Utang</p>
            <div className="card-sm px-4">
              <MetricRow label="DER" value={metrics.der?.toFixed(2) ?? "—"} note="Baik: < 1" />
              <MetricRow label="Debt Ratio" value={metrics.debt_ratio?.toFixed(2) ?? "—"} note="Baik: < 0.5" />
              <MetricRow label="ICR" value={metrics.icr?.toFixed(1) ?? "—"} note="Baik: > 3" />
            </div>
          </section>
        </div>
      </div>

      {/* Tren historis */}
      <section>
        <p className="section-title">Tren Laporan Keuangan</p>
        <div className="card-sm overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/8 text-left text-gray-500">
                <th className="px-4 py-3">Periode</th>
                <th className="px-4 py-3 text-right">Rilis</th>
                <th className="px-4 py-3 text-right">Laba Bersih</th>
                <th className="px-4 py-3 text-right">Pendapatan</th>
                <th className="px-4 py-3 text-right">NPM</th>
              </tr>
            </thead>
            <tbody>
              {laporan_historis.map((l, i) => {
                const nm =
                  l.net_income !== null && l.revenue !== null && l.revenue !== 0
                    ? ((l.net_income / l.revenue) * 100).toFixed(1) + "%"
                    : "—";
                return (
                  <tr
                    key={l.periode}
                    className={`border-b border-white/5 last:border-0 transition-colors hover:bg-white/3 ${
                      i === 0 ? "bg-white/4" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-mono font-bold text-white">
                      {l.periode}
                      {i === 0 && (
                        <span className="ml-1.5 badge-green">terkini</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {formatTanggal(l.tanggal_rilis)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-300">
                      {formatRupiah(l.net_income, true)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-300">
                      {formatRupiah(l.revenue, true)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">{nm}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
