"use client";

import { useState } from "react";
import { RefreshCw, X, CheckCircle, AlertCircle } from "lucide-react";
import type { ApiResponse } from "@/types";
import type { UpdateDataResult } from "@/app/api/admin/update-data/route";

export function UpdateDataButton() {
  const [open, setOpen] = useState(false);
  const [adminSecret, setAdminSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UpdateDataResult | null>(null);

  const onTrigger = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const headers: HeadersInit = {};
      if (adminSecret) headers["x-admin-secret"] = adminSecret;

      const res = await fetch("/api/admin/update-data", { method: "POST", headers });
      const json: ApiResponse<UpdateDataResult> = await res.json();

      if (!json.success) {
        setError(json.error);
      } else {
        setResult(json.data);
      }
    } catch {
      setError("Gagal menghubungi server");
    } finally {
      setLoading(false);
    }
  };

  const close = () => {
    setOpen(false);
    setAdminSecret("");
    setError(null);
    setResult(null);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden />
        Update Data
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onClick={close}
        >
          <div className="card w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
                Update Data Screener
              </h3>
              <button
                onClick={close}
                className="text-slate-400 hover:text-slate-700 dark:text-gray-500 dark:hover:text-gray-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {result ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-medium">Update selesai — {result.tanggal}</p>
                    <p className="mt-1 text-xs opacity-80">
                      {result.saham_diproses} saham diambil, {result.saham_ada_indikator} dihitung
                      indikatornya, {result.saham_ada_skor} punya skor baru. Butuh{" "}
                      {(result.durasi_ms / 1000).toFixed(1)}s. Refresh halaman untuk lihat hasilnya.
                    </p>
                  </div>
                </div>
                {result.saham_gagal_fetch.length > 0 && (
                  <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                    <p className="mb-1 font-medium">
                      {result.saham_gagal_fetch.length} saham gagal di-fetch (dilewati):
                    </p>
                    <p className="opacity-80">{result.saham_gagal_fetch.join(", ")}</p>
                  </div>
                )}
              </div>
            ) : (
              <>
                <p className="mb-3 text-xs text-slate-500 dark:text-gray-400">
                  Menjalankan ulang pipeline (fetch OHLCV, hitung indikator &amp; skor) langsung di
                  server — tidak lewat GitHub Actions. Tidak ada jadwal otomatis, data hanya
                  diperbarui saat tombol ini ditekan.
                </p>
                <label className="mb-1.5 block text-sm font-medium text-slate-600 dark:text-gray-300">
                  Admin Secret
                </label>
                <input
                  type="password"
                  value={adminSecret}
                  onChange={(e) => setAdminSecret(e.target.value)}
                  placeholder="Wajib diisi"
                  className="input-dark w-full mb-4"
                  autoFocus
                />
                {error && (
                  <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-300">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {error}
                  </div>
                )}
                <button
                  onClick={onTrigger}
                  disabled={loading || !adminSecret}
                  className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Memproses... (bisa 30-60 detik)
                    </span>
                  ) : (
                    "Jalankan Update"
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
