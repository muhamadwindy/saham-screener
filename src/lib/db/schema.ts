import {
  pgTable,
  varchar,
  boolean,
  numeric,
  date,
  timestamp,
  bigserial,
  bigint,
  unique,
  index,
  text,
  pgEnum,
  primaryKey,
  integer,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ============================================================
// Enums
// ============================================================

export const horizonEnum = pgEnum("horizon_type", ["harian", "3hari", "5hari"]);
export const signalEnum  = pgEnum("signal_type",  ["baik", "tidak_baik", "netral"]);
export const watchlistTierEnum = pgEnum("watchlist_tier", ["base", "priority", "high_confidence"]);
export const brokerKategoriEnum = pgEnum("broker_kategori", ["retail", "institusional", "asing", "unknown"]);
export const sentimenEnum = pgEnum("sentimen_type", ["positif", "negatif", "netral"]);
export const doubleBottomStatusEnum = pgEnum("double_bottom_status", ["terbentuk", "breakout_konfirmasi", "gagal"]);
export const keyakinanEnum = pgEnum("keyakinan_type", ["tinggi", "sedang", "rendah"]);
export const taggedByEnum = pgEnum("tagged_by_type", ["manual", "llm"]);

// ============================================================
// Universe & Master
// ============================================================

export const emiten = pgTable("emiten", {
  kode_saham:    varchar("kode_saham", { length: 10 }).primaryKey(),
  nama_emiten:   varchar("nama_emiten", { length: 150 }).notNull(),
  sektor:        varchar("sektor", { length: 100 }),
  sub_sektor:    varchar("sub_sektor", { length: 100 }),
  is_syariah:    boolean("is_syariah").default(false),
  is_bank:       boolean("is_bank").default(false),
  // Computed: lolos_universe = is_syariah AND NOT is_bank
  // Drizzle belum support generated column langsung, pakai SQL expression saat query
  updated_at:    timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
});

export const broker = pgTable("broker", {
  kode_broker:      varchar("kode_broker", { length: 10 }).primaryKey(),
  nama_broker:      varchar("nama_broker", { length: 150 }).notNull(),
  kategori:         brokerKategoriEnum("kategori").default("unknown"),
  sumber_kategori:  text("sumber_kategori"),
  updated_at:       timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
});

// ============================================================
// Fundamental
// ============================================================

export const laporan_keuangan = pgTable(
  "laporan_keuangan",
  {
    id:                bigserial("id", { mode: "number" }).primaryKey(),
    kode_saham:        varchar("kode_saham", { length: 10 }).notNull().references(() => emiten.kode_saham),
    periode:           varchar("periode", { length: 10 }).notNull(),
    tanggal_rilis:     date("tanggal_rilis"),
    net_income:        numeric("net_income"),
    revenue:           numeric("revenue"),
    gross_profit:      numeric("gross_profit"),
    operating_profit:  numeric("operating_profit"),
    total_debt:        numeric("total_debt"),
    total_equity:      numeric("total_equity"),
    total_assets:      numeric("total_assets"),
    ebit:              numeric("ebit"),
    interest_expense:  numeric("interest_expense"),
    created_at:        timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  },
  (t) => ({
    unique_kode_periode: unique().on(t.kode_saham, t.periode),
  })
);

export const katalis_fundamental = pgTable(
  "katalis_fundamental",
  {
    id:             bigserial("id", { mode: "number" }).primaryKey(),
    kode_saham:     varchar("kode_saham", { length: 10 }).notNull().references(() => emiten.kode_saham),
    tanggal:        date("tanggal").notNull(),
    judul:          text("judul").notNull(),
    jenis:          varchar("jenis", { length: 50 }),
    sentimen:       sentimenEnum("sentimen").default("netral"),
    sumber:         varchar("sumber", { length: 50 }),
    link_dokumen:   text("link_dokumen"),
    tagged_by:      taggedByEnum("tagged_by").default("manual"),
    created_at:     timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  },
  (t) => ({
    idx_kode_tanggal: index("idx_katalis_kode_tanggal").on(t.kode_saham, t.tanggal),
  })
);

// ============================================================
// Teknikal
// ============================================================

export const ohlcv_harian = pgTable(
  "ohlcv_harian",
  {
    kode_saham: varchar("kode_saham", { length: 10 }).notNull().references(() => emiten.kode_saham),
    tanggal:    date("tanggal").notNull(),
    open:       numeric("open"),
    high:       numeric("high"),
    low:        numeric("low"),
    close:      numeric("close"),
    volume:     bigint("volume", { mode: "number" }),
    sumber:     varchar("sumber", { length: 30 }).default("yahoo_finance"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.kode_saham, t.tanggal] }),
  })
);

export const indikator_teknikal_cache = pgTable(
  "indikator_teknikal_cache",
  {
    kode_saham:          varchar("kode_saham", { length: 10 }).notNull().references(() => emiten.kode_saham),
    tanggal:             date("tanggal").notNull(),
    horizon:             horizonEnum("horizon").notNull(),
    ma_pendek:           numeric("ma_pendek"),
    ma_panjang:          numeric("ma_panjang"),
    rsi:                 numeric("rsi"),
    volume_avg_n:        numeric("volume_avg_n"),
    sinyal_tren:         signalEnum("sinyal_tren"),
    sinyal_momentum:     signalEnum("sinyal_momentum"),
    sinyal_volume:       signalEnum("sinyal_volume"),
    sinyal_price_action: signalEnum("sinyal_price_action"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.kode_saham, t.tanggal, t.horizon] }),
  })
);

// ============================================================
// Flow Bandar
// ============================================================

