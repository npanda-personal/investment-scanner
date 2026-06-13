/**
 * Pure scoring functions for the Data Quality Engine.
 *
 * Every weight, band and cutoff is read from the injected `DataQualityConfig`
 * rather than hardcoded, so coverage/readiness/liquidity scoring adapts to the
 * selected region and asset type. With the DEFAULT (IN/STOCK) config these
 * produce identical results to the previous inline implementation.
 */
import type { DataQualityConfig } from './data-quality-engine.config';
import type {
  CoverageStatus,
  FundamentalsCoverageTier,
  LiquidityStatus,
  PriceForQuality,
  SignalReadinessStatus,
} from './data-quality-engine.types';
import { average, median, optionalNumber } from './data-quality-engine.utils';

export interface InstrumentMetadata {
  sector: string | null;
  industry?: string | null;
  country: string | null;
  currency?: string | null;
}

export function coverageScore(
  meta: InstrumentMetadata,
  priceCount: number,
  latest: PriceForQuality | null,
  stale: boolean,
  fundamentalsCount: number,
  actionsCount: number,
  volumeCount: number,
  adjustedFallbackCount: number,
  config: DataQualityConfig,
): number {
  const w = config.coverageWeights;
  let score = 0;
  score += Math.min(w.priceHistoryMax, (priceCount / w.priceHistoryFullBars) * w.priceHistoryMax);
  if (latest && !stale) score += w.latestFresh;
  else if (latest) score += w.latestStale;
  if (fundamentalsCount > 0) score += w.fundamentals;
  if (actionsCount > 0) score += w.corporateActions;
  if (meta.sector) score += w.sector;
  if (meta.industry) score += w.industry;
  if (meta.country) score += w.country;
  if (meta.currency) score += w.currency;
  if (volumeCount > 0) score += w.volume;
  if (adjustedFallbackCount === 0 && priceCount > 0) score += w.adjustedClean;
  return Math.round(Math.min(100, score));
}

export function readinessScore(
  priceCount: number,
  stale: boolean,
  volumeCount: number,
  meta: Pick<InstrumentMetadata, 'sector' | 'country'>,
  liquidityScore: number,
  config: DataQualityConfig,
): number {
  const w = config.readinessWeights;
  let score = 0;
  if (priceCount >= w.rsiBars) score += w.rsiPoints;
  if (priceCount >= w.sma50Bars) score += w.sma50Points;
  if (priceCount >= w.sma200Bars) score += w.sma200Points;
  if (!stale) score += w.notStale;
  if (volumeCount > 0) score += w.volume;
  if (meta.sector) score += w.sector;
  if (meta.country) score += w.country;
  score += Math.min(w.liquidityMax, liquidityScore / w.liquidityDivisor);
  return Math.round(Math.min(100, score));
}

export function coverageStatus(score: number, config: DataQualityConfig): CoverageStatus {
  const c = config.coverageStatus;
  if (score >= c.good) return 'GOOD';
  if (score >= c.partial) return 'PARTIAL';
  if (score >= c.poor) return 'POOR';
  return 'UNUSABLE';
}

export function readinessStatus(score: number, config: DataQualityConfig): SignalReadinessStatus {
  const c = config.readinessStatus;
  if (score >= c.ready) return 'READY';
  if (score >= c.limited) return 'LIMITED';
  return 'NOT_READY';
}

export function calculateLiquidity(
  prices: PriceForQuality[],
  config: DataQualityConfig,
): { score: number; status: LiquidityStatus } {
  const l = config.liquidity;
  const recent = prices.slice(0, l.recentWindow);
  const volumes = recent
    .map((price) => optionalNumber(price.volume))
    .filter((value): value is number => value !== null);
  if (volumes.length === 0) return { score: 0, status: 'UNKNOWN' };

  const window = volumes.slice(0, l.averagingWindow);
  const avg = average(window) ?? 0;
  const med = median(window) ?? 0;
  const zeroRatio = volumes.filter((value) => value <= 0).length / volumes.length;

  let score = l.baseScore;
  const band = l.volumeBands.find((b) => avg > b.minAverageVolume);
  if (band) score += band.bonus;
  if (med > 0) score += l.positiveMedianBonus;
  score -= zeroRatio * l.zeroVolumePenaltyFactor;
  if (volumes.length >= l.sampleBonusMinCount) score += l.sampleBonus;

  score = Math.round(Math.max(0, Math.min(100, score)));
  const status: LiquidityStatus =
    score >= l.liquidMinScore ? 'LIQUID' : score >= l.thinMinScore ? 'THIN' : 'ILLIQUID';
  return { score, status };
}

/**
 * Classify fundamentals depth into a coverage tier by counting distinct fiscal
 * periods (periodEndDate). Boundaries come from config.
 */
export function fundamentalsCoverageTierFor(
  fundamentals: any[],
  config: DataQualityConfig,
): { tier: FundamentalsCoverageTier; periodCount: number } {
  if (fundamentals.length === 0) return { tier: 'NONE', periodCount: 0 };
  const distinctDates = new Set(
    fundamentals
      .map((record) => record.period_end_date ?? record.periodEndDate)
      .filter((date) => date != null)
      .map((date) => (date instanceof Date ? date.toISOString().slice(0, 10) : String(date).slice(0, 10))),
  );
  const periodCount = distinctDates.size;
  const { deepMinPeriods, adequateMinPeriods } = config.fundamentalsTier;
  const tier: FundamentalsCoverageTier =
    periodCount >= deepMinPeriods ? 'DEEP' : periodCount >= adequateMinPeriods ? 'ADEQUATE' : 'SHALLOW';
  return { tier, periodCount };
}
