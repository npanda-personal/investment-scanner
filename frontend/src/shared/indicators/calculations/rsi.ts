/**
 * RSI using Wilder smoothing (RMA / running moving average).
 * Returns null for the first `period` entries while the initial average is bootstrapped.
 */
export function rsi(closes: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = new Array(closes.length).fill(null);
  if (closes.length <= period) return result;

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) avgGain += d;
    else avgLoss -= d;
  }
  avgGain /= period;
  avgLoss /= period;

  const toRsi = (g: number, l: number) => (l === 0 ? 100 : 100 - 100 / (1 + g / l));
  result[period] = toRsi(avgGain, avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
    result[i] = toRsi(avgGain, avgLoss);
  }
  return result;
}

/**
 * Stochastic RSI.
 * Applies the stochastic formula to RSI values, then double-smooths into %K and %D.
 * Output values are in the 0–1 range (caller scales to 0–100 for display).
 */
export function stochRsi(
  closes: number[],
  rsiPeriod = 14,
  stochPeriod = 14,
  kSmooth = 3,
  dSmooth = 3,
): { k: (number | null)[]; d: (number | null)[] } {
  const rsiVals = rsi(closes, rsiPeriod);
  const n = closes.length;
  const rawStoch: (number | null)[] = new Array(n).fill(null);

  for (let i = stochPeriod - 1; i < n; i++) {
    const window = rsiVals.slice(i - stochPeriod + 1, i + 1);
    const valid = window.filter((v): v is number => v !== null);
    const current = rsiVals[i];
    if (valid.length < stochPeriod || current === null) continue;
    const lo = Math.min(...valid);
    const hi = Math.max(...valid);
    rawStoch[i] = hi === lo ? 0 : (current - lo) / (hi - lo);
  }

  const smK = smoothNullable(rawStoch, kSmooth);
  const smD = smoothNullable(smK, dSmooth);
  return { k: smK, d: smD };
}

function smoothNullable(vals: (number | null)[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(vals.length).fill(null);
  for (let i = period - 1; i < vals.length; i++) {
    const w = vals.slice(i - period + 1, i + 1);
    const valid = w.filter((v): v is number => v !== null);
    if (valid.length === period) {
      out[i] = valid.reduce((s, v) => s + v, 0) / period;
    }
  }
  return out;
}
