const DEFAULT_REGION = 'IN';
const DEFAULT_ASSET_TYPE = 'STOCK';
const DEFAULT_TIMEFRAME = '1d';
const DEFAULT_BATCH_SIZE = 25;
const MAX_BATCH_SIZE = 100;

export function parseStockInterestScope(query: Record<string, unknown>) {
  return {
    region: normalizeText(first(query.region), DEFAULT_REGION).toUpperCase(),
    assetType: normalizeText(first(query.assetType), DEFAULT_ASSET_TYPE).toUpperCase(),
  };
}

export function normalizeStockInterestRegion(value: unknown): string {
  return normalizeText(value, DEFAULT_REGION).toUpperCase();
}

export function normalizeStockInterestAssetType(value: unknown): string {
  return normalizeText(value, DEFAULT_ASSET_TYPE).toUpperCase();
}

export function normalizeStockInterestTimeframe(value: unknown): string {
  return normalizeText(value, DEFAULT_TIMEFRAME).toLowerCase();
}

export function parseStockInterestBatchSize(value: unknown): number {
  if (value === undefined || value === null || value === '') return DEFAULT_BATCH_SIZE;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_BATCH_SIZE) {
    throw new Error(`batchSize must be an integer between 1 and ${MAX_BATCH_SIZE}`);
  }
  return parsed;
}

export function parseStockInterestOffset(value: unknown): number {
  if (value === undefined || value === null || value === '') return 0;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error('offset must be a non-negative integer');
  return parsed;
}

function first(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeText(value: unknown, fallback: string): string {
  const text = String(value ?? fallback).trim();
  return text || fallback;
}
