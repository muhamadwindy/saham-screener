import type { Horizon, SkorBobot } from "@/types";

export const DEFAULT_WEIGHTS: Record<Horizon, SkorBobot> = {
  harian: { fundamental: 0.15, teknikal: 0.50, flow_bandar: 0.35 },
  "3hari": { fundamental: 0.20, teknikal: 0.45, flow_bandar: 0.35 },
  "5hari": { fundamental: 0.30, teknikal: 0.40, flow_bandar: 0.30 },
};

// Urutan tampil selector & kolom grid: Teknikal → Flow Bandar → Fundamental
export type AnalysisFactor = "teknikal" | "flow_bandar" | "fundamental";

export const ANALYSIS_FACTOR_ORDER: AnalysisFactor[] = ["teknikal", "flow_bandar", "fundamental"];

export const ANALYSIS_FACTOR_LABELS: Record<AnalysisFactor, string> = {
  teknikal: "Teknikal",
  flow_bandar: "Flow Bandar",
  fundamental: "Fundamental",
};

// Ringkasan metodologi tiap faktor — mengikuti logika etl/calculate_indicators.py & etl/calculate_scores.py
export const ANALYSIS_FACTOR_METHODOLOGY: Record<AnalysisFactor, { summary: string; poin: string[] }> = {
  teknikal: {
    summary: "Rata-rata 4 sinyal harga & volume, parameter menyesuaikan horizon (harian/3 hari/5 hari).",
    poin: [
      "Tren — cross MA pendek (5/10/20) vs MA panjang (10/20/50)",
      "Momentum — RSI periode 7/9/14: oversold <30 atau 40–60 = baik, >70 = tidak baik",
      "Volume — volume hari ini dibanding rata-rata N hari (5/10/20)",
      "Price action — pola candlestick 2 hari terakhir (bullish/bearish engulfing, rejection wick)",
    ],
  },
  flow_bandar: {
    summary: "Rata-rata 3 komponen dari data broker summary IDX untuk deteksi akumulasi institusional.",
    poin: [
      "Akumulasi — jumlah hari net buy broker saat harga turun/flat dalam window horizon",
      "Volume net buy — total nilai net buy dinormalisasi (maks pada Rp10 miliar)",
      "Double bottom — status pola: breakout konfirmasi > terbentuk > tidak ada",
    ],
  },
  fundamental: {
    summary: "Rata-rata metrik dari laporan keuangan kuartalan (yfinance), hanya metrik yang tersedia dihitung.",
    poin: [
      "Pertumbuhan EPS YoY — >15% baik, >0% netral",
      "Pertumbuhan Revenue YoY — >10% baik, >0% netral",
      "Tren gross margin — naik vs kuartal sebelumnya",
      "DER — <0.5 baik, <1 netral (fallback debt ratio bila DER tak tersedia)",
      "Interest Coverage Ratio (ICR) — >5 baik, >3 netral",
    ],
  },
};

/**
 * Hitung ulang skor komposit di client hanya dari faktor yang aktif,
 * bobot dinormalisasi ulang persis seperti logika ETL (etl/calculate_scores.py).
 */
export function computeCustomComposite(
  scores: Record<AnalysisFactor, number | null>,
  weights: SkorBobot,
  active: Record<AnalysisFactor, boolean>
): number | null {
  let sum = 0;
  let wTotal = 0;
  for (const factor of ANALYSIS_FACTOR_ORDER) {
    if (!active[factor]) continue;
    const value = scores[factor];
    if (value === null) continue;
    const w = weights[factor];
    sum += value * w;
    wTotal += w;
  }
  return wTotal > 0 ? sum / wTotal : null;
}

export const HORIZON_LABELS: Record<Horizon, string> = {
  harian: "Harian (1 hari)",
  "3hari": "Swing 3 Hari",
  "5hari": "Swing 5 Hari",
};

export const MA_PARAMS: Record<
  Horizon,
  { maPendek: number; maPanjang: number; rsiPeriode: number; volumeWindow: number }
> = {
  harian:  { maPendek: 5,  maPanjang: 10, rsiPeriode: 7,  volumeWindow: 5  },
  "3hari": { maPendek: 10, maPanjang: 20, rsiPeriode: 9,  volumeWindow: 10 },
  "5hari": { maPendek: 20, maPanjang: 50, rsiPeriode: 14, volumeWindow: 20 },
};
