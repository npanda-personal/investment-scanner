/// <reference types="@types/jest" />
import { parseCalibrationQuery, parseCalibrationRunRequest, requireInstrumentId, safeModelVersion } from '../../../src/modules/signal-calibration-engine';

describe('signal calibration engine validation', () => {
  it('parses and clamps query params', () => {
    expect(parseCalibrationQuery({ direction: 'BULLISH', minScore: '-5', limit: '999', region: 'in', assetType: 'stock' })).toMatchObject({
      direction: 'BULLISH',
      minScore: 0,
      limit: 100,
      region: 'IN',
      assetType: 'STOCK',
    });
  });

  it('parses table filters and safe sort fields', () => {
    expect(parseCalibrationQuery({
      sortBy: 'scoreDelta',
      sortDirection: 'asc',
      calibrationConfidence: 'insufficient_sample',
      evidenceStatus: 'low_sample',
      minRawScore: '50',
      minCalibratedScore: '55',
      minAbsDelta: '3',
      hasDataGaps: 'true',
      horizon: '5d',
    })).toMatchObject({
      sortBy: 'scoreDelta',
      sortDirection: 'asc',
      calibrationConfidence: 'INSUFFICIENT_SAMPLE',
      evidenceStatus: 'LOW_SAMPLE',
      minRawScore: 50,
      minCalibratedScore: 55,
      minAbsDelta: 3,
      hasDataGaps: true,
      horizon: '5D',
    });
    expect(parseCalibrationQuery({ sortBy: 'unsafe' }).sortBy).toBe('calibratedScore');
  });

  it('parses run requests', () => {
    expect(parseCalibrationRunRequest({ symbol: ' aapl ', limit: 0 })).toMatchObject({ symbol: 'AAPL', limit: 1 });
    expect(parseCalibrationRunRequest({ batchSize: 500, offset: 3 })).toMatchObject({ batchSize: 100, offset: 3 });
    expect(parseCalibrationRunRequest({ batchSize: 0, cursor: 7 })).toMatchObject({ batchSize: 1, offset: 7 });
    expect(parseCalibrationRunRequest({ region: 'in', assetType: 'stock', horizon: '1d' })).toMatchObject({ region: 'IN', assetType: 'STOCK', horizon: '1D' });
  });

  it('validates ids and model versions', () => {
    expect(() => requireInstrumentId('')).toThrow('instrumentId is required');
    expect(safeModelVersion('signal-calibration-v1')).toBe('signal-calibration-v1');
    expect(() => safeModelVersion('../bad')).toThrow('model version is invalid');
  });
});
