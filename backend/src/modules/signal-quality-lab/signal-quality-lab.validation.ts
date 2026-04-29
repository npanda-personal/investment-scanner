import type { QualityHorizon, QualityQuery } from './signal-quality-lab.types';

export const QUALITY_HORIZONS: QualityHorizon[] = ['1D', '5D', '10D', '20D', '60D'];
export const QUALITY_DIRECTIONS = ['BULLISH', 'NEUTRAL', 'BEARISH'] as const;

export function parseQualityQuery(query: any): QualityQuery {
  return {
    horizon: parseHorizon(query.horizon),
    direction: QUALITY_DIRECTIONS.includes(query.direction) ? query.direction : undefined,
    sector: typeof query.sector === 'string' && query.sector.trim() ? query.sector.trim() : undefined,
    country: typeof query.country === 'string' && query.country.trim() ? query.country.trim() : undefined,
    from: validDate(query.from) ? query.from : undefined,
    to: validDate(query.to) ? query.to : undefined,
    limit: clampInt(query.limit, 500, 1, 5000),
    minSampleSize: clampInt(query.minSampleSize, 0, 0, 1000),
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

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(numeric)));
}

function validDate(value: unknown): boolean {
  return typeof value === 'string' && Number.isFinite(new Date(value).getTime());
}
