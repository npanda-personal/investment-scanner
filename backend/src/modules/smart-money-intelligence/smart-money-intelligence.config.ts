import { resolveMarketProfile } from '../../shared/utils/market-profile';
import { SMART_MONEY_DEFAULT_ASSET_TYPE, SMART_MONEY_DEFAULT_REGION } from './smart-money-intelligence.constants';

/**
 * Runtime-injectable, per-market scoring configuration.
 *
 * Smart-money scoring used to bake India-NSE-calibrated thresholds (sector bands
 * tuned to the observed NSE 41–59 score spread, 1.2x/1.5x volume ratios, 70/35
 * status cutoffs) directly into the engine, applied region-blind. That made a
 * US/EU scope silently score against India calibration.
 *
 * This config externalises every market-CALIBRATED knob and resolves it from the
 * shared `MarketProfile` (the project's single source of truth for per-market
 * behaviour). Region overrides plug in here as calibration data becomes available;
 * until then non-IN equity scopes inherit the documented default baseline rather
 * than fabricating uncalibrated thresholds.
 */
export interface SmartMoneyScoringConfig {
  /** Normalised region this config was resolved for (IN | US | EU | GLOBAL). */
  region: string;
  /** Normalised asset class this config was resolved for (STOCK, ETF, ...). */
  assetType: string;

  // ── Data sufficiency ──────────────────────────────────────────────────────
  /** Minimum price bars before accumulation/distribution can be inferred. */
  minBars: number;
  /** Minimum usable prior-day volume observations in the 20-day lookback. */
  minPriorVolumeObservations: number;

  // ── Stock status thresholds (on the 0-100 smart-money score) ───────────────
  /** score >= this → ACCUMULATION. */
  accumulationScoreThreshold: number;
  /** score <= this → DISTRIBUTION. */
  distributionScoreThreshold: number;

  // ── Volume ratios vs the 20-day average ────────────────────────────────────
  /** "High" volume multiple — gates the directional price-volume signals. */
  highVolumeRatio: number;
  /** "Unusual" volume multiple — gates the standalone unusual-volume signal. */
  unusualVolumeRatio: number;
  /** "Elevated" volume multiple — gates multi-day and range day-skew signals. */
  elevatedVolumeRatio: number;

  // ── Sector 5-band classification (on the sector average score) ─────────────
  sectorBands: {
    strongAccumulation: number;
    accumulating: number;
    neutralFloor: number;
    distributing: number;
  };
  /** Below this instrument count a sector cannot carry an extreme STRONG_* verdict. */
  minUniverseForStrongVerdict: number;

  // ── List screen cutoffs (top / distribution) ───────────────────────────────
  /** Accumulation list includes status=ACCUMULATION OR score >= this. */
  accumulationListScoreFloor: number;
  /** Distribution list includes status=DISTRIBUTION OR score <= this. */
  distributionListScoreCeil: number;
}

/** Market-tunable knobs (everything except the resolved region/assetType labels). */
export type SmartMoneyScoringTunables = Omit<SmartMoneyScoringConfig, 'region' | 'assetType'>;

/**
 * Default equity baseline.
 *
 * These are the values smart-money has always used (calibrated against NSE as of
 * 2026-06). They remain the default for every equity market until a region supplies
 * its own calibrated override below, so India behaviour is byte-identical.
 */
export const DEFAULT_EQUITY_SCORING: SmartMoneyScoringTunables = {
  minBars: 21,
  minPriorVolumeObservations: 18,
  accumulationScoreThreshold: 70,
  distributionScoreThreshold: 35,
  highVolumeRatio: 1.2,
  unusualVolumeRatio: 1.5,
  elevatedVolumeRatio: 1.1,
  sectorBands: { strongAccumulation: 62, accumulating: 56, neutralFloor: 48, distributing: 38 },
  minUniverseForStrongVerdict: 3,
  accumulationListScoreFloor: 60,
  distributionListScoreCeil: 40,
};

/**
 * Per-region calibration overrides. Empty for now: US/EU intentionally inherit the
 * documented default baseline rather than uncalibrated guesses. When a market is
 * calibrated, add a partial override here (e.g. US: { sectorBands: {...} }) — no
 * engine code changes required.
 */
const REGION_SCORING_OVERRIDES: Record<string, Partial<SmartMoneyScoringTunables>> = {
  // US: { ... },  EU: { ... },  // plug in calibrated thresholds here
};

/**
 * Resolve the scoring config for a given scope. Region/asset normalisation flows
 * through the shared MarketProfile so smart-money branches on the same canonical
 * region the rest of the platform uses.
 */
export function resolveSmartMoneyConfig(region?: string | null, assetType?: string | null): SmartMoneyScoringConfig {
  const profile = resolveMarketProfile({ region, assetType });
  const override = REGION_SCORING_OVERRIDES[profile.region] ?? {};
  return {
    region: profile.region,
    assetType: profile.assetClass,
    ...DEFAULT_EQUITY_SCORING,
    ...override,
    sectorBands: { ...DEFAULT_EQUITY_SCORING.sectorBands, ...(override.sectorBands ?? {}) },
  };
}

/** The default config (India-equity baseline) used for bare/on-the-fly scoring calls. */
export const DEFAULT_SMART_MONEY_CONFIG: SmartMoneyScoringConfig = resolveSmartMoneyConfig(
  SMART_MONEY_DEFAULT_REGION,
  SMART_MONEY_DEFAULT_ASSET_TYPE,
);
