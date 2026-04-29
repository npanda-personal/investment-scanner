import type { CoverageStatus, DataQualityEvaluateRequest, DataQualityQuery, LiquidityStatus, SignalReadinessStatus } from './data-quality-engine.types';

const COVERAGE_STATUSES: CoverageStatus[] = ['GOOD', 'PARTIAL', 'POOR', 'UNUSABLE'];
const READINESS_STATUSES: SignalReadinessStatus[] = ['READY', 'LIMITED', 'NOT_READY'];
const LIQUIDITY_STATUSES: LiquidityStatus[] = ['LIQUID', 'THIN', 'ILLIQUID', 'UNKNOWN'];
const first = (value: unknown) => Array.isArray(value) ? value[0] : value;

export function parseDataQualityQuery(query: Record<string, unknown>): DataQualityQuery {
  return {
    status: parseEnum(first(query.status), COVERAGE_STATUSES),
    readinessStatus: parseEnum(first(query.readinessStatus), READINESS_STATUSES),
    liquidityStatus: parseEnum(first(query.liquidityStatus), LIQUIDITY_STATUSES),
    sector: parseString(first(query.sector)),
    country: parseString(first(query.country)),
    minCoverageScore: clampNumber(first(query.minCoverageScore), undefined, 0, 100),
    minReadinessScore: clampNumber(first(query.minReadinessScore), undefined, 0, 100),
    limit: clampInt(first(query.limit), 100, 1, 500),
    offset: clampInt(first(query.offset ?? query.cursor), 0, 0, Number.MAX_SAFE_INTEGER),
  };
}

export function parseDataQualityEvaluateRequest(input: any): DataQualityEvaluateRequest {
  return {
    instrumentId: parseString(input?.instrumentId),
    symbol: parseString(input?.symbol)?.toUpperCase(),
    batchSize: clampInt(input?.batchSize, 25, 1, 100),
    offset: clampInt(input?.offset ?? input?.cursor, 0, 0, Number.MAX_SAFE_INTEGER),
  };
}

export function requireInstrumentId(value: unknown): string {
  const instrumentId = parseString(value);
  if (!instrumentId) throw new Error('instrumentId is required');
  return instrumentId;
}

function parseEnum<T extends string>(value: unknown, allowed: T[]): T | undefined {
  const normalized = String(value || '').trim().toUpperCase();
  return allowed.includes(normalized as T) ? normalized as T : undefined;
}

function parseString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(numeric)));
}

function clampNumber(value: unknown, fallback: number | undefined, min: number, max: number): number | undefined {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}
