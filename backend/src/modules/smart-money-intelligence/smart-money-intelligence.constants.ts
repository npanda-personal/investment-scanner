import type { InsiderOwnershipSummary, SmartMoneyRange } from './smart-money-intelligence.types';

/**
 * Structural (non-market-tuned) constants for the smart-money module.
 *
 * Market-CALIBRATED knobs (score thresholds, volume ratios, sector bands) live in
 * `smart-money-intelligence.config.ts` so they can be tuned per region/asset class
 * at runtime. The values here are structural: range windows, refresh plumbing, and
 * the fixed signal weights that define what each price-volume pattern is "worth".
 */

/** Trading-day windows backing each range label. */
export const RANGE_LIMITS: Record<SmartMoneyRange, number> = { '1M': 35, '3M': 90, '6M': 180 };

/** Ranges materialised on every refresh run. */
export const SMART_MONEY_REFRESH_RANGES: SmartMoneyRange[] = ['1M', '3M', '6M'];

/** Default scope when a request does not specify one (India-equity first product). */
export const SMART_MONEY_DEFAULT_REGION = 'IN';
export const SMART_MONEY_DEFAULT_ASSET_TYPE = 'STOCK';

/**
 * Bound refresh concurrency to <=4 so smart-money stays within connection_limit=10
 * even when running concurrently with other pipeline stages.
 */
export const SMART_MONEY_REFRESH_CONCURRENCY = 4;

/** Hard ceiling on a single refresh page. */
export const SMART_MONEY_MAX_PAGE_SIZE = 100;

/** Score formula: baseline 50, +/- coefficient * net signal strength, clamped 0-100. */
export const SCORE_BASELINE = 50;
export const SCORE_STRENGTH_COEFFICIENT = 0.5;

/**
 * Fixed signal weights (structural — they define the relative importance of each
 * price-volume pattern, independent of market). Tunable thresholds that DECIDE
 * whether a signal fires live in the scoring config instead.
 */
export const SIGNAL_STRENGTHS = {
  unusualVolume: 15,
  priceUpHighVolume: 20,
  priceDownHighVolume: 20,
  closeNearHigh: 15,
  closeNearLow: 15,
  multiDayAccumulation: 25,
  multiDayDistribution: 25,
  /** Range-pressure signal: base + scaled bonus, capped at max. */
  rangePressureBase: 12,
  rangePressureMax: 30,
  /** High-volume day-skew signal: base + scaled bonus, capped at max. */
  highVolumeSkewBase: 8,
  highVolumeSkewMax: 15,
} as const;

/** Close-position thresholds inside the day's range for near-high / near-low signals. */
export const CLOSE_NEAR_HIGH_THRESHOLD = 0.75;
export const CLOSE_NEAR_LOW_THRESHOLD = 0.25;

/** Recent-window length and minimum elevated-volume days for the multi-day signals. */
export const MULTI_DAY_WINDOW = 6;
export const MULTI_DAY_MIN_DAYS = 3;

/** Single, canonical "ownership not configured" placeholder (free MVP has no provider). */
export const MISSING_OWNERSHIP: InsiderOwnershipSummary = {
  insiderBuyCount: null,
  insiderSellCount: null,
  netInsiderActivity: null,
  institutionalOwnershipPercent: null,
  ownershipDataStatus: 'MISSING',
  source: 'not-configured',
  explanation: 'Free insider and institutional ownership provider is not configured for the MVP.',
};

/** Build a fresh copy of the missing-ownership placeholder (avoids shared-reference mutation). */
export function missingOwnership(): InsiderOwnershipSummary {
  return { ...MISSING_OWNERSHIP };
}
