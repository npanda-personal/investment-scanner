/**
 * Single source of truth for page-cache keys. Imported by BOTH the read-through controllers
 * and the CACHE_WARM pipeline stage so the two can never drift.
 *
 * Builders take the already-resolved scope values (exactly what the controller passes to the
 * underlying service) and stringify them — they do NOT re-normalize. This guarantees the cache
 * key always matches the input that produced the cached payload. The `v1` prefix lets a
 * response-shape change invalidate everything with a one-line bump.
 */
const PREFIX = 'cache:v1';

const val = (v: unknown): string => {
  if (v === undefined || v === null || v === '') return '_';
  if (typeof v === 'boolean') return v ? '1' : '0';
  return String(v);
};

export const convictionKey = (s: { region?: string; assetType?: string; onlyFnoEligible?: boolean }): string =>
  `${PREFIX}:conviction:region=${val(s.region)}:assetType=${val(s.assetType)}:fno=${val(!!s.onlyFnoEligible)}`;

export const stockInterestKey = (s: { region: string; assetType: string }): string =>
  `${PREFIX}:stock-interest:region=${val(s.region)}:assetType=${val(s.assetType)}`;

export const sectorRotationKey = (s: { region: string; assetType: string }): string =>
  `${PREFIX}:sector-rotation:region=${val(s.region)}:assetType=${val(s.assetType)}`;

export const todayReviewKey = (s: {
  region?: string;
  assetType?: string;
  enrich?: boolean;
  limit?: number;
  offset?: number;
}): string =>
  `${PREFIX}:today-review:region=${val(s.region)}:assetType=${val(s.assetType)}:enrich=${
    s.enrich === false ? '0' : '1'
  }:limit=${val(s.limit)}:offset=${val(s.offset)}`;

export const marketContextSummaryKey = (region: string): string =>
  `${PREFIX}:market-context-summary:region=${val(region)}`;

export const marketPulseKey = (s: { region: string; assetType: string; timeframe: string }): string =>
  `${PREFIX}:market-pulse:region=${val(s.region)}:assetType=${val(s.assetType)}:timeframe=${val(s.timeframe)}`;

export const screenerKeyPrefix = `${PREFIX}:screener:`;
export const screenerKey = (s: {
  region?: string; assetType?: string; signalDirection?: string; setup?: string;
  minScore?: number; minRsPercentile?: number; sector?: string;
  capBand?: string; minDeliveryPct?: number; min52wPositionPct?: number;
  excludeFnoBan?: boolean; onlyDerivativesEligible?: boolean; limit?: number;
}): string =>
  `${screenerKeyPrefix}region=${val(s.region)}:assetType=${val(s.assetType)}` +
  `:dir=${val(s.signalDirection)}:setup=${val(s.setup)}:minScore=${val(s.minScore)}` +
  `:minRsP=${val(s.minRsPercentile)}:sector=${val(s.sector)}` +
  `:cap=${val(s.capBand)}:minDel=${val(s.minDeliveryPct)}` +
  `:min52w=${val(s.min52wPositionPct)}:exFno=${val(!!s.excludeFnoBan)}` +
  `:onlyDrv=${val(!!s.onlyDerivativesEligible)}:limit=${val(s.limit)}`;

// Smart-money sectors — low cardinality (range × region × assetType). Mirrors the resolved scope
// the service applies (withDefaultScope: region||IN, assetType||STOCK) so the invalidated key
// matches the one the controller reads.
export const smartMoneySectorsKeyPrefix = `${PREFIX}:smart-money-sectors:`;
export const smartMoneySectorsKey = (s: { range: string; region: string; assetType: string }): string =>
  `${smartMoneySectorsKeyPrefix}range=${val(s.range)}:region=${val(s.region)}:assetType=${val(s.assetType)}`;

// Earnings intelligence — low cardinality (region × assetType × limit × optional category).
export const earningsKeyPrefix = `${PREFIX}:earnings:`;
export const earningsKey = (s: { region: string; assetType: string; limit?: number; category?: string }): string =>
  `${earningsKeyPrefix}region=${val(s.region)}:assetType=${val(s.assetType)}:limit=${val(s.limit)}:cat=${val(s.category)}`;

export const marketMoversKeyPrefix = `${PREFIX}:movers:`;
export const marketMoversKey = (s: {
  region?: string; assetType?: string; limit?: number; range?: string;
}): string =>
  `${marketMoversKeyPrefix}region=${val(s.region)}:assetType=${val(s.assetType)}` +
  `:limit=${val(s.limit)}:range=${val(s.range)}`;

export const signalsTopKeyPrefix = `${PREFIX}:signals-top:`;
export const signalsTopKey = (q: {
  region?: string; assetType?: string; direction?: string; minScore?: number;
  sector?: string; confidence?: string; lifecycleState?: string;
  limit?: number; offset?: number; sortBy?: string; sortDirection?: string;
  strategyCode?: string; modelVersion?: string; signalType?: string;
  includeStrategyMatches?: boolean; onlyStrategyEligible?: boolean;
  excludeNoiseFiltered?: boolean; hasStrategyMatch?: boolean;
  hasBlockedStrategies?: boolean; frameworkBackedDecisionAvailable?: boolean;
  excludeSme?: boolean; reliabilityTier?: string; country?: string; search?: string;
}): string =>
  `${signalsTopKeyPrefix}region=${val(q.region)}:assetType=${val(q.assetType)}` +
  `:dir=${val(q.direction)}:minScore=${val(q.minScore)}:sector=${val(q.sector)}` +
  `:conf=${val(q.confidence)}:life=${val(q.lifecycleState)}:limit=${val(q.limit)}` +
  `:offset=${val(q.offset)}:sortBy=${val(q.sortBy)}:sortDir=${val(q.sortDirection)}` +
  `:st=${val(q.strategyCode)}:mv=${val(q.modelVersion)}:sig=${val(q.signalType)}` +
  `:ise=${val(!!q.includeStrategyMatches)}:ose=${val(!!q.onlyStrategyEligible)}` +
  `:enf=${val(!!q.excludeNoiseFiltered)}:hsm=${val(!!q.hasStrategyMatch)}` +
  `:hbs=${val(!!q.hasBlockedStrategies)}:fbd=${val(!!q.frameworkBackedDecisionAvailable)}` +
  `:exs=${val(!!q.excludeSme)}:rt=${val(q.reliabilityTier)}` +
  `:co=${val(q.country)}:search=${val(q.search)}`;
