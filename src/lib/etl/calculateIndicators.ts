import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { emiten, ohlcv_harian, indikator_teknikal_cache } from "@/lib/db/schema";
import { MA_PARAMS } from "@/lib/scoring/weights";
import type { Horizon, Signal } from "@/types";

const HORIZONS: Horizon[] = ["harian", "3hari", "5hari"];

interface Bar {
  tanggal: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function rollingMean(values: number[], window: number, endIndex: number): number | null {
  const start = endIndex - window + 1;
  if (start < 0) return null;
  let sum = 0;
  for (let i = start; i <= endIndex; i++) sum += values[i];
  return sum / window;
}

// Replikasi pandas .ewm(com=period-1, min_periods=period).mean() (adjust=True default):
// mean_i = N_i / D_i, dengan N_i = x_i + (1-alpha)*N_{i-1}, D_i = 1 + (1-alpha)*D_{i-1}, alpha = 1/period
function calcRsiLast(closes: number[], period: number): number | null {
  const alpha = 1 / period;
  let gNum = 0, gDen = 0, lNum = 0, lDen = 0, count = 0;
  let last: number | null = null;

  for (let i = 1; i < closes.length; i++) {
    const delta = closes[i] - closes[i - 1];
    const gain = Math.max(delta, 0);
    const loss = Math.max(-delta, 0);
    gNum = gain + (1 - alpha) * gNum;
    gDen = 1 + (1 - alpha) * gDen;
    lNum = loss + (1 - alpha) * lNum;
    lDen = 1 + (1 - alpha) * lDen;
    count++;

    if (count >= period) {
      const avgGain = gNum / gDen;
      const avgLoss = lNum / lDen;
      last = avgLoss === 0 ? null : 100 - 100 / (1 + avgGain / avgLoss);
    }
  }
  return last;
}

function signalTren(close: number, maS: number | null, maL: number | null): Signal {
  if (maS === null || maL === null) return "netral";
  if (close > maS && maS > maL) return "baik";
  if (close < maS && close < maL) return "tidak_baik";
  return "netral";
}

function signalRsi(rsi: number | null): Signal {
  if (rsi === null) return "netral";
  if (rsi < 30) return "baik";
  if (rsi > 70) return "tidak_baik";
  if (rsi >= 40 && rsi <= 60) return "baik";
  return "netral";
}

function signalVolume(volume: number, volAvg: number | null): Signal {
  if (volAvg === null || volAvg === 0) return "netral";
  return volume > volAvg ? "baik" : "tidak_baik";
}

function detectPriceAction(bars: Bar[]): Signal {
  if (bars.length < 2) return "netral";
  const prev = bars[bars.length - 2];
  const curr = bars[bars.length - 1];
  const prevBody = prev.close - prev.open;
  const currBody = curr.close - curr.open;
  const currRange = curr.high - curr.low;

  if (prevBody < 0 && currBody > 0 && curr.open <= prev.close && curr.close >= prev.open) return "baik";
  if (currBody > 0 && currRange > 0 && (curr.open - curr.low) / currRange > 0.6) return "baik";
  if (prevBody > 0 && currBody < 0 && curr.open >= prev.close && curr.close <= prev.open) return "tidak_baik";
  if (currRange > 0 && currBody < 0 && (curr.high - curr.open) / currRange > 0.6) return "tidak_baik";
  return "netral";
}

export async function calculateIndicators(tradeDate: string): Promise<{ processed: number }> {
  const universeRows = await db
    .select({ kode_saham: emiten.kode_saham })
    .from(emiten)
    .where(and(eq(emiten.is_syariah, true), eq(emiten.is_bank, false)));
  const kodeList = universeRows.map((r) => r.kode_saham);
  if (kodeList.length === 0) return { processed: 0 };

  const allBars = await db
    .select({
      kode_saham: ohlcv_harian.kode_saham,
      tanggal: ohlcv_harian.tanggal,
      open: sql<number>`${ohlcv_harian.open}::float`,
      high: sql<number>`${ohlcv_harian.high}::float`,
      low: sql<number>`${ohlcv_harian.low}::float`,
      close: sql<number>`${ohlcv_harian.close}::float`,
      volume: sql<number>`${ohlcv_harian.volume}::float`,
    })
    .from(ohlcv_harian)
    .where(inArray(ohlcv_harian.kode_saham, kodeList))
    .orderBy(ohlcv_harian.kode_saham, ohlcv_harian.tanggal);

  const byKode = new Map<string, Bar[]>();
  for (const b of allBars) {
    if (b.close === null) continue;
    const arr = byKode.get(b.kode_saham) ?? [];
    arr.push({ tanggal: b.tanggal, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume });
    byKode.set(b.kode_saham, arr);
  }

  type InsertRow = typeof indikator_teknikal_cache.$inferInsert;
  const rows: InsertRow[] = [];
  const processedKodes = new Set<string>();

  for (const kode of kodeList) {
    const bars = byKode.get(kode);
    if (!bars || bars.length < 5) continue;
    if (bars[bars.length - 1].tanggal !== tradeDate) continue;

    const closes = bars.map((b) => b.close);
    const volumes = bars.map((b) => b.volume);
    const lastIdx = bars.length - 1;
    const closeVal = closes[lastIdx];
    const volVal = volumes[lastIdx];
    const priceActionSignal = detectPriceAction(bars);

    for (const horizon of HORIZONS) {
      const p = MA_PARAMS[horizon];
      if (bars.length < p.maPanjang) continue;

      const maS = rollingMean(closes, p.maPendek, lastIdx);
      const maL = rollingMean(closes, p.maPanjang, lastIdx);
      const volAvg = rollingMean(volumes, p.volumeWindow, lastIdx);
      const rsi = calcRsiLast(closes, p.rsiPeriode);

      rows.push({
        kode_saham: kode,
        tanggal: tradeDate,
        horizon,
        ma_pendek: maS !== null ? String(maS) : null,
        ma_panjang: maL !== null ? String(maL) : null,
        rsi: rsi !== null ? String(rsi) : null,
        volume_avg_n: volAvg !== null ? String(volAvg) : null,
        sinyal_tren: signalTren(closeVal, maS, maL),
        sinyal_momentum: signalRsi(rsi),
        sinyal_volume: signalVolume(volVal, volAvg),
        sinyal_price_action: priceActionSignal,
      });
      processedKodes.add(kode);
    }
  }

  const CHUNK = 300;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    await db
      .insert(indikator_teknikal_cache)
      .values(chunk)
      .onConflictDoUpdate({
        target: [
          indikator_teknikal_cache.kode_saham,
          indikator_teknikal_cache.tanggal,
          indikator_teknikal_cache.horizon,
        ],
        set: {
          ma_pendek: sql`excluded.ma_pendek`,
          ma_panjang: sql`excluded.ma_panjang`,
          rsi: sql`excluded.rsi`,
          volume_avg_n: sql`excluded.volume_avg_n`,
          sinyal_tren: sql`excluded.sinyal_tren`,
          sinyal_momentum: sql`excluded.sinyal_momentum`,
          sinyal_volume: sql`excluded.sinyal_volume`,
          sinyal_price_action: sql`excluded.sinyal_price_action`,
        },
      });
  }

  return { processed: processedKodes.size };
}
