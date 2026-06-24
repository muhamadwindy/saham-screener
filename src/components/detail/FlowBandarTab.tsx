import { SignalBadge } from "@/components/ui/SignalBadge";
import { watchlistBadgeClass, watchlistLabel, formatRupiah } from "@/lib/utils/format";
import type { FlowBandarSummary } from "@/types";

const KATEGORI_STYLE: Record<string, string> = {
  institusional: "badge-blue",
  asing:         "badge-purple",
  retail:        "badge-gray",
  unknown:       "badge-gray",
};

const KATEGORI_LABEL: Record<string, string> = {
  institusional: "Institusional",
  asing:         "Asing",
  retail:        "Retail",
  unknown:       "Unknown",
};

interface Props {
  data: FlowBandarSummary;
}

export function FlowBandarTab({ data }: Props) {
  return (
    <div className="space-y-6">
      {/* Sinyal & status */}
      <div className="grid gap-2.5 sm:grid-cols-2">
        <div className="flex flex-col gap-2.5 rounded-xl border border-white/8 bg-white/3 px-4 py-3.5">
          <span className="text-xs text-gray-500">Sinyal Akumulasi</span>
          <SignalBadge signal={data.sinyal_akumulasi} />
        </div>
        <div className="flex flex-col gap-2.5 rounded-xl border border-white/8 bg-white/3 px-4 py-3.5">
          <span className="text-xs text-gray-500">Status Watchlist</span>
          {data.watchlist_tier ? (
            <span className={`w-fit text-sm font-semibold ${watchlistBadgeClass(data.watchlist_tier)}`}>
              {watchlistLabel(data.watchlist_tier)}
            </span>
          ) : (
            <span className="text-sm text-gray-600">Belum masuk watchlist</span>
          )}
        </div>
      </div>

      {/* Double Bottom */}
      <section>
        <p className="section-title">Pola Double Bottom</p>
        {data.double_bottom ? (
          <div className="card-sm p-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">Status</div>
                <div className={`text-sm font-semibold capitalize ${
                  data.double_bottom.status === "breakout_konfirmasi"
                    ? "text-emerald-400"
                    : data.double_bottom.status === "terbentuk"
                    ? "text-blue-400"
                    : "text-red-400"
                }`}>
                  {data.double_bottom.status.replace(/_/g, " ")}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Level Support</div>
                <div className="font-mono text-sm font-bold text-white">
                  {data.double_bottom.level_support?.toLocaleString("id-ID") ?? "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Level Neckline</div>
                <div className="font-mono text-sm font-bold text-white">
                  {data.double_bottom.level_neckline?.toLocaleString("id-ID") ?? "—"}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="card-sm flex items-center justify-center py-8 text-sm text-gray-600">
            Tidak terdeteksi pola double bottom dalam 30 hari terakhir
          </div>
        )}
      </section>

      {/* Broker akumulasi */}
      <section>
        <p className="section-title">Broker Net Buy (Akumulasi)</p>
        {data.broker_akumulasi.length === 0 ? (
          <div className="card-sm flex items-center justify-center py-8 text-sm text-gray-600">
            Tidak ada broker dengan net buy signifikan dalam periode ini
          </div>
        ) : (
          <div className="card-sm overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/8 text-left text-gray-500">
                  <th className="px-4 py-3">Broker</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3 text-center">Hari Akum.</th>
                  <th className="px-4 py-3 text-right">Total Net Buy</th>
                  <th className="px-4 py-3 text-center">Pemegang &gt;5%</th>
                </tr>
              </thead>
              <tbody>
                {data.broker_akumulasi.map((b) => (
                  <tr key={b.kode_broker} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-white">{b.kode_broker}</span>
                      <div className="text-gray-500 mt-0.5">{b.nama_broker}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${KATEGORI_STYLE[b.kategori] ?? "badge-gray"}`}>
                        {KATEGORI_LABEL[b.kategori] ?? b.kategori}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-gray-300">
                      {b.jumlah_hari_akumulasi}×
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-400">
                      {formatRupiah(b.total_net_buy, true)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {b.is_pemegang_5persen ? (
                        <span className="badge-purple text-xs">✓ Data Resmi</span>
                      ) : (
                        <span className="text-gray-700">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* High Confidence note */}
      {data.pemegang_5persen_terdeteksi.length > 0 && (
        <div className="rounded-xl border border-purple-500/25 bg-purple-500/10 px-4 py-3 text-xs text-purple-300">
          <strong className="text-purple-200">Data Resmi KSEI/IDX:</strong>{" "}
          Broker <strong>{data.pemegang_5persen_terdeteksi.join(", ")}</strong> teridentifikasi
          sebagai pemegang saham &gt;5% berdasarkan import manual data resmi bulanan KSEI.
          Sinyal akumulasi dari broker ini dikategorikan sebagai <strong>High Confidence</strong>.
        </div>
      )}
    </div>
  );
}
