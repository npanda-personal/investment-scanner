import type { SignalPositionLedgerActiveQuery } from './signal-position-ledger.types';

const first = (value: unknown): unknown => Array.isArray(value) ? value[0] : value;

function normalizeText(value: unknown): string | undefined {
  if (typeof first(value) !== 'string') return undefined;
  const normalized = String(first(value)).trim().toUpperCase();
  return normalized || undefined;
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const numeric = Number(first(value));
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(numeric)));
}

export function parseSignalPositionLedgerActiveQuery(query: Record<string, unknown>): SignalPositionLedgerActiveQuery {
  return {
    region: normalizeText(query.region) || 'IN',
    assetType: normalizeText(query.assetType) || 'STOCK',
    limit: clampInt(query.limit, 25, 1, 100),
    offset: clampInt(query.offset, 0, 0, Number.MAX_SAFE_INTEGER),
  };
}

