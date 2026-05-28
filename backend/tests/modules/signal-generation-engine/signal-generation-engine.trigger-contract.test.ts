/// <reference types="@types/jest" />
import { SignalGenerationEngineService } from '../../../src/modules/signal-generation-engine';
import { StrategyFrameworkRegistry } from '../../../src/modules/strategy-framework';

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

const price = (index: number, close: number, volume = 1000) => {
  const date = new Date('2026-05-16T00:00:00.000Z');
  date.setUTCDate(date.getUTCDate() - index);
  return {
    date: date.toISOString(),
    open: close - 0.5,
    high: close + 1,
    low: close - 1,
    close,
    adjusted_close: close,
    volume,
  };
};

const defaultPrices = [price(0, 105), price(1, 100)];

const createService = (
  signal: any = baseSignal,
  instrument: any = { id: 'stock-1', symbol: 'ABC', asset_type: 'STOCK', region: 'IN', currency: 'INR' },
  prices: any[] = defaultPrices
) => {
  const repository = {
    latestSignals: jest.fn().mockResolvedValue({ signals: [signal], total: 1 }),
  };
  const marketDataService = {
    getInstrumentsByIds: jest.fn().mockResolvedValue([instrument]),
    getLatestPricesBySymbols: jest.fn().mockResolvedValue([{ symbol: 'ABC', adjusted_close: prices[0]?.adjusted_close ?? 105, date: prices[0]?.date ?? '2026-05-16T00:00:00.000Z' }]),
    listPricesByInstrumentId: jest.fn().mockResolvedValue({ prices }),
  };
  const strategyFrameworkService = {
    performance: jest.fn().mockResolvedValue([{ ratingGrade: 'GOOD', readinessLabel: 'PAPER_TEST_CANDIDATE' }]),
  };
  return new SignalGenerationEngineService(repository as any, marketDataService as any, {} as any, {} as any, new StrategyFrameworkRegistry(), strategyFrameworkService as any);
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

  it('exposes source-proven entry trigger price evidence from Strategy Framework enrichment without target or R:R fields', async () => {
    const prices = Array.from({ length: 260 }, (_, index) => price(index, 220 - index * 0.1, index === 0 ? 4000 : 1000));
    const service = createService({ ...baseSignal, sourcePriceDate: prices[0].date }, undefined, prices);

    const result = await service.topSignals({ limit: 5, includeStrategyMatches: true, strategyCode: 'BREAKOUT_CONFIRMATION' });
    const trigger = result.signals[0].triggerContract;

    expect(trigger).toMatchObject({
      strategy_id: 'BREAKOUT_CONFIRMATION',
      strategy_version: '1.1.0',
      trigger_price: 220,
      trigger_timestamp: prices[0].date,
      timeframe: 'DAILY_SWING',
      data_quality_status: 'READY',
      trigger_price_evidence: {
        status: 'SOURCE_PROVEN',
        source_module: 'signal-generation-engine',
        source_field: 'strategyContext.prices[0].adjusted_close',
        source_timestamp: prices[0].date,
        strategy_id: 'BREAKOUT_CONFIRMATION',
        strategy_version: '1.1.0',
        timeframe: 'DAILY_SWING',
        compatibility_only: true,
      },
    });
    expect(trigger?.entry_rule_id).toEqual(expect.any(String));
    expect(trigger?.trigger_price_evidence.entry_rule_ids.length).toBeGreaterThan(0);
    expect(trigger?.unavailable_fields).not.toContain('trigger_price');
    expect(trigger?.unavailable_fields).not.toContain('entry_rule_id');
    expect(JSON.stringify(trigger)).not.toMatch(/targetPrice|profitTarget|priceTarget|rewardRiskRatio|R:R|buy now|sell now|guaranteed/i);
  });

  it('downgrades strategy-aware trigger price evidence when the local price row date does not match the signal source date', async () => {
    const prices = Array.from({ length: 260 }, (_, index) => price(index, 220 - index * 0.1, index === 0 ? 4000 : 1000));
    const service = createService({ ...baseSignal, sourcePriceDate: '2026-05-15T00:00:00.000Z' }, undefined, prices);

    const result = await service.topSignals({ limit: 5, includeStrategyMatches: true, strategyCode: 'BREAKOUT_CONFIRMATION' });
    const trigger = result.signals[0].triggerContract;

    expect(trigger?.trigger_price).toBeNull();
    expect(trigger?.trigger_timestamp).toBeNull();
    expect(trigger?.entry_rule_id).toBeNull();
    expect(trigger?.trigger_price_evidence).toMatchObject({
      status: 'UNAVAILABLE',
      source_module: null,
      source_field: null,
      source_timestamp: null,
      strategy_id: 'BREAKOUT_CONFIRMATION',
      strategy_version: '1.1.0',
      timeframe: 'DAILY_SWING',
      compatibility_only: true,
    });
    expect(trigger?.trigger_price_evidence.unavailable_reason).toContain('does not match the signal source price date');
    expect(trigger?.unavailable_fields).toEqual(expect.arrayContaining(['trigger_price', 'trigger_timestamp', 'entry_rule_id']));
  });

  it('does not emit source-proven entry trigger price evidence for non-entry strategy matches', async () => {
    const prices = Array.from({ length: 260 }, (_, index) => price(index, 220 - index * 0.1, index === 0 ? 4000 : 1000));
    const service = createService({ ...baseSignal, sourcePriceDate: prices[0].date }, undefined, prices);

    const result = await service.topSignals({ limit: 5, includeStrategyMatches: true, strategyCode: 'LOW_QUALITY_DATA_REJECTION' });
    const trigger = result.signals[0].triggerContract;

    expect(trigger).toMatchObject({
      strategy_id: 'LOW_QUALITY_DATA_REJECTION',
      strategy_version: '1.1.0',
      trigger_price: null,
      trigger_timestamp: null,
      entry_rule_id: null,
      timeframe: 'DAILY',
      trigger_price_evidence: {
        status: 'UNAVAILABLE',
        source_module: null,
        source_field: null,
        source_timestamp: null,
        strategy_id: 'LOW_QUALITY_DATA_REJECTION',
        strategy_version: '1.1.0',
        timeframe: 'DAILY',
        compatibility_only: true,
      },
    });
    expect(trigger?.trigger_price_evidence.unavailable_reason).toContain('Strategy category is FILTER, not ENTRY');
    expect(trigger?.unavailable_fields).toEqual(expect.arrayContaining(['trigger_price', 'trigger_timestamp', 'entry_rule_id']));
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
