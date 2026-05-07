/// <reference types="@types/jest" />
import { SignalGenerationEngineRepository, type SignalResultDto } from '../../../src/modules/signal-generation-engine';

const signal: SignalResultDto = {
  instrument_id: 'stock-1',
  symbol: 'AAPL',
  company_name: 'Apple',
  sector: 'Technology',
  country: 'US',
  currentPrice: null,
  previousClose: null,
  dailyChange: null,
  dailyChangePercent: null,
  currency: null,
  priceTimestamp: null,
  score: 75,
  direction: 'BULLISH',
  confidence: 'HIGH',
  triggered_signals: [{ code: 'PRICE_ABOVE_SMA50', label: 'price above SMA50', category: 'TECHNICAL' }],
  negative_signals: [],
  explanation: 'Bullish because price is above SMA50.',
  generated_at: '2026-04-29T15:45:00.000Z',
  modelVersion: 'signal-engine-v1',
  source: 'signal-generation-engine',
  data_status: 'COMPLETE',
};

describe('SignalGenerationEngineRepository', () => {
  it('upserts same-day signal results by instrument, model version, and normalized generated date', async () => {
    const upsert = jest.fn().mockResolvedValue({
      id: 'signal-1',
      instrumentId: 'stock-1',
      symbol: 'AAPL',
      companyName: 'Apple',
      sector: 'Technology',
      country: 'US',
      score: 75,
      direction: 'BULLISH',
      confidence: 'HIGH',
      triggeredSignals: signal.triggered_signals,
      negativeSignals: [],
      explanation: signal.explanation,
      generatedAt: new Date(signal.generated_at),
      modelVersion: 'signal-engine-v1',
      source: 'signal-generation-engine',
      dataStatus: 'COMPLETE',
    });
    const repository = new SignalGenerationEngineRepository({ signalResult: { upsert } } as any);

    const saved = await repository.createSignalResult(signal);

    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        instrumentId_modelVersion_generatedDate: {
          instrumentId: 'stock-1',
          modelVersion: 'signal-engine-v1',
          generatedDate: new Date('2026-04-29T00:00:00.000Z'),
        },
      },
    }));
    expect(upsert.mock.calls[0][0].create.generatedDate).toEqual(new Date('2026-04-29T00:00:00.000Z'));
    expect(saved).toMatchObject({ id: 'signal-1', instrument_id: 'stock-1', score: 75 });
  });

  it('applies searchable, partial, and confidence filters to latest signals', async () => {
    const findMany = jest.fn().mockResolvedValue([{
      id: 'signal-1',
      instrumentId: 'stock-1',
      symbol: 'AAPL',
      companyName: 'Apple',
      sector: 'Technology',
      country: 'US',
      score: 75,
      direction: 'BULLISH',
      confidence: 'HIGH',
      triggeredSignals: [],
      negativeSignals: [],
      explanation: signal.explanation,
      generatedAt: new Date(signal.generated_at),
      modelVersion: 'signal-engine-v1',
      source: 'signal-generation-engine',
      dataStatus: 'COMPLETE',
    }, {
      id: 'signal-2',
      instrumentId: 'stock-2',
      symbol: 'MSFT',
      companyName: 'Microsoft',
      sector: 'Technology',
      country: 'US',
      score: 55,
      direction: 'NEUTRAL',
      confidence: 'MEDIUM',
      triggeredSignals: [],
      negativeSignals: [],
      explanation: signal.explanation,
      generatedAt: new Date(signal.generated_at),
      modelVersion: 'signal-engine-v1',
      source: 'signal-generation-engine',
      dataStatus: 'COMPLETE',
    }]);
    const repository = new SignalGenerationEngineRepository({ signalResult: { findMany } } as any);

    const result = await repository.latestSignals({
      direction: 'BULLISH',
      confidence: 'HIGH',
      minScore: 70,
      sector: 'tech',
      country: 'us',
      search: 'app',
      limit: 25,
    });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        sector: { contains: 'tech', mode: 'insensitive' },
        country: { contains: 'us', mode: 'insensitive' },
        OR: [
          { symbol: { contains: 'app', mode: 'insensitive' } },
          { companyName: { contains: 'app', mode: 'insensitive' } },
        ],
      }),
    }));
    expect(findMany.mock.calls[0][0].where.direction).toBeUndefined();
    expect(findMany.mock.calls[0][0].where.confidence).toBeUndefined();
    expect(findMany.mock.calls[0][0].where.score).toBeUndefined();
    expect(result.signals.map((item) => item.symbol)).toEqual(['AAPL']);
    expect(result.total).toBe(1);
  });

  it('treats STOCK scope as current stock rows plus legacy null and EQUITY asset types', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const repository = new SignalGenerationEngineRepository({ signalResult: { findMany } } as any);

    await repository.latestSignals({ limit: 25, region: 'IN', assetType: 'STOCK' });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        stock: {
          AND: expect.arrayContaining([
            expect.objectContaining({
              OR: expect.arrayContaining([
                { assetType: { in: ['STOCK', 'EQUITY'], mode: 'insensitive' } },
                { assetType: null },
              ]),
            }),
          ]),
        },
      }),
    }));
  });

  it('counts latest directions for the current scope without applying the selected direction', async () => {
    const findMany = jest.fn().mockResolvedValue([
      { ...signal, id: 's1', instrumentId: 'stock-1', direction: 'BULLISH', generatedAt: new Date(signal.generated_at), triggeredSignals: [], negativeSignals: [], dataStatus: 'COMPLETE' },
      { ...signal, id: 's2', instrumentId: 'stock-2', direction: 'NEUTRAL', generatedAt: new Date(signal.generated_at), triggeredSignals: [], negativeSignals: [], dataStatus: 'COMPLETE' },
      { ...signal, id: 's3', instrumentId: 'stock-3', direction: 'BEARISH', generatedAt: new Date(signal.generated_at), triggeredSignals: [], negativeSignals: [], dataStatus: 'COMPLETE' },
    ]);
    const repository = new SignalGenerationEngineRepository({ signalResult: { findMany } } as any);

    const counts = await repository.directionCounts({ direction: 'BULLISH', region: 'IN', assetType: 'STOCK', limit: 25 });

    expect(counts).toEqual({ BULLISH: 1, NEUTRAL: 1, BEARISH: 1 });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.not.objectContaining({ direction: 'BULLISH' }),
    }));
  });
});
