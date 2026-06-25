# Saham Screener IDX

Stock screening tool untuk pasar modal Indonesia (IDX), fokus pada universe syariah non-bank (ISSI). Menggabungkan analisis fundamental, teknikal, dan flow bandar dengan scoring 3-horizon.

## Fitur

- **Dashboard** — Top stocks per horizon + watchlist aktif + statistik pasar
- **Detail Emiten** — Live chart Stockbit, skor breakdown, fundamental, teknikal, flow bandar
- **3 Horizon** — Harian, Swing 3 Hari, Swing 5 Hari dengan parameter MA/RSI berbeda
- **Watchlist Tiers** — Base, Priority, High Confidence
- **ETL Otomatis** — GitHub Actions jalan setiap hari kerja 17:30 WIB
- **Import Pemegang Saham** — Upload Excel/CSV data kepemilikan >5%

## Stack

| Layer | Teknologi |
|---|---|
| Frontend | Next.js 14 App Router, Tailwind CSS, Recharts |
| Database | Neon PostgreSQL + Drizzle ORM |
| Validasi | Zod |
| ETL | Python 3.10+, yfinance, pandas, psycopg2 |
| Deploy | Vercel + GitHub Actions |

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

**4. Seed & ETL awal**
```bash
cd etl
pip install -r requirements.txt

# Seed daftar emiten dari CSV
python seed_emiten.py

# Ambil data OHLCV 60 hari terakhir
python fetch_ohlcv.py --days 60

# Hitung indikator & skor
python calculate_indicators.py
python calculate_scores.py
```

**5. Jalankan dev server**
```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

## ETL Scripts

| Script | Fungsi |
|---|---|
| `seed_emiten.py` | Load universe dari `etl/data/issi_konstituen.csv` |
| `fetch_ohlcv.py --days N` | Ambil OHLCV dari Yahoo Finance |
| `fetch_broker_summary.py --file F --date D` | Import data broker summary harian |
| `calculate_indicators.py` | Hitung SMA, RSI, volume avg, sinyal candlestick |
| `calculate_scores.py` | Hitung skor komposit + update watchlist tier |

## Deploy ke Vercel

1. Push repo ke GitHub
2. Import project di [vercel.com](https://vercel.com)
3. Set environment variables:
   - `DATABASE_URL` — Neon connection string (pooled)
   - `ADMIN_SECRET` — Password untuk endpoint `/api/import/*`
4. Deploy

**GitHub Actions secret** (untuk ETL otomatis):
- Tambah `DATABASE_URL` di repo → Settings → Secrets and variables → Actions

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
