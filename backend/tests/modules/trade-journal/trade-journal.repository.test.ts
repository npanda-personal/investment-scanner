/// <reference types="@types/jest" />
import { computeRealizedReturnPct } from '../../../src/modules/trade-journal';

// ---------------------------------------------------------------------------
// computeRealizedReturnPct — the pure formula exported from the repository
// ---------------------------------------------------------------------------

describe('computeRealizedReturnPct', () => {
  describe('LONG direction', () => {
    it('returns positive value when exit > entry', () => {
      expect(computeRealizedReturnPct('LONG', 1000, 1100)).toBeCloseTo(0.1, 8);
    });

    it('returns negative value when exit < entry', () => {
      expect(computeRealizedReturnPct('LONG', 1000, 900)).toBeCloseTo(-0.1, 8);
    });

    it('returns 0 when exit === entry', () => {
      expect(computeRealizedReturnPct('LONG', 1000, 1000)).toBeCloseTo(0, 8);
    });
  });

  describe('SHORT direction', () => {
    it('returns positive value when exit < entry (short profit)', () => {
      expect(computeRealizedReturnPct('SHORT', 1000, 900)).toBeCloseTo(0.1, 8);
    });

    it('returns negative value when exit > entry (short loss)', () => {
      expect(computeRealizedReturnPct('SHORT', 1000, 1100)).toBeCloseTo(-0.1, 8);
    });

    it('returns 0 when exit === entry', () => {
      expect(computeRealizedReturnPct('SHORT', 1000, 1000)).toBeCloseTo(0, 8);
    });
  });

  describe('null / zero guard', () => {
    it('returns null when entryPrice is null', () => {
      expect(computeRealizedReturnPct('LONG', null, 1000)).toBeNull();
    });

    it('returns null when exitPrice is null', () => {
      expect(computeRealizedReturnPct('LONG', 1000, null)).toBeNull();
    });

    it('returns null when entryPrice is 0 (division guard)', () => {
      expect(computeRealizedReturnPct('LONG', 0, 1000)).toBeNull();
    });

    it('returns null when both are null', () => {
      expect(computeRealizedReturnPct('SHORT', null, null)).toBeNull();
    });
  });
});
