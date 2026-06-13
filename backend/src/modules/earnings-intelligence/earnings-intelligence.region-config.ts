/**
 * Per-region configuration for Earnings-Intelligence.
 *
 * Every tuning constant that used to be a module-level literal in the service —
 * category windows, the price-reaction session count, the fallback result-date
 * cadence, freshness thresholds, the pre-result interest heuristics, and the
 * repository data-load windows — now lives here, keyed by region.  This is what
 * makes the engine region-aware: when the caller scopes to US, the US row uses
 * US cadence/windows rather than the NSE-tuned defaults that were previously
 * baked in for every market.
 *
 * The registry is the single allow-list of earnings-capable regions.  Adding a
 * new market (e.g. another European exchange) is a one-object change here with no
 * edits to the engine, repository, or controller — that is the "configurable
 * files for runtime injection" the owner asked for.  `EarningsIntelligenceService`
 * accepts a resolver so tests and callers can inject bespoke configs at runtime.
 */

export interface EarningsRegionConfig {
  /** Region code, uppercase (matches Stock.region). */
  region: string;
  /** Human-readable market label. */
  label: string;
  /** Default asset type for this region when the caller omits one. */
  defaultAssetType: string;

  // ── Category windows ──────────────────────────────────────────────────────
  /** Max days ahead of the snapshot for a confirmed date to count as UPCOMING. */
  upcomingWindowDays: number;
  /** Max days after a confirmed result for it to count as a RECENT result. */
  recentResultWindowDays: number;

  // ── Price reaction ────────────────────────────────────────────────────────
  /** Trading sessions after the result used as the "after" bar for reaction. */
  priceReactionSessions: number;

  // ── Fallback (estimated) result-date cadence ──────────────────────────────
  /** Months added to a quarter/TTM period end to estimate the next result. */
  quarterlyCadenceMonths: number;
  /** Extra days after the next quarter end when results are typically announced. */
  quarterlyCadenceLagDays: number;
  /** Months added to an annual period end to estimate the next result. */
  annualCadenceMonths: number;
  /** Extra days after the next year end when annual results are announced. */
  annualCadenceLagDays: number;

  // ── Freshness thresholds (age of the latest period end, in days) ──────────
  freshnessFreshMaxDays: number;
  freshnessPartialMaxDays: number;

  // ── Pre-result interest heuristics ────────────────────────────────────────
  /** Bars looked back for the pre-result price move. */
  preResultPriceMoveLookbackBars: number;
  /** Pre-result price move (%) that flags interest. */
  preResultPriceMoveThresholdPercent: number;
  /** Absolute delivery % that flags pre-result delivery interest. */
  deliveryInterestAbsolutePercent: number;
  /** Delivery % above the trailing average that flags interest. */
  deliveryInterestRelativePercent: number;

  // ── Repository data-load windows ──────────────────────────────────────────
  /** How far back to load price history for reaction/pre-result maths. */
  priceHistoryLookbackDays: number;
  /** How far back to load delivery snapshots. */
  deliveryLookbackDays: number;
}

export const DEFAULT_EARNINGS_REGION = 'IN';
export const DEFAULT_EARNINGS_ASSET_TYPE = 'STOCK';

/**
 * India (NSE/BSE).  These values reproduce the engine's previous hard-coded
 * constants exactly, so the IN snapshot is byte-for-byte unchanged by the
 * region-config refactor.  NSE Q4FY results land ~45–75 days after the 31-Mar
 * period end, hence the 90-day upcoming window and the +3m+45d quarterly cadence.
 */
const IN_CONFIG: EarningsRegionConfig = {
  region: 'IN',
  label: 'India (NSE/BSE)',
  defaultAssetType: 'STOCK',
  upcomingWindowDays: 90,
  recentResultWindowDays: 60,
  priceReactionSessions: 5,
  quarterlyCadenceMonths: 3,
  quarterlyCadenceLagDays: 45,
  annualCadenceMonths: 12,
  annualCadenceLagDays: 60,
  freshnessFreshMaxDays: 120,
  freshnessPartialMaxDays: 240,
  preResultPriceMoveLookbackBars: 10,
  preResultPriceMoveThresholdPercent: 3,
  deliveryInterestAbsolutePercent: 55,
  deliveryInterestRelativePercent: 10,
  priceHistoryLookbackDays: 420,
  deliveryLookbackDays: 120,
};

