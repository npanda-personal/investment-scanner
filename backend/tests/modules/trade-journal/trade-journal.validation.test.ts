/// <reference types="@types/jest" />
import {
  validateCreateEntry,
  validateUpdateEntry,
  parseListFilters,
  normalizeTags,
} from '../../../src/modules/trade-journal';

const ISO = '2026-06-04T09:00:00.000Z';

describe('validateCreateEntry', () => {
  const valid = {
    symbol: 'RELIANCE',
    direction: 'LONG' as const,
    decision: 'ACTED' as const,
    reviewedAt: ISO,
  };

  it('passes for minimal valid input', () => {
    expect(validateCreateEntry(valid)).toEqual([]);
  });

  it('requires symbol', () => {
    expect(validateCreateEntry({ ...valid, symbol: '' })).toContain('symbol is required');
  });

  it('requires valid direction', () => {
    expect(validateCreateEntry({ ...valid, direction: 'HOLD' as any })).toEqual(
      expect.arrayContaining([expect.stringContaining('direction')]),
    );
  });

  it('requires valid decision', () => {
    expect(validateCreateEntry({ ...valid, decision: 'PASS' as any })).toEqual(
      expect.arrayContaining([expect.stringContaining('decision')]),
    );
  });

  it('requires valid ISO reviewedAt', () => {
    expect(validateCreateEntry({ ...valid, reviewedAt: 'not-a-date' })).toEqual(
      expect.arrayContaining([expect.stringContaining('reviewedAt')]),
    );
  });

  it('rejects conviction outside 1-10', () => {
    expect(validateCreateEntry({ ...valid, conviction: 0 })).toEqual(
      expect.arrayContaining([expect.stringContaining('conviction')]),
    );
    expect(validateCreateEntry({ ...valid, conviction: 11 })).toEqual(
      expect.arrayContaining([expect.stringContaining('conviction')]),
    );
  });

  it('accepts conviction at boundary values 1 and 10', () => {
    expect(validateCreateEntry({ ...valid, conviction: 1 })).toEqual([]);
    expect(validateCreateEntry({ ...valid, conviction: 10 })).toEqual([]);
  });

  it('rejects invalid outcomeStatus', () => {
    expect(validateCreateEntry({ ...valid, outcomeStatus: 'MAYBE' as any })).toEqual(
      expect.arrayContaining([expect.stringContaining('outcomeStatus')]),
    );
  });

  it('accepts valid outcomeStatus values', () => {
    expect(validateCreateEntry({ ...valid, outcomeStatus: 'OPEN' })).toEqual([]);
    expect(validateCreateEntry({ ...valid, outcomeStatus: 'CLOSED' })).toEqual([]);
    expect(validateCreateEntry({ ...valid, outcomeStatus: 'INVALIDATED' })).toEqual([]);
  });

  it('rejects negative entryPrice', () => {
    expect(validateCreateEntry({ ...valid, entryPrice: -1 })).toEqual(
      expect.arrayContaining([expect.stringContaining('entryPrice')]),
    );
  });

  it('rejects tags that exceed max count', () => {
    const tooManyTags = Array.from({ length: 21 }, (_, i) => `tag${i}`);
    expect(validateCreateEntry({ ...valid, tags: tooManyTags })).toEqual(
      expect.arrayContaining([expect.stringContaining('tags')]),
    );
  });
});

describe('validateUpdateEntry', () => {
  it('passes for empty update (all optional)', () => {
    expect(validateUpdateEntry({})).toEqual([]);
  });

  it('rejects blank symbol on update', () => {
    expect(validateUpdateEntry({ symbol: '   ' })).toEqual(
      expect.arrayContaining([expect.stringContaining('symbol')]),
    );
  });

  it('rejects invalid exitAt date', () => {
    expect(validateUpdateEntry({ exitAt: 'not-a-date' })).toEqual(
      expect.arrayContaining([expect.stringContaining('exitAt')]),
    );
  });
});

describe('parseListFilters', () => {
  it('accepts valid decision filter', () => {
    const f = parseListFilters({ decision: 'SKIPPED' });
    expect(f.decision).toBe('SKIPPED');
  });

  it('ignores unknown decision', () => {
    const f = parseListFilters({ decision: 'UNKNOWN' });
    expect(f.decision).toBeUndefined();
  });

  it('normalizes symbol to uppercase', () => {
    const f = parseListFilters({ symbol: 'tcs' });
    expect(f.symbol).toBe('TCS');
  });

  it('defaults page to 1 and pageSize to 25', () => {
    const f = parseListFilters({});
    expect(f.page).toBe(1);
    expect(f.pageSize).toBe(25);
  });

  it('caps pageSize at 100', () => {
    const f = parseListFilters({ pageSize: '999' });
    expect(f.pageSize).toBe(100);
  });

  it('ignores invalid date strings for fromDate/toDate', () => {
    const f = parseListFilters({ fromDate: 'bad', toDate: 'also-bad' });
    expect(f.fromDate).toBeUndefined();
    expect(f.toDate).toBeUndefined();
  });
});

describe('normalizeTags', () => {
  it('deduplicates and trims tags', () => {
    expect(normalizeTags(['  alpha ', 'beta', 'alpha'])).toEqual(['alpha', 'beta']);
  });

  it('returns empty array for undefined', () => {
    expect(normalizeTags(undefined)).toEqual([]);
  });

  it('filters blank strings', () => {
    expect(normalizeTags(['', '  ', 'valid'])).toEqual(['valid']);
  });
});
