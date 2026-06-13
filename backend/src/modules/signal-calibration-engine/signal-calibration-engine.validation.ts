import type { CalibrationQuery, CalibrationRunRequest } from './signal-calibration-engine.types';
import type { SignalDirection } from '../signal-generation-engine';
import { DEFAULT_ASSET_TYPE, DEFAULT_REGION } from './signal-calibration-engine.config';

const DIRECTIONS: SignalDirection[] = ['BULLISH', 'NEUTRAL', 'BEARISH'];
const CONFIDENCES = ['HIGH', 'MEDIUM', 'LOW'] as const;
const CALIBRATION_CONFIDENCES = ['HIGH', 'MEDIUM', 'LOW', 'INSUFFICIENT_SAMPLE'] as const;
const EVIDENCE_STATUSES = ['SUFFICIENT', 'LOW_SAMPLE', 'INSUFFICIENT', 'MISSING'] as const;
const SORT_FIELDS = new Set(['symbol', 'rawScore', 'calibratedScore', 'scoreDelta', 'delta', 'generatedAt', 'calibratedAt']);
const first = (value: unknown) => Array.isArray(value) ? value[0] : value;

export function normalizeCalibrationDirection(value: unknown): SignalDirection | undefined {
  const normalized = String(first(value) || '').trim().toUpperCase();
  return DIRECTIONS.includes(normalized as SignalDirection) ? normalized as SignalDirection : undefined;
}

export function parseCalibrationQuery(query: Record<string, unknown>): CalibrationQuery {
  const minScore = Number(first(query.minScore));
  const minRawScore = Number(first(query.minRawScore));
  const minCalibratedScore = Number(first(query.minCalibratedScore));
  const minAbsDelta = Number(first(query.minAbsDelta));
  const limit = Number(first(query.limit));
  const offset = Number(first(query.offset));
  const sortDirection = String(first(query.sortDirection) || '').toLowerCase() === 'asc' ? 'asc' : 'desc';
  const sortBy = String(first(query.sortBy) || 'calibratedScore').trim();
  const confidence = parseEnum(first(query.confidence), CONFIDENCES);
  const calibrationConfidence = parseEnum(first(query.calibrationConfidence), CALIBRATION_CONFIDENCES);
  const evidenceStatus = parseEnum(first(query.evidenceStatus), EVIDENCE_STATUSES);

  return {
    direction: normalizeCalibrationDirection(query.direction),
    minScore: Number.isFinite(minScore) ? Math.min(100, Math.max(0, minScore)) : undefined,
    minRawScore: Number.isFinite(minRawScore) ? Math.min(100, Math.max(0, minRawScore)) : undefined,
    minCalibratedScore: Number.isFinite(minCalibratedScore) ? Math.min(100, Math.max(0, minCalibratedScore)) : undefined,
    minAbsDelta: Number.isFinite(minAbsDelta) ? Math.min(100, Math.max(0, minAbsDelta)) : undefined,
    limit: Number.isFinite(limit) ? Math.min(100, Math.max(1, Math.floor(limit))) : 25,
    offset: Number.isFinite(offset) ? Math.max(0, Math.floor(offset)) : 0,
    sector: typeof first(query.sector) === 'string' ? String(first(query.sector)).trim() || undefined : undefined,
    country: typeof first(query.country) === 'string' ? String(first(query.country)).trim() || undefined : undefined,
    region: typeof first(query.region) === 'string' ? String(first(query.region)).trim().toUpperCase() || undefined : DEFAULT_REGION,
    assetType: typeof first(query.assetType) === 'string' ? String(first(query.assetType)).trim().toUpperCase() || undefined : DEFAULT_ASSET_TYPE,
    sortBy: SORT_FIELDS.has(sortBy) ? sortBy : 'calibratedScore',
    sortDirection,
    confidence,
    calibrationConfidence,
    evidenceStatus,
    search: typeof first(query.search) === 'string' ? String(first(query.search)).trim() : undefined,
    horizon: typeof first(query.horizon) === 'string' ? String(first(query.horizon)).trim().toUpperCase() : undefined,
    hasDataGaps: parseBoolean(first(query.hasDataGaps)),
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
    region: typeof body?.region === 'string' ? body.region.trim().toUpperCase() || undefined : DEFAULT_REGION,
    assetType: typeof body?.assetType === 'string' ? body.assetType.trim().toUpperCase() || undefined : DEFAULT_ASSET_TYPE,
    horizon: typeof body?.horizon === 'string' ? body.horizon.trim().toUpperCase() || undefined : undefined,
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

function parseEnum<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  const normalized = String(value || '').trim().toUpperCase();
  return allowed.includes(normalized as T) ? normalized as T : undefined;
}

function parseBoolean(value: unknown): boolean | undefined {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return undefined;
}
