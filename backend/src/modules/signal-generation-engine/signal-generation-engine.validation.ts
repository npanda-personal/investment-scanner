import type { SignalConfidence, SignalDirection, SignalQuery, SignalRunRequest } from './signal-generation-engine.types';

const DIRECTIONS: SignalDirection[] = ['BULLISH', 'NEUTRAL', 'BEARISH'];
const CONFIDENCES: SignalConfidence[] = ['LOW', 'MEDIUM', 'HIGH'];

const first = (value: unknown): unknown => Array.isArray(value) ? value[0] : value;

export function normalizeDirection(value: unknown): SignalDirection | undefined {
  const normalized = String(first(value) || '').trim().toUpperCase();
  return DIRECTIONS.includes(normalized as SignalDirection) ? normalized as SignalDirection : undefined;
}

export function normalizeConfidence(value: unknown): SignalConfidence | undefined {
  const normalized = String(first(value) || '').trim().toUpperCase();
  return CONFIDENCES.includes(normalized as SignalConfidence) ? normalized as SignalConfidence : undefined;
}

export function parseSignalQuery(query: Record<string, unknown>): SignalQuery {
  const minScoreValue = Number(first(query.minScore));
  const limitValue = Number(first(query.limit));
  return {
    direction: normalizeDirection(query.direction),
    minScore: Number.isFinite(minScoreValue) ? Math.min(100, Math.max(0, minScoreValue)) : undefined,
    limit: Number.isFinite(limitValue) ? Math.min(100, Math.max(1, Math.floor(limitValue))) : 25,
    sector: typeof first(query.sector) === 'string' ? String(first(query.sector)).trim() || undefined : undefined,
    country: typeof first(query.country) === 'string' ? String(first(query.country)).trim() || undefined : undefined,
    signalType: typeof first(query.signalType) === 'string' ? String(first(query.signalType)).trim() || undefined : undefined,
    confidence: normalizeConfidence(query.confidence),
    search: typeof first(query.search) === 'string' ? String(first(query.search)).trim() || undefined : undefined,
  };
}

export function parseRunRequest(body: any): SignalRunRequest {
  const limitValue = Number(body?.limit);
  return {
    instrumentId: typeof body?.instrumentId === 'string' ? body.instrumentId.trim() || undefined : undefined,
    symbol: typeof body?.symbol === 'string' ? body.symbol.trim().toUpperCase() || undefined : undefined,
    limit: Number.isFinite(limitValue) ? Math.min(250, Math.max(1, Math.floor(limitValue))) : undefined,
    direction: normalizeDirection(body?.direction),
    sector: typeof body?.sector === 'string' ? body.sector.trim() || undefined : undefined,
    country: typeof body?.country === 'string' ? body.country.trim() || undefined : undefined,
    useDataQualityFilter: body?.useDataQualityFilter === true,
    minSignalReadinessScore: Number.isFinite(Number(body?.minSignalReadinessScore)) ? Math.min(100, Math.max(0, Number(body.minSignalReadinessScore))) : undefined,
    allowedReadinessStatuses: Array.isArray(body?.allowedReadinessStatuses) ? body.allowedReadinessStatuses : undefined,
    includeLimited: body?.includeLimited === true,
    skipUnusable: body?.skipUnusable !== undefined ? body.skipUnusable === true : undefined,
    missingQualityBehavior: ['WARN_AND_PROCESS', 'SKIP'].includes(body?.missingQualityBehavior) ? body.missingQualityBehavior : undefined,
  };
}

export function validateInstrumentId(instrumentId: string | undefined): string | null {
  if (!instrumentId || instrumentId.trim().length === 0) return 'instrumentId is required';
  return null;
}
