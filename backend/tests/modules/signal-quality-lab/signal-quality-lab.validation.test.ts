/// <reference types="@types/jest" />
import { parseQualityQuery, requireInstrumentId } from '../../../src/modules/signal-quality-lab';

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
});
