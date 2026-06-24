"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  ReferenceLine,
} from "recharts";
import { SignalBadge } from "@/components/ui/SignalBadge";
import { formatHarga, formatVolume, formatTanggal } from "@/lib/utils/format";
import { MA_PARAMS } from "@/lib/scoring/weights";
import type { TechnicalSnapshot, OhlcvPoint, Horizon } from "@/types";

interface Props {
  snapshot: TechnicalSnapshot | null;
  ohlcv: OhlcvPoint[];
  horizon: Horizon;
}

function MetricRow({ label, value, note }: { label: string; value: React.ReactNode; note?: string }) {
  return (
    <div className="metric-row">
      <div>
        <span className="text-sm text-gray-300">{label}</span>
        {note && <div className="text-xs text-gray-600">{note}</div>}
      </div>
      <div className="text-right text-sm font-mono font-medium text-gray-100">{value}</div>
    </div>
  );
}

const CHART_COLORS = {
  grid: "rgba(255,255,255,0.04)",
  line: "#22c55e",
  volume: "#3b82f6",
  axis: "#6b7280",
};

export function TechnicalTab({ snapshot, ohlcv, horizon }: Props) {
  const params = MA_PARAMS[horizon];

  if (!snapshot) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-4xl mb-3">📈</div>
        <p className="text-sm text-gray-500">
          Data teknikal belum tersedia untuk horizon ini.
        </p>
      </div>
    );
  }

  const chartData = ohlcv.map((d) => ({
    date: d.tanggal.slice(5),
    close: d.close,
    volume: d.volume,
  }));

  const signals = [
    { label: `Tren MA${params.maPendek}/MA${params.maPanjang}`, signal: snapshot.sinyal_tren },
    { label: `RSI(${params.rsiPeriode})`, signal: snapshot.sinyal_momentum },
    { label: `Volume (avg ${params.volumeWindow}h)`, signal: snapshot.sinyal_volume },
    { label: "Price Action", signal: snapshot.sinyal_price_action },
  ];

  return (
    <div className="space-y-6">
      {/* Sinyal grid */}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {signals.map(({ label, signal }) => (
          <div key={label} className="flex flex-col gap-2.5 rounded-xl border border-white/8 bg-white/3 px-4 py-3.5">
            <span className="text-xs text-gray-500">{label}</span>
            <SignalBadge signal={signal} />
          </div>
        ))}
      </div>

      {/* Angka indikator */}
      <section>
        <p className="section-title">Indikator ({formatTanggal(snapshot.tanggal)})</p>
        <div className="card-sm px-4">
          <MetricRow label="Harga Terakhir" value={formatHarga(snapshot.close)} />
          <MetricRow label={`MA${params.maPendek}`} value={formatHarga(snapshot.ma_pendek)} note="Baik: Harga > MA Pendek > MA Panjang" />
          <MetricRow label={`MA${params.maPanjang}`} value={formatHarga(snapshot.ma_panjang)} />
          <MetricRow label={`RSI(${params.rsiPeriode})`} value={snapshot.rsi?.toFixed(1) ?? "—"} note="Rebound dari <30 = baik · >70 = overbought" />
          <MetricRow label="Volume" value={formatVolume(snapshot.volume)} />
          <MetricRow label={`Avg Volume (${params.volumeWindow}h)`} value={formatVolume(snapshot.volume_avg_n)} note="Baik: Volume hari ini > rata-rata" />
        </div>
      </section>

      {/* Price chart */}
      {chartData.length > 0 && (
        <section>
          <p className="section-title">Harga 30 Hari</p>
          <div className="card-sm p-4">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: CHART_COLORS.axis }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tick={{ fontSize: 10, fill: CHART_COLORS.axis }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => formatHarga(v)}
                  width={65}
                />
                <Tooltip
                  formatter={(v: number) => [formatHarga(v), "Close"]}
                  contentStyle={{
                    background: "#161b27",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    fontSize: 12,
                    color: "#e5e7eb",
                  }}
                  cursor={{ stroke: "rgba(255,255,255,0.1)" }}
                />
                {snapshot.ma_pendek && (
                  <ReferenceLine
                    y={snapshot.ma_pendek}
                    stroke="#22c55e"
                    strokeDasharray="4 2"
                    strokeWidth={1}
                    label={{ value: `MA${params.maPendek}`, fontSize: 9, fill: "#22c55e", position: "insideTopRight" }}
                  />
                )}
                {snapshot.ma_panjang && (
                  <ReferenceLine
                    y={snapshot.ma_panjang}
                    stroke="#f59e0b"
                    strokeDasharray="4 2"
                    strokeWidth={1}
                    label={{ value: `MA${params.maPanjang}`, fontSize: 9, fill: "#f59e0b", position: "insideBottomRight" }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="close"
                  stroke={CHART_COLORS.line}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: CHART_COLORS.line }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Volume chart */}
      {chartData.length > 0 && (
        <section>
          <p className="section-title">Volume 30 Hari</p>
          <div className="card-sm p-4">
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={chartData} margin={{ top: 0, right: 5, bottom: 0, left: 5 }}>
                <XAxis dataKey="date" hide />
                <Tooltip
                  formatter={(v: number) => [formatVolume(v), "Volume"]}
                  contentStyle={{
                    background: "#161b27",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    fontSize: 12,
                    color: "#e5e7eb",
                  }}
                />
                <Bar dataKey="volume" fill="rgba(59,130,246,0.5)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  );
}
