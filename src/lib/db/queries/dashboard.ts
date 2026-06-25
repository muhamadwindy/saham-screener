import { db } from "../client";
import {
  emiten,
  skor_harian,
  ohlcv_harian,
  watchlist,
  laporan_keuangan,
  pemegang_saham_5_persen,
} from "../schema";
import { eq, and, desc, gte, sql, isNotNull, max, inArray } from "drizzle-orm";
import type {
  DashboardResponse,
  DashboardStats,
  TopSahamRow,
  WatchlistItem,
  Horizon,
  WatchlistTier,
} from "@/types";

export async function getTopSaham(
  horizon: Horizon,
  limit = 10
): Promise<TopSahamRow[]> {
  // Tanggal terbaru di skor_harian untuk horizon ini
  const [latestRow] = await db
    .select({ v: max(skor_harian.tanggal) })
    .from(skor_harian)
    .where(eq(skor_harian.horizon, horizon));

  if (!latestRow?.v) return [];
  const latestDate = latestRow.v as string;

  const rows = await db
    .select({
      kode_saham:       skor_harian.kode_saham,
      nama_emiten:      emiten.nama_emiten,
      sektor:           emiten.sektor,
      skor_fundamental: skor_harian.skor_fundamental,
      skor_teknikal:    skor_harian.skor_teknikal,
      skor_flow_bandar: skor_harian.skor_flow_bandar,
      skor_komposit:    skor_harian.skor_komposit,
    })
    .from(skor_harian)
    .innerJoin(emiten, eq(emiten.kode_saham, skor_harian.kode_saham))
    .where(
      and(
        eq(skor_harian.horizon, horizon),
        eq(skor_harian.tanggal, latestDate),
        eq(emiten.is_syariah, true),
        eq(emiten.is_bank, false),
        isNotNull(skor_harian.skor_komposit)
      )
    )
    .orderBy(desc(sql`${skor_harian.skor_komposit}::numeric`))
    .limit(limit);

  if (rows.length === 0) return [];

  const kodeList = rows.map((r) => r.kode_saham);

  // Subquery: tanggal terbaru per saham
  const latestPerStock = db
    .select({
      kode_saham:   ohlcv_harian.kode_saham,
      max_tanggal:  max(ohlcv_harian.tanggal).as("max_tanggal"),
    })
    .from(ohlcv_harian)
    .where(inArray(ohlcv_harian.kode_saham, kodeList))
    .groupBy(ohlcv_harian.kode_saham)
    .as("latest_price");

  // Ambil harga terakhir + watchlist secara paralel
  const [priceRows, watchlistRows] = await Promise.all([
    db
      .select({
        kode_saham: ohlcv_harian.kode_saham,
        close:      sql<number>`${ohlcv_harian.close}::float`,
      })
      .from(ohlcv_harian)
      .innerJoin(
        latestPerStock,
        and(
          eq(ohlcv_harian.kode_saham, latestPerStock.kode_saham),
          eq(ohlcv_harian.tanggal,    latestPerStock.max_tanggal)
        )
      ),
    db
      .select({
        kode_saham: watchlist.kode_saham,
        tingkat:    watchlist.tingkat,
      })
      .from(watchlist)
      .where(
        and(
          inArray(watchlist.kode_saham, kodeList),
          gte(watchlist.tanggal, sql`CURRENT_DATE - INTERVAL '7 days'`)
        )
      )
      .orderBy(desc(watchlist.tanggal)),
  ]);

  const priceMap = new Map<string, number>(
    priceRows.map((r) => [r.kode_saham, r.close])
  );
  // Hanya simpan tier tertinggi per saham
  const watchlistMap = new Map<string, WatchlistTier>();
  const TIER_RANK: Record<string, number> = { high_confidence: 3, priority: 2, base: 1 };
  for (const r of watchlistRows) {
    const existing = watchlistMap.get(r.kode_saham);
    if (!existing || TIER_RANK[r.tingkat!] > TIER_RANK[existing]) {
      watchlistMap.set(r.kode_saham, r.tingkat as WatchlistTier);
    }
  }

  return rows.map((r) => ({
    kode_saham:       r.kode_saham,
    nama_emiten:      r.nama_emiten,
    sektor:           r.sektor ?? null,
    skor_fundamental: r.skor_fundamental ? Number(r.skor_fundamental) : null,
    skor_teknikal:    r.skor_teknikal ? Number(r.skor_teknikal) : null,
    skor_flow_bandar: r.skor_flow_bandar ? Number(r.skor_flow_bandar) : null,
    skor_komposit:    r.skor_komposit ? Number(r.skor_komposit) : null,
    watchlist_tier:   watchlistMap.get(r.kode_saham) ?? null,
    close:            priceMap.get(r.kode_saham) ?? null,
    perubahan_pct:    null,
  }));
}

