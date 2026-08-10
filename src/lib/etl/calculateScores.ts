import { and, desc, eq, gt, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  emiten,
  laporan_keuangan,
  indikator_teknikal_cache,
  ohlcv_harian,
  broker_summary_harian,
  broker,
  double_bottom_pattern,
  pemegang_saham_5_persen,
  skor_harian,
  watchlist,
} from "@/lib/db/schema";
import { DEFAULT_WEIGHTS, MA_PARAMS } from "@/lib/scoring/weights";
import type { Horizon } from "@/types";

const HORIZONS: Horizon[] = ["harian", "3hari", "5hari"];
const SIGNAL_SCORE: Record<string, number> = { baik: 1.0, netral: 0.5, tidak_baik: 0.0 };

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function toF(v: string | null): number | null {
  if (v === null) return null;
  const f = parseFloat(v);
  return Number.isFinite(f) ? f : null;
}

function pct(a: number | null, b: number | null): number | null {
  if (a === null || b === null || b === 0) return null;
  return ((a - b) / Math.abs(b)) * 100;
}

// ---- Fundamental ----

interface LaporanRow {
  net_income: string | null;
  revenue: string | null;
  gross_profit: string | null;
  total_debt: string | null;
  total_equity: string | null;
  total_assets: string | null;
  ebit: string | null;
  interest_expense: string | null;
}

function computeFundamentalScore(rowsDesc: LaporanRow[]): number | null {
  if (rowsDesc.length === 0) return null;
  const curr = rowsDesc[0];
  const prevQ = rowsDesc[1] ?? null;
  const prevY = rowsDesc[3] ?? null;

  const epsYoy = pct(toF(curr.net_income), prevY ? toF(prevY.net_income) : null);
  const revYoy = pct(toF(curr.revenue), prevY ? toF(prevY.revenue) : null);

  const rev = toF(curr.revenue);
  const gp = toF(curr.gross_profit);
  const currGm = gp && rev && rev !== 0 ? (gp / rev) * 100 : null;

  const prevGp = prevQ ? toF(prevQ.gross_profit) : null;
  const prevRev = prevQ ? toF(prevQ.revenue) : null;
  const prevGm = prevGp && prevRev && prevRev !== 0 ? (prevGp / prevRev) * 100 : null;

  const debt = toF(curr.total_debt);
  const eqTotal = toF(curr.total_equity);
  const assets = toF(curr.total_assets);
  const ebit = toF(curr.ebit);
  const intE = toF(curr.interest_expense);

  const der = debt && eqTotal && eqTotal !== 0 ? debt / eqTotal : null;
  const debtRatio = debt && assets && assets !== 0 ? debt / assets : null;
  const icr = ebit && intE && intE !== 0 ? ebit / intE : null;

  const scores: number[] = [];
  if (epsYoy !== null) scores.push(epsYoy > 15 ? 1.0 : epsYoy > 0 ? 0.5 : 0.0);
  if (revYoy !== null) scores.push(revYoy > 10 ? 1.0 : revYoy > 0 ? 0.5 : 0.0);
  if (currGm !== null && prevGm !== null) scores.push(currGm >= prevGm ? 1.0 : 0.0);
  if (der !== null) {
    scores.push(der < 0.5 ? 1.0 : der < 1 ? 0.5 : 0.0);
  } else if (debtRatio !== null) {
    scores.push(debtRatio < 0.5 ? 1.0 : debtRatio < 0.6 ? 0.5 : 0.0);
  }
  if (icr !== null) scores.push(icr > 5 ? 1.0 : icr > 3 ? 0.5 : 0.0);

  return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
}

// ---- Teknikal ----

