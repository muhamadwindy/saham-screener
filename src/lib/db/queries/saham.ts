import { db } from "../client";
import {
  emiten,
  laporan_keuangan,
  ohlcv_harian,
  indikator_teknikal_cache,
  broker_summary_harian,
  broker,
  pemegang_saham_5_persen,
  double_bottom_pattern,
  watchlist,
  skor_harian,
} from "../schema";
import {
  eq,
  and,
  desc,
  gte,
  sql,
  inArray,
  isNotNull,
  gt,
  max,
} from "drizzle-orm";
import type {
  SahamDetail,
  Horizon,
  Signal,
  WatchlistTier,
  BrokerKategori,
  FundamentalMetrics,
  LaporanKeuangan,
  OhlcvPoint,
  TechnicalSnapshot,
  AkumulasiBrokerRow,
  FlowBandarSummary,
  DoubleBottomPattern,
  Emiten,
  SkorHarian,
} from "@/types";

// ---- helpers ----

function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return isNaN(n) ? null : n;
}

function pct(a: number | null, b: number | null): number | null {
  if (a === null || b === null || b === 0) return null;
  return ((a - b) / Math.abs(b)) * 100;
}

function margin(profit: number | null, revenue: number | null): number | null {
  if (profit === null || revenue === null || revenue === 0) return null;
  return (profit / revenue) * 100;
}

function toSignal(good: boolean | null): Signal {
  if (good === null) return "netral";
  return good ? "baik" : "tidak_baik";
}

// ---- Emiten ----

export async function getEmiten(kode: string): Promise<Emiten | null> {
  const rows = await db
    .select()
    .from(emiten)
    .where(eq(emiten.kode_saham, kode))
    .limit(1);

  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    kode_saham:    r.kode_saham,
    nama_emiten:   r.nama_emiten,
    sektor:        r.sektor ?? null,
    sub_sektor:    r.sub_sektor ?? null,
    is_syariah:    r.is_syariah ?? false,
    is_bank:       r.is_bank ?? false,
    lolos_universe: (r.is_syariah ?? false) && !(r.is_bank ?? false),
    updated_at:    (r.updated_at as Date).toISOString(),
  };
}

// ---- Laporan Keuangan ----

export async function getLaporanKeuangan(
  kode: string,
  limit = 8
): Promise<LaporanKeuangan[]> {
  const rows = await db
    .select()
    .from(laporan_keuangan)
    .where(eq(laporan_keuangan.kode_saham, kode))
    .orderBy(desc(laporan_keuangan.periode))
    .limit(limit);

  return rows.map((r) => ({
    id:               r.id,
    kode_saham:       r.kode_saham,
    periode:          r.periode,
    tanggal_rilis:    r.tanggal_rilis ?? null,
    net_income:       toNum(r.net_income),
    revenue:          toNum(r.revenue),
    gross_profit:     toNum(r.gross_profit),
    operating_profit: toNum(r.operating_profit),
    total_debt:       toNum(r.total_debt),
    total_equity:     toNum(r.total_equity),
    total_assets:     toNum(r.total_assets),
    ebit:             toNum(r.ebit),
    interest_expense: toNum(r.interest_expense),
  }));
}

function computeFundamentalMetrics(laporan: LaporanKeuangan[]): FundamentalMetrics | null {
  if (laporan.length === 0) return null;

  const [curr, prevQ, , prevY] = laporan;

  const eps_growth_qoq   = pct(curr.net_income, prevQ?.net_income ?? null);
  const eps_growth_yoy   = pct(curr.net_income, prevY?.net_income ?? null);
  const rev_growth_qoq   = pct(curr.revenue, prevQ?.revenue ?? null);
  const rev_growth_yoy   = pct(curr.revenue, prevY?.revenue ?? null);

  const gross_margin     = margin(curr.gross_profit, curr.revenue);
  const operating_margin = margin(curr.operating_profit, curr.revenue);
  const net_margin       = margin(curr.net_income, curr.revenue);

  const prevGM = margin(prevQ?.gross_profit ?? null, prevQ?.revenue ?? null);

  const der = curr.total_debt !== null && curr.total_equity && curr.total_equity !== 0
    ? curr.total_debt! / curr.total_equity! : null;
  const debt_ratio = curr.total_debt !== null && curr.total_assets && curr.total_assets !== 0
    ? curr.total_debt! / curr.total_assets! : null;
  const icr = curr.ebit !== null && curr.interest_expense && curr.interest_expense !== 0
    ? curr.ebit! / curr.interest_expense! : null;

  return {
    eps_growth_yoy,
    eps_growth_qoq,
    revenue_growth_yoy: rev_growth_yoy,
    revenue_growth_qoq: rev_growth_qoq,
    gross_margin,
    operating_margin,
    net_margin,
    der,
    debt_ratio,
    icr,
    skor_eps_growth:     toSignal(eps_growth_yoy !== null ? eps_growth_yoy > 15 : null),
    skor_revenue_growth: toSignal(rev_growth_yoy !== null ? rev_growth_yoy > 0 : null),
    skor_margin:         toSignal(gross_margin !== null && prevGM !== null ? gross_margin >= prevGM : null),
    skor_utang:          toSignal(der !== null ? der < 1 : debt_ratio !== null ? debt_ratio < 0.5 : null),
  };
}

