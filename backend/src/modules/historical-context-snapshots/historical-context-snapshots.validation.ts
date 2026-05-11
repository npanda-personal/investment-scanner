import type { GenerateSnapshotsRequest, SnapshotQuery } from './historical-context-snapshots.types';

export function normalizeSnapshotDate(value?: string | Date): Date {
  const date = value ? new Date(value) : new Date();
  if (!Number.isFinite(date.getTime())) throw new Error('snapshotDate must be a valid date');
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function parseGenerateRequest(input: GenerateSnapshotsRequest): { snapshotDate: Date; limit: number; region: string; assetType: string } {
  return {
    snapshotDate: normalizeSnapshotDate(input.snapshotDate),
    limit: clampInt(input.limit, 50, 1, 250),
    region: normalizeScopeCode(input.region, 'IN'),
    assetType: normalizeScopeCode(input.assetType, 'STOCK'),
  };
}

export function parseSnapshotQuery(query: any): SnapshotQuery {
  const from = validDate(query.from) ? normalizeSnapshotDate(query.from) : undefined;
  const to = validDate(query.to) ? normalizeSnapshotDate(query.to) : undefined;
  if (from && to && from.getTime() > to.getTime()) throw new Error('from must be before to');
  return {
    from,
    to,
    date: validDate(query.date) ? normalizeSnapshotDate(query.date) : undefined,
    sector: stringOrUndefined(query.sector),
    country: stringOrUndefined(query.country),
    instrumentId: stringOrUndefined(query.instrumentId),
    region: normalizeScopeCode(query.region, 'IN'),
    assetType: normalizeScopeCode(query.assetType, 'STOCK'),
    limit: clampInt(query.limit, 100, 1, 1000),
  };
}

export function parseLookupQuery(query: any): { date: Date; lookbackDays: number; instrumentId?: string; sector?: string; country?: string; region: string; assetType: string } {
  if (!validDate(query.date)) throw new Error('date is required');
  return {
    date: normalizeSnapshotDate(query.date),
    lookbackDays: clampInt(query.lookbackDays, 7, 1, 60),
    instrumentId: stringOrUndefined(query.instrumentId),
    sector: stringOrUndefined(query.sector),
    country: stringOrUndefined(query.country),
    region: normalizeScopeCode(query.region, 'IN'),
    assetType: normalizeScopeCode(query.assetType, 'STOCK'),
  };
}

function validDate(value: unknown): boolean {
  return typeof value === 'string' && Number.isFinite(new Date(value).getTime());
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function normalizeScopeCode(value: unknown, fallback: string): string {
  const text = stringOrUndefined(value);
  return (text || fallback).toUpperCase();
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(numeric)));
}
