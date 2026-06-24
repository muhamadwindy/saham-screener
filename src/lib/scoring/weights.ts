import type { Horizon, SkorBobot } from "@/types";

export const DEFAULT_WEIGHTS: Record<Horizon, SkorBobot> = {
  harian: { fundamental: 0.15, teknikal: 0.50, flow_bandar: 0.35 },
  "3hari": { fundamental: 0.20, teknikal: 0.45, flow_bandar: 0.35 },
  "5hari": { fundamental: 0.30, teknikal: 0.40, flow_bandar: 0.30 },
};

export const HORIZON_LABELS: Record<Horizon, string> = {
  harian: "Harian (1 hari)",
  "3hari": "Swing 3 Hari",
  "5hari": "Swing 5 Hari",
};

export const MA_PARAMS: Record<
  Horizon,
  { maPendek: number; maPanjang: number; rsiPeriode: number; volumeWindow: number }
> = {
  harian:  { maPendek: 5,  maPanjang: 10, rsiPeriode: 7,  volumeWindow: 5  },
  "3hari": { maPendek: 10, maPanjang: 20, rsiPeriode: 9,  volumeWindow: 10 },
  "5hari": { maPendek: 20, maPanjang: 50, rsiPeriode: 14, volumeWindow: 20 },
};
