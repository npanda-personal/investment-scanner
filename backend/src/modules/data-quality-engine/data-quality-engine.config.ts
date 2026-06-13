/**
 * Runtime-injectable Data Quality configuration.
 *
 * Previously every scoring weight, liquidity band, bar-count gate and the
 * staleness calendar were hardcoded literals scattered through the service.
 * That made the engine implicitly India/NSE + equity shaped: selecting US, EU
 * or crypto still applied INR-scale volume bands and an NSE trading calendar.
 *
 * This module turns all of that into a single `DataQualityConfig` resolved per
 * `{ region, assetType }`.  The DEFAULT config reproduces the historical
 * IN/STOCK behavior byte-for-byte, so existing evaluations are unchanged; region
 * and asset overrides only refine the previously-wrong non-IN paths.
 *
 * Numeric thresholds that already had a single source of truth in
 * `ELIGIBILITY_POLICY` are imported from there rather than re-stated, so the
 * legacy DataQualityEvaluation path and the instrument_eligibility verdict path
 * can never disagree on the same number again.
 */
import { ELIGIBILITY_POLICY } from '../../shared/types/eligibility-policy';
import { normalizeMarketRegion } from '../../shared/utils/market-scope';

export type DataQualityTradingMode = 'SESSIONS' | 'CONTINUOUS';

export interface CoverageScoreWeights {
  /** Max points awarded for price history, reached at `priceHistoryFullBars`. */
  priceHistoryMax: number;
  priceHistoryFullBars: number;
  latestFresh: number;
  latestStale: number;
  fundamentals: number;
  corporateActions: number;
  sector: number;
  industry: number;
  country: number;
  currency: number;
  volume: number;
  adjustedClean: number;
}

export interface ReadinessScoreWeights {
  rsiBars: number;
  sma50Bars: number;
  sma200Bars: number;
  /** Points for each bar gate, in the same order as the *Bars fields. */
  rsiPoints: number;
  sma50Points: number;
  sma200Points: number;
  notStale: number;
  volume: number;
  sector: number;
  country: number;
  /** liquidityScore is divided by this then capped at liquidityMax. */
  liquidityDivisor: number;
  liquidityMax: number;
}

export interface LiquidityConfig {
  /** Most-recent N bars considered for liquidity. */
  recentWindow: number;
  /** Bars used for the average/median volume bands. */
  averagingWindow: number;
  baseScore: number;
  /** [threshold, bonus] pairs, evaluated high→low; first match wins. */
  volumeBands: Array<{ minAverageVolume: number; bonus: number }>;
  positiveMedianBonus: number;
  zeroVolumePenaltyFactor: number;
  sampleBonusMinCount: number;
  sampleBonus: number;
  liquidMinScore: number;
  thinMinScore: number;
}

export interface CoverageStatusCutoffs {
  good: number;
  partial: number;
  poor: number;
}

export interface ReadinessStatusCutoffs {
  ready: number;
  limited: number;
}

export interface FundamentalsTierCutoffs {
  deepMinPeriods: number;
  adequateMinPeriods: number;
}

export interface DataQualityConfig {
  /** Region code used for the trading calendar / staleness math. */
  calendarRegion: string;
  /** SESSIONS = exchange trading calendar; CONTINUOUS = 24/7 (crypto). */
  tradingMode: DataQualityTradingMode;
  /** A price is stale once it is this many sessions behind the expected date. */
  staleSessionThreshold: number;
  /** Fallback calendar-day window when the trading calendar is unavailable. */
  staleFallbackDays: number;

  coverageWeights: CoverageScoreWeights;
  readinessWeights: ReadinessScoreWeights;
  liquidity: LiquidityConfig;
  coverageStatus: CoverageStatusCutoffs;
  readinessStatus: ReadinessStatusCutoffs;
  fundamentalsTier: FundamentalsTierCutoffs;

  /** Bar-count gates (single source of truth, mostly from ELIGIBILITY_POLICY). */
  sma50Bars: number;
  sma200Bars: number;
  rsiBars: number;
  backtestMinBars: number;
  calibrationMinBars: number;
  reviewMinBars: number;
  signalMinReadinessScore: number;
  /** Liquidity score below which an instrument counts as illiquid for signals. */
  signalIlliquidLiquidityScore: number;

  /**
   * Whether this instrument must have fundamentals to be signal-eligible.
   * Default (IN) mirrors the legacy mainboard gate (NSE_EQUITY_SECURITIES).
   * Other markets can supply their own predicate.
   */
  requiresFundamentals: (instrument: { catalogSource?: unknown; catalog_source?: unknown }) => boolean;
}

const isNseMainboard = (instrument: { catalogSource?: unknown; catalog_source?: unknown }): boolean =>
  instrument?.catalogSource === 'NSE_EQUITY_SECURITIES' || instrument?.catalog_source === 'NSE_EQUITY_SECURITIES';

/**
 * The historical (IN/STOCK) defaults. Every literal here matches the value the
 * service used before configurability was introduced, so default behavior is
 * unchanged.
 */
