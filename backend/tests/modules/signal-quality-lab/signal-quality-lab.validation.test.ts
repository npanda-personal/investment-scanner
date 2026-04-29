/// <reference types="@types/jest" />
import { parseQualityQuery, parseQualityRecalculateRequest, requireInstrumentId } from '../../../src/modules/signal-quality-lab';

describe('signal quality lab validation', () => {
  it('parses and clamps query params', () => {
    expect(parseQualityQuery({ horizon: '5D', direction: 'BULLISH', limit: '99999', minSampleSize: '-1' })).toMatchObject({
      horizon: '5D',
      direction: 'BULLISH',
      limit: 5000,
      minSampleSize: 0,
    });
  });

  it('defaults invalid values safely', () => {
    expect(parseQualityQuery({ horizon: '9D', direction: 'BAD', from: 'nope' })).toMatchObject({
      horizon: '20D',
      direction: undefined,
      from: undefined,
    });
  });

  it('requires instrument id', () => {
    expect(() => requireInstrumentId('')).toThrow('instrumentId is required');
    expect(requireInstrumentId('abc')).toBe('abc');
  });

  it('parses recalculation batch request and clamps batch size', () => {
    expect(parseQualityRecalculateRequest({ batchSize: '999', offset: '10' })).toMatchObject({
      batchSize: 100,
      offset: 10,
    });
    expect(parseQualityRecalculateRequest({ cursor: '5', batchSize: '0' })).toMatchObject({
      batchSize: 1,
      offset: 5,
    });
    expect(() => parseQualityRecalculateRequest({ from: '2026-02-01', to: '2026-01-01' })).toThrow('from must be before to');
  });
});
