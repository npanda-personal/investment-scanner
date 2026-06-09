import type { TodayReviewQuery, TodayReviewRunRequest } from './today-trade-review.types';

const first = (value: unknown): string | undefined => Array.isArray(value) ? first(value[0]) : typeof value === 'string' ? value : undefined;

export function parseTodayReviewQuery(query: Record<string, unknown>): TodayReviewQuery {
  return {
    region: first(query.region),
    assetType: first(query.assetType),
    limit: parsePositiveInt(first(query.limit)),
    offset: parseNonNegativeInt(first(query.offset)),
    // Only an explicit ?enrich=false|0|no opts out; otherwise leave undefined (defaults to enriched).
    enrich: ['false', '0', 'no'].includes((first(query.enrich) || '').trim().toLowerCase()) ? false : undefined,
  };
}

export function parseTodayReviewRunRequest(query: Record<string, unknown>, body: Record<string, unknown> = {}): TodayReviewRunRequest {
  return {
    region: first(body.region) || first(query.region),
    assetType: first(body.assetType) || first(query.assetType),
  };
}

export function requireTodayReviewId(id: unknown): string {
  if (typeof id !== 'string' || id.trim().length === 0) {
    throw new Error('Today review id is required.');
  }
  return id;
}

function parsePositiveInt(value?: string) {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parseNonNegativeInt(value?: string) {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}
