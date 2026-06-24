"""
calculate_indicators.py
-----------------------
Hitung indikator teknikal (MA, RSI, Volume avg) dari tabel ohlcv_harian
menggunakan pandas-ta, lalu simpan ke indikator_teknikal_cache.

Jalankan setelah fetch_ohlcv.py selesai.

Cara pakai:
    python calculate_indicators.py [--date 2026-06-24]
"""

import argparse
from datetime import date

import pandas as pd
import pandas_ta as ta
from db import get_conn

HORIZON_PARAMS = {
    "harian": {"ma_short": 5,  "ma_long": 10, "rsi_period": 7,  "vol_window": 5},
    "3hari":  {"ma_short": 10, "ma_long": 20, "rsi_period": 9,  "vol_window": 10},
    "5hari":  {"ma_short": 20, "ma_long": 50, "rsi_period": 14, "vol_window": 20},
}

HORIZONS = list(HORIZON_PARAMS.keys())


def signal_tren(close, ma_short, ma_long):
    if any(v is None or pd.isna(v) for v in [close, ma_short, ma_long]):
        return "netral"
    if close > ma_short > ma_long:
        return "baik"
    if close < ma_short and close < ma_long:
        return "tidak_baik"
    return "netral"


def signal_rsi(rsi):
    if rsi is None or pd.isna(rsi):
        return "netral"
    if rsi < 30:
        return "baik"   # oversold — potensi rebound
    if rsi > 70:
        return "tidak_baik"
    if 40 <= rsi <= 60:
        return "baik"
    return "netral"


def signal_volume(volume, vol_avg):
    if any(v is None or pd.isna(v) for v in [volume, vol_avg]) or vol_avg == 0:
        return "netral"
    if volume > vol_avg:
        return "baik"
    return "tidak_baik"


def detect_price_action(df: pd.DataFrame) -> str:
    """Deteksi candlestick reversal sederhana dari 2 candle terakhir."""
    if len(df) < 2:
        return "netral"

    prev = df.iloc[-2]
    curr = df.iloc[-1]

    prev_body = prev["close"] - prev["open"]
    curr_body = curr["close"] - curr["open"]
    curr_range = curr["high"] - curr["low"]

    # Bullish engulfing
    if (prev_body < 0 and curr_body > 0
            and curr["open"] <= prev["close"]
            and curr["close"] >= prev["open"]):
        return "baik"

    # Hammer: body kecil di atas, shadow bawah panjang
    if (curr_body > 0 and curr_range > 0
            and (curr["open"] - curr["low"]) / curr_range > 0.6):
        return "baik"

    # Bearish engulfing
    if (prev_body > 0 and curr_body < 0
            and curr["open"] >= prev["close"]
            and curr["close"] <= prev["open"]):
        return "tidak_baik"

    # Shooting star
    if (curr_range > 0 and curr_body < 0
            and (curr["high"] - curr["open"]) / curr_range > 0.6):
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
    df = pd.DataFrame(rows)
    df["tanggal"] = pd.to_datetime(df["tanggal"])
    df = df.set_index("tanggal")
    return df


def compute_and_upsert(kode: str, df: pd.DataFrame, trade_date: date, conn):
    if len(df) < 5:
        return

    cur = conn.cursor()
    for horizon, p in HORIZON_PARAMS.items():
        min_periods = p["ma_long"]
        if len(df) < min_periods:
            continue

        close = df["close"]
        ma_short = ta.sma(close, length=p["ma_short"])
        ma_long = ta.sma(close, length=p["ma_long"])
        rsi = ta.rsi(close, length=p["rsi_period"])
        vol_avg = df["volume"].rolling(p["vol_window"]).mean()

        last = df.index[-1].date()
        if last != trade_date:
            continue

        ma_s_val = ma_short.iloc[-1] if ma_short is not None else None
        ma_l_val = ma_long.iloc[-1] if ma_long is not None else None
        rsi_val = rsi.iloc[-1] if rsi is not None else None
        vol_val = df["volume"].iloc[-1]
        vol_avg_val = vol_avg.iloc[-1]
        close_val = close.iloc[-1]

        s_tren = signal_tren(close_val, ma_s_val, ma_l_val)
        s_mom = signal_rsi(rsi_val)
        s_vol = signal_volume(vol_val, vol_avg_val)
        s_pa = detect_price_action(df.reset_index())

        cur.execute(
            """
            INSERT INTO indikator_teknikal_cache
              (kode_saham, tanggal, horizon, ma_pendek, ma_panjang, rsi, volume_avg_n,
               sinyal_tren, sinyal_momentum, sinyal_volume, sinyal_price_action)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (kode_saham, tanggal, horizon) DO UPDATE SET
                ma_pendek          = EXCLUDED.ma_pendek,
                ma_panjang         = EXCLUDED.ma_panjang,
                rsi                = EXCLUDED.rsi,
                volume_avg_n       = EXCLUDED.volume_avg_n,
                sinyal_tren        = EXCLUDED.sinyal_tren,
                sinyal_momentum    = EXCLUDED.sinyal_momentum,
                sinyal_volume      = EXCLUDED.sinyal_volume,
                sinyal_price_action = EXCLUDED.sinyal_price_action
            """,
            (
                kode, trade_date, horizon,
                float(ma_s_val) if ma_s_val and not pd.isna(ma_s_val) else None,
                float(ma_l_val) if ma_l_val and not pd.isna(ma_l_val) else None,
                float(rsi_val) if rsi_val and not pd.isna(rsi_val) else None,
                float(vol_avg_val) if vol_avg_val and not pd.isna(vol_avg_val) else None,
                s_tren, s_mom, s_vol, s_pa,
            ),
        )

    conn.commit()
    cur.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", default=str(date.today()), help="Tanggal YYYY-MM-DD")
    args = parser.parse_args()
    trade_date = date.fromisoformat(args.date)

    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT kode_saham FROM emiten WHERE lolos_universe = TRUE ORDER BY kode_saham")
    universe = [r["kode_saham"] for r in cur.fetchall()]
    cur.close()

    print(f"[calculate_indicators] {len(universe)} emiten, tanggal {trade_date}")

    for i, kode in enumerate(universe):
        df = get_ohlcv(kode, conn)
        if df.empty:
            continue
        compute_and_upsert(kode, df, trade_date, conn)
        if (i + 1) % 50 == 0:
            print(f"  {i+1}/{len(universe)}...")

    conn.close()
    print("[calculate_indicators] Selesai.")


if __name__ == "__main__":
    main()
