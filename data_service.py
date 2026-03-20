"""
ml-service/src/services/data_service.py
Fetches OHLCV data via yfinance and computes 25+ technical indicators.
Thread-safe: uses asyncio.to_thread for blocking yfinance calls.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timedelta
from typing import Any

import numpy as np
import pandas as pd
import pandas_ta as ta
import yfinance as yf
from loguru import logger
from tenacity import retry, stop_after_attempt, wait_exponential


class DataService:
    """All data-fetching and feature-engineering logic."""

    MACRO_TICKERS: dict[str, str] = {
        "^VIX": "vix",
        "GC=F": "gold",
        "^TNX": "treasury_10y",
        "DX-Y.NYB": "usd_index",
        "^GSPC": "sp500",
    }

    # ── Public API ─────────────────────────────────────────────────────────────

    async def fetch_and_engineer(
        self,
        ticker: str,
        period_days: int = 730,
        include_macro: bool = True,
    ) -> pd.DataFrame:
        """
        Returns a fully-featured DataFrame ready for model input.
        Runs yfinance in a thread to avoid blocking the event loop.
        """
        end = datetime.utcnow()
        start = end - timedelta(days=period_days)

        # Fetch main ticker + macro in parallel
        tasks = [
            asyncio.to_thread(self._fetch_ohlcv, ticker, start, end),
        ]
        if include_macro:
            tasks.append(
                asyncio.to_thread(self._fetch_macro, start, end)
            )

        results = await asyncio.gather(*tasks, return_exceptions=True)

        df: pd.DataFrame = results[0]
        if isinstance(df, Exception):
            raise RuntimeError(f"Failed to fetch {ticker}: {df}") from df

        if include_macro and not isinstance(results[1], Exception):
            macro_df: pd.DataFrame = results[1]
            df = df.join(macro_df, how="left")
            df[macro_df.columns] = df[macro_df.columns].ffill().bfill()

        df = self._add_technical_indicators(df)
        df = self._add_time_features(df)
        df = df.dropna()

        logger.info(
            f"[DataService] {ticker}: {len(df)} rows, {len(df.columns)} features"
        )
        return df

    def get_feature_columns(self, df: pd.DataFrame) -> list[str]:
        """Return all feature columns (exclude raw OHLCV except close)."""
        exclude = {"open", "high", "low", "volume", "dividends", "stock_splits"}
        return [c for c in df.columns if c.lower() not in exclude]

    # ── Private helpers ────────────────────────────────────────────────────────

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    def _fetch_ohlcv(
        self, ticker: str, start: datetime, end: datetime
    ) -> pd.DataFrame:
        tkr = yf.Ticker(ticker)
        df = tkr.history(start=start.strftime("%Y-%m-%d"), end=end.strftime("%Y-%m-%d"))
        if df.empty:
            raise ValueError(f"No data returned for {ticker}")
        df.columns = [c.lower().replace(" ", "_") for c in df.columns]
        df.index = pd.to_datetime(df.index).tz_localize(None)
        return df[["open", "high", "low", "close", "volume"]]

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    def _fetch_macro(
        self, start: datetime, end: datetime
    ) -> pd.DataFrame:
        frames: list[pd.DataFrame] = []
        for sym, name in self.MACRO_TICKERS.items():
            try:
                tkr = yf.Ticker(sym)
                hist = tkr.history(
                    start=start.strftime("%Y-%m-%d"),
                    end=end.strftime("%Y-%m-%d"),
                )
                if not hist.empty:
                    s = hist["Close"].rename(name)
                    s.index = pd.to_datetime(s.index).tz_localize(None)
                    frames.append(s)
            except Exception as exc:
                logger.warning(f"Macro fetch failed for {sym}: {exc}")

        if not frames:
            return pd.DataFrame()
        macro = pd.concat(frames, axis=1)
        # Normalise to % change so scales are comparable
        macro = macro.pct_change().add_prefix("macro_")
        return macro

    def _add_technical_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add 25+ TA indicators using pandas-ta."""
        # Trend
        df.ta.sma(length=10, append=True)
        df.ta.sma(length=20, append=True)
        df.ta.sma(length=50, append=True)
        df.ta.ema(length=12, append=True)
        df.ta.ema(length=26, append=True)
        df.ta.macd(fast=12, slow=26, signal=9, append=True)

        # Momentum
        df.ta.rsi(length=14, append=True)
        df.ta.stoch(k=14, d=3, append=True)
        df.ta.cci(length=20, append=True)
        df.ta.williams(lbp=14, append=True)
        df.ta.mom(length=10, append=True)

        # Volatility
        df.ta.bbands(length=20, std=2, append=True)
        df.ta.atr(length=14, append=True)
        df.ta.natr(length=14, append=True)

        # Volume
        df.ta.obv(append=True)
        df.ta.mfi(length=14, append=True)
        df.ta.vwap(append=True)

        # Custom derived features
        df["log_return"] = np.log(df["close"] / df["close"].shift(1))
        df["hl_spread"] = (df["high"] - df["low"]) / df["close"]
        df["co_spread"] = (df["close"] - df["open"]) / df["open"]
        df["vol_ratio"] = df["volume"] / df["volume"].rolling(20).mean()
        df["price_momentum_5"] = df["close"].pct_change(5)
        df["price_momentum_20"] = df["close"].pct_change(20)

        return df

    def _add_time_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Encode cyclical time features."""
        idx = df.index
        df["day_of_week_sin"] = np.sin(2 * np.pi * idx.dayofweek / 7)
        df["day_of_week_cos"] = np.cos(2 * np.pi * idx.dayofweek / 7)
        df["month_sin"] = np.sin(2 * np.pi * idx.month / 12)
        df["month_cos"] = np.cos(2 * np.pi * idx.month / 12)
        return df
