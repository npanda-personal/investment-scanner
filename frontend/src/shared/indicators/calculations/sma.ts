/**
 * Simple moving average. Returns null for the first (period-1) entries where
 * there is insufficient history.
 */
export function sma(values: number[], period: number): (number | null)[] {
  if (period <= 0) return values.map(() => null);
  const result: (number | null)[] = [];
  let windowSum = 0;
  for (let i = 0; i < values.length; i++) {
    windowSum += values[i];
    if (i >= period) windowSum -= values[i - period];
    result.push(i < period - 1 ? null : windowSum / period);
  }
  return result;
}
