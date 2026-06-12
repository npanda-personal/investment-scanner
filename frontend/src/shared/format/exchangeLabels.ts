/**
 * Scope-aware exchange / market labels.
 *
 * The scanner spans multiple market scopes (IN = NSE/BSE, US, EU, crypto).
 * Hardcoded "NSE/BSE" copy must never leak into the US or crypto experience.
 * These helpers turn a scope into the right user-facing exchange phrase so the
 * same component renders honest copy under every scope.
 *
 * Keep purely presentational — no data access.
 */

export interface ScopeLike {
  region?: string | null;
  assetType?: string | null;
}

/** Human exchange phrase for a region, e.g. "NSE/BSE", "US exchanges". */
export function exchangeLabel(scope: ScopeLike): string {
  const assetType = String(scope.assetType || '').trim().toUpperCase();
  if (assetType === 'CRYPTO') return 'crypto exchanges';
  const region = String(scope.region || '').trim().toUpperCase();
  switch (region) {
    case 'US':
      return 'US exchanges';
    case 'EU':
      return 'European exchanges';
    case 'IN':
    case 'INDIA':
      return 'NSE/BSE';
    case 'GLOBAL':
      return 'global exchanges';
    default:
      return 'exchanges';
  }
}

/** Noun for the tradable instrument under a scope: "stocks" vs "coins". */
export function instrumentNoun(scope: ScopeLike, plural = true): string {
  const assetType = String(scope.assetType || '').trim().toUpperCase();
  if (assetType === 'CRYPTO') return plural ? 'coins' : 'coin';
  return plural ? 'stocks' : 'stock';
}

/** Screener subtitle, scope-aware (replaces the hardcoded "Filter NSE/BSE stocks…"). */
export function screenerSubtitle(scope: ScopeLike): string {
  const assetType = String(scope.assetType || '').trim().toUpperCase();
  if (assetType === 'CRYPTO') {
    return 'Filter crypto assets by technicals and signals.';
  }
  return `Filter ${exchangeLabel(scope)} ${instrumentNoun(scope)} by technicals, fundamentals and signals.`;
}

/**
 * Subtitle for the instrument workspace landing (replaces the hardcoded
 * "Open any NSE/BSE stock…").
 */
export function instrumentWorkspaceSubtitle(scope: ScopeLike): string {
  const assetType = String(scope.assetType || '').trim().toUpperCase();
  if (assetType === 'CRYPTO') {
    return 'Open any coin to study it in one place — price action, market regime, and the latest research-support signal.';
  }
  return `Open any ${exchangeLabel(scope)} ${instrumentNoun(scope, false)} to study it in one place — price action, market regime, sector strength, smart-money context, and the latest research-support signal.`;
}
