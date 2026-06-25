import type { Signal, WatchlistTier } from "@/types";

export function formatRupiah(value: number | null, compact = false): string {
  if (value === null) return "—";
  if (compact) {
    if (Math.abs(value) >= 1e12) return `Rp ${(value / 1e12).toFixed(2)}T`;
    if (Math.abs(value) >= 1e9)  return `Rp ${(value / 1e9).toFixed(2)}M`;
    if (Math.abs(value) >= 1e6)  return `Rp ${(value / 1e6).toFixed(2)}jt`;
  }
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatHarga(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPersen(value: number | null, decimals = 1): string {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatSkor(value: number | null): string {
  if (value === null) return "—";
  return (value * 100).toFixed(0);
}

export function formatTanggal(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatTanggalJam(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  const tgl = d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
  const jam = d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  });
  return `${tgl}, ${jam} WIB`;
}

export function formatVolume(value: number | null): string {
  if (value === null) return "—";
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(1)}M lot`;
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)}jt`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(1)}rb`;
  return value.toFixed(0);
}

export function signalColor(signal: Signal): string {
  switch (signal) {
    case "baik":       return "text-emerald-400";
    case "tidak_baik": return "text-red-400";
    default:           return "text-gray-500";
  }
}

export function watchlistLabel(tier: WatchlistTier): string {
  switch (tier) {
    case "high_confidence": return "High Confidence";
    case "priority":        return "Priority";
    case "base":            return "Watchlist";
  }
}

export function watchlistBadgeClass(tier: WatchlistTier): string {
  switch (tier) {
    case "high_confidence": return "badge-purple";
    case "priority":        return "badge-blue";
    case "base":            return "badge-amber";
  }
}

export function skorColor(skor: number | null): string {
  if (skor === null) return "text-gray-500";
  const s = skor * 100;
  if (s >= 70) return "text-emerald-300 font-semibold";
  if (s >= 50) return "text-blue-300";
  if (s >= 30) return "text-amber-300";
  return "text-red-400";
}
