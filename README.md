# Saham Screener IDX

Stock screening tool untuk pasar modal Indonesia (IDX), fokus pada universe syariah non-bank (ISSI). Menggabungkan analisis fundamental, teknikal, dan flow bandar dengan scoring 3-horizon.

## Fitur

- **Dashboard** — Top stocks per horizon + watchlist aktif + statistik pasar
- **Detail Emiten** — Live chart Stockbit, skor breakdown, fundamental, teknikal, flow bandar
- **3 Horizon** — Harian, Swing 3 Hari, Swing 5 Hari dengan parameter MA/RSI berbeda
- **Watchlist Tiers** — Base, Priority, High Confidence
- **Update Data Manual** — Tombol di navbar menjalankan fetch OHLCV + hitung indikator + skor langsung di server Next.js, tanpa jadwal cron
- **Import Pemegang Saham** — Upload Excel/CSV data kepemilikan >5%

## Stack

| Layer | Teknologi |
|---|---|
| Frontend | Next.js 14 App Router, Tailwind CSS, Recharts |
| Database | Neon PostgreSQL + Drizzle ORM |
| Validasi | Zod |
| Update Data (`/api/admin/update-data`) | TypeScript — `src/lib/etl/*.ts`, fetch langsung ke Yahoo Finance |
| ETL manual/lokal saja | Python 3.10+, yfinance, pandas, psycopg2 (`etl/fetch_fundamentals.py`, `etl/fetch_broker_summary.py`, `etl/seed_emiten.py`) |
| Deploy | Vercel |

## Setup Lokal

**1. Clone & install**
```bash
git clone https://github.com/muhamadwindy/saham-screener.git
cd saham-screener
npm install
```

**2. Environment variables**

Buat `.env.local` di root project:
```
DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require
ADMIN_SECRET=your-secret-here
```

**3. Push schema ke database**
```bash
npx drizzle-kit push
```

**4. Seed awal & data pertama**
```bash
cd etl
pip install -r requirements.txt

# Seed daftar emiten dari CSV (sekali saja / saat universe berubah)
python seed_emiten.py
```

Setelah universe ter-seed, jalankan tombol **"Update Data"** di navbar (butuh
`ADMIN_SECRET`) untuk fetch OHLCV + hitung indikator + skor pertama kali —
tidak perlu script Python lagi untuk ini.

**5. Jalankan dev server**
```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Update Data (`/api/admin/update-data`)

Tombol "Update Data" di navbar menjalankan 3 tahap berurutan di server Next.js (`src/lib/etl/`), tanpa Python/GitHub Actions sama sekali:

| Modul | Fungsi | Padanan script lama |
|---|---|---|
| `fetchOhlcv.ts` | Ambil OHLCV dari Yahoo Finance (fetch langsung, paralel) | `fetch_ohlcv.py` |
| `calculateIndicators.ts` | Hitung SMA, RSI, volume avg, sinyal candlestick | `calculate_indicators.py` |
| `calculateScores.ts` | Hitung skor komposit + update watchlist tier | `calculate_scores.py` |

Butuh header `x-admin-secret` yang sesuai `ADMIN_SECRET`. Tidak ada jadwal otomatis (tidak ada cron) — data hanya diperbarui saat tombol ini ditekan.

## ETL Scripts (Python, manual/lokal saja)

Script ini **tidak** dipicu tombol web — dijalankan manual di terminal saat dibutuhkan (fundamental kuartalan, broker summary butuh file manual dari IDX):

| Script | Fungsi |
|---|---|
| `seed_emiten.py` | Load universe dari `etl/data/issi_konstituen.csv` |
| `fetch_fundamentals.py` | Ambil laporan keuangan kuartalan dari Yahoo Finance |
| `fetch_broker_summary.py --file F --date D` | Import data broker summary harian dari file IDX |

## Deploy ke Vercel

1. Push repo ke GitHub
2. Import project di [vercel.com](https://vercel.com)
3. Set environment variables:
   - `DATABASE_URL` — Neon connection string (pooled)
   - `ADMIN_SECRET` — Password untuk endpoint `/api/import/*` dan `/api/admin/*`
4. Deploy

## Universe & Scoring

Universe = emiten ISSI (`is_syariah = TRUE`) yang bukan bank (`is_bank = FALSE`).

**Bobot skor per horizon:**

| Komponen | Harian | 3 Hari | 5 Hari |
|---|---|---|---|
| Fundamental | 15% | 20% | 30% |
| Teknikal | 50% | 45% | 40% |
| Flow Bandar | 35% | 35% | 30% |

## Import Pemegang Saham

Akses halaman `/import` untuk upload file Excel/CSV data kepemilikan saham >5% dari KSEI. Memerlukan header `x-admin-secret` yang sesuai dengan `ADMIN_SECRET`.

---

*Personal tool — tidak untuk distribusi publik.*
