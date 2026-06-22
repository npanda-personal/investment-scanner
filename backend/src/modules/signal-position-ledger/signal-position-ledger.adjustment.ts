import type { SignalPositionLatestPriceSnapshot } from './signal-position-ledger.types';

const DISCONTINUITY_THRESHOLD = 0.5;

interface AdjustmentEntry {
  instrumentId: string;
  entryTimestamp: string;
  storedEntryPrice: number;
}

interface AdjustmentRepo {
  priceAtOrBeforeInstrumentId(
    instrumentId: string,
    date: Date,
    scope: { region: string; assetType: string },
  ): Promise<SignalPositionLatestPriceSnapshot | null>;
  priceAtDateBatch(
    entries: Array<{ instrumentId: string; date: Date }>,
    scope: { region: string; assetType: string },
  ): Promise<Map<string, SignalPositionLatestPriceSnapshot>>;
}

function parseEntryDate(entryTimestamp: string): Date | null {
  const d = new Date(entryTimestamp);
  return Number.isFinite(d.getTime()) ? d : null;
}

function resolveAdjusted(
  snapshot: SignalPositionLatestPriceSnapshot | null,
  storedEntryPrice: number,
  exitPrice?: number | null,
): number | null {
  if (!snapshot) return storedEntryPrice;
  const adj = snapshot.adjustedClose ?? snapshot.close;
  if (!Number.isFinite(adj) || adj <= 0) return storedEntryPrice;
  if (adj === storedEntryPrice && typeof exitPrice === 'number' && exitPrice > 0) {
    const ratio = exitPrice / storedEntryPrice;
    if (ratio < (1 - DISCONTINUITY_THRESHOLD) || ratio > (1 + DISCONTINUITY_THRESHOLD)) return null;
  }
  return adj;
}

export function adjustedReturn(adjEntry: number | null, closePrice: number | null, fallback: number | null): { pct: number | null; status: 'CURRENT' | 'UNAVAILABLE' } {
  if (adjEntry === null) return { pct: null, status: 'UNAVAILABLE' };
  if (closePrice === null || adjEntry <= 0) return { pct: fallback, status: fallback !== null ? 'CURRENT' : 'UNAVAILABLE' };
  return { pct: Number((((closePrice - adjEntry) / adjEntry) * 100).toFixed(4)), status: 'CURRENT' };
}

export async function adjustedEntryPrice(
  repo: AdjustmentRepo,
  instrumentId: string,
  entryTimestamp: string,
  storedEntryPrice: number,
  scope: { region: string; assetType: string },
  exitPrice?: number | null,
): Promise<number | null> {
  const date = parseEntryDate(entryTimestamp);
  if (!date) return storedEntryPrice;
  if (typeof repo.priceAtOrBeforeInstrumentId !== 'function') return storedEntryPrice;
  const snapshot = await repo.priceAtOrBeforeInstrumentId(instrumentId, date, scope);
  return resolveAdjusted(snapshot, storedEntryPrice, exitPrice);
}

export async function adjustedEntryPricesBatch(
  repo: AdjustmentRepo,
  entries: AdjustmentEntry[],
  scope: { region: string; assetType: string },
  exitPrices?: Map<string, number>,
): Promise<Map<string, number | null>> {
  if (typeof repo.priceAtDateBatch !== 'function') {
    const fallback = new Map<string, number | null>();
    for (const e of entries) fallback.set(e.instrumentId, e.storedEntryPrice);
    return fallback;
  }
  const batchEntries = entries.flatMap((e) => {
    const date = parseEntryDate(e.entryTimestamp);
    return date ? [{ instrumentId: e.instrumentId, date }] : [];
  });
  const priceMap = batchEntries.length > 0
    ? await repo.priceAtDateBatch(batchEntries, scope)
    : new Map<string, SignalPositionLatestPriceSnapshot>();
  const result = new Map<string, number | null>();
  for (const entry of entries) {
    const snapshot = priceMap.get(entry.instrumentId) ?? null;
    const ep = exitPrices?.get(entry.instrumentId) ?? undefined;
    result.set(entry.instrumentId, resolveAdjusted(snapshot, entry.storedEntryPrice, ep));
  }
  return result;
}
