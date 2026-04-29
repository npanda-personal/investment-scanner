/// <reference types="@types/jest" />
import { SignalCalibrationEngineRepository, type SignalCalibrationResultDto } from '../../../src/modules/signal-calibration-engine';

const calibration: SignalCalibrationResultDto = {
  signalResultId: 'signal-1',
  instrumentId: 'stock-1',
  symbol: 'AAPL',
  companyName: 'Apple',
  sector: 'Technology',
  country: 'US',
  rawScore: 72,
  calibratedScore: 78,
  scoreDelta: 6,
  rawDirection: 'BULLISH',
  calibratedDirection: 'BULLISH',
  rawConfidence: 'MEDIUM',
  calibratedConfidence: 'HIGH',
  boosts: [{ type: 'REGIME', label: 'Risk-on regime', delta: 3 }],
  penalties: [],
  calibrationReasons: ['Risk-on context supports the raw signal.'],
  dataGaps: [],
  calibrationModelVersion: 'signal-calibration-v1',
  rawSignalModelVersion: 'signal-engine-v1',
  generatedAt: '2026-04-29T15:45:00.000Z',
  dataStatus: 'COMPLETE',
  researchUrl: '/research/stocks/stock-1',
};

describe('SignalCalibrationEngineRepository', () => {
  it('upserts calibration results by raw signal and calibration model version', async () => {
    const upsert = jest.fn().mockResolvedValue({
      id: 'calibration-1',
      ...calibration,
      signalResultId: 'signal-1',
      generatedAt: new Date(calibration.generatedAt),
    });
    const repository = new SignalCalibrationEngineRepository({ signalCalibrationResult: { upsert } } as any);

    const saved = await repository.create(calibration);

    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        signalResultId_calibrationModelVersion: {
          signalResultId: 'signal-1',
          calibrationModelVersion: 'signal-calibration-v1',
        },
      },
    }));
    expect(saved).toMatchObject({ id: 'calibration-1', signalResultId: 'signal-1', calibratedScore: 78 });
  });
});
