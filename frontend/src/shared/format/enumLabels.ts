/**
 * Human-readable labels for the raw enum/code strings the backend emits.
 *
 * The backend serializes internal SCREAMING_SNAKE_CASE codes (statuses, reasons,
 * strategy families, index symbols, readiness tiers, etc). These must never render
 * raw in the trader UI. Use `humanizeCode` for the generic case and `indexLabel`
 * for NSE/BSE index symbols. Specific overrides live in the maps below.
 *
 * Research-support tone: keep labels neutral ("Review", "Candidate", "Watch") — never
 * imperative ("Buy"/"Sell").
 */

/**
 * Known Indian-market and financial acronyms that must stay ALL-CAPS after
 * title-casing. Add new tokens here — they are matched as whole words only
 * (word-boundary \b on each side), case-insensitively, after the title-case
 * pass so e.g. "Fmcg" → "FMCG", "Psu" → "PSU".
 */
const ACRONYMS = new Set([
  'IT', 'FMCG', 'PSU', 'FII', 'DII', 'RS', 'VIX',
  'NSE', 'BSE', 'FNO', 'F&O', 'AD', 'A/D', 'OI', 'PCR',
  'SME', 'T2T', 'ISIN', 'EPS', 'PE', 'ROE', 'ROCE',
  'CAGR', 'YTD', 'SMA', 'EMA', 'RSI', 'ADX', 'MACD',
  'NIFTY', 'SENSEX', 'IPO', 'QIP', 'ETF', 'REIT',
  'GST', 'RBI', 'USD', 'INR',
  // keep previously-handled short tokens
  'PR', 'TR', 'IQ', 'AI', 'US', 'UK',
]);

/** Regex that matches any token from the ACRONYMS set as a whole word (rebuilt once). */
const ACRONYM_RE = new RegExp(
  `\\b(${[...ACRONYMS].map((a) => a.replace(/[/&]/g, '\\$&')).join('|')})\\b`,
  'gi',
);

/** Generic SCREAMING_SNAKE / kebab / dotted code -> Title Case words. */
export function humanizeCode(code: unknown): string {
  if (code === null || code === undefined) return '';
  const raw = String(code).trim();
  if (!raw) return '';
  // Already human (has a space and a lowercase letter) -> leave as-is.
  if (/\s/.test(raw) && /[a-z]/.test(raw)) return raw;
  const titleCased = raw
    .replace(/^\^/, '') // strip ^ index prefix (e.g. ^CNXMETAL)
    .replace(/^(NSE_INDEX_|NSE_|BSE_)/i, '')
    .replace(/[_\-.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\b([a-z])/g, (_m, c: string) => c.toUpperCase());
  // Restore known acronyms to ALL-CAPS (e.g. "Fmcg" → "FMCG", "Psu" → "PSU").
  return titleCased.replace(ACRONYM_RE, (m: string) => m.toUpperCase());
}

/**
 * Humanize SCREAMING_SNAKE_CASE tokens embedded inside a longer sentence/string.
 * (humanizeCode leaves multi-word human text untouched, so it won't fix an enum
 * token buried in a backend-generated sentence — this does.)
 */
export function humanizeEmbedded(text: unknown): string {
  if (text === null || text === undefined) return '';
  return String(text).replace(/\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/g, (token) => humanizeCode(token));
}

/** Friendly names for the common NSE indices (raw symbol -> display). */
const INDEX_LABELS: Record<string, string> = {
  '^NSEI': 'Nifty 50',
  NSE_INDEX_NIFTY_50: 'Nifty 50',
  NSE_INDEX_NIFTY50: 'Nifty 50',
  '^NSEBANK': 'Bank Nifty',
  NSE_INDEX_NIFTY_BANK: 'Bank Nifty',
  '^BSESN': 'Sensex',
  NSE_INDEX_NIFTY_NEXT_50: 'Nifty Next 50',
  NSE_INDEX_NIFTY_MIDCAP_100: 'Nifty Midcap 100',
  NSE_INDEX_NIFTY_SMALLCAP_100: 'Nifty Smallcap 100',
  NSE_INDEX_NIFTY_IT: 'Nifty IT',
  NSE_INDEX_NIFTY_AUTO: 'Nifty Auto',
  NSE_INDEX_NIFTY_PHARMA: 'Nifty Pharma',
  NSE_INDEX_NIFTY_FMCG: 'Nifty FMCG',
  NSE_INDEX_NIFTY_METAL: 'Nifty Metal',
  NSE_INDEX_NIFTY_REALTY: 'Nifty Realty',
  NSE_INDEX_NIFTY_ENERGY: 'Nifty Energy',
  NSE_INDEX_NIFTY_INFRASTRUCTURE: 'Nifty Infrastructure',
  NSE_INDEX_NIFTY_PRIVATE_BANK: 'Nifty Private Bank',
  NSE_INDEX_NIFTY_PSU_BANK: 'Nifty PSU Bank',
  NSE_INDEX_NIFTY_FIN_SERVICE: 'Nifty Financial Services',
  NSE_INDEX_NIFTY_CAPITAL_MARKETS: 'Nifty Capital Markets',
  '^CNXMETAL': 'Nifty Metal',
  '^CNXPHARMA': 'Nifty Pharma',
  '^CNXAUTO': 'Nifty Auto',
  '^CNXMEDIA': 'Nifty Media',
  '^CNXREALTY': 'Nifty Realty',
  '^CNXIT': 'Nifty IT',
  '^CNXFMCG': 'Nifty FMCG',
  '^CNXENERGY': 'Nifty Energy',
};

/** Display label for an NSE/BSE index symbol/code (falls back to humanizeCode). */
export function indexLabel(code: unknown): string {
  if (code === null || code === undefined) return '';
  const raw = String(code).trim();
  const key = raw.toUpperCase();
  return INDEX_LABELS[raw] || INDEX_LABELS[key] || humanizeCode(raw);
}

/**
 * The headline indices a trader expects on the market-overview surface, in order.
 * Used to curate "Top indices" away from obscure inverse/midsmall niche indices.
 * Match against a row's raw symbol/code via `isHeadlineIndex`.
 */
export const HEADLINE_INDEX_KEYS = [
  '^NSEI', 'NSE_INDEX_NIFTY_50', 'NSE_INDEX_NIFTY50',
  '^NSEBANK', 'NSE_INDEX_NIFTY_BANK',
  '^BSESN',
  'NSE_INDEX_NIFTY_NEXT_50',
  'NSE_INDEX_NIFTY_MIDCAP_100',
  'NSE_INDEX_NIFTY_IT',
  'NSE_INDEX_NIFTY_BANK',
  'NSE_INDEX_NIFTY_FIN_SERVICE',
  'NSE_INDEX_NIFTY_AUTO',
  'NSE_INDEX_NIFTY_PHARMA',
  'NSE_INDEX_NIFTY_FMCG',
  'NSE_INDEX_NIFTY_ENERGY',
  'NSE_INDEX_NIFTY_METAL',
];

/** True if a raw index symbol/code is a headline index (not an inverse/niche slice). */
export function isHeadlineIndex(code: unknown): boolean {
  if (!code) return false;
  const key = String(code).trim().toUpperCase();
  if (/(_PR_|_TR_|INVERSE|_1X_|_2X_|_3X_|MIDSMALL|HIGH_BETA|LOW_VOL|VOLATILITY|EQUAL_WEIGHT|ALPHA|QUALITY_30|VALUE_20)/.test(key)) {
    return false;
  }
  return HEADLINE_INDEX_KEYS.some((k) => k.toUpperCase() === key);
}
