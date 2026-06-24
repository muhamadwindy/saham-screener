import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSahamDetail } from "@/lib/db/queries/saham";
import type { ApiResponse, SahamDetail } from "@/types";

const kodeSchema = z
  .string()
  .regex(/^[A-Z0-9]{1,10}$/, "Kode saham tidak valid");

const querySchema = z.object({
  horizon: z.enum(["harian", "3hari", "5hari"]).default("harian"),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { kode: string } }
) {
  // Validasi kode saham
  const kodeResult = kodeSchema.safeParse(params.kode.toUpperCase());
  if (!kodeResult.success) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Kode saham tidak valid" },
      { status: 400 }
    );
  }

  // Validasi query params
  const queryResult = querySchema.safeParse({
    horizon: req.nextUrl.searchParams.get("horizon") ?? "harian",
  });
  if (!queryResult.success) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Horizon tidak valid" },
      { status: 400 }
    );
  }

  const kode    = kodeResult.data;
  const horizon = queryResult.data.horizon;

  try {
    const data = await getSahamDetail(kode, horizon);
    if (!data) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: `Saham ${kode} tidak ditemukan` },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<SahamDetail>>(
      { success: true, data },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (err) {
    console.error(`[api/saham/${kode}]`, err);
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Gagal mengambil data saham" },
      { status: 500 }
    );
  }
}
