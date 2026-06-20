import { describe, it, expect } from 'vitest';
import { sma } from './sma';

describe('sma', () => {
  it('returns empty array for empty input', () => {
    expect(sma([], 3)).toEqual([]);
  });

  it('returns all nulls when period > length', () => {
    expect(sma([1, 2], 5)).toEqual([null, null]);
  });

  it('returns all nulls for period <= 0', () => {
    expect(sma([1, 2, 3], 0)).toEqual([null, null, null]);
    expect(sma([1, 2, 3], -1)).toEqual([null, null, null]);
  });

  it('period 1 returns identity', () => {
    expect(sma([10, 20, 30], 1)).toEqual([10, 20, 30]);
  });

  it('computes 3-period SMA correctly', () => {
    const result = sma([1, 2, 3, 4, 5], 3);
    expect(result[0]).toBeNull();
    expect(result[1]).toBeNull();
    expect(result[2]).toBeCloseTo(2);
    expect(result[3]).toBeCloseTo(3);
    expect(result[4]).toBeCloseTo(4);
  });

  it('computes 5-period SMA correctly', () => {
    const result = sma([10, 20, 30, 40, 50, 60], 5);
    expect(result.slice(0, 4)).toEqual([null, null, null, null]);
    expect(result[4]).toBeCloseTo(30);
    expect(result[5]).toBeCloseTo(40);
  });
});
