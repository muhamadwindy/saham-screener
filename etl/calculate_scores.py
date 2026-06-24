"""
calculate_scores.py
-------------------
Hitung skor komposit (Fundamental + Teknikal + Flow Bandar) untuk semua
emiten di universe, simpan ke tabel skor_harian, dan update tabel watchlist
berdasarkan aturan override (Section 6E dokumen spek).

Cara pakai:
    python calculate_scores.py [--date 2026-06-24]
"""

import argparse
from datetime import date, timedelta

from db import get_conn


SIGNAL_SCORE = {"baik": 1.0, "netral": 0.5, "tidak_baik": 0.0}

HORIZON_WEIGHTS = {
    "harian": {"fundamental": 0.15, "teknikal": 0.50, "flow_bandar": 0.35},
    "3hari":  {"fundamental": 0.20, "teknikal": 0.45, "flow_bandar": 0.35},
    "5hari":  {"fundamental": 0.30, "teknikal": 0.40, "flow_bandar": 0.30},
}

HORIZONS = list(HORIZON_WEIGHTS.keys())

VOL_WINDOW = {"harian": 5, "3hari": 10, "5hari": 20}


# ---- Fundamental ----

def compute_fundamental_score(kode: str, conn) -> float | None:
    cur = conn.cursor()
    cur.execute(
        """
        SELECT net_income, revenue, gross_profit, total_debt, total_equity,
               total_assets, ebit, interest_expense
        FROM laporan_keuangan
        WHERE kode_saham = %s
        ORDER BY periode DESC
        LIMIT 4
        """,
        (kode,),
    )
    rows = cur.fetchall()
    cur.close()

    if not rows:
        return None

    def to_f(v):
        return float(v) if v is not None else None

    def pct(a, b):
        if a is None or b is None or b == 0:
            return None
        return (a - b) / abs(b) * 100

    curr = rows[0]
    prev_q = rows[1] if len(rows) > 1 else None
    prev_y = rows[3] if len(rows) > 3 else None

    eps_yoy = pct(to_f(curr["net_income"]), to_f(prev_y["net_income"]) if prev_y else None)
    rev_yoy = pct(to_f(curr["revenue"]), to_f(prev_y["revenue"]) if prev_y else None)

    rev = to_f(curr["revenue"])
    gp  = to_f(curr["gross_profit"])
    curr_gm = (gp / rev * 100) if gp and rev and rev != 0 else None

    prev_gp  = to_f(prev_q["gross_profit"]) if prev_q else None
    prev_rev = to_f(prev_q["revenue"]) if prev_q else None
    prev_gm  = (prev_gp / prev_rev * 100) if prev_gp and prev_rev and prev_rev != 0 else None

    debt  = to_f(curr["total_debt"])
    eq    = to_f(curr["total_equity"])
    assets = to_f(curr["total_assets"])
    ebit  = to_f(curr["ebit"])
    int_e = to_f(curr["interest_expense"])

    der        = (debt / eq)           if debt and eq and eq != 0     else None
    debt_ratio = (debt / assets)       if debt and assets and assets != 0 else None
    icr        = (ebit / int_e)        if ebit and int_e and int_e != 0  else None

    scores = []

    # EPS growth YoY
    if eps_yoy is not None:
        scores.append(1.0 if eps_yoy > 15 else 0.5 if eps_yoy > 0 else 0.0)

    # Revenue growth YoY
    if rev_yoy is not None:
        scores.append(1.0 if rev_yoy > 10 else 0.5 if rev_yoy > 0 else 0.0)

    # Margin trend
    if curr_gm is not None and prev_gm is not None:
        scores.append(1.0 if curr_gm >= prev_gm else 0.0)

    # DER
    if der is not None:
        scores.append(1.0 if der < 0.5 else 0.5 if der < 1 else 0.0)
    elif debt_ratio is not None:
        scores.append(1.0 if debt_ratio < 0.5 else 0.5 if debt_ratio < 0.6 else 0.0)

    # ICR
    if icr is not None:
        scores.append(1.0 if icr > 5 else 0.5 if icr > 3 else 0.0)

    return sum(scores) / len(scores) if scores else None


# ---- Teknikal ----

