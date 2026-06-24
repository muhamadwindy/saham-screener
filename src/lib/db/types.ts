// Raw database row types — sesuai schema PostgreSQL

export type DbHorizon = "harian" | "3hari" | "5hari";
export type DbSignal = "baik" | "tidak_baik" | "netral";
export type DbWatchlistTier = "base" | "priority" | "high_confidence";
export type DbBrokerKategori = "retail" | "institusional" | "asing" | "unknown";
export type DbSentimen = "positif" | "negatif" | "netral";
export type DbDoubleBottomStatus = "terbentuk" | "breakout_konfirmasi" | "gagal";

export interface DbEmiten {
  kode_saham: string;
  nama_emiten: string;
  sektor: string | null;
  sub_sektor: string | null;
  is_syariah: boolean;
  is_bank: boolean;
  lolos_universe: boolean;
  updated_at: Date;
}

export interface DbSkorHarian {
  kode_saham: string;
  tanggal: Date;
  horizon: DbHorizon;
  skor_fundamental: string | null;
  skor_teknikal: string | null;
  skor_flow_bandar: string | null;
  skor_komposit: string | null;
}

export interface DbLaporanKeuangan {
  id: bigint;
  kode_saham: string;
  periode: string;
  tanggal_rilis: Date | null;
  net_income: string | null;
  revenue: string | null;
  gross_profit: string | null;
  operating_profit: string | null;
  total_debt: string | null;
  total_equity: string | null;
  total_assets: string | null;
  ebit: string | null;
  interest_expense: string | null;
  created_at: Date;
}

export interface DbOhlcvHarian {
  kode_saham: string;
  tanggal: Date;
  open: string | null;
  high: string | null;
  low: string | null;
  close: string | null;
  volume: string | null;
  sumber: string;
}

export interface DbIndikatorCache {
  kode_saham: string;
  tanggal: Date;
  horizon: DbHorizon;
  ma_pendek: string | null;
  ma_panjang: string | null;
  rsi: string | null;
  volume_avg_n: string | null;
  sinyal_tren: DbSignal | null;
  sinyal_momentum: DbSignal | null;
  sinyal_volume: DbSignal | null;
  sinyal_price_action: DbSignal | null;
}

export interface DbBroker {
  kode_broker: string;
  nama_broker: string;
  kategori: DbBrokerKategori;
  sumber_kategori: string | null;
  updated_at: Date;
}

export interface DbBrokerSummaryHarian {
  kode_saham: string;
  tanggal: Date;
  kode_broker: string;
  net_buy_value: string | null;
  net_buy_lot: string | null;
}

export interface DbPemegangSaham5Persen {
  id: bigint;
  kode_saham: string;
  tanggal_laporan: Date;
  nama_pemegang_rekening_efek_raw: string;
  nama_pemegang_saham_raw: string;
  nama_pemegang_saham_bersih: string | null;
  perlu_review: boolean;
  kode_broker_terdeteksi: string | null;
  is_bank_kustodian: boolean;
  tingkat_keyakinan: "tinggi" | "sedang" | "rendah" | null;
  catatan: string | null;
  nama_file_sumber: string | null;
  diimpor_pada: Date;
  created_at: Date;
}

export interface DbDoubleBottom {
  id: bigint;
  kode_saham: string;
  tanggal_deteksi: Date;
  level_support: string | null;
  level_neckline: string | null;
  status: DbDoubleBottomStatus;
  created_at: Date;
}

export interface DbWatchlist {
  id: bigint;
  kode_saham: string;
  tanggal: Date;
  tingkat: DbWatchlistTier;
  kode_broker_trigger: string | null;
  pemegang_saham_5p_id: bigint | null;
  keterangan: string | null;
  created_at: Date;
}

export interface DbKonfigurasiBobot {
  horizon: DbHorizon;
  bobot_fundamental: string;
  bobot_teknikal: string;
  bobot_flow_bandar: string;
}
