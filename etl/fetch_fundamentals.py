"""
fetch_fundamentals.py
---------------------
Ambil data laporan keuangan kuartalan dari Yahoo Finance (yfinance)
untuk semua emiten di universe, lalu simpan ke tabel laporan_keuangan.

Data yang diambil: revenue, net_income, gross_profit, operating_profit,
ebit, interest_expense, total_debt, total_equity, total_assets.

Cara pakai:
    python fetch_fundamentals.py [--limit 10]
"""

import argparse
import time
import warnings
from datetime import date

import pandas as pd
import yfinance as yf
from db import get_conn

warnings.filterwarnings("ignore")


def to_val(v):
    """Konversi ke float, return None jika NaN/None."""
    try:
        f = float(v)
        return None if (f != f) else f  # NaN check
    except (TypeError, ValueError):
        return None


def periode_label(dt) -> str:
    """Konversi tanggal ke label 'YYYY-QN'."""
    q = (dt.month - 1) // 3 + 1
    return f"{dt.year}-Q{q}"


def fetch_emiten(kode: str, conn) -> int:
    """Fetch laporan keuangan dari yfinance untuk satu emiten. Return jumlah baris baru."""
    ticker_sym = f"{kode}.JK"
    try:
        t = yf.Ticker(ticker_sym)

        # Quarterly income statement
        inc = t.quarterly_income_stmt
        # Quarterly balance sheet
        bs = t.quarterly_balance_sheet

        if inc is None or inc.empty:
            return 0

        inserted = 0
        cur = conn.cursor()

        for col in inc.columns:
            try:
                dt = col.to_pydatetime().date() if hasattr(col, "to_pydatetime") else col
                periode = periode_label(dt)

                def get_inc(labels):
                    for lbl in labels:
                        for idx in inc.index:
                            if lbl.lower() in str(idx).lower():
                                return to_val(inc.loc[idx, col])
                    return None

                def get_bs(labels):
                    if bs is None or bs.empty or col not in bs.columns:
                        return None
                    for lbl in labels:
                        for idx in bs.index:
                            if lbl.lower() in str(idx).lower():
                                return to_val(bs.loc[idx, col])
                    return None

                revenue          = get_inc(["total revenue", "total revenues"])
                gross_profit     = get_inc(["gross profit"])
                operating_profit = get_inc(["operating income", "ebit"])
                net_income       = get_inc(["net income"])
                ebit             = get_inc(["ebit", "operating income"])
                interest_expense = get_inc(["interest expense"])

                total_assets  = get_bs(["total assets"])
                total_equity  = get_bs(["total stockholder equity", "stockholders equity", "total equity"])
                total_debt    = get_bs(["total debt", "long term debt"])

                # Skip jika semua null
                if all(v is None for v in [revenue, net_income, gross_profit]):
                    continue

                cur.execute(
                    """
                    INSERT INTO laporan_keuangan
                      (kode_saham, periode, tanggal_rilis,
                       net_income, revenue, gross_profit, operating_profit,
                       total_debt, total_equity, total_assets,
                       ebit, interest_expense)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (kode_saham, periode) DO UPDATE SET
                        tanggal_rilis    = EXCLUDED.tanggal_rilis,
                        net_income       = EXCLUDED.net_income,
                        revenue          = EXCLUDED.revenue,
                        gross_profit     = EXCLUDED.gross_profit,
                        operating_profit = EXCLUDED.operating_profit,
                        total_debt       = EXCLUDED.total_debt,
                        total_equity     = EXCLUDED.total_equity,
                        total_assets     = EXCLUDED.total_assets,
                        ebit             = EXCLUDED.ebit,
                        interest_expense = EXCLUDED.interest_expense
                    """,
                    (
                        kode, periode, str(dt),
                        net_income, revenue, gross_profit, operating_profit,
                        total_debt, total_equity, total_assets,
                        ebit, interest_expense,
                    ),
                )
                inserted += cur.rowcount
            except Exception:
                continue

        conn.commit()
        cur.close()
        return inserted

    except Exception as e:
        print(f"  [WARN] {kode}: {e}")
        return 0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=0, help="Batasi jumlah emiten (0 = semua)")
    args = parser.parse_args()

    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        "SELECT kode_saham FROM emiten WHERE is_syariah = TRUE AND is_bank = FALSE ORDER BY kode_saham"
    )
    universe = [r["kode_saham"] for r in cur.fetchall()]
    cur.close()

    if args.limit:
        universe = universe[: args.limit]

    print(f"[fetch_fundamentals] {len(universe)} emiten...")
    total_rows = 0

    for i, kode in enumerate(universe):
        n = fetch_emiten(kode, conn)
        total_rows += n
        if n:
            print(f"  {kode}: {n} periode")
        time.sleep(0.5)  # rate limit
        if (i + 1) % 20 == 0:
            print(f"  [{i+1}/{len(universe)}] total rows so far: {total_rows}")

    conn.close()
    print(f"[fetch_fundamentals] Selesai. Total {total_rows} baris di-upsert.")


if __name__ == "__main__":
    main()
