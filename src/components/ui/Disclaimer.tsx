import { AlertTriangle } from "lucide-react";

export function Disclaimer() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
      <p className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
        <span>
          <strong>Disclaimer:</strong> Aplikasi ini adalah alat bantu analisis,{" "}
          <strong>bukan rekomendasi atau nasihat investasi</strong>. Seluruh
          data, skor, dan sinyal yang ditampilkan bersifat edukatif dan tidak
          menjamin hasil investasi. Keputusan investasi sepenuhnya menjadi
          tanggung jawab pengguna. Pastikan untuk melakukan riset mandiri (DYOR)
          sebelum mengambil keputusan.
        </span>
      </p>
    </div>
  );
}
