import { describe, it, expect } from 'vitest';
import { aggregateBars } from './aggregation';
import type { OHLCVBar } from '../types';

const mkBar = (time: string, o: number, h: number, l: number, c: number, v: number | null = 1000): OHLCVBar => ({
  time, open: o, high: h, low: l, close: c, volume: v,
});

describe('aggregateBars', () => {
  it('1D is a pass-through returning same reference', () => {
    const bars = [mkBar('2024-06-17', 100, 110, 95, 105)];
    expect(aggregateBars(bars, '1D')).toBe(bars);
  });

  it('empty input returns empty', () => {
    expect(aggregateBars([], '1W')).toEqual([]);
    expect(aggregateBars([], '1M')).toEqual([]);
  });

  describe('weekly aggregation', () => {
    it('groups Mon–Fri into one bar keyed to Monday', () => {
      const bars = [
        mkBar('2024-06-17', 100, 115, 98, 110, 500),  // Mon
        mkBar('2024-06-18', 110, 120, 105, 108, 600),  // Tue
        mkBar('2024-06-19', 108, 112, 100, 111, 400),  // Wed
        mkBar('2024-06-20', 111, 118, 107, 115, 700),  // Thu
        mkBar('2024-06-21', 115, 125, 110, 120, 800),  // Fri
      ];
      const result = aggregateBars(bars, '1W');
      expect(result).toHaveLength(1);
      expect(result[0].time).toBe('2024-06-17');
      expect(result[0].open).toBe(100);
      expect(result[0].close).toBe(120);
      expect(result[0].high).toBe(125);
      expect(result[0].low).toBe(98);
      expect(result[0].volume).toBe(3000);
    });

    it('Sunday groups with the prior Monday (ISO week)', () => {
      const bars = [
        mkBar('2024-06-21', 100, 110, 95, 105, 500),  // Fri
        mkBar('2024-06-23', 105, 112, 100, 108, 600),  // Sun → same week as Fri (Mon=Jun 17)
      ];
      const result = aggregateBars(bars, '1W');
      expect(result).toHaveLength(1);
      expect(result[0].time).toBe('2024-06-17');
    });

    it('separates bars from different weeks', () => {
      const bars = [
        mkBar('2024-06-21', 100, 110, 95, 105),  // Fri week of Jun 17
        mkBar('2024-06-24', 105, 112, 100, 108),  // Mon week of Jun 24
      ];
      const result = aggregateBars(bars, '1W');
      expect(result).toHaveLength(2);
      expect(result[0].time).toBe('2024-06-17');
      expect(result[1].time).toBe('2024-06-24');
    });
  });

  describe('monthly aggregation', () => {
    it('groups by calendar month with time = YYYY-MM-01', () => {
      const bars = [
        mkBar('2024-06-03', 100, 115, 98, 110, 500),
        mkBar('2024-06-28', 110, 120, 105, 118, 600),
        mkBar('2024-07-01', 118, 125, 112, 122, 700),
      ];
      const result = aggregateBars(bars, '1M');
      expect(result).toHaveLength(2);
      expect(result[0].time).toBe('2024-06-01');
      expect(result[0].open).toBe(100);
      expect(result[0].close).toBe(118);
      expect(result[0].high).toBe(120);
      expect(result[0].low).toBe(98);
      expect(result[0].volume).toBe(1100);
      expect(result[1].time).toBe('2024-07-01');
    });
  });

  describe('volume handling', () => {
    it('null volume stays null when all bars have null volume', () => {
      const bars = [
        mkBar('2024-06-17', 100, 110, 95, 105, null),
        mkBar('2024-06-18', 105, 112, 100, 108, null),
      ];
      const result = aggregateBars(bars, '1W');
      expect(result[0].volume).toBeNull();
    });

    it('sums non-null volumes ignoring nulls', () => {
      const bars = [
        mkBar('2024-06-17', 100, 110, 95, 105, 500),
        mkBar('2024-06-18', 105, 112, 100, 108, null),
        mkBar('2024-06-19', 108, 115, 103, 112, 300),
      ];
      const result = aggregateBars(bars, '1W');
      expect(result[0].volume).toBe(800);
    });
  });
});
