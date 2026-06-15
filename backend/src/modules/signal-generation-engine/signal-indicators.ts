/**
 * signal-indicators.ts
 *
 * Pure technical-analysis indicators over a newest-first SignalPricePoint[]
 * (prices[0] is the latest bar).  No I/O and no cross-module imports beyond the
 * local price-point type and signal-math helpers — fully unit-testable in
 * isolation and reusable by both the equity engine and the crypto lane.
 *
 * Extracted verbatim from signal-generation-engine.service.ts; the Wilder warm-up
 * windows, adjusted-OHLC handling and null-guards are preserved byte-for-byte.
 */
import type { SignalPricePoint } from './signal-generation-engine.types';
import { average } from './signal-math';

export function sma(prices: SignalPricePoint[], period: number): number | null {
  if (prices.length < period) return null;
  return average(prices.slice(0, period).map((price) => price.adjusted_close));
}

export function rsi(prices: SignalPricePoint[], period: number): number | null {
  if (prices.length <= period) return null;

  // Wilder's EMA requires a long warm-up to converge.  A short cap (period*2+1)
  // never stabilises and biases RSI; extend to min(len, period*10) (~140 bars for
  // RSI-14), matching professional implementations.  Still null below period+1 bars.
  const windowSize = Math.min(prices.length, period * 10);
  const chronological = [...prices].slice(0, windowSize).reverse();
  if (chronological.length < period + 1) return null;

  let avgGain = 0;
  let avgLoss = 0;

  // Initial average
  for (let i = 1; i <= period; i++) {
    const change = chronological[i].adjusted_close - chronological[i - 1].adjusted_close;
    if (change >= 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }
  avgGain /= period;
  avgLoss /= period;

  // Smoothing
  for (let i = period + 1; i < chronological.length; i++) {
    const change = chronological[i].adjusted_close - chronological[i - 1].adjusted_close;
    const currentGain = change >= 0 ? change : 0;
    const currentLoss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

export function adx(prices: SignalPricePoint[], period: number): number | null {
  // Wilder ADX needs ~3×period bars to converge (mirrors the RSI warm-up).
  const warmupSize = Math.min(prices.length, period * 3);
  if (prices.length <= period * 2) return null;
  const chronological = [...prices].slice(0, warmupSize).reverse();

  const trueRanges: number[] = [];
  const plusDM: number[] = [];
  const minusDM: number[] = [];

  for (let i = 1; i < chronological.length; i++) {
    const current = chronological[i];
    const previous = chronological[i - 1];

    // Use adjusted high/low (safe fallback to raw) so TR/DM share the adjusted_close
    // price scale after a split or bonus issue.
    const curHigh  = current.adjusted_high  ?? current.high;
    const curLow   = current.adjusted_low   ?? current.low;
    const prevHigh = previous.adjusted_high ?? previous.high;
    const prevLow  = previous.adjusted_low  ?? previous.low;

    if (curHigh === null || curLow === null || prevHigh === null || prevLow === null) {
      trueRanges.push(0);
      plusDM.push(0);
      minusDM.push(0);
      continue;
    }

    const tr = Math.max(
      curHigh - curLow,
      Math.abs(curHigh - previous.adjusted_close),
      Math.abs(curLow - previous.adjusted_close)
    );
    trueRanges.push(tr);

    const upMove = curHigh - prevHigh;
    const downMove = prevLow - curLow;

    if (upMove > downMove && upMove > 0) {
      plusDM.push(upMove);
    } else {
      plusDM.push(0);
    }

    if (downMove > upMove && downMove > 0) {
      minusDM.push(downMove);
    } else {
      minusDM.push(0);
    }
  }

  if (trueRanges.length < period * 2) return null;

  let smoothedTR = trueRanges.slice(0, period).reduce((a, b) => a + b, 0);
  let smoothedPlusDM = plusDM.slice(0, period).reduce((a, b) => a + b, 0);
  let smoothedMinusDM = minusDM.slice(0, period).reduce((a, b) => a + b, 0);

  const dxArray: number[] = [];

  for (let i = period; i < trueRanges.length; i++) {
    smoothedTR = smoothedTR - (smoothedTR / period) + trueRanges[i];
    smoothedPlusDM = smoothedPlusDM - (smoothedPlusDM / period) + plusDM[i];
    smoothedMinusDM = smoothedMinusDM - (smoothedMinusDM / period) + minusDM[i];

    // Guard divide-by-zero: a circuit-locked / all-flat bar has smoothedTR === 0,
    // which would blow plusDI/minusDI to Infinity and coerce dx to NaN.  Push dx=0
    // ("no directional information") instead.
    if (smoothedTR === 0) {
      dxArray.push(0);
      continue;
    }
    const plusDI = (smoothedPlusDM / smoothedTR) * 100;
    const minusDI = (smoothedMinusDM / smoothedTR) * 100;

    const diSum = plusDI + minusDI;
    const dx = diSum === 0 ? 0 : (Math.abs(plusDI - minusDI) / diSum) * 100;
    dxArray.push(dx);
  }

  if (dxArray.length < period) return null;

  let adxVal = dxArray.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < dxArray.length; i++) {
    adxVal = (adxVal * (period - 1) + dxArray[i]) / period;
  }

  return adxVal;
}

export function atr(prices: SignalPricePoint[], period: number): number | null {
  if (prices.length <= period) return null;
  const chronological = [...prices].slice(0, period * 2 + 1).reverse();
  if (chronological.length < period + 1) return null;

  const trueRanges: number[] = [];
  for (let i = 1; i < chronological.length; i++) {
    const current = chronological[i];
    const previous = chronological[i - 1];
    // Use adjusted high/low (safe fallback to raw) so ATR shares the adjusted_close
    // price scale after a corporate action.
    const curHigh = current.adjusted_high  ?? current.high;
    const curLow  = current.adjusted_low   ?? current.low;
    if (curHigh === null || curLow === null) {
      trueRanges.push(0);
      continue;
    }
    const tr = Math.max(
      curHigh - curLow,
      Math.abs(curHigh - previous.adjusted_close),
      Math.abs(curLow  - previous.adjusted_close)
    );
    trueRanges.push(tr);
  }

  if (trueRanges.length < period) return null;

  let atrVal = trueRanges.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
  for (let i = period; i < trueRanges.length; i++) {
    atrVal = (atrVal * (period - 1) + trueRanges[i]) / period;
  }

  return atrVal;
}

export function closePosition(price: SignalPricePoint | undefined): number | null {
  // periodHigh/periodLow use adjusted_close, so the daily close position must too.
  // We scale raw high/low by the same adjustment ratio used for close
  // (adj_factor = adjusted_close / close) and fall back to raw when close is 0/NaN.
  if (!price) return null;
  const rawClose = price.close;
  const adjClose = price.adjusted_close;
  const rawHigh = price.high;
  const rawLow = price.low;
  if (rawHigh === null || rawLow === null) return null;

  let adjHigh: number;
  let adjLow: number;
  if (rawClose > 0 && Number.isFinite(rawClose) && Number.isFinite(adjClose)) {
    const adjFactor = adjClose / rawClose;
    adjHigh = rawHigh * adjFactor;
    adjLow  = rawLow  * adjFactor;
  } else {
    adjHigh = rawHigh;
    adjLow  = rawLow;
  }

  if (adjHigh === adjLow) return null;
  return (adjClose - adjLow) / (adjHigh - adjLow);
}

export function periodHigh(prices: SignalPricePoint[], period: number): number | null {
  const values = prices.slice(0, period).map((price) => price.adjusted_close);
  return values.length > 0 ? Math.max(...values) : null;
}

export function periodLow(prices: SignalPricePoint[], period: number): number | null {
  const values = prices.slice(0, period).map((price) => price.adjusted_close);
  return values.length > 0 ? Math.min(...values) : null;
}

export function returnAtOffset(prices: SignalPricePoint[], offset: number): number | null {
  if (prices.length <= offset) return null;
  const oldValue = prices[offset].adjusted_close;
  if (oldValue <= 0) return null;
  return (prices[0].adjusted_close - oldValue) / oldValue;
}

export function obv(prices: SignalPricePoint[]): number[] {
  if (prices.length === 0) return [];
  const chronological = [...prices].reverse();
  let currentOBV = 0;
  const obvArray: number[] = [currentOBV];

  for (let i = 1; i < chronological.length; i++) {
    const current = chronological[i];
    const previous = chronological[i - 1];
    // Use adjusted_volume (split-factor applied) with safe fallback to raw volume.
    const vol = current.adjusted_volume ?? current.volume;
    if (vol === null) {
      obvArray.push(currentOBV);
      continue;
    }

    if (current.adjusted_close > previous.adjusted_close) {
      currentOBV += vol;
    } else if (current.adjusted_close < previous.adjusted_close) {
      currentOBV -= vol;
    }
    obvArray.push(currentOBV);
  }

  return obvArray.reverse();
}

export function isObvTrendingUp(prices: SignalPricePoint[], period = 10): boolean {
  const obvArray = obv(prices);
  if (obvArray.length < period) return false;
  return obvArray[0] > obvArray[period - 1];
}

export function isObvTrendingDown(prices: SignalPricePoint[], period = 10): boolean {
  const obvArray = obv(prices);
  if (obvArray.length < period) return false;
  return obvArray[0] < obvArray[period - 1];
}

/** Exponential moving average over a chronological (oldest-first) close series. */
function emaSeries(closes: number[], period: number): number[] {
  if (closes.length === 0) return [];
  const k = 2 / (period + 1);
  const out: number[] = [closes[0]];
  for (let i = 1; i < closes.length; i++) {
    out.push(closes[i] * k + out[i - 1] * (1 - k));
  }
  return out;
}

export interface MacdResult {
  macd: number;
  signal: number;
  histogram: number;
}

/**
 * MACD over a newest-first SignalPricePoint[] using adjusted_close.
 * Standard (12, 26, 9). Returns null until there are enough bars for the slow
 * EMA plus the signal warm-up. macd = EMA(fast) - EMA(slow); signal = EMA(macd, 9).
 */
export function macd(
  prices: SignalPricePoint[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
): MacdResult | null {
  if (prices.length < slowPeriod + signalPeriod) return null;
  // Chronological (oldest-first) close series.
  const closes = [...prices].reverse().map((p) => p.adjusted_close);
  const fast = emaSeries(closes, fastPeriod);
  const slow = emaSeries(closes, slowPeriod);
  const macdLine = closes.map((_, i) => fast[i] - slow[i]);
  const signalLine = emaSeries(macdLine, signalPeriod);
  const lastMacd = macdLine[macdLine.length - 1];
  const lastSignal = signalLine[signalLine.length - 1];
  if (!Number.isFinite(lastMacd) || !Number.isFinite(lastSignal)) return null;
  return { macd: lastMacd, signal: lastSignal, histogram: lastMacd - lastSignal };
}

/**
 * Bollinger %B over a newest-first SignalPricePoint[] using adjusted_close.
 * %B = (close - lower) / (upper - lower), where bands = SMA(period) ± mult·stddev.
 * 0 = at lower band, 1 = at upper band, >1 = above upper (overbought). Null below
 * `period` bars or when the band collapses (zero volatility).
 */
export function bollingerPercentB(
  prices: SignalPricePoint[],
  period = 20,
  mult = 2,
): number | null {
  if (prices.length < period) return null;
  const window = prices.slice(0, period).map((p) => p.adjusted_close);
  const mean = average(window);
  if (mean === null) return null;
  const variance = average(window.map((v) => (v - mean) ** 2));
  if (variance === null) return null;
  const stddev = Math.sqrt(variance);
  if (stddev === 0) return null;
  const upper = mean + mult * stddev;
  const lower = mean - mult * stddev;
  if (upper === lower) return null;
  return (prices[0].adjusted_close - lower) / (upper - lower);
}