// ---- Teknikal ----

export async function getTechnicalSnapshot(
  kode: string,
  horizon: Horizon
): Promise<TechnicalSnapshot | null> {
  const rows = await db
    .select({
      tanggal:             indikator_teknikal_cache.tanggal,
      ma_pendek:           indikator_teknikal_cache.ma_pendek,
      ma_panjang:          indikator_teknikal_cache.ma_panjang,
      rsi:                 indikator_teknikal_cache.rsi,
      volume_avg_n:        indikator_teknikal_cache.volume_avg_n,
      sinyal_tren:         indikator_teknikal_cache.sinyal_tren,
      sinyal_momentum:     indikator_teknikal_cache.sinyal_momentum,
      sinyal_volume:       indikator_teknikal_cache.sinyal_volume,
      sinyal_price_action: indikator_teknikal_cache.sinyal_price_action,
      close:               ohlcv_harian.close,
      volume:              ohlcv_harian.volume,
    })
    .from(indikator_teknikal_cache)
    .innerJoin(
      ohlcv_harian,
      and(
        eq(ohlcv_harian.kode_saham, indikator_teknikal_cache.kode_saham),
        eq(ohlcv_harian.tanggal, indikator_teknikal_cache.tanggal)
      )
    )
    .where(
      and(
        eq(indikator_teknikal_cache.kode_saham, kode),
        eq(indikator_teknikal_cache.horizon, horizon)
      )
    )
    .orderBy(desc(indikator_teknikal_cache.tanggal))
    .limit(1);

  if (rows.length === 0) return null;
  const r = rows[0];

  return {
    tanggal:             r.tanggal as string,
    horizon,
    close:               toNum(r.close),
    ma_pendek:           toNum(r.ma_pendek),
    ma_panjang:          toNum(r.ma_panjang),
    rsi:                 toNum(r.rsi),
    volume:              r.volume ?? null,
    volume_avg_n:        toNum(r.volume_avg_n),
    sinyal_tren:         (r.sinyal_tren ?? "netral") as Signal,
    sinyal_momentum:     (r.sinyal_momentum ?? "netral") as Signal,
    sinyal_volume:       (r.sinyal_volume ?? "netral") as Signal,
    sinyal_price_action: (r.sinyal_price_action ?? "netral") as Signal,
  };
}

export async function getOhlcv30Hari(kode: string): Promise<OhlcvPoint[]> {
  const rows = await db
    .select({
      tanggal: ohlcv_harian.tanggal,
      open:    ohlcv_harian.open,
      high:    ohlcv_harian.high,
      low:     ohlcv_harian.low,
      close:   ohlcv_harian.close,
      volume:  ohlcv_harian.volume,
    })
    .from(ohlcv_harian)
    .where(eq(ohlcv_harian.kode_saham, kode))
    .orderBy(desc(ohlcv_harian.tanggal))
    .limit(30);

  return rows
    .map((r) => ({
      tanggal: r.tanggal as string,
      open:    toNum(r.open) ?? 0,
      high:    toNum(r.high) ?? 0,
      low:     toNum(r.low) ?? 0,
      close:   toNum(r.close) ?? 0,
      volume:  r.volume ?? 0,
    }))
    .reverse();
}

// ---- Flow Bandar ----