def compute_teknikal_score(kode: str, trade_date: date, horizon: str, conn) -> float | None:
    cur = conn.cursor()
    cur.execute(
        """
        SELECT sinyal_tren, sinyal_momentum, sinyal_volume, sinyal_price_action
        FROM indikator_teknikal_cache
        WHERE kode_saham = %s AND tanggal = %s AND horizon = %s
        """,
        (kode, trade_date, horizon),
    )
    row = cur.fetchone()
    cur.close()

    if not row:
        return None

    scores = [
        SIGNAL_SCORE.get(row["sinyal_tren"], 0.5),
        SIGNAL_SCORE.get(row["sinyal_momentum"], 0.5),
        SIGNAL_SCORE.get(row["sinyal_volume"], 0.5),
        SIGNAL_SCORE.get(row["sinyal_price_action"], 0.5),
    ]
    return sum(scores) / len(scores)


# ---- Flow Bandar ----

def compute_flow_score(kode: str, trade_date: date, horizon: str, conn) -> float | None:
    window = VOL_WINDOW.get(horizon, 5)
    start = trade_date - timedelta(days=window * 2)

    cur = conn.cursor()
    # Net buy days: hari ketika broker ada net_buy > 0 saat harga turun/flat
    cur.execute(
        """
        SELECT COUNT(DISTINCT bsh.tanggal) AS akum_days,
               SUM(bsh.net_buy_value) AS total_buy
        FROM broker_summary_harian bsh
        JOIN ohlcv_harian o ON o.kode_saham = bsh.kode_saham AND o.tanggal = bsh.tanggal
        LEFT JOIN ohlcv_harian o_prev ON o_prev.kode_saham = bsh.kode_saham
            AND o_prev.tanggal = (
                SELECT MAX(tanggal) FROM ohlcv_harian
                WHERE kode_saham = bsh.kode_saham AND tanggal < bsh.tanggal
            )
        WHERE bsh.kode_saham = %s
          AND bsh.tanggal BETWEEN %s AND %s
          AND bsh.net_buy_value > 0
          AND (o_prev.close IS NULL OR o.close <= o_prev.close * 1.005)
        """,
        (kode, start, trade_date),
    )
    r = cur.fetchone()
    akum_days = int(r["akum_days"] or 0)
    total_buy = float(r["total_buy"] or 0)

    # Double bottom
    cur.execute(
        """
        SELECT status FROM double_bottom_pattern
        WHERE kode_saham = %s
          AND tanggal_deteksi >= %s
        ORDER BY tanggal_deteksi DESC LIMIT 1
        """,
        (kode, trade_date - timedelta(days=30)),
    )
    db_row = cur.fetchone()
    cur.close()

    scores = []

    # Akumulasi
    if akum_days >= 3:
        scores.append(1.0)
    elif akum_days >= 1:
        scores.append(0.6)
    else:
        scores.append(0.0)

    # Total net buy volume
    scores.append(min(total_buy / 1e10, 1.0) if total_buy > 0 else 0.0)

    # Double bottom
    if db_row:
        status = db_row["status"]
        if status == "breakout_konfirmasi":
            scores.append(1.0)
        elif status == "terbentuk":
            scores.append(0.7)
        else:
            scores.append(0.0)
    else:
        scores.append(0.3)  # netral

    return sum(scores) / len(scores) if scores else None


# ---- Watchlist ----

