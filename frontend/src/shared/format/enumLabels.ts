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

/** Generic SCREAMING_SNAKE / kebab / dotted code -> Title Case words. */
export function humanizeCode(code: unknown): string {
  if (code === null || code === undefined) return '';
  const raw = String(code).trim();
  if (!raw) return '';
  // Already human (has a space and a lowercase letter) -> leave as-is.
  if (/\s/.test(raw) && /[a-z]/.test(raw)) return raw;
  return raw
    .replace(/^\^/, '') // strip ^ index prefix (e.g. ^CNXMETAL)
    .replace(/^(NSE_INDEX_|NSE_|BSE_)/i, '')
    .replace(/[_\-.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\b([a-z])/g, (_m, c: string) => c.toUpperCase())
    // keep common acronyms upper
    .replace(/\b(It|Pe|Eps|Roe|Roce|Pr|Tr|Etf|Reit|Sme|Fno|F&o|Nifty|Sensex|Rsi|Sma|Adx|Iq|Ai|Us|Uk|Dii|Fii|Rbi)\b/gi,
      (m: string) => m.toUpperCase());
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
