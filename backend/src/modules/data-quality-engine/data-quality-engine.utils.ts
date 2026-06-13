/**
 * Small shared primitives used across the Data Quality Engine.
 *
 * These were previously re-implemented as private methods on both the service
 * and the repository; centralizing them removes the duplication and keeps the
 * coercion semantics identical everywhere.
 */

/** Trim to a non-empty string, or null. */
export function optionalText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

/** Coerce to a finite number, or null. Empty string counts as null. */
export function optionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/** Coerce a persisted JSON column into a string array. */
export function jsonStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}