export async function getFlowBandar(
  kode: string,
  horizon: Horizon
): Promise<FlowBandarSummary> {
  const windowDays = horizon === "harian" ? 5 : horizon === "3hari" ? 10 : 20;
  const cutoff = sql`CURRENT_DATE - INTERVAL '${sql.raw(String(windowDays * 2))} days'`;

  // Broker akumulasi
  const brokerRows = await db
    .select({
      kode_broker:           broker.kode_broker,
      nama_broker:           broker.nama_broker,
      kategori:              broker.kategori,
      jumlah_hari_akumulasi: sql<number>`COUNT(*)::int`,
      total_net_buy:         sql<number>`SUM(${broker_summary_harian.net_buy_value})::float`,
    })
    .from(broker_summary_harian)
    .innerJoin(broker, eq(broker.kode_broker, broker_summary_harian.kode_broker))
    .where(
      and(
        eq(broker_summary_harian.kode_saham, kode),
        gte(broker_summary_harian.tanggal, cutoff as unknown as string),
        gt(broker_summary_harian.net_buy_value, sql`0`)
      )
    )
    .groupBy(broker.kode_broker, broker.nama_broker, broker.kategori)
    .orderBy(desc(sql`SUM(${broker_summary_harian.net_buy_value})`))
    .limit(10);

  const brokerCodes = brokerRows.map((r) => r.kode_broker);

  // Pemegang >5% yang match broker
  let pemegang5PctBroker: string[] = [];
  if (brokerCodes.length > 0) {
    const p5Rows = await db
      .selectDistinct({ kode: pemegang_saham_5_persen.kode_broker_terdeteksi })
      .from(pemegang_saham_5_persen)
      .where(
        and(
          eq(pemegang_saham_5_persen.kode_saham, kode),
          inArray(pemegang_saham_5_persen.kode_broker_terdeteksi, brokerCodes),
          isNotNull(pemegang_saham_5_persen.kode_broker_terdeteksi)
        )
      );
    pemegang5PctBroker = p5Rows.map((r) => r.kode!).filter(Boolean);
  }

  const brokerAkumulasi: AkumulasiBrokerRow[] = brokerRows.map((r) => ({
    kode_broker:           r.kode_broker,
    nama_broker:           r.nama_broker,
    kategori:              (r.kategori ?? "unknown") as BrokerKategori,
    jumlah_hari_akumulasi: r.jumlah_hari_akumulasi,
    total_net_buy:         r.total_net_buy,
    is_pemegang_5persen:   pemegang5PctBroker.includes(r.kode_broker),
  }));

  // Double bottom
  const dbRows = await db
    .select()
    .from(double_bottom_pattern)
    .where(eq(double_bottom_pattern.kode_saham, kode))
    .orderBy(desc(double_bottom_pattern.tanggal_deteksi))
    .limit(1);

  const double_bottom: DoubleBottomPattern | null =
    dbRows.length > 0
      ? {
          id:              dbRows[0].id,
          kode_saham:      dbRows[0].kode_saham,
          tanggal_deteksi: dbRows[0].tanggal_deteksi as string,
          level_support:   toNum(dbRows[0].level_support),
          level_neckline:  toNum(dbRows[0].level_neckline),
          status:          dbRows[0].status as DoubleBottomPattern["status"],
        }
      : null;

  // Watchlist tier
  const wlRows = await db
    .select({ tingkat: watchlist.tingkat })
    .from(watchlist)
    .where(eq(watchlist.kode_saham, kode))
    .orderBy(desc(watchlist.tanggal), desc(watchlist.id))
    .limit(1);

  const watchlist_tier: WatchlistTier | null =
    wlRows.length > 0 ? (wlRows[0].tingkat as WatchlistTier) : null;

  const hasBrokerAkumulasi = brokerAkumulasi.some((b) => b.jumlah_hari_akumulasi >= 2);
  const sinyal_akumulasi: Signal = hasBrokerAkumulasi
    ? "baik"
    : brokerAkumulasi.length > 0
    ? "netral"
    : "tidak_baik";

  return {
    sinyal_akumulasi,
    double_bottom,
    broker_akumulasi:            brokerAkumulasi,
    pemegang_5persen_terdeteksi: pemegang5PctBroker,
    watchlist_tier,
  };
}

// ---- Aggregated detail ----

export async function getSahamDetail(
  kode: string,
  horizon: Horizon
): Promise<SahamDetail | null> {
  const e = await getEmiten(kode);
  if (!e) return null;

  const [laporan, snapshot, ohlcv, flowBandar] = await Promise.all([
    getLaporanKeuangan(kode),
    getTechnicalSnapshot(kode, horizon),
    getOhlcv30Hari(kode),
    getFlowBandar(kode, horizon),
  ]);

  const latestDate = await db
    .select({ v: max(skor_harian.tanggal) })
    .from(skor_harian)
    .where(and(eq(skor_harian.kode_saham, kode), eq(skor_harian.horizon, horizon)));

  let skor: SkorHarian | null = null;
  if (latestDate[0]?.v) {
    const skorRows = await db
      .select()
      .from(skor_harian)
      .where(
        and(
          eq(skor_harian.kode_saham, kode),
          eq(skor_harian.horizon, horizon),
          eq(skor_harian.tanggal, latestDate[0].v as string)
        )
      )
      .limit(1);

    if (skorRows.length > 0) {
      const s = skorRows[0];
      skor = {
        kode_saham:       kode,
        tanggal:          s.tanggal as string,
        horizon,
        skor_fundamental: toNum(s.skor_fundamental),
        skor_teknikal:    toNum(s.skor_teknikal),
        skor_flow_bandar: toNum(s.skor_flow_bandar),
        skor_komposit:    toNum(s.skor_komposit),
      };
    }
  }

  return {
    emiten:      e,
    skor,
    fundamental: {
      metrics:           computeFundamentalMetrics(laporan),
      laporan_terkini:   laporan[0] ?? null,
      laporan_historis:  laporan,
    },
    teknikal: {
      snapshot,
      ohlcv_30hari: ohlcv,
    },
    flow_bandar: flowBandar,
  };
}
