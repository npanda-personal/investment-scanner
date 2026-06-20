import { describe, it, expect } from 'vitest';
import { sortScreenerRows } from './screener-sort';
import type { ScreenerRow } from '../types';

// Minimal row factory — only populate the field under test.
function row(fields: Partial<ScreenerRow>): ScreenerRow {
  return { instrumentId: '', symbol: '', companyName: '', price: null, signalDirection: null,
    signalScore: null, rsPercentile: null, sector: null, capBand: null, deliveryPct: null,
    range52wPositionPct: null, inFnoBan: false, buildupLabel: null, oiChangePct: null,
    pcrOi: null, fnoReadinessScore: null, fnoGrade: null, fnoComponents: null,
    scoreDeltaPrev: null, isNewEntry: false, factorFamilies: null, sparkline: null,
    currency: 'INR', ...fields };
}

describe('sortScreenerRows', () => {
  describe('numeric sort', () => {
    it('sorts asc by signalScore', () => {
      const rows = [row({ signalScore: 80 }), row({ signalScore: 30 }), row({ signalScore: 55 })];
      const result = sortScreenerRows(rows, 'signalScore', 'asc');
      expect(result.map(r => r.signalScore)).toEqual([30, 55, 80]);
    });

    it('sorts desc by signalScore', () => {
      const rows = [row({ signalScore: 30 }), row({ signalScore: 80 }), row({ signalScore: 55 })];
      const result = sortScreenerRows(rows, 'signalScore', 'desc');
      expect(result.map(r => r.signalScore)).toEqual([80, 55, 30]);
    });
  });

  describe('null-last ordering', () => {
    it('puts nulls last on asc sort', () => {
      const rows = [row({ signalScore: null }), row({ signalScore: 50 }), row({ signalScore: null }), row({ signalScore: 10 })];
      const result = sortScreenerRows(rows, 'signalScore', 'asc');
      expect(result.map(r => r.signalScore)).toEqual([10, 50, null, null]);
    });

    it('puts nulls last on desc sort', () => {
      const rows = [row({ signalScore: 50 }), row({ signalScore: null }), row({ signalScore: 10 })];
      const result = sortScreenerRows(rows, 'signalScore', 'desc');
      expect(result.map(r => r.signalScore)).toEqual([50, 10, null]);
    });

    it('two nulls compare as equal (stable relative order irrelevant)', () => {
      const rows = [row({ price: null }), row({ price: null })];
      const result = sortScreenerRows(rows, 'price', 'asc');
      expect(result.every(r => r.price === null)).toBe(true);
    });
  });

  describe('string sort', () => {
    it('sorts symbol asc (localeCompare)', () => {
      const rows = [row({ symbol: 'ZEEL' }), row({ symbol: 'INFY' }), row({ symbol: 'AAPL' })];
      const result = sortScreenerRows(rows, 'symbol', 'asc');
      expect(result.map(r => r.symbol)).toEqual(['AAPL', 'INFY', 'ZEEL']);
    });

    it('sorts symbol desc', () => {
      const rows = [row({ symbol: 'AAPL' }), row({ symbol: 'ZEEL' }), row({ symbol: 'INFY' })];
      const result = sortScreenerRows(rows, 'symbol', 'desc');
      expect(result.map(r => r.symbol)).toEqual(['ZEEL', 'INFY', 'AAPL']);
    });
  });

  describe('immutability', () => {
    it('does not mutate the original array', () => {
      const rows = [row({ signalScore: 80 }), row({ signalScore: 10 }), row({ signalScore: 55 })];
      const original = [...rows];
      sortScreenerRows(rows, 'signalScore', 'asc');
      expect(rows).toEqual(original);
    });
  });
});
