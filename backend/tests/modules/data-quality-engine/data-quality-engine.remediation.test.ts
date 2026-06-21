/// <reference types="@types/jest" />
import { DataQualityEngineService } from '../../../src/modules/data-quality-engine';
import { computeVolumeFacts } from '../../../src/modules/data-quality-engine/data-quality-engine.scoring';

const DAY_MS = 86_400_000;

const instrument = (overrides: Record<string, any> = {}) => ({
  id: 'in-1',
  symbol: 'RELIANCE',
  company_name: 'Reliance',
  sector: 'Energy',
  industry: 'Oil & Gas',
  country: 'IN',
  currency: 'INR',
  region: 'IN',
  exchange: 'NSE',
  assetType: 'STOCK',
  required_history_status: 'COMPLETE',
  listing_date_status: 'PRESENT_OLDER_THAN_15Y_USED_15Y',
  ...overrides,
});

const prices = (count: number, volume: number | null = 1_500_000) =>
  Array.from({ length: count }).map((_, index) => ({
    date: new Date(Date.now() - index * DAY_MS).toISOString(),
    close: 2500 - index * 0.5,
    adjusted_close: 2500 - index * 0.5,
    volume,
  }));

describe('DQE remediation — single eligibility authority (Phase 1)', () => {
  it('fundamentals no longer gate signal eligibility: a fresh, liquid, READY mainboard is eligible with or without fundamentals', () => {
    const mainboard = instrument({ catalog_source: 'NSE_EQUITY_SECURITIES' });
    const svc = new DataQualityEngineService();

    const withoutFundamentals = svc.evaluateInstrument(mainboard, prices(260), prices(1)[0], [], [{ action_type: 'dividend' }], false);
    const withFundamentals = svc.evaluateInstrument(mainboard, prices(260), prices(1)[0], [{ eps: 1 }], [{ action_type: 'dividend' }], false);

    // Same high readiness score in both cases…
    expect(withoutFundamentals.signalReadinessStatus).toBe('READY');
    // …and a fresh, liquid, READY mainboard is signal-ELIGIBLE even with NO fundamentals:
    // missing fundamentals is reflected via reliabilityTier=PARTIAL in scoring, it does not
    // exclude the instrument from having a signal (aligns IN with US/EU/crypto).
    expect(withoutFundamentals.eligibleForSignals).toBe(true);
    expect(withFundamentals.eligibleForSignals).toBe(true);
  });

  it('legacy booleans equal the verdicts for the same facts (no second authority)', () => {
    const svc = new DataQualityEngineService();
    const dto = svc.evaluateInstrument(instrument(), prices(260), prices(1)[0], [{ eps: 1 }], [{ action_type: 'dividend' }], false);

    const facts = svc.computeEligibilityFacts(instrument(), prices(260), prices(1)[0], [{ eps: 1 }], 0, dto.liquidityScore);
    const verdicts = svc.computeEligibilityVerdicts(facts, instrument(), dto.signalReadinessScore);

    expect(dto.eligibleForSignals).toBe(verdicts.signalEligible);
    expect(dto.eligibleForBacktesting).toBe(verdicts.backtestEligible);
    expect(dto.eligibleForCalibration).toBe(verdicts.calibrationEligible);
  });

  it('locks the stale branch: signal/backtest ineligible, calibration still eligible (verdict gates applied)', () => {
    const svc = new DataQualityEngineService();
    const staleLatest = { ...prices(1)[0], date: new Date(Date.now() - 20 * DAY_MS).toISOString() };
    const dto = svc.evaluateInstrument(instrument(), prices(260), staleLatest, [{ eps: 1 }], [{ action_type: 'dividend' }], false);

    expect(dto.eligibleForSignals).toBe(false); // verdict: staleSessions > 3
    expect(dto.eligibleForBacktesting).toBe(false); // verdict: requires a fresh price
    expect(dto.eligibleForCalibration).toBe(true); // verdict: 260 bars, no staleness gate
  });
});

