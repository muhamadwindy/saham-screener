"""
fetch_broker_summary.py
-----------------------
Download Broker Summary harian dari IDX (resmi & gratis, EOD).

Endpoint IDX Broker Summary:
  https://idx.co.id/en/market-data/trading-summary/broker-summary/
  → File Excel/CSV tersedia via link download per tanggal.

Karena idx.co.id menerapkan bot detection, script ini dirancang untuk
dijalankan dengan session browser (requests-html / playwright) atau
menerima file yang sudah didownload manual.

MODE:
  --file <path>   : Proses file Excel/CSV yang sudah didownload manual
  --auto          : Coba fetch otomatis (butuh browser headless — pastikan playwright install)

Cara pakai (manual, lebih aman):
    python fetch_broker_summary.py --file broker_summary_20260624.xlsx --date 2026-06-24

Kolom yang diharapkan dari file IDX:
    No, Stock Code, Broker, Net Buy (Lot), Net Buy (Value)
    atau: Kode Saham, Kode Broker, Net Buy Lot, Net Buy Nilai
"""

import argparse
import os
from datetime import date

import pandas as pd
from db import get_conn


COLUMN_ALIASES = {
    "stock_code": ["stock code", "kode saham", "kode efek", "code"],
    "kode_broker": ["broker", "kode broker", "broker code"],
    "net_buy_lot": ["net buy (lot)", "net buy lot", "buy lot", "netbuylot"],
    "net_buy_value": ["net buy (value)", "net buy value", "buy value", "netbuyvalue"],
}


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    rename = {}
    lower_cols = {c.lower().strip(): c for c in df.columns}
    for canonical, aliases in COLUMN_ALIASES.items():
        for alias in aliases:
            if alias in lower_cols:
                rename[lower_cols[alias]] = canonical
                break
    return df.rename(columns=rename)


def ensure_brokers(conn, kode_list: list[str]):
    """Insert broker baru yang belum ada di tabel broker."""
    cur = conn.cursor()
    for kode in kode_list:
        cur.execute(
            """
            INSERT INTO broker (kode_broker, nama_broker, kategori)
            VALUES (%s, %s, 'unknown')
            ON CONFLICT (kode_broker) DO NOTHING
            """,
            (kode, kode),
        )
    conn.commit()
    cur.close()


def process_file(filepath: str, trade_date: date, conn):
    ext = os.path.splitext(filepath)[1].lower()
    if ext in (".xls", ".xlsx"):
        df = pd.read_excel(filepath)
    elif ext == ".csv":
        df = pd.read_csv(filepath)
    else:
        raise ValueError(f"Format file tidak didukung: {ext}")

    df = normalize_columns(df)

    required = {"stock_code", "kode_broker", "net_buy_lot", "net_buy_value"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Kolom tidak ditemukan: {missing}. Kolom tersedia: {list(df.columns)}")

    df = df.dropna(subset=["stock_code", "kode_broker"])
    df["stock_code"] = df["stock_code"].astype(str).str.strip().str.upper()
    df["kode_broker"] = df["kode_broker"].astype(str).str.strip().str.upper()

    # Pastikan broker terdaftar
    ensure_brokers(conn, df["kode_broker"].unique().tolist())

    # Ambil universe
    cur = conn.cursor()
    cur.execute("SELECT kode_saham FROM emiten WHERE is_syariah = TRUE AND is_bank = FALSE")
    universe = {r["kode_saham"] for r in cur.fetchall()}
    cur.close()

    df = df[df["stock_code"].isin(universe)]
    if df.empty:
        print("[fetch_broker_summary] Tidak ada baris yang match dengan universe.")
        return 0

    count = 0
    cur = conn.cursor()
    for _, row in df.iterrows():
        net_buy_value = float(row.get("net_buy_value") or 0) if pd.notna(row.get("net_buy_value")) else None
        net_buy_lot = float(row.get("net_buy_lot") or 0) if pd.notna(row.get("net_buy_lot")) else None

        cur.execute(
            """
            INSERT INTO broker_summary_harian (kode_saham, tanggal, kode_broker, net_buy_value, net_buy_lot)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (kode_saham, tanggal, kode_broker) DO UPDATE SET
                net_buy_value = EXCLUDED.net_buy_value,
                net_buy_lot   = EXCLUDED.net_buy_lot
            """,
            (row["stock_code"], trade_date, row["kode_broker"], net_buy_value, net_buy_lot),
        )
        count += cur.rowcount

    conn.commit()
    cur.close()
    return count


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", required=True, help="Path ke file Excel/CSV broker summary")
    parser.add_argument("--date", default=str(date.today()), help="Tanggal trading YYYY-MM-DD (default: hari ini)")
    args = parser.parse_args()

    trade_date = date.fromisoformat(args.date)
    conn = get_conn()
    count = process_file(args.file, trade_date, conn)
    conn.close()
    print(f"[fetch_broker_summary] {count} baris di-upsert untuk tanggal {trade_date}.")


if __name__ == "__main__":
    main()