export const broker_summary_harian = pgTable(
  "broker_summary_harian",
  {
    kode_saham:    varchar("kode_saham", { length: 10 }).notNull().references(() => emiten.kode_saham),
    tanggal:       date("tanggal").notNull(),
    kode_broker:   varchar("kode_broker", { length: 10 }).notNull().references(() => broker.kode_broker),
    net_buy_value: numeric("net_buy_value"),
    net_buy_lot:   numeric("net_buy_lot"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.kode_saham, t.tanggal, t.kode_broker] }),
    idx_kode_tanggal: index("idx_broker_summary_kode_tanggal").on(t.kode_saham, t.tanggal),
  })
);

export const pemegang_saham_5_persen = pgTable(
  "pemegang_saham_5_persen",
  {
    id:                              bigserial("id", { mode: "number" }).primaryKey(),
    kode_saham:                      varchar("kode_saham", { length: 10 }).notNull().references(() => emiten.kode_saham),
    tanggal_laporan:                 date("tanggal_laporan").notNull(),
    nama_pemegang_rekening_efek_raw: varchar("nama_pemegang_rekening_efek_raw", { length: 200 }).notNull(),
    nama_pemegang_saham_raw:         text("nama_pemegang_saham_raw").notNull(),
    nama_pemegang_saham_bersih:      varchar("nama_pemegang_saham_bersih", { length: 200 }),
    perlu_review:                    boolean("perlu_review").default(false),
    kode_broker_terdeteksi:          varchar("kode_broker_terdeteksi", { length: 10 }).references(() => broker.kode_broker),
    is_bank_kustodian:               boolean("is_bank_kustodian").default(false),
    tingkat_keyakinan:               keyakinanEnum("tingkat_keyakinan"),
    catatan:                         text("catatan"),
    nama_file_sumber:                varchar("nama_file_sumber", { length: 200 }),
    diimpor_pada:                    timestamp("diimpor_pada", { withTimezone: true }).default(sql`now()`),
    created_at:                      timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  },
  (t) => ({
    idx_kode_tanggal:  index("idx_pemegang_5p_kode_tanggal").on(t.kode_saham, t.tanggal_laporan),
    idx_broker:        index("idx_pemegang_5p_broker").on(t.kode_broker_terdeteksi),
  })
);

export const double_bottom_pattern = pgTable(
  "double_bottom_pattern",
  {
    id:               bigserial("id", { mode: "number" }).primaryKey(),
    kode_saham:       varchar("kode_saham", { length: 10 }).notNull().references(() => emiten.kode_saham),
    tanggal_deteksi:  date("tanggal_deteksi").notNull(),
    level_support:    numeric("level_support"),
    level_neckline:   numeric("level_neckline"),
    status:           doubleBottomStatusEnum("status").default("terbentuk"),
    created_at:       timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  },
  (t) => ({
    idx_kode: index("idx_double_bottom_kode").on(t.kode_saham, t.tanggal_deteksi),
  })
);

// ============================================================
// Scoring & Watchlist
// ============================================================

export const skor_harian = pgTable(
  "skor_harian",
  {
    kode_saham:       varchar("kode_saham", { length: 10 }).notNull().references(() => emiten.kode_saham),
    tanggal:          date("tanggal").notNull(),
    horizon:          horizonEnum("horizon").notNull(),
    skor_fundamental: numeric("skor_fundamental"),
    skor_teknikal:    numeric("skor_teknikal"),
    skor_flow_bandar: numeric("skor_flow_bandar"),
    skor_komposit:    numeric("skor_komposit"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.kode_saham, t.tanggal, t.horizon] }),
    idx_tanggal_komposit: index("idx_skor_tanggal_komposit").on(t.tanggal, t.horizon, t.skor_komposit),
  })
);

export const watchlist = pgTable(
  "watchlist",
  {
    id:                    bigserial("id", { mode: "number" }).primaryKey(),
    kode_saham:            varchar("kode_saham", { length: 10 }).notNull().references(() => emiten.kode_saham),
    tanggal:               date("tanggal").notNull(),
    tingkat:               watchlistTierEnum("tingkat").default("base"),
    kode_broker_trigger:   varchar("kode_broker_trigger", { length: 10 }).references(() => broker.kode_broker),
    pemegang_saham_5p_id:  bigint("pemegang_saham_5p_id", { mode: "number" }).references(() => pemegang_saham_5_persen.id),
    keterangan:            text("keterangan"),
    created_at:            timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  },
  (t) => ({
    idx_tanggal: index("idx_watchlist_tanggal").on(t.tanggal, t.tingkat),
  })
);

export const konfigurasi_bobot = pgTable("konfigurasi_bobot", {
  horizon:          horizonEnum("horizon").primaryKey(),
  bobot_fundamental: numeric("bobot_fundamental").notNull(),
  bobot_teknikal:   numeric("bobot_teknikal").notNull(),
  bobot_flow_bandar: numeric("bobot_flow_bandar").notNull(),
});

// ============================================================
// Type exports (inferred from schema)
// ============================================================

export type EmitenRow            = typeof emiten.$inferSelect;
export type BrokerRow            = typeof broker.$inferSelect;
export type LaporanKeuanganRow   = typeof laporan_keuangan.$inferSelect;
export type OhlcvRow             = typeof ohlcv_harian.$inferSelect;
export type IndikatorRow         = typeof indikator_teknikal_cache.$inferSelect;
export type BrokerSummaryRow     = typeof broker_summary_harian.$inferSelect;
export type PemegangSaham5pRow   = typeof pemegang_saham_5_persen.$inferSelect;
export type DoubleBottomRow      = typeof double_bottom_pattern.$inferSelect;
export type SkorHarianRow        = typeof skor_harian.$inferSelect;
export type WatchlistRow         = typeof watchlist.$inferSelect;