function computeTeknikalScore(row?: {
  sinyal_tren: string | null;
  sinyal_momentum: string | null;
  sinyal_volume: string | null;
  sinyal_price_action: string | null;
}): number | null {
  if (!row) return null;
  const sigs = [row.sinyal_tren, row.sinyal_momentum, row.sinyal_volume, row.sinyal_price_action];
  const scores = sigs.map((s) => SIGNAL_SCORE[s ?? "netral"] ?? 0.5);
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

// ---- Flow bandar ----

function computeFlowScore(akumDays: number, totalBuy: number, dbStatus: string | null): number {
  const scores: number[] = [];
  scores.push(akumDays >= 3 ? 1.0 : akumDays >= 1 ? 0.6 : 0.0);
  scores.push(totalBuy > 0 ? Math.min(totalBuy / 1e10, 1.0) : 0.0);
  if (dbStatus) {
    scores.push(dbStatus === "breakout_konfirmasi" ? 1.0 : dbStatus === "terbentuk" ? 0.7 : 0.0);
  } else {
    scores.push(0.3);
  }
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

export async function calculateScores(tradeDate: string): Promise<{ processed: number }> {
  const universeRows = await db
    .select({ kode_saham: emiten.kode_saham })
    .from(emiten)
    .where(and(eq(emiten.is_syariah, true), eq(emiten.is_bank, false)));
  const kodeList = universeRows.map((r) => r.kode_saham);
  if (kodeList.length === 0) return { processed: 0 };

  // Window terluas dipakai: flow score 5hari butuh volumeWindow(20)*2 = 40 hari + 1 hari ekstra untuk prevClose
  const windowStartWide = addDays(tradeDate, -41);
  const windowStart10 = addDays(tradeDate, -10);
  const windowStart30 = addDays(tradeDate, -30);

  const [laporanRows, indikatorRows, closesRows, brokerRows, doubleBottomRows, pemegangRows] =
    await Promise.all([
      db
        .select({
          kode_saham: laporan_keuangan.kode_saham,
          net_income: laporan_keuangan.net_income,
          revenue: laporan_keuangan.revenue,
          gross_profit: laporan_keuangan.gross_profit,
          total_debt: laporan_keuangan.total_debt,
          total_equity: laporan_keuangan.total_equity,
          total_assets: laporan_keuangan.total_assets,
          ebit: laporan_keuangan.ebit,
          interest_expense: laporan_keuangan.interest_expense,
        })
        .from(laporan_keuangan)
        .where(inArray(laporan_keuangan.kode_saham, kodeList))
        .orderBy(laporan_keuangan.kode_saham, desc(laporan_keuangan.periode)),

      db
        .select({
          kode_saham: indikator_teknikal_cache.kode_saham,
          horizon: indikator_teknikal_cache.horizon,
          sinyal_tren: indikator_teknikal_cache.sinyal_tren,
          sinyal_momentum: indikator_teknikal_cache.sinyal_momentum,
          sinyal_volume: indikator_teknikal_cache.sinyal_volume,
          sinyal_price_action: indikator_teknikal_cache.sinyal_price_action,
        })
        .from(indikator_teknikal_cache)
        .where(
          and(
            eq(indikator_teknikal_cache.tanggal, tradeDate),
            inArray(indikator_teknikal_cache.kode_saham, kodeList)
          )
        ),

      db
        .select({
          kode_saham: ohlcv_harian.kode_saham,
          tanggal: ohlcv_harian.tanggal,
          close: sql<number>`${ohlcv_harian.close}::float`,
        })
        .from(ohlcv_harian)
        .where(and(inArray(ohlcv_harian.kode_saham, kodeList), gte(ohlcv_harian.tanggal, windowStartWide)))
        .orderBy(ohlcv_harian.kode_saham, ohlcv_harian.tanggal),

      db
        .select({
          kode_saham: broker_summary_harian.kode_saham,
          tanggal: broker_summary_harian.tanggal,
          kode_broker: broker_summary_harian.kode_broker,
          net_buy_value: sql<number>`${broker_summary_harian.net_buy_value}::float`,
          kategori: broker.kategori,
        })
        .from(broker_summary_harian)
        .innerJoin(broker, eq(broker.kode_broker, broker_summary_harian.kode_broker))
        .where(
          and(
            inArray(broker_summary_harian.kode_saham, kodeList),
            gte(broker_summary_harian.tanggal, windowStartWide),
            gt(broker_summary_harian.net_buy_value, "0")
          )
        ),

      db
        .select({
          kode_saham: double_bottom_pattern.kode_saham,
          status: double_bottom_pattern.status,
        })
        .from(double_bottom_pattern)
        .where(
          and(
            inArray(double_bottom_pattern.kode_saham, kodeList),
            gte(double_bottom_pattern.tanggal_deteksi, windowStart30)
          )
        )
        .orderBy(double_bottom_pattern.kode_saham, desc(double_bottom_pattern.tanggal_deteksi)),

      db
        .select({
          kode_saham: pemegang_saham_5_persen.kode_saham,
          kode_broker: pemegang_saham_5_persen.kode_broker_terdeteksi,
        })
        .from(pemegang_saham_5_persen)
        .where(
          and(
            inArray(pemegang_saham_5_persen.kode_saham, kodeList),
            sql`${pemegang_saham_5_persen.kode_broker_terdeteksi} IS NOT NULL`
          )
        ),
    ]);

  // ---- Susun struktur in-memory ----

  const laporanByKode = new Map<string, LaporanRow[]>();
  for (const r of laporanRows) {
    const arr = laporanByKode.get(r.kode_saham) ?? [];
    if (arr.length < 4) arr.push(r);
    laporanByKode.set(r.kode_saham, arr);
  }

  const indikatorMap = new Map<string, (typeof indikatorRows)[number]>();
  for (const r of indikatorRows) indikatorMap.set(`${r.kode_saham}|${r.horizon}`, r);

  // Tanggal (per kode) di mana close <= prevClose*1.005 ATAU belum ada prevClose
  const priceOkByKode = new Map<string, Set<string>>();
  const closesSortedByKode = new Map<string, { tanggal: string; close: number }[]>();
  for (const r of closesRows) {
    if (r.close === null) continue;
    const arr = closesSortedByKode.get(r.kode_saham) ?? [];
    arr.push({ tanggal: r.tanggal, close: r.close });
    closesSortedByKode.set(r.kode_saham, arr);
  }
  for (const [kode, arr] of closesSortedByKode) {
    const okSet = new Set<string>();
    for (let i = 0; i < arr.length; i++) {
      const prevClose = i > 0 ? arr[i - 1].close : null;
      if (prevClose === null || arr[i].close <= prevClose * 1.005) okSet.add(arr[i].tanggal);
    }
    priceOkByKode.set(kode, okSet);
  }

  const brokerRowsByKode = new Map<string, (typeof brokerRows)[number][]>();
  for (const r of brokerRows) {
    const arr = brokerRowsByKode.get(r.kode_saham) ?? [];
    arr.push(r);
    brokerRowsByKode.set(r.kode_saham, arr);
  }

  // Double bottom — status apa saja, terbaru, dipakai untuk flow score
  const dbLatestAnyStatus = new Map<string, string>();
  for (const r of doubleBottomRows) {
    if (!dbLatestAnyStatus.has(r.kode_saham)) dbLatestAnyStatus.set(r.kode_saham, r.status ?? "terbentuk");
  }
  // Double bottom — hanya status terbentuk/breakout_konfirmasi, dipakai sebagai gate watchlist
  const dbGateExists = new Set(
    doubleBottomRows.filter((r) => r.status === "terbentuk" || r.status === "breakout_konfirmasi").map((r) => r.kode_saham)
  );

  const pemegangKeySet = new Set(pemegangRows.map((r) => `${r.kode_saham}|${r.kode_broker}`));

  function getFlowInputs(kode: string, horizon: Horizon): { akumDays: number; totalBuy: number } {
    const window = MA_PARAMS[horizon].volumeWindow * 2;
    const start = addDays(tradeDate, -window);
    const rows = brokerRowsByKode.get(kode) ?? [];
    const okDates = priceOkByKode.get(kode) ?? new Set<string>();
    const qualifying = rows.filter((r) => r.tanggal >= start && r.tanggal <= tradeDate && okDates.has(r.tanggal));
    const distinctDates = new Set(qualifying.map((r) => r.tanggal));
    const totalBuy = qualifying.reduce((sum, r) => sum + r.net_buy_value, 0);
    return { akumDays: distinctDates.size, totalBuy };
  }

  function getWatchlistInputs(kode: string): { akumDays10: number; brokerTrigger: string | null } {
    const rows = (brokerRowsByKode.get(kode) ?? []).filter(
      (r) => r.tanggal >= windowStart10 && r.tanggal <= tradeDate
    );
    const akumDays10 = new Set(rows.map((r) => r.tanggal)).size;
    const triggerRow = rows.find((r) => r.kategori === "institusional" || r.kategori === "asing");
    return { akumDays10, brokerTrigger: triggerRow?.kode_broker ?? null };
  }

  // ---- Loop utama ----

  type SkorInsert = typeof skor_harian.$inferInsert;
  type WatchlistInsert = typeof watchlist.$inferInsert;
  const skorRows: SkorInsert[] = [];
  const watchlistRows: WatchlistInsert[] = [];
  const processedKodes = new Set<string>();

  for (const kode of kodeList) {
    const fScore = computeFundamentalScore(laporanByKode.get(kode) ?? []);

    for (const horizon of HORIZONS) {
      const weights = DEFAULT_WEIGHTS[horizon];
      const tScore = computeTeknikalScore(indikatorMap.get(`${kode}|${horizon}`));
      const { akumDays, totalBuy } = getFlowInputs(kode, horizon);
      const fbScore = computeFlowScore(akumDays, totalBuy, dbLatestAnyStatus.get(kode) ?? null);

      if (tScore === null && fbScore === null) continue;

      let sum = 0;
      let wTotal = 0;
      if (fScore !== null) {
        sum += fScore * weights.fundamental;
        wTotal += weights.fundamental;
      }
      if (tScore !== null) {
        sum += tScore * weights.teknikal;
        wTotal += weights.teknikal;
      }
      if (fbScore !== null) {
        sum += fbScore * weights.flow_bandar;
        wTotal += weights.flow_bandar;
      }
      const komposit = wTotal > 0 ? sum / wTotal : null;

      skorRows.push({
        kode_saham: kode,
        tanggal: tradeDate,
        horizon,
        skor_fundamental: fScore !== null ? String(fScore) : null,
        skor_teknikal: tScore !== null ? String(tScore) : null,
        skor_flow_bandar: fbScore !== null ? String(fbScore) : null,
        skor_komposit: komposit !== null ? String(komposit) : null,
      });
      processedKodes.add(kode);
    }

    // Watchlist
    const { akumDays10, brokerTrigger } = getWatchlistInputs(kode);
    if (!(akumDays10 >= 2 && dbGateExists.has(kode))) continue;

    let tier: "base" | "priority" | "high_confidence" = "base";
    if (brokerTrigger) tier = "priority";
    if (brokerTrigger && pemegangKeySet.has(`${kode}|${brokerTrigger}`)) tier = "high_confidence";

    const keteranganMap: Record<string, string> = {
      base: "Akumulasi broker + Double Bottom terdeteksi",
      priority: `Akumulasi broker institusional/asing (${brokerTrigger}) + Double Bottom`,
      high_confidence: `Broker ${brokerTrigger} terdeteksi sebagai pemegang >5% (data resmi KSEI)`,
    };

    watchlistRows.push({
      kode_saham: kode,
      tanggal: tradeDate,
      tingkat: tier,
      kode_broker_trigger: brokerTrigger,
      keterangan: keteranganMap[tier],
    });
  }

  const CHUNK = 300;
  for (let i = 0; i < skorRows.length; i += CHUNK) {
    const chunk = skorRows.slice(i, i + CHUNK);
    await db
      .insert(skor_harian)
      .values(chunk)
      .onConflictDoUpdate({
        target: [skor_harian.kode_saham, skor_harian.tanggal, skor_harian.horizon],
        set: {
          skor_fundamental: sql`excluded.skor_fundamental`,
          skor_teknikal: sql`excluded.skor_teknikal`,
          skor_flow_bandar: sql`excluded.skor_flow_bandar`,
          skor_komposit: sql`excluded.skor_komposit`,
        },
      });
  }

  if (watchlistRows.length > 0) {
    await db.insert(watchlist).values(watchlistRows).onConflictDoNothing();
  }

  return { processed: processedKodes.size };
}
