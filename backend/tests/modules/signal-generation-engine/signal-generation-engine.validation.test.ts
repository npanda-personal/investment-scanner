/// <reference types="@types/jest" />
import { normalizeDirection, parseRunRequest, parseSignalQuery, validateInstrumentId } from '../../../src/modules/signal-generation-engine';

describe('signal generation validation', () => {
  it('normalizes direction values', () => {
    expect(normalizeDirection('bullish')).toBe('BULLISH');
    expect(normalizeDirection('nope')).toBeUndefined();
  });

  it('parses query filters with safe limits', () => {
    expect(parseSignalQuery({ direction: 'bearish', confidence: 'high', minScore: '110', limit: '999', sector: 'Tech', search: 'apple' })).toMatchObject({
      direction: 'BEARISH',
      confidence: 'HIGH',
      minScore: 100,
      limit: 100,
      sector: 'Tech',
      search: 'apple',
    });
  });

  it('parses run request and validates instrument id', () => {
    expect(parseRunRequest({ symbol: 'aapl', limit: 0 })).toMatchObject({ symbol: 'AAPL', limit: 1 });
    expect(validateInstrumentId('')).toBe('instrumentId is required');
  });
});
