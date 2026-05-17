/// <reference types="@types/jest" />
import { SignalGenerationEngineService } from '../../../src/modules/signal-generation-engine';

const trustedReadEvidence = {
  auditStatus: 'CURRENT' as const,
  dataQualityEligibility: {
    filterApplied: true,
    eligible: true,
    coverageStatus: 'GOOD',
    signalReadinessStatus: 'READY',
    liquidityStatus: 'LIQUID',
  },
};

const baseSignal = {
  id: 'signal-1',
  instrument_id: 'stock-1',
  symbol: 'ABC',
  company_name: 'ABC Co',
  sector: 'Technology',
  country: 'IN',
  currentPrice: null,
  previousClose: null,
  dailyChange: null,
  dailyChangePercent: null,
  currency: null,
  priceTimestamp: null,
  score: 80,
  direction: 'BULLISH' as const,
  confidence: 'HIGH' as const,
  triggered_signals: [{ code: 'PRICE_ABOVE_SMA50', label: 'price is above SMA50', category: 'TECHNICAL' as const }],
  negative_signals: [{ code: 'RSI_OVERBOUGHT_REVERSAL', label: 'RSI is reversing', category: 'TECHNICAL' as const }],
  explanation: 'Bullish because price is above SMA50.',
  generated_at: '2026-05-17T10:00:00.000Z',
  generatedDate: '2026-05-17T00:00:00.000Z',
  sourceDataDate: '2026-05-16T00:00:00.000Z',
  sourcePriceDate: '2026-05-16T00:00:00.000Z',
  modelVersion: 'signal-engine-v1',
  rulesetVersion: 'signal-engine-v1',
  generationRunId: 'run-1',
  source: 'signal-generation-engine',
  data_status: 'COMPLETE' as const,
  ...trustedReadEvidence,
};

const createService = (signal: any = baseSignal, instrument: any = { id: 'stock-1', symbol: 'ABC', asset_type: 'STOCK', region: 'IN', currency: 'INR' }) => {
  const repository = {
    latestSignals: jest.fn().mockResolvedValue({ signals: [signal], total: 1 }),
  };
  const marketDataService = {
    getInstrumentsByIds: jest.fn().mockResolvedValue([instrument]),
    getLatestPricesBySymbols: jest.fn().mockResolvedValue([{ symbol: 'ABC', adjusted_close: 105, date: '2026-05-16T00:00:00.000Z' }]),
    listPricesByInstrumentId: jest.fn().mockResolvedValue({ prices: [{ adjusted_close: 105 }, { adjusted_close: 100 }] }),
  };
  return new SignalGenerationEngineService(repository as any, marketDataService as any, {} as any);
};

describe('signal generation trigger contract projection', () => {
  it('adds an explicit contract-incomplete trigger projection without inventing unavailable fields', async () => {
    const service = createService();

    const result = await service.topSignals({ limit: 5 });
    const trigger = result.signals[0].triggerContract;

    expect(trigger).toMatchObject({
      contractVersion: 'TriggerObjectV1',
      contractStatus: 'CONTRACT_INCOMPLETE',
      signal_id: 'signal-1',
      instrument_id: 'stock-1',
      symbol: 'ABC',
      asset_class: 'STOCK',
      region: 'IN',
      trigger_type: 'bullish_entry_trigger',
      trigger_price: null,
      trigger_timestamp: '2026-05-16T00:00:00.000Z',
      timeframe: null,
      data_quality_status: 'READY',
      lifecycle_status: null,
      created_at: null,
      updated_at: null,
    });
    expect(trigger?.passed_conditions).toEqual([{ code: 'PRICE_ABOVE_SMA50', label: 'price is above SMA50', category: 'TECHNICAL' }]);
    expect(trigger?.failed_conditions).toEqual([{ code: 'RSI_OVERBOUGHT_REVERSAL', label: 'RSI is reversing', category: 'TECHNICAL' }]);
    expect(trigger?.unavailable_fields).toEqual(expect.arrayContaining([
      'strategy_id',
      'strategy_version',
      'trigger_price',
      'timeframe',
      'entry_rule_id',
      'exit_rule_id',
      'invalidation_rule_id',
      'lifecycle_status',
      'created_at',
      'updated_at',
    ]));
  });

  it('marks legacy records incomplete instead of inventing Data Quality or trigger evidence', async () => {
    const legacySignal = {
      ...baseSignal,
      id: undefined,
      auditStatus: 'LEGACY_MISSING' as const,
      dataQualityEligibility: null,
      sourceDataDate: null,
      sourcePriceDate: null,
    };
    const service = createService(legacySignal, { id: 'stock-1', symbol: 'ABC' });

    const signal = await service.enrichSignal(legacySignal as any);
    const trigger = signal.triggerContract;

    expect(trigger?.contractStatus).toBe('LEGACY_INCOMPLETE');
    expect(trigger?.signal_id).toBeNull();
    expect(trigger?.asset_class).toBeNull();
    expect(trigger?.region).toBeNull();
    expect(trigger?.trigger_price).toBeNull();
    expect(trigger?.trigger_timestamp).toBeNull();
    expect(trigger?.data_quality_status).toBeNull();
    expect(trigger?.unavailable_fields).toEqual(expect.arrayContaining([
      'signal_id',
      'asset_class',
      'region',
      'trigger_price',
      'trigger_timestamp',
      'data_quality_status',
      'lifecycle_status',
    ]));
  });
});
