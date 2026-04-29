import type { CalibrationQuery, CalibrationRunRequest } from './signal-calibration-engine.types';
import type { SignalDirection } from '../signal-generation-engine';

const DIRECTIONS: SignalDirection[] = ['BULLISH', 'NEUTRAL', 'BEARISH'];
const first = (value: unknown) => Array.isArray(value) ? value[0] : value;

export function normalizeCalibrationDirection(value: unknown): SignalDirection | undefined {
  const normalized = String(first(value) || '').trim().toUpperCase();
  return DIRECTIONS.includes(normalized as SignalDirection) ? normalized as SignalDirection : undefined;
}

export function parseCalibrationQuery(query: Record<string, unknown>): CalibrationQuery {
  const minScore = Number(first(query.minScore));
  const limit = Number(first(query.limit));
  return {
    direction: normalizeCalibrationDirection(query.direction),
    minScore: Number.isFinite(minScore) ? Math.min(100, Math.max(0, minScore)) : undefined,
    limit: Number.isFinite(limit) ? Math.min(100, Math.max(1, Math.floor(limit))) : 25,
    sector: typeof first(query.sector) === 'string' ? String(first(query.sector)).trim() || undefined : undefined,
    country: typeof first(query.country) === 'string' ? String(first(query.country)).trim() || undefined : undefined,
  };
}

export function parseCalibrationRunRequest(body: any): CalibrationRunRequest {
  const limit = Number(body?.limit);
  return {
    instrumentId: typeof body?.instrumentId === 'string' ? body.instrumentId.trim() || undefined : undefined,
    symbol: typeof body?.symbol === 'string' ? body.symbol.trim().toUpperCase() || undefined : undefined,
    limit: Number.isFinite(limit) ? Math.min(100, Math.max(1, Math.floor(limit))) : undefined,
    batchSize: clampInt(body?.batchSize, undefined, 1, 100),
    offset: clampInt(body?.offset ?? body?.cursor, 0, 0, Number.MAX_SAFE_INTEGER),
    direction: normalizeCalibrationDirection(body?.direction),
    sector: typeof body?.sector === 'string' ? body.sector.trim() || undefined : undefined,
    country: typeof body?.country === 'string' ? body.country.trim() || undefined : undefined,
  };
}

export function requireInstrumentId(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error('instrumentId is required');
  return value.trim();
}

export function safeModelVersion(value: unknown): string {
  const version = String(value || '').trim();
  if (!/^[a-zA-Z0-9._-]{1,64}$/.test(version)) throw new Error('model version is invalid');
  return version;
}

function clampInt(value: unknown, fallback: number | undefined, min: number, max: number): number | undefined {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(numeric)));
}
