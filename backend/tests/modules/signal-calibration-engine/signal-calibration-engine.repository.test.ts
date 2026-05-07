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

  it('paginates scoped calibration rows and attaches market metadata', async () => {
    const stockFindMany = jest
      .fn()
      .mockResolvedValueOnce([{ id: 'stock-in-1' }])
      .mockResolvedValueOnce([{ id: 'stock-in-1', exchange: 'NSE', region: 'IN', assetType: 'STOCK', country: 'India', name: 'India Co' }]);
    const count = jest.fn().mockResolvedValue(1);
    const findMany = jest.fn().mockResolvedValue([{
      id: 'calibration-1',
      ...calibration,
      instrumentId: 'stock-in-1',
      symbol: 'INDIA',
      country: null,
      generatedAt: new Date(calibration.generatedAt),
    }]);
    const repository = new SignalCalibrationEngineRepository({
      stock: { findMany: stockFindMany },
      signalCalibrationResult: { count, findMany },
    } as any);

    const page = await repository.top({ region: 'IN', assetType: 'STOCK', limit: 25, offset: 0, sortBy: 'calibratedScore', sortDirection: 'desc' });

    expect(count).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ instrumentId: { in: ['stock-in-1'] } }),
    }));
    expect(page).toMatchObject({ totalCount: 1, limit: 25, offset: 0, hasMore: false });
    expect(page.items[0]).toMatchObject({ instrumentId: 'stock-in-1', region: 'IN', exchange: 'NSE', assetType: 'STOCK' });
  });

  it('supports delta sorting and calibration confidence filtering', async () => {
    const count = jest.fn().mockResolvedValue(0);
    const findMany = jest.fn().mockResolvedValue([]);
    const repository = new SignalCalibrationEngineRepository({
      stock: { findMany: jest.fn().mockResolvedValue([]) },
      signalCalibrationResult: { count, findMany },
    } as any);

    await repository.top({ region: 'GLOBAL', assetType: undefined, limit: 10, offset: 0, sortBy: 'scoreDelta', sortDirection: 'asc', calibrationConfidence: 'LOW' });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ calibratedConfidence: 'LOW' }),
      orderBy: [{ scoreDelta: 'asc' }, { id: 'asc' }],
    }));
  });
});
