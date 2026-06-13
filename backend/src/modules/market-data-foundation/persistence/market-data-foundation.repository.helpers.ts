import { Prisma } from '@prisma/client';

// Shared pure leaf helpers for MarketDataFoundationRepository sub-repositories.
// Byte-for-byte relocations of the original private methods, rewritten as free
// functions (none referenced instance state). Pure relocation.

export function normalizePeriodEndDate(value: string | Date): Date {
    return normalizeUtcDay(value);
  }

export function normalizeUtcDay(value: string | Date): Date {
    const date = value instanceof Date ? new Date(value) : new Date(value);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }

export function decimalKey(value: unknown) {
    if (value === null || value === undefined) return 'null';
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric.toFixed(8).replace(/\.?0+$/, '') : String(value);
  }

export function priceStorageKey(symbol: string, timestamp: Date): string {
    return `${symbol}|${timestamp.toISOString()}`;
  }

export function sameDecimal(left: unknown, right: number, tolerance = 0.000001): boolean {
    return Math.abs(Number(left) - Number(right)) <= tolerance;
  }

export function sameNullableDecimal(left: unknown, right: number | null, tolerance = 0.000001): boolean {
    if (left === null || left === undefined || right === null || right === undefined) return (left === null || left === undefined) && (right === null || right === undefined);
    return sameDecimal(left, right, tolerance);
  }

export function sameNullableBigInt(left: unknown, right: number | null): boolean {
    if (left === null || left === undefined || right === null || right === undefined) return (left === null || left === undefined) && (right === null || right === undefined);
    return BigInt(left as any) === BigInt(right);
  }

export function toNumber(value: Prisma.Decimal | number | string | null | undefined): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return Number(value);
    return value.toNumber();
  }

export function percent(value: number, denominator: number) {
    if (denominator <= 0) return 0;
    return Number(((value / denominator) * 100).toFixed(1));
  }

export function computeAdjustmentFactor(
    close: { toNumber?(): number } | number | string | null | undefined,
    adjustedClose: { toNumber?(): number } | number | string | null | undefined,
  ): number {
    if (close == null || adjustedClose == null) return 1;
    const c = typeof (close as any).toNumber === 'function' ? (close as any).toNumber() : Number(close);
    const ac = typeof (adjustedClose as any).toNumber === 'function' ? (adjustedClose as any).toNumber() : Number(adjustedClose);
    if (!Number.isFinite(c) || c <= 0 || !Number.isFinite(ac) || ac <= 0) return 1;
    const factor = ac / c;
    return Number.isFinite(factor) && factor > 0 ? factor : 1;
  }

export function assignIfChanged(target: Prisma.StockUpdateInput, key: string, next: unknown, current: unknown) {
    if (next === undefined || next === null) return;
    if (next !== current) (target as any)[key] = next;
  }

export function assignIdentityIfChanged(target: Prisma.StockUpdateInput, key: string, next: unknown, current: unknown, force: boolean) {
    if (next === undefined || next === null) return;
    if (typeof next === 'string' && next.trim().length === 0) return;
    if (!force && current !== null && current !== undefined && !(typeof current === 'string' && current.trim().length === 0)) return;
    if (next !== current) (target as any)[key] = next;
  }

export function keepExistingIfBlank<T>(next: T | null | undefined, current: T | null): T | null {
    if (typeof next === 'string' && next.trim().length === 0) return current;
    return next === null || next === undefined ? current : next;
  }

export function keepExistingRequiredIfBlank(next: string | null | undefined, current: string): string {
    if (typeof next === 'string' && next.trim().length > 0) return next;
    return current;
  }