/**
 * United States (SEC).  US 10-Q filings land ~40 days after quarter end and
 * 10-K ~60 days after fiscal year end; delivery-% has no US analogue, so its
 * thresholds are inert (no delivery snapshots are ever loaded for US scope).
 */
const US_CONFIG: EarningsRegionConfig = {
  region: 'US',
  label: 'United States (SEC)',
  defaultAssetType: 'STOCK',
  upcomingWindowDays: 90,
  recentResultWindowDays: 60,
  priceReactionSessions: 5,
  quarterlyCadenceMonths: 3,
  quarterlyCadenceLagDays: 40,
  annualCadenceMonths: 12,
  annualCadenceLagDays: 60,
  freshnessFreshMaxDays: 120,
  freshnessPartialMaxDays: 240,
  preResultPriceMoveLookbackBars: 10,
  preResultPriceMoveThresholdPercent: 3,
  deliveryInterestAbsolutePercent: 55,
  deliveryInterestRelativePercent: 10,
  priceHistoryLookbackDays: 420,
  deliveryLookbackDays: 120,
};

/**
 * Europe (placeholder for the in-progress EU rollout).  EU issuers report on a
 * slower cadence (half-yearly is common; annual reports land up to ~4 months
 * after year end), so the fallback cadence lags are wider.  Present here purely
 * so EU becomes a config entry, not an engine change, when the rollout lands.
 */
const EU_CONFIG: EarningsRegionConfig = {
  region: 'EU',
  label: 'Europe',
  defaultAssetType: 'STOCK',
  upcomingWindowDays: 120,
  recentResultWindowDays: 75,
  priceReactionSessions: 5,
  quarterlyCadenceMonths: 3,
  quarterlyCadenceLagDays: 60,
  annualCadenceMonths: 12,
  annualCadenceLagDays: 120,
  freshnessFreshMaxDays: 150,
  freshnessPartialMaxDays: 300,
  preResultPriceMoveLookbackBars: 10,
  preResultPriceMoveThresholdPercent: 3,
  deliveryInterestAbsolutePercent: 55,
  deliveryInterestRelativePercent: 10,
  priceHistoryLookbackDays: 420,
  deliveryLookbackDays: 120,
};

/** The registry — the single allow-list of earnings-capable regions. */
export const EARNINGS_REGION_CONFIGS: Readonly<Record<string, EarningsRegionConfig>> = {
  IN: IN_CONFIG,
  US: US_CONFIG,
  EU: EU_CONFIG,
};

/** Resolver signature so the service can take an injected config source. */
export type EarningsRegionConfigResolver = (region: string) => EarningsRegionConfig;

/** Normalise an arbitrary region input to an uppercase code. */
export function normalizeRegionCode(region: string | null | undefined): string {
  const text = String(region ?? '').trim().toUpperCase();
  return text.length > 0 ? text : DEFAULT_EARNINGS_REGION;
}

/** True when the region has a dedicated, tuned earnings config. */
export function isSupportedEarningsRegion(region: string | null | undefined): boolean {
  return Object.prototype.hasOwnProperty.call(EARNINGS_REGION_CONFIGS, normalizeRegionCode(region));
}

/** Every region code the engine has tuned config for. */
export function supportedEarningsRegions(): string[] {
  return Object.keys(EARNINGS_REGION_CONFIGS);
}

/**
 * Resolve the config for a region.  Unknown regions fall back to the default
 * (IN) config with the region code overwritten, so the engine degrades
 * gracefully (a computable-but-default-tuned snapshot) rather than throwing —
 * the read API surfaces an "unconfigured region" warning instead.
 */
export function getEarningsRegionConfig(region: string | null | undefined): EarningsRegionConfig {
  const code = normalizeRegionCode(region);
  const config = EARNINGS_REGION_CONFIGS[code];
  if (config) return config;
  return { ...EARNINGS_REGION_CONFIGS[DEFAULT_EARNINGS_REGION], region: code };
}
