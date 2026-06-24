"""
seed_emiten.py
--------------
Seed tabel emiten dengan konstituen ISSI (Indeks Saham Syariah Indonesia)
sebagai proxy universe syariah, lalu filter non-bank.

Cara pakai:
    python seed_emiten.py

Data ISSI diambil dari file Excel yang didownload dari BEI:
    https://www.idx.co.id/id/data-pasar/ringkasan-perdagangan/ringkasan-saham/
atau dari file CSV manual yang diletakkan di etl/data/issi_konstituen.csv

Kolom yang diharapkan (CSV):
    kode_saham, nama_emiten, sektor, sub_sektor, is_syariah (TRUE/FALSE)

Bank ditetapkan is_bank=True berdasarkan sub_sektor == "Bank" (IDX-IC).
"""

import csv
import os
import sys
from db import get_conn

CSV_PATH = os.path.join(os.path.dirname(__file__), "data", "issi_konstituen.csv")

BANK_SUBSEKTOR = {"bank", "banks"}


def load_csv():
    if not os.path.exists(CSV_PATH):
        print(f"[seed_emiten] File tidak ditemukan: {CSV_PATH}")
        print("  → Buat folder etl/data/ dan letakkan issi_konstituen.csv di sana.")
        sys.exit(1)

    rows = []
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append({
                "kode_saham": row.get("kode_saham", "").strip().upper(),
                "nama_emiten": row.get("nama_emiten", "").strip(),
                "sektor": row.get("sektor", "").strip() or None,
                "sub_sektor": row.get("sub_sektor", "").strip() or None,
                "is_syariah": row.get("is_syariah", "TRUE").strip().upper() in ("1", "TRUE", "YES"),
            })
    return [r for r in rows if r["kode_saham"]]


def seed(rows):
    conn = get_conn()
    cur = conn.cursor()

    upserted = 0
    for r in rows:
        is_bank = (r["sub_sektor"] or "").lower() in BANK_SUBSEKTOR
        cur.execute(
            """
            INSERT INTO emiten (kode_saham, nama_emiten, sektor, sub_sektor, is_syariah, is_bank)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (kode_saham) DO UPDATE SET
                nama_emiten = EXCLUDED.nama_emiten,
                sektor      = EXCLUDED.sektor,
                sub_sektor  = EXCLUDED.sub_sektor,
                is_syariah  = EXCLUDED.is_syariah,
                is_bank     = EXCLUDED.is_bank,
                updated_at  = now()
            """,
            (
                r["kode_saham"],
                r["nama_emiten"],
                r["sektor"],
                r["sub_sektor"],
                r["is_syariah"],
                is_bank,
            ),
        )
        upserted += cur.rowcount

    conn.commit()
    cur.close()
    conn.close()
    print(f"[seed_emiten] {upserted} emiten di-upsert ke database.")


if __name__ == "__main__":
    rows = load_csv()
    print(f"[seed_emiten] {len(rows)} baris dibaca dari CSV.")
    seed(rows)
