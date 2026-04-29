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
});
