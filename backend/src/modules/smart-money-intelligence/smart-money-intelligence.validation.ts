import type { SmartMoneyRange } from './smart-money-intelligence.types';

export const SMART_MONEY_RANGES: SmartMoneyRange[] = ['1M', '3M', '6M'];

export function getParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] : value || '';
}

export function parseLimit(value: unknown, fallback = 10): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(100, Math.max(1, Math.floor(parsed)));
}

export function parseOffset(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.floor(parsed));
}

export function parseRange(value: unknown): SmartMoneyRange {
  return SMART_MONEY_RANGES.includes(value as SmartMoneyRange) ? value as SmartMoneyRange : '3M';
}

export function parseOptionalText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
