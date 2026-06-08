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
 * Currency-aware price formatter.
 *
 * Defaults to INR (the equity path). When `currency` is USD (crypto / US assets)
 * formats with `$` and en-US grouping. Keeps the rest of the app's INR behavior
 * untouched — only callers that pass a non-INR currency change.
 */
export function money(value: number | string | null | undefined, currency?: string | null, opts: InrOpts = {}): string {
  const code = String(currency || 'INR').toUpperCase();
  if (code === 'INR') return inr(value, opts);
  if (value === null || value === undefined || value === '') return 'N/A';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 'N/A';
  const fractionDigits = opts.fractionDigits ?? 2;
  const symbol = code === 'USD' ? '$' : code === 'EUR' ? '€' : '';
  const formatted = numeric.toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
  return symbol ? `${symbol}${formatted}` : `${formatted} ${code}`;
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
 * Generic compact formatter for large amounts in non-Indian currencies
 * (US/EU/crypto), using the international K/M/B/T scale.
 *
 *   compact(2_345_000_000, 'USD') → "$2.35B"
 *   compact(3_450_000, 'EUR')     → "€3.45M"
 *   compact(12_345, 'USD')        → "$12,345"
 *
 * Negative values supported ("−$1.20B"). Returns "N/A" for null/non-finite.
 * For INR amounts use `inrCompact` (lakh/crore) or `compactByProfile`.
 */
export function compact(value: number | string | null | undefined, currency?: string | null): string {
  if (value === null || value === undefined || value === '') return 'N/A';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 'N/A';

  const code = String(currency || 'USD').toUpperCase();
  const symbol = code === 'USD' ? '$' : code === 'EUR' ? '€' : code === 'INR' ? '₹' : '';
  const abs = Math.abs(numeric);
  const sign = numeric < 0 ? '−' : '';
  const withCode = (body: string) => (symbol ? `${symbol}${sign}${body}` : `${sign}${body} ${code}`);

  const tiers: Array<[number, string]> = [
    [1e12, 'T'],
    [1e9, 'B'],
    [1e6, 'M'],
    [1e3, 'K'],
  ];
  for (const [threshold, unit] of tiers) {
    if (abs >= threshold) {
      const scaled = abs / threshold;
      return withCode(`${scaled.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${unit}`);
    }
  }
  return withCode(abs.toLocaleString('en-US', { maximumFractionDigits: 0 }));
}

/**
 * Profile-aware compact formatter: INR amounts use the Indian lakh/crore scale
 * (`inrCompact`); every other currency uses the international K/M/B/T scale
 * (`compact`). Pass a UiMarketProfile (or any object with a `currency`).
 */
export function compactByProfile(
  value: number | string | null | undefined,
  profile: { currency: string }
): string {
  return String(profile.currency || 'INR').toUpperCase() === 'INR'
    ? inrCompact(value)
    : compact(value, profile.currency);
}

/**
 * Currency symbol/label for a currency code: ₹ / $ / € for the known ones,
 * otherwise the bare code (e.g. "GBP"). Use for column headers and labels.
 */
export function currencySymbol(currency?: string | null): string {
  const code = String(currency || 'INR').toUpperCase();
  if (code === 'INR') return '₹';
  if (code === 'USD') return '$';
  if (code === 'EUR') return '€';
  return code;
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
