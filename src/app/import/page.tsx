import { ImportUploader } from "@/components/import/ImportUploader";
import { FileDown, ExternalLink } from "lucide-react";

export const metadata = {
  title: "Import Pemegang Saham — IDX Screener",
};

export default function ImportPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="gradient-text text-2xl font-bold">
          Import Data Pemegang Saham &gt;5%
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload file pengumuman bulanan KSEI untuk aktivasi{" "}
          <strong className="text-purple-400">Watchlist High Confidence</strong>.
        </p>
      </div>

      {/* Instruksi */}
      <div className="card p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
          <FileDown className="h-4 w-4 text-emerald-400" />
          Cara download data dari IDX/KSEI
        </h2>
        <ol className="space-y-3 text-sm text-gray-400">
          {[
            <>
              Buka{" "}
              <a
                href="https://www.idx.co.id/id/data-pasar/laporan-statistik/pemegang-saham"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-emerald-400 hover:underline"
              >
                IDX → Data Pasar → Laporan Statistik → Pemegang Saham
                <ExternalLink className="h-3 w-3" />
              </a>
            </>,
            <>Pilih laporan <em className="text-gray-300">"Pemegang Saham di atas 1% (KSEI)"</em> untuk bulan terbaru.</>,
            <>Download file Excel atau CSV yang tersedia.</>,
            <>Upload di form di bawah, isi tanggal laporan, lalu klik Proses.</>,
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/30 text-xs font-bold text-emerald-400">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <ImportUploader />
    </div>
  );
}
