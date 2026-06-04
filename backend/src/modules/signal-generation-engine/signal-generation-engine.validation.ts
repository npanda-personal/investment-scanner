import type { ReliabilityTier, SignalConfidence, SignalDirection, SignalLifecycleState, SignalQuery, SignalRunRequest } from './signal-generation-engine.types';
import { normalizeMarketRegion } from '../../shared/utils/market-scope';
import {
  signal_generation_engine_batch_size,
  signal_generation_engine_max_workers_count,
} from './signal-generation-engine.config';

const DIRECTIONS: SignalDirection[] = ['BULLISH', 'NEUTRAL', 'BEARISH'];
const CONFIDENCES: SignalConfidence[] = ['LOW', 'MEDIUM', 'HIGH'];
const RELIABILITY_TIERS: ReliabilityTier[] = ['FULL', 'PARTIAL'];
const LIFECYCLE_STATES: SignalLifecycleState[] = ['ENTRY', 'ACTIVE', 'EXIT', 'EXPIRED'];
const SORT_FIELDS = ['score', 'symbol', 'companyName', 'generatedAt', 'direction', 'confidence', 'dailyChangePercent'];

const first = (value: unknown): unknown => Array.isArray(value) ? value[0] : value;

export function normalizeDirection(value: unknown): SignalDirection | undefined {
  const normalized = String(first(value) || '').trim().toUpperCase();
  return DIRECTIONS.includes(normalized as SignalDirection) ? normalized as SignalDirection : undefined;
}

export function normalizeConfidence(value: unknown): SignalConfidence | undefined {
  const normalized = String(first(value) || '').trim().toUpperCase();
  return CONFIDENCES.includes(normalized as SignalConfidence) ? normalized as SignalConfidence : undefined;
}

export function normalizeSignalSortBy(value: unknown): string | undefined {
  const normalized = String(first(value) || '').trim();
  return SORT_FIELDS.includes(normalized) ? normalized : undefined;
}

const normalizeRegionText = (value: unknown): string | undefined => {
  if (typeof first(value) !== 'string') return undefined;
  const raw = String(first(value)).trim().toUpperCase();
  if (!raw) return undefined;
  return normalizeMarketRegion(raw) || 'GLOBAL';
};

const normalizeAssetTypeText = (value: unknown): string | undefined =>
  typeof first(value) === 'string' ? String(first(value)).trim().toUpperCase() || undefined : undefined;

const normalizeVersionText = (value: unknown): string | undefined =>
  typeof first(value) === 'string' ? String(first(value)).trim() || undefined : undefined;

export function parseSignalQuery(query: Record<string, unknown>): SignalQuery {
  const minScoreValue = Number(first(query.minScore));
  const limitValue = Number(first(query.limit));
  const offsetValue = Number(first(query.offset));
  const sortDirection = String(first(query.sortDirection) || '').toLowerCase();

  return {
    direction: normalizeDirection(query.direction),
    minScore: Number.isFinite(minScoreValue) ? Math.min(100, Math.max(0, minScoreValue)) : undefined,
    limit: Number.isFinite(limitValue) ? Math.min(100, Math.max(1, Math.floor(limitValue))) : 25,
    offset: Number.isFinite(offsetValue) ? Math.max(0, Math.floor(offsetValue)) : undefined,
    sortBy: normalizeSignalSortBy(query.sortBy),
    sortDirection: sortDirection === 'asc' || sortDirection === 'desc' ? sortDirection : undefined,
    sector: typeof first(query.sector) === 'string' ? String(first(query.sector)).trim() || undefined : undefined,
    country: typeof first(query.country) === 'string' ? String(first(query.country)).trim() || undefined : undefined,
    region: normalizeRegionText(query.region),
    assetType: normalizeAssetTypeText(query.assetType),
    modelVersion: normalizeVersionText(query.modelVersion),
    signalType: typeof first(query.signalType) === 'string' ? String(first(query.signalType)).trim() || undefined : undefined,
    confidence: normalizeConfidence(query.confidence),
    search: typeof first(query.search) === 'string' ? String(first(query.search)).trim() || undefined : undefined,
    strategyCode: typeof first(query.strategyCode) === 'string' ? String(first(query.strategyCode)).trim().toUpperCase() || undefined : undefined,
    includeStrategyMatches: first(query.includeStrategyMatches) === 'true' || first(query.includeStrategyMatches) === true,
    onlyStrategyEligible: first(query.onlyStrategyEligible) === 'true' || first(query.onlyStrategyEligible) === true,
    excludeNoiseFiltered: first(query.excludeNoiseFiltered) === 'true' || first(query.excludeNoiseFiltered) === true,
    hasStrategyMatch: first(query.hasStrategyMatch) === 'true' || first(query.hasStrategyMatch) === true,
    hasBlockedStrategies: first(query.hasBlockedStrategies) === 'true' || first(query.hasBlockedStrategies) === true,
    frameworkBackedDecisionAvailable: first(query.frameworkBackedDecisionAvailable) === 'true' || first(query.frameworkBackedDecisionAvailable) === true,
    excludeSme: first(query.excludeSme) === 'true' || first(query.excludeSme) === true,
    reliabilityTier: (() => {
      const v = String(first(query.reliabilityTier) || '').trim().toUpperCase() as ReliabilityTier;
      return RELIABILITY_TIERS.includes(v) ? v : undefined;
    })(),
    lifecycleState: (() => {
      const v = String(first(query.lifecycleState) || '').trim().toUpperCase() as SignalLifecycleState;
      return LIFECYCLE_STATES.includes(v) ? v : undefined;
    })(),
  };
}

