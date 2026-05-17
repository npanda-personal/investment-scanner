/// <reference types="@types/jest" />
import { DataQualityEngineService, parseDataQualityQuery } from '../../../src/modules/data-quality-engine';
import type {
  CoverageStatus,
  DataQualityEvaluationDto,
  LiquidityStatus,
  SignalReadinessStatus,
} from '../../../src/modules/data-quality-engine/data-quality-engine.types';

const DAY_MS = 86_400_000;

const instrument = (overrides: Record<string, any> = {}) => ({
  id: 'in-stock-1',
  symbol: 'RELIANCE',
  company_name: 'Reliance Industries',
  sector: 'Energy',
  industry: 'Integrated Oil and Gas',
  country: 'IN',
  currency: 'INR',
  exchange: 'NSE',
  assetType: 'STOCK',
  required_history_status: 'COMPLETE',
  listing_date_status: 'PRESENT_OLDER_THAN_15Y_USED_15Y',
  ...overrides,
});

const prices = (count: number, volume: number | null = 1_500_000) => Array.from({ length: count }).map((_, index) => ({
  date: new Date(Date.now() - index * DAY_MS).toISOString(),
  close: 2500 - index * 0.5,
  adjusted_close: 2500 - index * 0.5,
  volume,
}));

const baseEvaluation = (overrides: Partial<DataQualityEvaluationDto> = {}): DataQualityEvaluationDto => ({
  instrumentId: 'ready',
  symbol: 'READY',
  companyName: 'Ready Stock',
  sector: 'Financial Services',
  industry: 'Banks',
  country: 'IN',
  currency: 'INR',
  coverageScore: 95,
  coverageStatus: 'GOOD',
  signalReadinessScore: 90,
  signalReadinessStatus: 'READY',
  liquidityScore: 85,
  liquidityStatus: 'LIQUID',
  eligibleForSignals: true,
  eligibleForBacktesting: true,
  eligibleForCalibration: true,
  dataGaps: [],
  warnings: [],
  readinessReasons: [],
  readinessBlockers: [],
  recommendedFixes: [],
  lastEvaluatedAt: new Date().toISOString(),
  researchUrl: '/research/stocks/ready',
  ...overrides,
});

const serviceWithEvaluations = (evaluations: DataQualityEvaluationDto[]) => {
  const repository = {
    latestForInstruments: jest.fn().mockResolvedValue(evaluations),
  };
  const marketDataService = {
    listInstruments: jest.fn(),
    getInstrument: jest.fn(),
    listPricesByInstrumentId: jest.fn(),
    latestPriceByInstrumentId: jest.fn(),
    storedFundamentalsByInstrumentId: jest.fn(),
    storedCorporateActionsByInstrumentId: jest.fn(),
  };

  return {
    repository,
    marketDataService,
    instance: new DataQualityEngineService(repository as any, marketDataService as any, null),
  };
};

