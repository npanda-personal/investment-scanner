import type { EarningsIntelligenceCategory, EarningsIntelligenceQuery } from './earnings-intelligence.types';
import {
  EARNINGS_INTELLIGENCE_CATEGORIES,
  isEarningsIntelligenceCategory,
} from './earnings-intelligence.categories';
import {
  DEFAULT_EARNINGS_REGION,
  getEarningsRegionConfig,
  normalizeRegionCode,
} from './earnings-intelligence.region-config';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

// Re-exported from the single category source of truth so existing importers
// (`from '.../earnings-intelligence.validation'`) keep working unchanged.
export { EARNINGS_INTELLIGENCE_CATEGORIES, isEarningsIntelligenceCategory };

export function parseEarningsIntelligenceQuery(query: Record<string, unknown>): EarningsIntelligenceQuery {
  const category = parseCategory(first(query.category));
  const region = normalizeRegionCode(normalizeText(first(query.region), DEFAULT_EARNINGS_REGION));
  const assetType = normalizeText(first(query.assetType), getEarningsRegionConfig(region).defaultAssetType).toUpperCase();
  return {
    region,
    assetType,
    limit: parseLimit(first(query.limit)),
    ...(category ? { category } : {}),
  };
}

function first(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeText(value: unknown, fallback: string): string {
  const text = String(value ?? fallback).trim();
  return text.length > 0 ? text : fallback;
}

function parseLimit(value: unknown): number {
  if (value === undefined || value === null || value === '') return DEFAULT_LIMIT;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_LIMIT) {
    throw new Error(`limit must be an integer between 1 and ${MAX_LIMIT}`);
  }
  return parsed;
}

function parseCategory(value: unknown): EarningsIntelligenceCategory | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const category = String(value).trim().toUpperCase();
  if (!isEarningsIntelligenceCategory(category)) {
    throw new Error(`category must be one of: ${EARNINGS_INTELLIGENCE_CATEGORIES.join(', ')}`);
  }
  return category;
}
