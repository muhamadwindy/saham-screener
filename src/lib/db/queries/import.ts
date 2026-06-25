import { db } from "../client";
import {
  emiten,
  broker,
  pemegang_saham_5_persen,
  broker_summary_harian,
  watchlist,
} from "../schema";
import { eq, and, gte, sql, isNotNull, gt, exists } from "drizzle-orm";
import type { ImportRow, ImportResult } from "@/types";

const BANK_KUSTODIAN_KEYWORDS = [
  "citibank",
  "deutsche bank",
  "hsbc",
  "bank mandiri",
  "bank central asia",
  "bank negara",
  "bank rakyat",
  "standard chartered",
  "jpmorgan",
  "j.p. morgan",
  "bank danamon",
  "bank permata",
  "bank maybank",
  "bank cimb",
  "bank ocbc",
  "uob",
];

function isBankKustodian(name: string): boolean {
  const lower = name.toLowerCase();
  return BANK_KUSTODIAN_KEYWORDS.some((kw) => lower.includes(kw));
}

function parseName(raw: string): { bersih: string | null; perlu_review: boolean } {
  const cleaned = raw
    .replace(/\b\d[\d,. ]+\b/g, "")
    .replace(/\b(WNI|WNA|L|P|MALE|FEMALE)\b/gi, "")
    .replace(
      /\b(jl\.|jalan|no\.|rt\.|rw\.|kelurahan|kecamatan|jakarta|surabaya|bandung|indonesia|singapore|malaysia)\b.*/gi,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length < 3) return { bersih: null, perlu_review: true };
  const perlu_review = cleaned.length < raw.length * 0.4;
  return { bersih: cleaned, perlu_review };
}

export async function importPemegangSaham(
  rows: ImportRow[],
  namaFile: string,
  tanggalLaporan: string
): Promise<ImportResult> {
  // Ambil universe & broker dalam satu batch paralel
  const [universeRows, brokerRows] = await Promise.all([
    db.select({ kode_saham: emiten.kode_saham })
      .from(emiten)
      .where(and(eq(emiten.is_syariah, true), eq(emiten.is_bank, false))),
    db.select({ kode_broker: broker.kode_broker, nama_broker: broker.nama_broker })
      .from(broker),
  ]);

  const universeSet = new Set(universeRows.map((r) => r.kode_saham.toUpperCase()));
  const brokerMap = new Map<string, string>();
  for (const b of brokerRows) {
    brokerMap.set(b.nama_broker.toLowerCase().trim(), b.kode_broker);
  }

  let lolos_universe = 0;
  let match_broker = 0;
  let perlu_review_count = 0;
  let sudah_tersimpan = 0;

  type InsertItem = typeof pemegang_saham_5_persen.$inferInsert;
  const toInsert: InsertItem[] = [];

  for (const row of rows) {
    const kode = row.kode_efek.toUpperCase().trim();
    if (!universeSet.has(kode)) continue;
    lolos_universe++;

    const is_bank_kustodian = isBankKustodian(row.nama_pemegang_rekening_efek_raw);

    let kode_broker_terdeteksi: string | null = null;
    if (!is_bank_kustodian) {
      const keyLower = row.nama_pemegang_rekening_efek_raw.toLowerCase().trim();
      kode_broker_terdeteksi = brokerMap.get(keyLower) ?? null;

      if (!kode_broker_terdeteksi) {
        for (const [brokerName, kodeBroker] of brokerMap.entries()) {
          if (keyLower.includes(brokerName) || brokerName.includes(keyLower)) {
            kode_broker_terdeteksi = kodeBroker;
            break;
          }
        }
      }

      if (kode_broker_terdeteksi) match_broker++;
    }

    const { bersih, perlu_review } = parseName(row.nama_pemegang_saham_raw);
    if (perlu_review) perlu_review_count++;

    toInsert.push({
      kode_saham:                      kode,
      tanggal_laporan:                 tanggalLaporan,
      nama_pemegang_rekening_efek_raw: row.nama_pemegang_rekening_efek_raw,
      nama_pemegang_saham_raw:         row.nama_pemegang_saham_raw,
      nama_pemegang_saham_bersih:      bersih,
      perlu_review,
      kode_broker_terdeteksi,
      is_bank_kustodian,
      nama_file_sumber:                namaFile,
    });
  }

  // Batch insert dalam chunk 100 per transaksi
  if (toInsert.length > 0) {
    const chunkSize = 100;
    for (let i = 0; i < toInsert.length; i += chunkSize) {
      const chunk = toInsert.slice(i, i + chunkSize);
      const result = await db
        .insert(pemegang_saham_5_persen)
        .values(chunk)
        .onConflictDoNothing()
        .returning({ id: pemegang_saham_5_persen.id });
      sudah_tersimpan += result.length;
    }
  }

  // Auto-insert High Confidence watchlist
  const eligibleRows = await db
    .selectDistinct({
      kode_saham:  pemegang_saham_5_persen.kode_saham,
      kode_broker: pemegang_saham_5_persen.kode_broker_terdeteksi,
    })
    .from(pemegang_saham_5_persen)
    .where(
      and(
        isNotNull(pemegang_saham_5_persen.kode_broker_terdeteksi),
        exists(
          db
            .select({ v: sql<number>`1` })
            .from(broker_summary_harian)
            .where(
              and(
                eq(broker_summary_harian.kode_saham, pemegang_saham_5_persen.kode_saham),
                eq(broker_summary_harian.kode_broker, pemegang_saham_5_persen.kode_broker_terdeteksi!),
                gt(broker_summary_harian.net_buy_value, "0"),
                gte(broker_summary_harian.tanggal, sql`CURRENT_DATE - INTERVAL '10 days'`)
              )
            )
        )
      )
    );

  if (eligibleRows.length > 0) {
    await db
      .insert(watchlist)
      .values(
        eligibleRows.map((r) => ({
          kode_saham:          r.kode_saham,
          tanggal:             sql`CURRENT_DATE`,
          tingkat:             "high_confidence" as const,
          kode_broker_trigger: r.kode_broker,
          keterangan:          `Broker ${r.kode_broker} terdeteksi sebagai pemegang >5% (import manual)`,
        }))
      )
      .onConflictDoNothing();
  }

  return {
    total_baris:    rows.length,
    lolos_universe,
    match_broker,
    perlu_review:   perlu_review_count,
    sudah_tersimpan,
    error:          null,
  };
}