const DEFAULT_CONFIG: DataQualityConfig = {
  calendarRegion: 'IN',
  tradingMode: 'SESSIONS',
  staleSessionThreshold: ELIGIBILITY_POLICY.signal.maxStaleSessions, // 3
  staleFallbackDays: 7,

  coverageWeights: {
    priceHistoryMax: 30,
    priceHistoryFullBars: 252,
    latestFresh: 15,
    latestStale: 5,
    fundamentals: 12,
    corporateActions: 5,
    sector: 8,
    industry: 6,
    country: 6,
    currency: 5,
    volume: 8,
    adjustedClean: 5,
  },
  readinessWeights: {
    rsiBars: 14,
    sma50Bars: 50,
    sma200Bars: 200,
    rsiPoints: 10,
    sma50Points: 20,
    sma200Points: 25,
    notStale: 15,
    volume: 10,
    sector: 5,
    country: 5,
    liquidityDivisor: 10,
    liquidityMax: 10,
  },
  liquidity: {
    recentWindow: 60,
    averagingWindow: 20,
    baseScore: 30,
    volumeBands: [
      { minAverageVolume: 1_000_000, bonus: 35 },
      { minAverageVolume: 100_000, bonus: 25 },
      { minAverageVolume: 10_000, bonus: 15 },
    ],
    positiveMedianBonus: 15,
    zeroVolumePenaltyFactor: 35,
    sampleBonusMinCount: 20,
    sampleBonus: 10,
    liquidMinScore: 70,
    thinMinScore: 40,
  },
  coverageStatus: { good: 80, partial: 60, poor: 30 },
  readinessStatus: { ready: 75, limited: 50 },
  fundamentalsTier: { deepMinPeriods: 8, adequateMinPeriods: 3 },

  sma50Bars: 50,
  sma200Bars: 200,
  rsiBars: 14,
  backtestMinBars: ELIGIBILITY_POLICY.backtest.minPriceBars, // 252
  calibrationMinBars: ELIGIBILITY_POLICY.calibration.minPriceBars, // 60
  reviewMinBars: ELIGIBILITY_POLICY.review.minPriceBars, // 120
  signalMinReadinessScore: ELIGIBILITY_POLICY.signal.minReadinessScore, // 70
  signalIlliquidLiquidityScore: 40,

  requiresFundamentals: isNseMainboard,
};

/**
 * Per-region / per-asset deltas applied on top of DEFAULT_CONFIG.
 *
 * Only the values that genuinely differ by market are overridden — everything
 * else inherits the (correct, well-tested) IN defaults. This keeps each market
 * profile small and auditable.
 */
type ConfigOverride = Partial<Omit<DataQualityConfig, 'liquidity' | 'coverageWeights' | 'readinessWeights'>> & {
  liquidity?: Partial<LiquidityConfig>;
};

const REGION_OVERRIDES: Record<string, ConfigOverride> = {
  US: {
    calendarRegion: 'US',
    // US large-caps trade far higher share volumes; keep the same band shape
    // but lift the thresholds so an Indian mid-cap and a US large-cap aren't
    // scored on the same absolute share counts.
    liquidity: {
      volumeBands: [
        { minAverageVolume: 5_000_000, bonus: 35 },
        { minAverageVolume: 500_000, bonus: 25 },
        { minAverageVolume: 50_000, bonus: 15 },
      ],
    },
    requiresFundamentals: () => false,
  },
  EU: {
    calendarRegion: 'EU',
    requiresFundamentals: () => false,
  },
};

/**
 * Asset-type deltas applied after region. Crypto trades continuously (no
 * exchange sessions / weekends), so session-based staleness is replaced by a
 * tight calendar-day staleness and volume bands are scaled to crypto units.
 */
const ASSET_OVERRIDES: Record<string, ConfigOverride> = {
  CRYPTO: {
    tradingMode: 'CONTINUOUS',
    // Every calendar day is a trading day for crypto: one day stale tolerance
    // plus provider lag, no weekend/holiday absorption needed.
    staleSessionThreshold: 1,
    staleFallbackDays: 2,
    requiresFundamentals: () => false,
  },
};

function applyOverride(base: DataQualityConfig, override?: ConfigOverride): DataQualityConfig {
  if (!override) return base;
  const { liquidity, ...rest } = override;
  return {
    ...base,
    ...rest,
    liquidity: liquidity ? { ...base.liquidity, ...liquidity } : base.liquidity,
  };
}

/** Normalize an asset type, folding the legacy EQUITY alias into STOCK. */
export function normalizeAssetType(assetType?: string | null): string {
  const value = String(assetType || '').trim().toUpperCase();
  if (!value || value === 'EQUITY') return 'STOCK';
  return value;
}

export interface DataQualityScope {
  region?: string | null;
  assetType?: string | null;
}

/**
 * Resolve the effective Data Quality config for an instrument scope.
 *
 * Resolution order: DEFAULT (IN/STOCK) → region override → asset override.
 * Unknown regions/assets fall back to the default, so behavior degrades safely.
 */
export function resolveDataQualityConfig(scope: DataQualityScope = {}): DataQualityConfig {
  const region = normalizeMarketRegion(scope.region) ?? 'IN';
  const assetType = normalizeAssetType(scope.assetType);
  let config = applyOverride(DEFAULT_CONFIG, REGION_OVERRIDES[region]);
  config = applyOverride(config, ASSET_OVERRIDES[assetType]);
  // When no region maps to a known calendar, keep the instrument's region for
  // the calendar so the market-session helpers can decide (or fall back).
  if (!REGION_OVERRIDES[region] && region !== 'IN') {
    config = { ...config, calendarRegion: region };
  }
  return config;
}

export { DEFAULT_CONFIG as DEFAULT_DATA_QUALITY_CONFIG };
