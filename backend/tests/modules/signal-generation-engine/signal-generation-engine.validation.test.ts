/// <reference types="@types/jest" />
import { normalizeDirection, normalizeSignalSortBy, parseRunRequest, parseSignalQuery, validateInstrumentId } from '../../../src/modules/signal-generation-engine';

describe('signal generation validation', () => {
  it('normalizes direction values', () => {
    expect(normalizeDirection('bullish')).toBe('BULLISH');
    expect(normalizeDirection('nope')).toBeUndefined();
  });

  it('parses query filters with safe limits', () => {
    expect(parseSignalQuery({ direction: 'bearish', confidence: 'high', minScore: '110', limit: '999', offset: '10', sector: 'Tech', search: 'apple', region: 'in', assetType: 'stock', sortBy: 'generatedAt', sortDirection: 'ASC' })).toMatchObject({
      direction: 'BEARISH',
      confidence: 'HIGH',
      minScore: 100,
      limit: 100,
      offset: 10,
      sector: 'Tech',
      search: 'apple',
      region: 'IN',
      assetType: 'STOCK',
      sortBy: 'generatedAt',
      sortDirection: 'asc',
    });
  });

  it('defaults unsupported sort values safely', () => {
    expect(normalizeSignalSortBy('symbol')).toBe('symbol');
    expect(normalizeSignalSortBy('generated_at')).toBeUndefined();
    expect(parseSignalQuery({ sortBy: 'DROP TABLE', sortDirection: 'sideways' })).toMatchObject({
      sortBy: undefined,
      sortDirection: undefined,
    });
  });

  it('parses run request and validates instrument id', () => {
    expect(parseRunRequest({ symbol: 'aapl', limit: 0, region: 'india', assetType: 'stock' })).toMatchObject({ symbol: 'AAPL', limit: 1, region: 'IN', assetType: 'STOCK' });
    expect(parseRunRequest({ batchSize: 999, offset: '25', force: true })).toMatchObject({ batchSize: 100, offset: 25, force: true });
    expect(validateInstrumentId('')).toBe('instrumentId is required');
  });
});