describe('data quality engine readiness invariants', () => {
  it('treats fully trusted IN/STOCK data as eligible for downstream research use-case tiers', () => {
    const result = new DataQualityEngineService().evaluateInstrument(
      instrument(),
      prices(260),
      prices(1)[0],
      [{ eps: 98.3 }],
      [{ action_type: 'dividend' }],
      true
    );

    expect(result.coverageStatus).toBe('GOOD');
    expect(result.signalReadinessStatus).toBe('READY');
    expect(result.liquidityStatus).toBe('LIQUID');
    expect(result.eligibleForSignals).toBe(true);
    expect(result.eligibleForBacktesting).toBe(true);
    expect(result.eligibleForCalibration).toBe(true);
    expect(result.useCaseTiers).toMatchObject({
      dailyReview: { status: 'READY' },
      signal: { status: 'READY' },
      backtest: { status: 'READY' },
      calibration: { status: 'READY' },
      automation: { status: 'BLOCKED', reasons: ['PHASE0_AUTOMATION_NOT_AUTHORIZED'] },
    });
  });

  it('keeps LIMITED data visible while excluding it from default downstream eligibility', async () => {
    const ready = baseEvaluation({ instrumentId: 'ready', symbol: 'READY' });
    const limited = baseEvaluation({
      instrumentId: 'limited',
      symbol: 'LIMITED',
      signalReadinessScore: 62,
      signalReadinessStatus: 'LIMITED',
      eligibleForSignals: false,
      readinessReasons: ['SIGNAL_LIMITED'],
      readinessBlockers: ['LIMITED data is research-visible only.'],
      useCaseTiers: {
        dailyReview: { status: 'LIMITED', reasons: ['SIGNAL_LIMITED'] },
        signal: { status: 'LIMITED', reasons: ['SIGNAL_LIMITED'] },
        backtest: { status: 'BLOCKED', reasons: ['LEGACY_BACKTEST_EVIDENCE_INELIGIBLE'] },
        calibration: { status: 'BLOCKED', reasons: ['LEGACY_CALIBRATION_EVIDENCE_INELIGIBLE'] },
        automation: { status: 'BLOCKED', reasons: ['PHASE0_AUTOMATION_NOT_AUTHORIZED'] },
      },
    });
    const setup = serviceWithEvaluations([ready, limited]);

    const result = await setup.instance.filterEligibleInstruments(['ready', 'limited'], {
      missingQualityBehavior: 'SKIP',
    });

    expect(result.eligibleInstrumentIds).toEqual(['ready']);
    expect(result.excludedInstrumentIds).toEqual(['limited']);
    expect(result.evaluationsByInstrumentId.limited).toMatchObject({
      signalReadinessStatus: 'LIMITED',
      eligibleForSignals: false,
    });
  });

  it('fails closed for NOT_READY, UNUSABLE, stale, illiquid, and missing evaluations', async () => {
    const ready = baseEvaluation({ instrumentId: 'ready', symbol: 'READY' });
    const notReady = baseEvaluation({
      instrumentId: 'not-ready',
      symbol: 'NOTREADY',
      signalReadinessScore: 25,
      signalReadinessStatus: 'NOT_READY',
      eligibleForSignals: false,
    });
    const unusable = baseEvaluation({
      instrumentId: 'unusable',
      symbol: 'UNUSABLE',
      coverageStatus: 'UNUSABLE',
    });
    const stale = baseEvaluation({
      instrumentId: 'stale',
      symbol: 'STALE',
      eligibleForSignals: false,
      dataGaps: ['latest price is stale.'],
      readinessBlockers: ['Latest price is stale.'],
    });
    const illiquid = baseEvaluation({
      instrumentId: 'illiquid',
      symbol: 'ILLIQUID',
      liquidityStatus: 'ILLIQUID',
    });
    const setup = serviceWithEvaluations([ready, notReady, unusable, stale, illiquid]);

    const result = await setup.instance.filterEligibleInstruments(
      ['ready', 'not-ready', 'unusable', 'stale', 'illiquid', 'missing'],
      {
        missingQualityBehavior: 'SKIP',
        excludeNotReady: true,
        excludeIlliquid: true,
      }
    );

    expect(result.eligibleInstrumentIds).toEqual(['ready']);
    expect(result.excludedInstrumentIds).toEqual(['not-ready', 'unusable', 'stale', 'illiquid', 'missing']);
    expect(result.missingQualityEvaluationCount).toBe(1);
    expect(result.warnings).toContain('missing: missing data quality evaluation');
  });

  it('emits stale-data blockers without provider, startup, or UI behavior', () => {
    const staleLatest = {
      ...prices(1)[0],
      date: new Date(Date.now() - 20 * DAY_MS).toISOString(),
    };

    const result = new DataQualityEngineService().evaluateInstrument(
      instrument(),
      prices(260),
      staleLatest,
      [{ eps: 98.3 }],
      [{ action_type: 'dividend' }],
      true
    );

    expect(result.dataGaps).toContain('latest price is stale.');
    expect(result.readinessBlockers).toContain('Latest price is stale.');
    expect(result.useCaseTiers?.dailyReview).toMatchObject({
      status: 'BLOCKED',
      reasons: expect.arrayContaining(['STALE_PRICE_DATA']),
    });
    expect(result.useCaseTiers?.signal).toMatchObject({
      status: 'BLOCKED',
      reasons: expect.arrayContaining(['STALE_PRICE_DATA']),
    });
    expect(result.useCaseTiers?.backtest.status).toBe('BLOCKED');
    expect(result.useCaseTiers?.automation).toMatchObject({
      status: 'BLOCKED',
      reasons: ['PHASE0_AUTOMATION_NOT_AUTHORIZED'],
    });
  });

  it.each([
    ['manual-required', 'CATALOG_IDENTITY_REPAIR_REQUIRED'],
    ['unsupported', 'UNSUPPORTED_OR_INACTIVE_EXCLUDED'],
    ['retry-cooldown', 'RETRY_BLOCKED_PROVIDER_VALIDATION'],
  ])('keeps %s rows visible but not downstream-ready', (_label, requiredHistoryStatus) => {
    const result = new DataQualityEngineService().evaluateInstrument(
      instrument({
        required_history_status: requiredHistoryStatus,
        trusted_baseline_blocker_codes: [requiredHistoryStatus],
      }),
      prices(260),
      prices(1)[0],
      [{ eps: 98.3 }],
      [{ action_type: 'dividend' }],
      true
    );

    expect(result.readinessBlockers).toContain(
      `Trusted baseline required history status is ${requiredHistoryStatus}.`
    );
    expect(result.useCaseTiers?.dailyReview.status).toBe('LIMITED');
    expect(result.useCaseTiers?.signal.status).not.toBe('READY');
    expect(result.useCaseTiers?.backtest).toMatchObject({
      status: 'BLOCKED',
      reasons: expect.arrayContaining(['TRUSTED_BASELINE_HISTORY_INCOMPLETE']),
    });
    expect(result.useCaseTiers?.calibration).toMatchObject({
      status: 'BLOCKED',
      reasons: expect.arrayContaining(['TRUSTED_BASELINE_HISTORY_INCOMPLETE']),
    });
    expect([...result.dataGaps, ...result.warnings].join(' ')).not.toContain('fallback is required');
  });

  it('accepts only the current Data Quality status vocabulary through query parsing', () => {
    const coverageStatuses: CoverageStatus[] = ['GOOD', 'PARTIAL', 'POOR', 'UNUSABLE'];
    const readinessStatuses: SignalReadinessStatus[] = ['READY', 'LIMITED', 'NOT_READY'];
    const liquidityStatuses: LiquidityStatus[] = ['LIQUID', 'THIN', 'ILLIQUID', 'UNKNOWN'];

    for (const status of coverageStatuses) {
      expect(parseDataQualityQuery({ status }).status).toBe(status);
    }
    for (const readinessStatus of readinessStatuses) {
      expect(parseDataQualityQuery({ readinessStatus }).readinessStatus).toBe(readinessStatus);
    }
    for (const liquidityStatus of liquidityStatuses) {
      expect(parseDataQualityQuery({ liquidityStatus }).liquidityStatus).toBe(liquidityStatus);
    }

    expect(parseDataQualityQuery({ status: 'NOT_TRUSTWORTHY' }).status).toBeUndefined();
    expect(parseDataQualityQuery({ readinessStatus: 'BLOCKED' }).readinessStatus).toBeUndefined();
    expect(parseDataQualityQuery({ liquidityStatus: 'BROKER_READY' }).liquidityStatus).toBeUndefined();
  });

  it('filters invariant candidates without live providers, Angel One, broker credentials, startup work, or UI scope', async () => {
    const repository = {
      latestForInstruments: jest.fn().mockResolvedValue([baseEvaluation({ instrumentId: 'ready' })]),
    };
    const forbiddenCall = jest.fn(() => {
      throw new Error('provider, startup, or UI behavior is outside this test scope');
    });
    const marketDataService = {
      listInstruments: forbiddenCall,
      getInstrument: forbiddenCall,
      listPricesByInstrumentId: forbiddenCall,
      latestPriceByInstrumentId: forbiddenCall,
      storedFundamentalsByInstrumentId: forbiddenCall,
      storedCorporateActionsByInstrumentId: forbiddenCall,
    };
    const service = new DataQualityEngineService(repository as any, marketDataService as any, null);

    const result = await service.filterEligibleInstruments(['ready'], {
      missingQualityBehavior: 'SKIP',
    });

    expect(result.eligibleInstrumentIds).toEqual(['ready']);
    expect(repository.latestForInstruments).toHaveBeenCalledWith(['ready']);
    expect(forbiddenCall).not.toHaveBeenCalled();
  });
});
