import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDashboard } from "@/lib/db/queries/dashboard";
import type { ApiResponse, DashboardResponse } from "@/types";

const querySchema = z.object({
  horizon: z.enum(["harian", "3hari", "5hari"]).default("harian"),
});

export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse({
    horizon: req.nextUrl.searchParams.get("horizon") ?? "harian",
  });

  if (!parsed.success) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Horizon tidak valid. Pilih: harian, 3hari, 5hari" },
      { status: 400 }
    );
  }

  try {
    const data = await getDashboard(parsed.data.horizon);
    return NextResponse.json<ApiResponse<DashboardResponse>>(
      { success: true, data },
      {
        headers: {
          // Cache 60 detik di edge — data harian tidak perlu real-time
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (err) {
    console.error("[api/dashboard]", err);
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Gagal mengambil data dashboard" },
      { status: 500 }
    );
  }
}
