/**
 * India-native money formatting helpers.
 *
 * All amounts are assumed to be in INR (₹) — this scanner covers NSE/BSE only.
 * Use `inr` for prices and per-share amounts; `inrCompact` for large balance-sheet
 * figures (market cap, revenue, net income).
 *
 * Pure functions — no React or MUI imports; safe to use anywhere.
 */

/** Options for `inr`. */
export interface InrOpts {
  /** Number of fraction digits. Defaults to 2. */
  fractionDigits?: number;
}

/**
 * Format a price / per-share value in INR with Indian digit grouping.
 *
 * Examples:
 *   inr(1420.9)        → "₹1,420.90"
 *   inr(100000)        → "₹1,00,000.00"
 *   inr(null)          → "N/A"
 */
export function inr(value: number | string | null | undefined, opts: InrOpts = {}): string {
  if (value === null || value === undefined || value === '') return 'N/A';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 'N/A';

  const fractionDigits = opts.fractionDigits ?? 2;
  return (
    '₹' +
    numeric.toLocaleString('en-IN', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    })
  );
}

/**
 * Compact format for large INR amounts (market cap, revenue, net income).
 *
 * Scale rules (matching BSE/NSE convention):
 *   ≥ 1 Cr  (1e7)  → "₹2,345.7 Cr"
 *   ≥ 1 L   (1e5)  → "₹3.45 L"
 *   otherwise       → "₹12,345"
 *
 * Negative values are supported: "₹−234.5 Cr".
 * Returns "N/A" for null/undefined/non-finite.
 */
export function inrCompact(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'N/A';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 'N/A';

  const abs = Math.abs(numeric);
  const sign = numeric < 0 ? '−' : '';

  if (abs >= 1e7) {
    const cr = abs / 1e7;
    return `₹${sign}${cr.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Cr`;
  }
  if (abs >= 1e5) {
    const lakh = abs / 1e5;
    return `₹${sign}${lakh.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`;
  }
  // Small amount — show without decimal
  return `₹${sign}${abs.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

/**
 * MUI `color` string for a signed numeric change.
 *
 * Returns 'success.main' for positive, 'error.main' for negative,
 * and 'text.secondary' for zero or N/A.
 */
export function changeColor(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'text.secondary';
  if (value > 0) return 'success.main';
  if (value < 0) return 'error.main';
  return 'text.secondary';
}

/**
 * Strip the `.NS` (or `.BO`) Yahoo Finance suffix from a displayed symbol.
 * Only removes a trailing dot-suffix; leaves bare symbols unchanged.
 *
 *   stripSuffix("RELIANCE.NS") → "RELIANCE"
 *   stripSuffix("INFY.BO")     → "INFY"
 *   stripSuffix("TCS")         → "TCS"
 */
export function stripSuffix(symbol: string | null | undefined): string {
  if (!symbol) return '';
  return symbol.replace(/\.(NS|BO|NSE|BSE)$/i, '');
}
