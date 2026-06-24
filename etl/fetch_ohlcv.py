"""
fetch_ohlcv.py
--------------
Ambil data OHLCV harian dari Yahoo Finance (yfinance) untuk semua emiten
yang lolos universe (is_syariah=TRUE, is_bank=FALSE).

Ticker format Yahoo Finance: {KODE}.JK  (contoh: BBCA.JK)

Cara pakai:
    python fetch_ohlcv.py [--days 60]
"""

import argparse
import time
from datetime import date, timedelta

import yfinance as yf
import pandas as pd
from db import get_conn


def get_universe(conn):
    cur = conn.cursor()
    cur.execute("SELECT kode_saham FROM emiten WHERE is_syariah = TRUE AND is_bank = FALSE ORDER BY kode_saham")
    rows = cur.fetchall()
    cur.close()
    return [r["kode_saham"] for r in rows]


def fetch_and_upsert(kode: str, days: int, conn):
    ticker = f"{kode}.JK"
    end = date.today()
    start = end - timedelta(days=days)

    try:
        df = yf.download(ticker, start=start, end=end, progress=False, auto_adjust=True)
    except Exception as e:
        print(f"  [WARN] {kode}: yfinance error — {e}")
        return 0

    if df.empty:
        print(f"  [WARN] {kode}: data kosong")
        return 0

    df = df.reset_index()
    df.columns = [c[0] if isinstance(c, tuple) else c for c in df.columns]
    df = df.rename(columns={"Date": "tanggal", "Open": "open", "High": "high",
                             "Low": "low", "Close": "close", "Volume": "volume"})

    cur = conn.cursor()
    count = 0
    for _, row in df.iterrows():
        cur.execute(
            """
            INSERT INTO ohlcv_harian (kode_saham, tanggal, open, high, low, close, volume, sumber)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'yahoo_finance')
            ON CONFLICT (kode_saham, tanggal) DO UPDATE SET
                open   = EXCLUDED.open,
                high   = EXCLUDED.high,
                low    = EXCLUDED.low,
                close  = EXCLUDED.close,
                volume = EXCLUDED.volume,
                sumber = EXCLUDED.sumber
            """,
            (
                kode,
                row["tanggal"].date() if hasattr(row["tanggal"], "date") else row["tanggal"],
                float(row["open"]) if pd.notna(row["open"]) else None,
                float(row["high"]) if pd.notna(row["high"]) else None,
                float(row["low"]) if pd.notna(row["low"]) else None,
                float(row["close"]) if pd.notna(row["close"]) else None,
                int(row["volume"]) if pd.notna(row["volume"]) else None,
            ),
        )
        count += cur.rowcount
    conn.commit()
    cur.close()
    return count


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=60, help="Jumlah hari historis (default: 60)")
    args = parser.parse_args()

    conn = get_conn()
    universe = get_universe(conn)
    print(f"[fetch_ohlcv] {len(universe)} emiten di universe. Fetching {args.days} hari terakhir...")

    total = 0
    for i, kode in enumerate(universe):
        count = fetch_and_upsert(kode, args.days, conn)
        total += count
        if (i + 1) % 20 == 0:
            print(f"  {i+1}/{len(universe)} diproses...")
        time.sleep(0.3)  # rate limit wajar

    conn.close()
    print(f"[fetch_ohlcv] Selesai. {total} baris di-upsert.")


if __name__ == "__main__":
    main()
