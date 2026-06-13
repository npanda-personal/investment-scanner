// Pure leaf utilities extracted from MarketDataFoundationService. Free functions, no
// instance/repository state. Behavior is byte-identical to the prior private/public methods.
import type { ExchangeDailyImportSummary } from '../ingestion/india/market-data-foundation.india-ingestion-host';

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function objectMetadata(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
}

export function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

export function iso(value: unknown): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

export function clampHistoricalBackfillWorkers(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 3;
  return Math.max(1, Math.min(5, Math.floor(parsed)));
}

export function clampHistoricalBackfillMaxRetries(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 2;
  return Math.max(0, Math.min(10, Math.floor(parsed)));
}

export function isHistoricalBackfillNotAvailable(summary: ExchangeDailyImportSummary): boolean {
  return (summary.errors || []).some((error) => isNotAvailableErrorMessage(error));
}

export function isNotAvailableErrorMessage(message: string): boolean {
  return /HTTP\s*404|404|not found|no such key|file .*missing|unavailable/i.test(String(message || ''));
}

export function trimmedUpper(value: unknown): string {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}
