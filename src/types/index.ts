// ============================================================
// Domain types — shared across frontend & API
// ============================================================

export type Horizon = "harian" | "3hari" | "5hari";

export type Signal = "baik" | "tidak_baik" | "netral";

export type WatchlistTier = "base" | "priority" | "high_confidence";

export type BrokerKategori = "retail" | "institusional" | "asing" | "unknown";

export type Sentimen = "positif" | "negatif" | "netral";

// ============================================================
// Emiten / Universe
// ============================================================

export interface Emiten {
  kode_saham: string;
  nama_emiten: string;
  sektor: string | null;
  sub_sektor: string | null;
  is_syariah: boolean;
  is_bank: boolean;
  lolos_universe: boolean;
  updated_at: string;
}

// ============================================================
// Scoring
// ============================================================

export interface SkorHarian {
  kode_saham: string;
  tanggal: string;
  horizon: Horizon;
  skor_fundamental: number | null;
  skor_teknikal: number | null;
  skor_flow_bandar: number | null;
  skor_komposit: number | null;
}

export interface SkorBobot {
  fundamental: number;
  teknikal: number;
  flow_bandar: number;
}

// ============================================================
// Dashboard
// ============================================================

export interface TopSahamRow {
  kode_saham: string;
  nama_emiten: string;
  sektor: string | null;
  skor_fundamental: number | null;
  skor_teknikal: number | null;
  skor_flow_bandar: number | null;
  skor_komposit: number | null;
  watchlist_tier: WatchlistTier | null;
  close: number | null;
  perubahan_pct: number | null;
}

export interface WatchlistItem {
  kode_saham: string;
  nama_emiten: string;
  tanggal: string;
  tingkat: WatchlistTier;
  kode_broker_trigger: string | null;
  keterangan: string | null;
  skor_komposit: number | null;
}

export interface DashboardStats {
  tanggal_update_teknikal: string | null;
  tanggal_update_fundamental: string | null;
  tanggal_import_pemegang_saham: string | null;
  jumlah_universe: number;
}

export interface DashboardResponse {
  top_saham: TopSahamRow[];
  watchlist: WatchlistItem[];
  stats: DashboardStats;
  horizon: Horizon;
}

// ============================================================
// Fundamental
// ============================================================

export interface LaporanKeuangan {
  id: number;
  kode_saham: string;
  periode: string;
  tanggal_rilis: string | null;
  net_income: number | null;
  revenue: number | null;
  gross_profit: number | null;
  operating_profit: number | null;
  total_debt: number | null;
  total_equity: number | null;
  total_assets: number | null;
  ebit: number | null;
  interest_expense: number | null;
}

export interface FundamentalMetrics {
  eps_growth_yoy: number | null;
  eps_growth_qoq: number | null;
  revenue_growth_yoy: number | null;
  revenue_growth_qoq: number | null;
  gross_margin: number | null;
  operating_margin: number | null;
  net_margin: number | null;
  der: number | null;
  debt_ratio: number | null;
  icr: number | null;
  skor_eps_growth: Signal;
  skor_revenue_growth: Signal;
  skor_margin: Signal;
  skor_utang: Signal;
}

// ============================================================
// Teknikal
// ============================================================

export interface TechnicalSnapshot {
  tanggal: string;
  horizon: Horizon;
  close: number | null;
  ma_pendek: number | null;
  ma_panjang: number | null;
  rsi: number | null;
  volume: number | null;
  volume_avg_n: number | null;
  sinyal_tren: Signal;
  sinyal_momentum: Signal;
  sinyal_volume: Signal;
  sinyal_price_action: Signal;
}

export interface OhlcvPoint {
  tanggal: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ============================================================
// Flow Bandar
// ============================================================

export interface BrokerNetBuy {
  kode_broker: string;
  nama_broker: string;
  kategori: BrokerKategori;
  net_buy_value: number;
  net_buy_lot: number;
  tanggal: string;
}

export interface AkumulasiBrokerRow {
  kode_broker: string;
  nama_broker: string;
  kategori: BrokerKategori;
  jumlah_hari_akumulasi: number;
  total_net_buy: number;
  is_pemegang_5persen: boolean;
}

export interface DoubleBottomPattern {
  id: number;
  kode_saham: string;
  tanggal_deteksi: string;
  level_support: number | null;
  level_neckline: number | null;
  status: "terbentuk" | "breakout_konfirmasi" | "gagal";
}

export interface FlowBandarSummary {
  sinyal_akumulasi: Signal;
  double_bottom: DoubleBottomPattern | null;
  broker_akumulasi: AkumulasiBrokerRow[];
  pemegang_5persen_terdeteksi: string[];
  watchlist_tier: WatchlistTier | null;
}

// ============================================================
// Stock detail (semua tab digabung)
// ============================================================

export interface SahamDetail {
  emiten: Emiten;
  skor: SkorHarian | null;
  fundamental: {
    metrics: FundamentalMetrics | null;
    laporan_terkini: LaporanKeuangan | null;
    laporan_historis: LaporanKeuangan[];
  };
  teknikal: {
    snapshot: TechnicalSnapshot | null;
    ohlcv_30hari: OhlcvPoint[];
  };
  flow_bandar: FlowBandarSummary;
}

// ============================================================
// Import pemegang saham
// ============================================================

export interface ImportRow {
  no: number;
  kode_efek: string;
  nama_pemegang_rekening_efek_raw: string;
  nama_pemegang_saham_raw: string;
}

export interface ImportResult {
  total_baris: number;
  lolos_universe: number;
  match_broker: number;
  perlu_review: number;
  sudah_tersimpan: number;
  error: string | null;
}

// ============================================================
// API response wrapper
// ============================================================

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };
