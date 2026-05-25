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
      signalCalibrationResult: { findMany },
    } as any);

    const page = await repository.top({ region: 'IN', assetType: 'STOCK', limit: 25, offset: 0, sortBy: 'calibratedScore', sortDirection: 'desc' });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ instrumentId: { in: ['stock-in-1'] } }),
      orderBy: [{ generatedAt: 'desc' }, { updatedAt: 'desc' }, { id: 'asc' }],
      distinct: ['instrumentId'],
    }));
    expect(page).toMatchObject({ totalCount: 1, limit: 25, offset: 0, hasMore: false });
    expect(page.items[0]).toMatchObject({ instrumentId: 'stock-in-1', region: 'IN', exchange: 'NSE', assetType: 'STOCK' });
  });

  it('returns only the latest calibration row per instrument in top results', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: 'calibration-latest-stock-1',
        ...calibration,
        signalResultId: 'signal-latest-stock-1',
        instrumentId: 'stock-1',
        symbol: 'AAPL',
        calibratedScore: 82,
        generatedAt: new Date('2026-05-26T09:30:00.000Z'),
        updatedAt: new Date('2026-05-26T09:30:00.000Z'),
      },
      {
        id: 'calibration-old-stock-1',
        ...calibration,
        signalResultId: 'signal-old-stock-1',
        instrumentId: 'stock-1',
        symbol: 'AAPL',
        calibratedScore: 95,
        generatedAt: new Date('2026-05-25T09:30:00.000Z'),
        updatedAt: new Date('2026-05-25T09:30:00.000Z'),
      },
      {
        id: 'calibration-stock-2',
        ...calibration,
        signalResultId: 'signal-stock-2',
        instrumentId: 'stock-2',
        symbol: 'MSFT',
        calibratedScore: 88,
        generatedAt: new Date('2026-05-26T09:00:00.000Z'),
        updatedAt: new Date('2026-05-26T09:00:00.000Z'),
      },
    ]);
    const repository = new SignalCalibrationEngineRepository({
      stock: { findMany: jest.fn().mockResolvedValue([]) },
      signalCalibrationResult: { findMany },
    } as any);

    const page = await repository.top({ region: 'GLOBAL', assetType: undefined, limit: 25, offset: 0, sortBy: 'calibratedScore', sortDirection: 'desc' });

    expect(page.totalCount).toBe(2);
    expect(page.items.map((item) => item.id)).toEqual(['calibration-stock-2', 'calibration-latest-stock-1']);
    expect(page.items.filter((item) => item.instrumentId === 'stock-1')).toHaveLength(1);
  });

  it('reports hasMore from filtered latest-row pagination', async () => {
    const rows = ['A', 'B', 'C'].map((symbol, index) => ({
      id: `calibration-${symbol}`,
      ...calibration,
      signalResultId: `signal-${symbol}`,
      instrumentId: `stock-${symbol}`,
      symbol,
      calibratedScore: 90 - index,
      generatedAt: new Date(`2026-05-26T09:0${index}:00.000Z`),
      updatedAt: new Date(`2026-05-26T09:0${index}:00.000Z`),
    }));
    const repository = new SignalCalibrationEngineRepository({
      stock: { findMany: jest.fn().mockResolvedValue([]) },
      signalCalibrationResult: { findMany: jest.fn().mockResolvedValue(rows) },
    } as any);

    const firstPage = await repository.top({ region: 'GLOBAL', assetType: undefined, limit: 2, offset: 0, sortBy: 'calibratedScore', sortDirection: 'desc' });
    const secondPage = await repository.top({ region: 'GLOBAL', assetType: undefined, limit: 2, offset: 2, sortBy: 'calibratedScore', sortDirection: 'desc' });

    expect(firstPage).toMatchObject({ totalCount: 3, hasMore: true });
    expect(firstPage.items).toHaveLength(2);
    expect(secondPage).toMatchObject({ totalCount: 3, hasMore: false });
    expect(secondPage.items).toHaveLength(1);
  });

  it('supports delta sorting and calibration confidence filtering', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const repository = new SignalCalibrationEngineRepository({
      stock: { findMany: jest.fn().mockResolvedValue([]) },
      signalCalibrationResult: { findMany },
    } as any);

    await repository.top({ region: 'GLOBAL', assetType: undefined, limit: 10, offset: 0, sortBy: 'scoreDelta', sortDirection: 'asc', calibrationConfidence: 'LOW' });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: [{ generatedAt: 'desc' }, { updatedAt: 'desc' }, { id: 'asc' }],
      distinct: ['instrumentId'],
    }));
  });
});
