import type { MarketContextRange } from './market-context-intelligence.types';

export const SUPPORTED_CONTEXT_RANGES: MarketContextRange[] = ['1M', '3M', '6M'];

export function parseRange(value: unknown): MarketContextRange {
  const candidate = Array.isArray(value) ? value[0] : value;
  return SUPPORTED_CONTEXT_RANGES.includes(candidate as MarketContextRange) ? candidate as MarketContextRange : '3M';
}

export function parseOptionalText(value: unknown): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : undefined;
}
