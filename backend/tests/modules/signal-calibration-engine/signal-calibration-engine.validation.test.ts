/// <reference types="@types/jest" />
import { parseCalibrationQuery, parseCalibrationRunRequest, requireInstrumentId, safeModelVersion } from '../../../src/modules/signal-calibration-engine';

describe('signal calibration engine validation', () => {
  it('parses and clamps query params', () => {
    expect(parseCalibrationQuery({ direction: 'BULLISH', minScore: '-5', limit: '999' })).toMatchObject({
      direction: 'BULLISH',
      minScore: 0,
      limit: 100,
    });
  });

  it('parses run requests', () => {
    expect(parseCalibrationRunRequest({ symbol: ' aapl ', limit: 0 })).toMatchObject({ symbol: 'AAPL', limit: 1 });
    expect(parseCalibrationRunRequest({ batchSize: 500, offset: 3 })).toMatchObject({ batchSize: 100, offset: 3 });
    expect(parseCalibrationRunRequest({ batchSize: 0, cursor: 7 })).toMatchObject({ batchSize: 1, offset: 7 });
  });

  it('validates ids and model versions', () => {
    expect(() => requireInstrumentId('')).toThrow('instrumentId is required');
    expect(safeModelVersion('signal-calibration-v1')).toBe('signal-calibration-v1');
    expect(() => safeModelVersion('../bad')).toThrow('model version is invalid');
  });
});
