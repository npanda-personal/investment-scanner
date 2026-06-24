import { describe, it, expect } from 'vitest';
import { compareSortValues, sortRows } from './useTableSort';

describe('compareSortValues', () => {
  it('orders numbers ascending and descending', () => {
    expect(compareSortValues(1, 2, 'asc')).toBeLessThan(0);
    expect(compareSortValues(1, 2, 'desc')).toBeGreaterThan(0);
    expect(compareSortValues(5, 5, 'asc')).toBe(0);
  });

  it('orders strings case-insensitively', () => {
    expect(compareSortValues('apple', 'Banana', 'asc')).toBeLessThan(0);
    expect(compareSortValues('apple', 'Banana', 'desc')).toBeGreaterThan(0);
    expect(compareSortValues('Abc', 'abc', 'asc')).toBe(0);
  });

  it('always sorts null/undefined/blank last, regardless of direction', () => {
    // Empty value is the second arg -> it must sort after (positive).
    expect(compareSortValues(10, null, 'asc')).toBeLessThan(0);
    expect(compareSortValues(10, null, 'desc')).toBeLessThan(0);
    // Empty value is the first arg -> it must sort after (positive).
    expect(compareSortValues(null, 10, 'asc')).toBeGreaterThan(0);
    expect(compareSortValues(null, 10, 'desc')).toBeGreaterThan(0);
    expect(compareSortValues(undefined, '', 'asc')).toBe(0);
    expect(compareSortValues('', 'x', 'asc')).toBeGreaterThan(0);
  });
});

describe('sortRows', () => {
  type Row = { name: string; score: number | null };
  const accessor = (r: Row, key: 'name' | 'score') => r[key];

  it('returns the input array unchanged when no key is active', () => {
    const rows: Row[] = [{ name: 'b', score: 1 }, { name: 'a', score: 2 }];
    expect(sortRows(rows, null, 'asc', accessor)).toBe(rows);
  });

  it('does not mutate the input array', () => {
    const rows: Row[] = [{ name: 'b', score: 1 }, { name: 'a', score: 2 }];
    const snapshot = [...rows];
    sortRows(rows, 'name', 'asc', accessor);
    expect(rows).toEqual(snapshot);
  });

  it('sorts by a numeric key with nulls last', () => {
    const rows: Row[] = [
      { name: 'a', score: null },
      { name: 'b', score: 30 },
      { name: 'c', score: 10 },
    ];
    expect(sortRows(rows, 'score', 'desc', accessor).map((r) => r.name)).toEqual(['b', 'c', 'a']);
    expect(sortRows(rows, 'score', 'asc', accessor).map((r) => r.name)).toEqual(['c', 'b', 'a']);
  });
});
