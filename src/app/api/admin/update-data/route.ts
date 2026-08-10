import { NextRequest, NextResponse } from "next/server";
import { max } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { ohlcv_harian } from "@/lib/db/schema";
import { fetchOhlcv } from "@/lib/etl/fetchOhlcv";
import { calculateIndicators } from "@/lib/etl/calculateIndicators";
import { calculateScores } from "@/lib/etl/calculateScores";
import type { ApiResponse } from "@/types";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export interface UpdateDataResult {
  tanggal: string;
  saham_diproses: number;
  saham_gagal_fetch: string[];
  baris_ohlcv: number;
  saham_ada_indikator: number;
  saham_ada_skor: number;
  durasi_ms: number;
}

export async function POST(req: NextRequest) {
  // Auth guard — sama seperti /api/import/pemegang-saham
  const adminSecret = process.env.ADMIN_SECRET;
  if (adminSecret) {
    const provided = req.headers.get("x-admin-secret");
    if (provided !== adminSecret) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Tidak diizinkan" },
        { status: 401 }
      );
    }
  }

  const startedAt = Date.now();

  try {
    const ohlcvResult = await fetchOhlcv(60);

    const [latestRow] = await db.select({ v: max(ohlcv_harian.tanggal) }).from(ohlcv_harian);
    const tradeDate = latestRow?.v as string | null;
    if (!tradeDate) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Tidak ada data OHLCV di database — fetch gagal total" },
        { status: 502 }
      );
    }

    const indicatorResult = await calculateIndicators(tradeDate);
    const scoreResult = await calculateScores(tradeDate);

    const result: UpdateDataResult = {
      tanggal: tradeDate,
      saham_diproses: ohlcvResult.processed,
      saham_gagal_fetch: ohlcvResult.failed,
      baris_ohlcv: ohlcvResult.rowCount,
      saham_ada_indikator: indicatorResult.processed,
      saham_ada_skor: scoreResult.processed,
      durasi_ms: Date.now() - startedAt,
    };

    return NextResponse.json<ApiResponse<UpdateDataResult>>({ success: true, data: result });
  } catch (err) {
    console.error("[api/admin/update-data]", err);
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Gagal menjalankan update data" },
      { status: 500 }
    );
  }
}