export async function getActiveWatchlist(
  horizon: Horizon
): Promise<WatchlistItem[]> {
  const [latestRow] = await db
    .select({ v: max(skor_harian.tanggal) })
    .from(skor_harian)
    .where(eq(skor_harian.horizon, horizon));

  const latestDate = (latestRow?.v as string | null) ?? null;

  const rows = await db
    .select({
      kode_saham:          watchlist.kode_saham,
      nama_emiten:         emiten.nama_emiten,
      tanggal:             watchlist.tanggal,
      tingkat:             watchlist.tingkat,
      kode_broker_trigger: watchlist.kode_broker_trigger,
      keterangan:          watchlist.keterangan,
      skor_komposit:       skor_harian.skor_komposit,
    })
    .from(watchlist)
    .innerJoin(emiten, eq(emiten.kode_saham, watchlist.kode_saham))
    .leftJoin(
      skor_harian,
      and(
        eq(skor_harian.kode_saham, watchlist.kode_saham),
        eq(skor_harian.horizon, horizon),
        latestDate
          ? eq(skor_harian.tanggal, latestDate)
          : sql`false`
      )
    )
    .where(gte(watchlist.tanggal, sql`CURRENT_DATE - INTERVAL '7 days'`))
    .orderBy(
      sql`CASE ${watchlist.tingkat}
        WHEN 'high_confidence' THEN 1
        WHEN 'priority' THEN 2
        ELSE 3
      END`,
      desc(watchlist.tanggal)
    )
    .limit(20);

  return rows.map((r) => ({
    kode_saham:          r.kode_saham,
    nama_emiten:         r.nama_emiten,
    tanggal:             r.tanggal as string,
    tingkat:             r.tingkat as WatchlistTier,
    kode_broker_trigger: r.kode_broker_trigger,
    keterangan:          r.keterangan,
    skor_komposit:       r.skor_komposit ? Number(r.skor_komposit) : null,
  }));
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [teknikal, fundamental, pemegang, universe] = await Promise.all([
    db.select({ v: max(skor_harian.tanggal) }).from(skor_harian),
    db.select({ v: max(laporan_keuangan.tanggal_rilis) }).from(laporan_keuangan),
    db.select({ v: max(pemegang_saham_5_persen.diimpor_pada) }).from(pemegang_saham_5_persen),
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(emiten)
      .where(and(eq(emiten.is_syariah, true), eq(emiten.is_bank, false))),
  ]);

  return {
    tanggal_update_teknikal:       (teknikal[0]?.v as string | null) ?? null,
    tanggal_update_fundamental:    (fundamental[0]?.v as string | null) ?? null,
    tanggal_import_pemegang_saham: (pemegang[0]?.v as string | null) ?? null,
    jumlah_universe:               universe[0]?.count ?? 0,
  };
}

export async function getDashboard(horizon: Horizon): Promise<DashboardResponse> {
  const [top_saham, watchlistItems, stats] = await Promise.all([
    getTopSaham(horizon),
    getActiveWatchlist(horizon),
    getDashboardStats(),
  ]);

  return { top_saham, watchlist: watchlistItems, stats, horizon };
}
