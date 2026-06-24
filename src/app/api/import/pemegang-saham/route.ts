import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as XLSX from "xlsx";
import { importPemegangSaham } from "@/lib/db/queries/import";
import type { ImportRow, ImportResult, ApiResponse } from "@/types";

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD");

function parseSheet(workbook: XLSX.WorkBook): ImportRow[] {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    header: 0,
  });

  return raw.map((row, i) => {
    const keys = Object.keys(row);
    const get = (needle: string) => {
      const k = keys.find((k) =>
        k.toLowerCase().includes(needle.toLowerCase())
      );
      return k ? String(row[k] ?? "").trim() : "";
    };

    return {
      no:                               i + 1,
      kode_efek:                        get("kode efek") || get("kode_efek") || get("efek"),
      nama_pemegang_rekening_efek_raw:  get("rekening efek") || get("pemegang rekening") || get("rekening"),
      nama_pemegang_saham_raw:          get("pemegang saham") || get("nama pemegang") || get("pemegang"),
    };
  });
}

export async function POST(req: NextRequest) {
  // Auth guard
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

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const tanggalRaw = formData.get("tanggal_laporan") as string | null;

    if (!file) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "File wajib diisi" },
        { status: 400 }
      );
    }

    // Validasi tanggal dengan Zod
    const parsed = dateSchema.safeParse(tanggalRaw);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    // Batas ukuran file 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "File terlalu besar (maks 10MB)" },
        { status: 413 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(Buffer.from(arrayBuffer), { type: "buffer" });
    const rows = parseSheet(workbook);

    const result = await importPemegangSaham(rows, file.name, parsed.data);

    return NextResponse.json<ApiResponse<ImportResult>>({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("[api/import/pemegang-saham]", err);
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Gagal memproses file" },
      { status: 500 }
    );
  }
}
