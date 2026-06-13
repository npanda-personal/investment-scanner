/**
 * Pure technical-indicator and price-normalisation helpers for the Strategy
 * Decision Engine (audit R-3).
 *
 * These were private methods on the service. Extracting them as pure,
 * dependency-free functions makes them independently unit-testable and reusable
 * by the future split modules (market-gate, legacy-evaluators) without dragging
 * the service in. They are kept *module-local* (not promoted to shared/) to
 * respect the current module-boundary constraint; promoting to a shared TA util
 * is a separate, cross-module change.
 *
 * Convention: price arrays are ordered NEWEST-FIRST (index 0 = latest close),
 * matching `toPricePoints` output. `calculateSma`/`calculateRsi` rely on this.
 */

export interface PricePoint {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  adjusted_close: number;
  volume: number | null;
}

/** Coerce to a finite number or null. */
export function optionalNumber(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

/**
 * Simple moving average over the most recent `period` closes (newest-first
 * input). Returns null when there is insufficient history.
 */
export function calculateSma(prices: number[], period: number): number | null {
  if (prices.length < period) return null;
  return prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
}

/**
 * Simple (unsmoothed) RSI over `period` deltas of the newest-first close
 * series. Note: this is a simple-average RSI, not Wilder-smoothed, so it will
 * not match charting-platform RSI exactly; it is intentionally lightweight for
 * screening. Returns null when there is insufficient history.
 */
export function calculateRsi(prices: number[], period: number): number | null {
  if (prices.length <= period) return null;
  let gains = 0;
  let losses = 0;
  for (let i = 0; i < period; i++) {
    const diff = prices[i] - prices[i + 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }
  if (losses === 0) return 100;
  const rs = (gains / period) / (losses / period);
  return 100 - (100 / (1 + rs));
}

/** Arithmetic mean, or null for an empty series. */
export function average(values: number[]): number | null {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

/**
 * Annualised volatility of a newest-first close series (std-dev of period
 * returns × √252). Returns null when fewer than two returns are available.
 */
export function volatility(values: number[]): number | null {
  const returns = values.slice(1).map((value, index) => (value > 0 ? (values[index] - value) / value : 0));
  if (returns.length < 2) return null;
  const avg = average(returns) ?? 0;
  return Math.sqrt(returns.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) / (returns.length - 1)) * Math.sqrt(252);
}

/**
 * Normalise raw price rows into newest-first `PricePoint`s, dropping rows with a
 * non-finite adjusted close.
 */
export function toPricePoints(prices: any[]): PricePoint[] {
  return prices
    .map((price) => ({
      date: typeof price.date === 'string' ? price.date : new Date(price.date).toISOString(),
      open: optionalNumber(price.open),
      high: optionalNumber(price.high),
      low: optionalNumber(price.low),
      close: Number(price.close),
      adjusted_close: Number(price.adjusted_close ?? price.close),
      volume: optionalNumber(price.volume),
    }))
    .filter((price) => Number.isFinite(price.adjusted_close))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
