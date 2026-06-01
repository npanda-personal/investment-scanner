import type { EarningsIntelligenceCategory, EarningsIntelligenceQuery } from './earnings-intelligence.types';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

export const EARNINGS_INTELLIGENCE_CATEGORIES: EarningsIntelligenceCategory[] = [
  'UPCOMING_RESULTS',
  'PRE_RESULT_INTEREST',
  'RESULT_WINNERS',
  'RESULT_DISAPPOINTMENTS',
  'RESULT_REACTION_HISTORY',
  'EARNINGS_WATCHLIST',
];

export function parseEarningsIntelligenceQuery(query: Record<string, unknown>): EarningsIntelligenceQuery {
  const category = parseCategory(first(query.category));
  return {
    region: normalizeText(first(query.region), 'IN').toUpperCase(),
    assetType: normalizeText(first(query.assetType), 'STOCK').toUpperCase(),
    limit: parseLimit(first(query.limit)),
    ...(category ? { category } : {}),
  };
}

export function isEarningsIntelligenceCategory(value: string): value is EarningsIntelligenceCategory {
  return EARNINGS_INTELLIGENCE_CATEGORIES.includes(value as EarningsIntelligenceCategory);
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

