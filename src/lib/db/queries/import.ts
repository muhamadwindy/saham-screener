import { db } from "../client";
import {
  emiten,
  broker,
  pemegang_saham_5_persen,
  broker_summary_harian,
  watchlist,
} from "../schema";
import { eq, and, gte, sql, isNotNull } from "drizzle-orm";
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
  await db.execute(sql`
    INSERT INTO watchlist (kode_saham, tanggal, tingkat, kode_broker_trigger, keterangan)
    SELECT DISTINCT
      p.kode_saham,
      CURRENT_DATE,
      'high_confidence',
      p.kode_broker_terdeteksi,
      'Broker ' || p.kode_broker_terdeteksi || ' terdeteksi sebagai pemegang >5% (import manual)'
    FROM pemegang_saham_5_persen p
    WHERE p.kode_broker_terdeteksi IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM broker_summary_harian bsh
        WHERE bsh.kode_saham = p.kode_saham
          AND bsh.kode_broker = p.kode_broker_terdeteksi
          AND bsh.net_buy_value > 0
          AND bsh.tanggal >= CURRENT_DATE - INTERVAL '10 days'
      )
    ON CONFLICT DO NOTHING
  `);

  return {
    total_baris:    rows.length,
    lolos_universe,
    match_broker,
    perlu_review:   perlu_review_count,
    sudah_tersimpan,
    error:          null,
  };
}