def update_watchlist(kode: str, trade_date: date, conn):
    cur = conn.cursor()

    # Cek akumulasi
    cur.execute(
        """
        SELECT COUNT(DISTINCT bsh.tanggal) AS days
        FROM broker_summary_harian bsh
        WHERE bsh.kode_saham = %s
          AND bsh.tanggal >= %s
          AND bsh.net_buy_value > 0
        """,
        (kode, trade_date - timedelta(days=10)),
    )
    akum_days = int(cur.fetchone()["days"] or 0)

    # Cek double bottom
    cur.execute(
        """
        SELECT id FROM double_bottom_pattern
        WHERE kode_saham = %s AND status IN ('terbentuk', 'breakout_konfirmasi')
          AND tanggal_deteksi >= %s
        ORDER BY tanggal_deteksi DESC LIMIT 1
        """,
        (kode, trade_date - timedelta(days=30)),
    )
    db_row = cur.fetchone()

    if not (akum_days >= 2 and db_row):
        cur.close()
        return

    # Base watchlist
    tier = "base"

    # Priority: broker institutional/asing
    cur.execute(
        """
        SELECT DISTINCT bsh.kode_broker
        FROM broker_summary_harian bsh
        JOIN broker b ON b.kode_broker = bsh.kode_broker
        WHERE bsh.kode_saham = %s
          AND bsh.net_buy_value > 0
          AND bsh.tanggal >= %s
          AND b.kategori IN ('institusional', 'asing')
        LIMIT 1
        """,
        (kode, trade_date - timedelta(days=10)),
    )
    inst_row = cur.fetchone()
    broker_trigger = inst_row["kode_broker"] if inst_row else None
    if broker_trigger:
        tier = "priority"

    # High confidence: broker match pemegang >5%
    if broker_trigger:
        cur.execute(
            """
            SELECT id FROM pemegang_saham_5_persen
            WHERE kode_saham = %s AND kode_broker_terdeteksi = %s
            LIMIT 1
            """,
            (kode, broker_trigger),
        )
        ps_row = cur.fetchone()
        if ps_row:
            tier = "high_confidence"

    keterangan_map = {
        "base": "Akumulasi broker + Double Bottom terdeteksi",
        "priority": f"Akumulasi broker institusional/asing ({broker_trigger}) + Double Bottom",
        "high_confidence": f"Broker {broker_trigger} terdeteksi sebagai pemegang >5% (data resmi KSEI)",
    }

    cur.execute(
        """
        INSERT INTO watchlist (kode_saham, tanggal, tingkat, kode_broker_trigger, keterangan)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT DO NOTHING
        """,
        (kode, trade_date, tier, broker_trigger, keterangan_map[tier]),
    )
    conn.commit()
    cur.close()


# ---- Main ----

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", default=str(date.today()))
    args = parser.parse_args()
    trade_date = date.fromisoformat(args.date)

    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT kode_saham FROM emiten WHERE is_syariah = TRUE AND is_bank = FALSE ORDER BY kode_saham")
    universe = [r["kode_saham"] for r in cur.fetchall()]
    cur.close()

    print(f"[calculate_scores] {len(universe)} emiten, tanggal {trade_date}")

    for i, kode in enumerate(universe):
        f_score = compute_fundamental_score(kode, conn)

        for horizon, weights in HORIZON_WEIGHTS.items():
            t_score = compute_teknikal_score(kode, trade_date, horizon, conn)
            fb_score = compute_flow_score(kode, trade_date, horizon, conn)

            if t_score is None and fb_score is None:
                continue

            # Fundamental sebagai gate jika tidak ada data teknikal
            parts = []
            w_total = 0.0

            if f_score is not None:
                parts.append(f_score * weights["fundamental"])
                w_total += weights["fundamental"]
            if t_score is not None:
                parts.append(t_score * weights["teknikal"])
                w_total += weights["teknikal"]
            if fb_score is not None:
                parts.append(fb_score * weights["flow_bandar"])
                w_total += weights["flow_bandar"]

            komposit = sum(parts) / w_total if w_total > 0 else None

            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO skor_harian
                  (kode_saham, tanggal, horizon, skor_fundamental, skor_teknikal, skor_flow_bandar, skor_komposit)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (kode_saham, tanggal, horizon) DO UPDATE SET
                    skor_fundamental  = EXCLUDED.skor_fundamental,
                    skor_teknikal     = EXCLUDED.skor_teknikal,
                    skor_flow_bandar  = EXCLUDED.skor_flow_bandar,
                    skor_komposit     = EXCLUDED.skor_komposit
                """,
                (kode, trade_date, horizon, f_score, t_score, fb_score, komposit),
            )
            conn.commit()
            cur.close()

        update_watchlist(kode, trade_date, conn)

        if (i + 1) % 50 == 0:
            print(f"  {i+1}/{len(universe)}...")

    conn.close()
    print("[calculate_scores] Selesai.")


if __name__ == "__main__":
    main()
