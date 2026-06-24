"use client";

import { useState, useRef } from "react";
import { Upload, CheckCircle, AlertCircle, FileSpreadsheet, X } from "lucide-react";
import type { ImportResult, ApiResponse } from "@/types";

export function ImportUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [tanggal, setTanggal] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adminSecret, setAdminSecret] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setResult(null);
    setError(null);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0] ?? null;
    setFile(f);
    setResult(null);
    setError(null);
  };

  const onSubmit = async () => {
    if (!file) return setError("Pilih file terlebih dahulu");
    if (!tanggal) return setError("Isi tanggal laporan (YYYY-MM-DD)");

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tanggal_laporan", tanggal);

      const headers: HeadersInit = {};
      if (adminSecret) headers["x-admin-secret"] = adminSecret;

      const res = await fetch("/api/import/pemegang-saham", {
        method: "POST",
        headers,
        body: formData,
      });

      const json: ApiResponse<ImportResult> = await res.json();

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

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Panduan */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-300">
        <p className="font-semibold text-blue-200 mb-1">Format file yang diterima</p>
        <p className="text-blue-300/80">
          CSV atau Excel dari pengumuman resmi KSEI/IDX{" "}
          <em>"Pemegang Saham di atas 1% (KSEI)"</em>.<br />
          Kolom:{" "}
          {["No", "Kode Efek", "Nama Pemegang Rekening Efek", "Nama Pemegang Saham"].map((c) => (
            <code key={c} className="mx-0.5 rounded bg-blue-500/20 px-1 text-blue-200">
              {c}
            </code>
          ))}
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200 ${
          dragging
            ? "border-emerald-400/60 bg-emerald-500/10"
            : "border-white/15 bg-white/3 hover:border-emerald-500/40 hover:bg-white/5"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={onFileChange}
        />
        {file ? (
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 border border-emerald-500/30">
              <FileSpreadsheet className="h-7 w-7 text-emerald-400" />
            </div>
            <div>
              <p className="font-semibold text-white">{file.name}</p>
              <p className="text-sm text-gray-500">
                {(file.size / 1024).toFixed(1)} KB · Klik atau drop untuk ganti
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null); }}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-400 transition-colors"
            >
              <X className="h-3 w-3" /> Hapus file
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
              <Upload className="h-7 w-7 text-gray-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-300">
                Drag & drop atau klik untuk upload
              </p>
              <p className="text-sm text-gray-600">CSV, XLSX, XLS — maks 10MB</p>
            </div>
          </div>
        )}
      </div>

      {/* Form */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-300">
            Tanggal Laporan <span className="text-red-400">*</span>
          </label>
          <input
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            className="input-dark w-full"
          />
          <p className="mt-1 text-xs text-gray-600">Periode laporan KSEI</p>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-300">
            Admin Secret
          </label>
          <input
            type="password"
            value={adminSecret}
            onChange={(e) => setAdminSecret(e.target.value)}
            placeholder="Opsional"
            className="input-dark w-full"
          />
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={onSubmit}
        disabled={loading || !file}
        className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Memproses...
          </span>
        ) : (
          "Proses & Simpan Data"
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-emerald-300">
            <CheckCircle className="h-4 w-4" />
            Import Berhasil
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {[
              { label: "Total Baris", value: result.total_baris },
              { label: "Lolos Universe", value: result.lolos_universe },
              { label: "Match Broker", value: result.match_broker },
              { label: "Perlu Review", value: result.perlu_review },
              { label: "Tersimpan", value: result.sudah_tersimpan },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-xl bg-white/5 border border-white/8 px-3 py-3"
              >
                <div className="text-xs text-gray-500">{label}</div>
                <div className="text-2xl font-black text-white mt-1">{value}</div>
              </div>
            ))}
          </div>
          {result.perlu_review > 0 && (
            <p className="mt-4 text-xs text-emerald-400/80">
              ⚠ {result.perlu_review} baris ditandai{" "}
              <strong className="text-emerald-300">perlu_review</strong> — nama pemegang
              saham tidak bisa diparse otomatis. Data tetap tersimpan.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
