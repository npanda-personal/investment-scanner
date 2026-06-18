/**
 * Single source of truth for page-cache keys. Imported by BOTH the read-through controllers
 * and the CACHE_WARM pipeline stage so the two can never drift.
 *
 * Builders take the already-resolved scope values (exactly what the controller passes to the
 * underlying service) and stringify them — they do NOT re-normalize. This guarantees the cache
 * key always matches the input that produced the cached payload. The `v1` prefix lets a
 * response-shape change invalidate everything with a one-line bump.
 */
const PREFIX = 'cache:v1';

const val = (v: unknown): string => {
  if (v === undefined || v === null || v === '') return '_';
  if (typeof v === 'boolean') return v ? '1' : '0';
  return String(v);
};

export const convictionKey = (s: { region?: string; assetType?: string; onlyFnoEligible?: boolean }): string =>
  `${PREFIX}:conviction:region=${val(s.region)}:assetType=${val(s.assetType)}:fno=${val(!!s.onlyFnoEligible)}`;

export const stockInterestKey = (s: { region: string; assetType: string }): string =>
  `${PREFIX}:stock-interest:region=${val(s.region)}:assetType=${val(s.assetType)}`;

export const sectorRotationKey = (s: { region: string; assetType: string }): string =>
  `${PREFIX}:sector-rotation:region=${val(s.region)}:assetType=${val(s.assetType)}`;

export const todayReviewKey = (s: {
  region?: string;
  assetType?: string;
  enrich?: boolean;
  limit?: number;
  offset?: number;
}): string =>
  `${PREFIX}:today-review:region=${val(s.region)}:assetType=${val(s.assetType)}:enrich=${
    s.enrich === false ? '0' : '1'
  }:limit=${val(s.limit)}:offset=${val(s.offset)}`;

export const marketContextSummaryKey = (region: string): string =>
  `${PREFIX}:market-context-summary:region=${val(region)}`;

export const marketPulseKey = (s: { region: string; assetType: string; timeframe: string }): string =>
  `${PREFIX}:market-pulse:region=${val(s.region)}:assetType=${val(s.assetType)}:timeframe=${val(s.timeframe)}`;
