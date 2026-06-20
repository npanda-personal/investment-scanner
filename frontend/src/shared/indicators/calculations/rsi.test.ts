import { describe, it, expect } from 'vitest';
import { rsi, stochRsi } from './rsi';

describe('rsi', () => {
  it('returns all nulls when data <= period', () => {
    expect(rsi([100, 101, 102], 14)).toEqual([null, null, null]);
  });

  it('first period entries are null', () => {
    const closes = Array.from({ length: 20 }, (_, i) => 100 + i);
    const result = rsi(closes, 14);
    for (let i = 0; i < 14; i++) expect(result[i]).toBeNull();
    expect(result[14]).not.toBeNull();
  });

  it('RSI = 100 when all changes are gains', () => {
    const closes = Array.from({ length: 20 }, (_, i) => 100 + i);
    const result = rsi(closes, 14);
    expect(result[14]).toBeCloseTo(100);
  });

  it('RSI = 0 when all changes are losses', () => {
    const closes = Array.from({ length: 20 }, (_, i) => 200 - i);
    const result = rsi(closes, 14);
    expect(result[14]).toBeCloseTo(0);
  });

  it('RSI is near 50 for alternating gains/losses of equal size', () => {
    const closes: number[] = [100];
    for (let i = 1; i < 30; i++) closes.push(closes[i - 1] + (i % 2 === 0 ? -1 : 1));
    const result = rsi(closes, 14);
    const last = result[result.length - 1]!;
    expect(last).toBeGreaterThan(40);
    expect(last).toBeLessThan(60);
  });

  it('all values are in 0–100 range', () => {
    const closes = [100, 105, 98, 110, 95, 102, 108, 97, 115, 90, 100, 105, 98, 110, 95, 102];
    const result = rsi(closes, 5);
    for (const v of result) {
      if (v !== null) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe('stochRsi', () => {
  it('returns k and d arrays of correct length', () => {
    const closes = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i) * 10);
    const { k, d } = stochRsi(closes);
    expect(k).toHaveLength(50);
    expect(d).toHaveLength(50);
  });

  it('non-null values are in 0–1 range (raw stochastic scale)', () => {
    const closes = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i) * 10);
    const { k, d } = stochRsi(closes);
    for (const v of k) {
      if (v !== null) {
        expect(v).toBeGreaterThanOrEqual(-0.001);
        expect(v).toBeLessThanOrEqual(1.001);
      }
    }
    for (const v of d) {
      if (v !== null) {
        expect(v).toBeGreaterThanOrEqual(-0.001);
        expect(v).toBeLessThanOrEqual(1.001);
      }
    }
  });

  it('returns all nulls when data is too short', () => {
    const closes = [100, 101, 102];
    const { k, d } = stochRsi(closes);
    expect(k.every((v) => v === null)).toBe(true);
    expect(d.every((v) => v === null)).toBe(true);
  });
});
