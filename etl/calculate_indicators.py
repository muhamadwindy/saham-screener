"""
calculate_indicators.py
-----------------------
Hitung indikator teknikal (SMA, RSI, Volume avg) dari tabel ohlcv_harian
menggunakan pandas murni (tanpa pandas-ta / numba), lalu simpan ke
indikator_teknikal_cache.

Jalankan setelah fetch_ohlcv.py selesai.

Cara pakai:
    python calculate_indicators.py [--date 2026-06-24]
"""

import argparse
from datetime import date

import numpy as np
import pandas as pd
from db import get_conn

HORIZON_PARAMS = {
    "harian": {"ma_short": 5,  "ma_long": 10, "rsi_period": 7,  "vol_window": 5},
    "3hari":  {"ma_short": 10, "ma_long": 20, "rsi_period": 9,  "vol_window": 10},
    "5hari":  {"ma_short": 20, "ma_long": 50, "rsi_period": 14, "vol_window": 20},
}


def calc_rsi(series: pd.Series, period: int) -> pd.Series:
    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(com=period - 1, min_periods=period).mean()
    avg_loss = loss.ewm(com=period - 1, min_periods=period).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))


def signal_tren(close, ma_short, ma_long) -> str:
    if any(v is None or (isinstance(v, float) and np.isnan(v)) for v in [close, ma_short, ma_long]):
        return "netral"
    if close > ma_short > ma_long:
        return "baik"
    if close < ma_short and close < ma_long:
        return "tidak_baik"
    return "netral"


def signal_rsi(rsi) -> str:
    if rsi is None or (isinstance(rsi, float) and np.isnan(rsi)):
        return "netral"
    if rsi < 30:
        return "baik"
    if rsi > 70:
        return "tidak_baik"
    if 40 <= rsi <= 60:
        return "baik"
    return "netral"


def signal_volume(volume, vol_avg) -> str:
    if any(v is None or (isinstance(v, float) and np.isnan(v)) for v in [volume, vol_avg]) or vol_avg == 0:
        return "netral"
    return "baik" if volume > vol_avg else "tidak_baik"


def detect_price_action(df: pd.DataFrame) -> str:
    if len(df) < 2:
        return "netral"
    prev = df.iloc[-2]
    curr = df.iloc[-1]
    prev_body = prev["close"] - prev["open"]
    curr_body = curr["close"] - curr["open"]
    curr_range = curr["high"] - curr["low"]

    if (prev_body < 0 and curr_body > 0
            and curr["open"] <= prev["close"]
            and curr["close"] >= prev["open"]):
        return "baik"

    if curr_body > 0 and curr_range > 0 and (curr["open"] - curr["low"]) / curr_range > 0.6:
        return "baik"

    if (prev_body > 0 and curr_body < 0
            and curr["open"] >= prev["close"]
            and curr["close"] <= prev["open"]):
        return "tidak_baik"

    if curr_range > 0 and curr_body < 0 and (curr["high"] - curr["open"]) / curr_range > 0.6:
        return "tidak_baik"

    return "netral"


def get_ohlcv(kode: str, conn) -> pd.DataFrame:
    cur = conn.cursor()
    cur.execute(
        """
        SELECT tanggal, open::float, high::float, low::float, close::float, volume::bigint
        FROM ohlcv_harian
        WHERE kode_saham = %s
        ORDER BY tanggal
        """,
        (kode,),
    )
    rows = cur.fetchall()
    cur.close()
    if not rows:
        return pd.DataFrame()
    df = pd.DataFrame(rows)   # RealDictCursor returns dicts — column names auto-detected
    df["tanggal"] = pd.to_datetime(df["tanggal"])
    return df.set_index("tanggal")


def compute_and_upsert(kode: str, df: pd.DataFrame, trade_date: date, conn):
    if len(df) < 5:
        return
    if df.index[-1].date() != trade_date:
        return

    cur = conn.cursor()
    rows = []
    for horizon, p in HORIZON_PARAMS.items():
        if len(df) < p["ma_long"]:
            continue

        close   = df["close"]
        ma_s    = close.rolling(p["ma_short"]).mean()
        ma_l    = close.rolling(p["ma_long"]).mean()
        rsi     = calc_rsi(close, p["rsi_period"])
        vol_avg = df["volume"].rolling(p["vol_window"]).mean()

        def fval(s):
            v = s.iloc[-1]
            return float(v) if v is not None and not np.isnan(v) else None

        ma_s_val   = fval(ma_s)
        ma_l_val   = fval(ma_l)
        rsi_val    = fval(rsi)
        vol_val    = float(df["volume"].iloc[-1])
        vol_avg_val = fval(vol_avg)
        close_val  = float(close.iloc[-1])

        rows.append((
            kode, trade_date, horizon,
            ma_s_val, ma_l_val, rsi_val, vol_avg_val,
            signal_tren(close_val, ma_s_val, ma_l_val),
            signal_rsi(rsi_val),
            signal_volume(vol_val, vol_avg_val),
            detect_price_action(df.reset_index()),
        ))

    if rows:
        cur.executemany(
            """
            INSERT INTO indikator_teknikal_cache
              (kode_saham, tanggal, horizon, ma_pendek, ma_panjang, rsi, volume_avg_n,
               sinyal_tren, sinyal_momentum, sinyal_volume, sinyal_price_action)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (kode_saham, tanggal, horizon) DO UPDATE SET
                ma_pendek           = EXCLUDED.ma_pendek,
                ma_panjang          = EXCLUDED.ma_panjang,
                rsi                 = EXCLUDED.rsi,
                volume_avg_n        = EXCLUDED.volume_avg_n,
                sinyal_tren         = EXCLUDED.sinyal_tren,
                sinyal_momentum     = EXCLUDED.sinyal_momentum,
                sinyal_volume       = EXCLUDED.sinyal_volume,
                sinyal_price_action = EXCLUDED.sinyal_price_action
            """,
            rows,
        )
        conn.commit()
    cur.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", default=str(date.today()))
    args = parser.parse_args()
    trade_date = date.fromisoformat(args.date)

    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        "SELECT kode_saham FROM emiten WHERE is_syariah = TRUE AND is_bank = FALSE ORDER BY kode_saham"
    )
    universe = [r["kode_saham"] for r in cur.fetchall()]
    cur.close()

    print(f"[calculate_indicators] {len(universe)} emiten, tanggal {trade_date}")
    for i, kode in enumerate(universe):
        df = get_ohlcv(kode, conn)
        if not df.empty:
            compute_and_upsert(kode, df, trade_date, conn)
        if (i + 1) % 50 == 0:
            print(f"  {i+1}/{len(universe)}...")

    conn.close()
    print("[calculate_indicators] Selesai.")


if __name__ == "__main__":
    main()
