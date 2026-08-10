import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { emiten, ohlcv_harian } from "@/lib/db/schema";

const CONCURRENCY = 10;
const CHUNK_SIZE = 500;

interface YahooBar {
  kode_saham: string;
  tanggal: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  volume: number | null;
}

type FetchResult = { kode: string; rows: YahooBar[] } | { kode: string; error: string };

async function fetchTicker(kode: string, days: number): Promise<FetchResult> {
  const end = Math.floor(Date.now() / 1000);
  const start = end - days * 86400;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${kode}.JK?period1=${start}&period2=${end}&interval=1d`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; saham-screener/1.0)" },
    });
    if (!res.ok) return { kode, error: `HTTP ${res.status}` };

    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return { kode, error: "Data kosong" };

    const timestamps: number[] = result.timestamp ?? [];
    if (timestamps.length === 0) return { kode, error: "Data kosong" };

    const gmtoffset: number = result.meta?.gmtoffset ?? 0;
    const quote = result.indicators?.quote?.[0] ?? {};
    const opens: (number | null)[] = quote.open ?? [];
    const highs: (number | null)[] = quote.high ?? [];
    const lows: (number | null)[] = quote.low ?? [];
    const closes: (number | null)[] = quote.close ?? [];
    const volumes: (number | null)[] = quote.volume ?? [];

    const rows: YahooBar[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const close = closes[i];
      if (close === null || close === undefined) continue;
      const tanggal = new Date((timestamps[i] + gmtoffset) * 1000).toISOString().slice(0, 10);
      rows.push({
        kode_saham: kode,
        tanggal,
        open: opens[i] ?? null,
        high: highs[i] ?? null,
        low: lows[i] ?? null,
        close,
        volume: volumes[i] ?? null,
      });
    }

    if (rows.length === 0) return { kode, error: "Data kosong" };
    return { kode, rows };
  } catch (err) {
    return { kode, error: err instanceof Error ? err.message : "Fetch error" };
  }
}

export async function fetchOhlcv(
  days = 60
): Promise<{ processed: number; failed: string[]; rowCount: number }> {
  const universeRows = await db
    .select({ kode_saham: emiten.kode_saham })
    .from(emiten)
    .where(and(eq(emiten.is_syariah, true), eq(emiten.is_bank, false)));

  const kodeList = universeRows.map((r) => r.kode_saham);
  const failed: string[] = [];
  const allRows: YahooBar[] = [];

  for (let i = 0; i < kodeList.length; i += CONCURRENCY) {
    const batch = kodeList.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map((k) => fetchTicker(k, days)));
    for (const r of results) {
      if ("error" in r) {
        failed.push(`${r.kode}: ${r.error}`);
      } else {
        allRows.push(...r.rows);
      }
    }
    // Jeda kecil antar batch — sopan ke Yahoo, hindari beruntun 63 request sekaligus
    if (i + CONCURRENCY < kodeList.length) {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }

  for (let i = 0; i < allRows.length; i += CHUNK_SIZE) {
    const chunk = allRows.slice(i, i + CHUNK_SIZE);
    await db
      .insert(ohlcv_harian)
      .values(
        chunk.map((r) => ({
          kode_saham: r.kode_saham,
          tanggal: r.tanggal,
          open: r.open !== null ? String(r.open) : null,
          high: r.high !== null ? String(r.high) : null,
          low: r.low !== null ? String(r.low) : null,
          close: String(r.close),
          volume: r.volume,
          sumber: "yahoo_finance",
        }))
      )
      .onConflictDoUpdate({
        target: [ohlcv_harian.kode_saham, ohlcv_harian.tanggal],
        set: {
          open: sql`excluded.open`,
          high: sql`excluded.high`,
          low: sql`excluded.low`,
          close: sql`excluded.close`,
          volume: sql`excluded.volume`,
          sumber: sql`excluded.sumber`,
        },
      });
  }

  return { processed: kodeList.length - failed.length, failed, rowCount: allRows.length };
}
