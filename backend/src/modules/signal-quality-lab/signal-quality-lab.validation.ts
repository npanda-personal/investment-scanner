import type { QualityHorizon, QualityQuery } from './signal-quality-lab.types';

export const QUALITY_HORIZONS: QualityHorizon[] = ['1D', '5D', '10D', '20D', '60D'];
export const QUALITY_DIRECTIONS = ['BULLISH', 'NEUTRAL', 'BEARISH'] as const;
export const QUALITY_ANALYSIS_LIMIT = 10000;

export function parseQualityQuery(query: any): QualityQuery {
  return {
    horizon: parseHorizon(query.horizon),
    direction: QUALITY_DIRECTIONS.includes(query.direction) ? query.direction : undefined,
    sector: typeof query.sector === 'string' && query.sector.trim() ? query.sector.trim() : undefined,
    country: typeof query.country === 'string' && query.country.trim() ? query.country.trim() : undefined,
    region: typeof query.region === 'string' && query.region.trim() ? query.region.trim().toUpperCase() : 'IN',
    assetType: typeof query.assetType === 'string' && query.assetType.trim() ? query.assetType.trim().toUpperCase() : 'STOCK',
    modelVersion: parseModelVersion(query.modelVersion),
    from: validDate(query.from) ? query.from : undefined,
    to: validDate(query.to) ? query.to : undefined,
    limit: clampInt(query.limit, 1000, 1, QUALITY_ANALYSIS_LIMIT),
    minSampleSize: clampInt(query.minSampleSize, 0, 0, 1000),
    readinessStatus: parseEnum(query.readinessStatus, ['READY', 'LIMITED', 'NOT_READY']),
    coverageStatus: parseEnum(query.coverageStatus, ['GOOD', 'PARTIAL', 'POOR', 'UNUSABLE']),
    liquidityStatus: parseEnum(query.liquidityStatus, ['LIQUID', 'THIN', 'ILLIQUID', 'UNKNOWN']),
    minReadinessScore: clampNumber(query.minReadinessScore, undefined, 0, 100),
    onlySignalReady: query.onlySignalReady === 'true' || query.onlySignalReady === true,
    excludePoorQuality: query.excludePoorQuality === 'true' || query.excludePoorQuality === true,
  };
}

export function parseHorizon(value: unknown): QualityHorizon {
  return QUALITY_HORIZONS.includes(value as QualityHorizon) ? value as QualityHorizon : '20D';
}

export function requireInstrumentId(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('instrumentId is required');
  }
  return value.trim();
}

export function parseQualityRecalculateRequest(input: any): { batchSize: number; offset: number; horizon: QualityHorizon; region: string; assetType: string; modelVersion?: string; from?: string; to?: string } {
  const from = validDate(input?.from) ? input.from : undefined;
  const to = validDate(input?.to) ? input.to : undefined;
  if (from && to && new Date(from).getTime() > new Date(to).getTime()) throw new Error('from must be before to');
  return {
    batchSize: clampInt(input?.batchSize, 25, 1, 100),
    offset: clampInt(input?.offset ?? input?.cursor, 0, 0, Number.MAX_SAFE_INTEGER),
    horizon: parseHorizon(input?.horizon),
    region: typeof input?.region === 'string' && input.region.trim() ? input.region.trim().toUpperCase() : 'IN',
    assetType: typeof input?.assetType === 'string' && input.assetType.trim() ? input.assetType.trim().toUpperCase() : 'STOCK',
    modelVersion: parseModelVersion(input?.modelVersion),
    from,
    to,
  };
}

function parseModelVersion(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return /^[A-Za-z0-9._:-]{1,80}$/.test(normalized) ? normalized : undefined;
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

function parseEnum<T extends string>(value: unknown, allowed: T[]): T | undefined {
  const normalized = String(value || '').trim().toUpperCase();
  return allowed.includes(normalized as T) ? normalized as T : undefined;
}

function validDate(value: unknown): boolean {
  return typeof value === 'string' && Number.isFinite(new Date(value).getTime());
}
