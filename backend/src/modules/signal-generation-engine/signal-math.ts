/**
 * signal-math.ts
 *
 * Pure, dependency-free numeric helpers shared across the signal-generation
 * engine.  No I/O, no cross-module imports — safe to unit-test in isolation and
 * to reuse from the equity engine, the crypto lane, and the indicator layer.
 *
 * Extracted verbatim from signal-generation-engine.service.ts so the behaviour is
 * byte-identical to the prior inlined implementations.
 */

/** Arithmetic mean, or null for an empty input. */
export function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Sample standard deviation (n-1), or null when fewer than 2 values. */
export function stddev(values: number[]): number | null {
  if (values.length < 2) return null;
  const avg = average(values) ?? 0;
  return Math.sqrt(values.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) / (values.length - 1));
}

/** Coerce to a finite number, or null when the value is non-numeric. */
export function optionalNumber(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

/** Clamp an arbitrary value to an integer within [min, max], falling back when non-finite. */
export function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(numeric)));
}

/** Returns a copy of the date normalised to 00:00:00 UTC (the canonical "day" key). */
export function normalizeUtcDay(value: Date): Date {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}