export function parseRunRequest(body: any): SignalRunRequest {
  const limitValue = Number(body?.limit);
  const batchSizeValue = Number(body?.batchSize ?? body?.limit);
  const offsetValue = Number(body?.offset ?? body?.cursor);
  const maxConcurrencyValue = Number(body?.maxConcurrency ?? body?.workerCount);
  const providerThrottleMsValue = Number(body?.providerThrottleMs);
  return {
    instrumentId: typeof body?.instrumentId === 'string' ? body.instrumentId.trim() || undefined : undefined,
    symbol: typeof body?.symbol === 'string' ? body.symbol.trim().toUpperCase() || undefined : undefined,
    limit: Number.isFinite(limitValue) ? Math.min(signal_generation_engine_batch_size, Math.max(1, Math.floor(limitValue))) : undefined,
    batchSize: Number.isFinite(batchSizeValue) ? Math.min(signal_generation_engine_batch_size, Math.max(1, Math.floor(batchSizeValue))) : undefined,
    offset: Number.isFinite(offsetValue) ? Math.max(0, Math.floor(offsetValue)) : 0,
    maxConcurrency: Number.isFinite(maxConcurrencyValue) ? Math.min(signal_generation_engine_max_workers_count, Math.max(1, Math.floor(maxConcurrencyValue))) : undefined,
    providerThrottleMs: Number.isFinite(providerThrottleMsValue) ? Math.min(2000, Math.max(0, Math.floor(providerThrottleMsValue))) : undefined,
    direction: normalizeDirection(body?.direction),
    sector: typeof body?.sector === 'string' ? body.sector.trim() || undefined : undefined,
    country: typeof body?.country === 'string' ? body.country.trim() || undefined : undefined,
    region: normalizeRegionText(body?.region),
    assetType: normalizeAssetTypeText(body?.assetType),
    modelVersion: normalizeVersionText(body?.modelVersion),
    rulesetVersion: normalizeVersionText(body?.rulesetVersion),
    requestedByUserId: normalizeVersionText(body?.requestedByUserId),
    useDataQualityFilter: body?.useDataQualityFilter !== false,
    minSignalReadinessScore: Number.isFinite(Number(body?.minSignalReadinessScore)) ? Math.min(100, Math.max(0, Number(body.minSignalReadinessScore))) : undefined,
    allowedReadinessStatuses: Array.isArray(body?.allowedReadinessStatuses) ? body.allowedReadinessStatuses : undefined,
    includeLimited: body?.includeLimited === true,
    skipUnusable: body?.skipUnusable !== undefined ? body.skipUnusable === true : undefined,
    missingQualityBehavior: ['WARN_AND_PROCESS', 'SKIP'].includes(body?.missingQualityBehavior) ? body.missingQualityBehavior : undefined,
    strategyCode: typeof body?.strategyCode === 'string' ? body.strategyCode.trim().toUpperCase() || undefined : undefined,
    includeStrategyMatches: body?.includeStrategyMatches === true,
    onlyStrategyEligible: body?.onlyStrategyEligible === true,
    excludeNoiseFiltered: body?.excludeNoiseFiltered === true,
    force: body?.force === true,
  };
}

export function validateInstrumentId(instrumentId: string | undefined): string | null {
  if (!instrumentId || instrumentId.trim().length === 0) return 'instrumentId is required';
  return null;
}