describe('DQE remediation — real volume facts (Phase 4)', () => {
  it('computes volumeCoveragePct and maxGapDays instead of persisting 0', () => {
    expect(computeVolumeFacts(prices(10, 1_000_000))).toEqual({ volumeCoveragePct: 100, maxGapDays: 1 });
    expect(computeVolumeFacts(prices(10, null))).toMatchObject({ volumeCoveragePct: 0 });
    expect(computeVolumeFacts([])).toEqual({ volumeCoveragePct: 0, maxGapDays: 0 });
  });

  it('flags the largest calendar gap in the window', () => {
    const series = [
      { date: '2026-01-01', close: 10, volume: 1 },
      { date: '2026-01-02', close: 10, volume: 1 },
      { date: '2026-01-09', close: 10, volume: 1 }, // 7-day gap
    ];
    expect(computeVolumeFacts(series).maxGapDays).toBe(7);
  });

  it('eligibility facts carry the computed volume coverage, not a placeholder zero', () => {
    const svc = new DataQualityEngineService();
    const facts = svc.computeEligibilityFacts(instrument(), prices(60, 1_000_000), prices(1)[0], [{ eps: 1 }], 0, 80);
    expect(facts.volumeCoveragePct).toBe(100);
    expect(facts.maxGapDays).toBe(1);
  });
});

describe('DQE remediation — honest missing-verdict reason (Phase 2)', () => {
  it('filterByVerdict excludes no-verdict instruments with ELIGIBILITY_NOT_COMPUTED', async () => {
    const repository = { findEligibilityRows: jest.fn().mockResolvedValue([]) };
    const svc = new DataQualityEngineService(repository as any, {} as any, null);

    const result = await svc.filterByVerdict(['missing-1'], 'signal');

    expect(result.excludedInstrumentIds).toEqual(['missing-1']);
    expect(result.reasonsByInstrumentId['missing-1']).toEqual(['ELIGIBILITY_NOT_COMPUTED']);
  });

  it('filterByVerdict includes no-verdict instruments when missingQualityBehavior is WARN_AND_PROCESS', async () => {
    const repository = { findEligibilityRows: jest.fn().mockResolvedValue([]) };
    const svc = new DataQualityEngineService(repository as any, {} as any, null);

    const result = await svc.filterByVerdict(['missing-1'], 'signal', undefined, 'WARN_AND_PROCESS');

    expect(result.eligibleInstrumentIds).toContain('missing-1');
    expect(result.excludedInstrumentIds).toHaveLength(0);
    expect(result.readinessStatusByInstrumentId['missing-1']).toBeUndefined();
  });

  it('filterByVerdict surfaces signalReadinessStatus per instrument (so the persisted signal snapshot can satisfy the trusted-read predicate)', async () => {
    const row = {
      instrumentId: 'in-1', tradingDate: new Date('2026-06-17'), priceBars: 300,
      lastPriceDate: new Date('2026-06-17'), staleSessions: 0, volumeCoveragePct: 100, maxGapDays: 1,
      liquidityScore: 90, hasFundamentals: false, hasSector: true, hasIndustry: true, hasCountry: true,
      signalEligible: true, reviewEligible: true, backtestEligible: true, calibrationEligible: true,
      signalReasons: [], reviewReasons: [], backtestReasons: [], calibrationReasons: [],
      readinessScore: 98, readinessStatus: 'READY', policyVersion: 'elig-v1', computedAt: new Date(),
    };
    const repository = { findEligibilityRows: jest.fn().mockResolvedValue([row]) };
    const svc = new DataQualityEngineService(repository as any, {} as any, null);

    const result = await svc.filterByVerdict(['in-1'], 'signal');

    expect(result.eligibleInstrumentIds).toEqual(['in-1']);
    // The readiness status must be carried through — without it the signal-generation
    // snapshot omits signalReadinessStatus and every signal fails isTrustedReadSignal.
    expect(result.readinessStatusByInstrumentId['in-1']).toBe('READY');
  });
});

describe('DQE remediation — single scope engine for summary (Phase 0a)', () => {
  it('summary derives totalInstruments from the scoped Stock count, not MarketDataFoundation', async () => {
    const repository = {
      countInstrumentsInScope: jest.fn().mockResolvedValue(6826),
      summary: jest.fn().mockResolvedValue({ totalInstruments: 6826, dataStatus: 'PARTIAL' }),
    };
    const marketDataService = { listInstruments: jest.fn() };
    const svc = new DataQualityEngineService(repository as any, marketDataService as any, null);

    const query = { region: 'US', assetType: 'STOCK' };
    const result = await svc.summary(query);

    expect(repository.countInstrumentsInScope).toHaveBeenCalledWith(query);
    expect(repository.summary).toHaveBeenCalledWith(6826, query);
    // No longer crosses scoping engines: the MDF universe call is gone from summary.
    expect(marketDataService.listInstruments).not.toHaveBeenCalled();
    expect(result).toMatchObject({ totalInstruments: 6826 });
  });
});
