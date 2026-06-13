/**
 * snapshot-assembler.service.test.ts
 *
 * Unit tests for:
 *  1. composeSnapshotRow — per-section provenance (OK / STALE / FAILED / N_A),
 *     verdict copy, null-safety.
 *  2. SnapshotAssemblerService.assemble — versioning, watermark upsert, with a
 *     fully mocked repository.
 */

import { composeSnapshotRow, SnapshotAssemblerService } from '../../../src/modules/snapshot-assembler/snapshot-assembler.service';
import { DEFAULT_SNAPSHOT_ASSEMBLER_CONFIG } from '../../../src/modules/snapshot-assembler/snapshot-assembler.config';
import type { InstrumentSources } from '../../../src/modules/snapshot-assembler/snapshot-assembler.types';

// ── Test fixtures ──────────────────────────────────────────────────────────

const TRADING_DATE = new Date('2026-06-10T00:00:00.000Z');
const ASSEMBLED_AT = new Date('2026-06-10T20:00:00.000Z');
const INSTRUMENT_ID = 'inst-abc';

/** Build a minimal InstrumentSources with all sections populated for TRADING_DATE. */
function buildSources(overrides: Partial<InstrumentSources> = {}): InstrumentSources {
  return {
    instrumentId: INSTRUMENT_ID,
    tradingDate: TRADING_DATE,
    region: 'IN',
    assetType: 'STOCK',
    eligibility: {
      instrumentId: INSTRUMENT_ID,
      tradingDate: TRADING_DATE,
      signalEligible: true,
      reviewEligible: true,
      backtestEligible: false,
      calibrationEligible: true,
      reviewReasons: [],
      signalReasons: [],
      readinessScore: 80,
      readinessStatus: 'READY',
    },
    signal: {
      instrumentId: INSTRUMENT_ID,
      score: 72,
      direction: 'BULLISH',
      modelVersion: 'signal-engine-v1',
      generatedDate: TRADING_DATE,
    },
    calibration: {
      instrumentId: INSTRUMENT_ID,
      calibratedScore: 75,
      calibrationModelVersion: 'calib-v1',
      generatedAt: TRADING_DATE,
    },
    decision: {
      instrumentId: INSTRUMENT_ID,
      decision: 'TRADE_CANDIDATE',
      entryRulesPassed: ['rule-A'],
      exitRulesTriggered: null,
      invalidationRulesTriggered: null,
      noiseFiltersTriggered: null,
      generatedDate: TRADING_DATE,
    },
    tradePlan: {
      instrumentId: INSTRUMENT_ID,
      planStatus: 'READY',
      stopLoss: { price: 145.0 },
      target: { price: 170.0 },
      rewardRiskRatio: 2.5,
      generatedDate: TRADING_DATE,
    },
    context: {
      snapshotDate: TRADING_DATE,
      regime: 'BULL',
      breadthPercentAboveSma50: 62.5,
    },
    sectorForInstrument: {
      sector: 'IT',
      snapshotDate: TRADING_DATE,
      relativeStrengthScore: 1.2,
    },
    earnings: {
      stockId: INSTRUMENT_ID,
      snapshotDate: TRADING_DATE,
      daysToResult: 12,
    },
    smartMoney: {
      instrumentId: INSTRUMENT_ID,
      smartMoneyScore: 0.7,
      status: 'ACCUMULATION',
      snapshotDate: TRADING_DATE,
    },
    signalBulkFailed: false,
    calibrationBulkFailed: false,
    decisionBulkFailed: false,
    tradePlanBulkFailed: false,
    contextBulkFailed: false,
    earningsBulkFailed: false,
    smartMoneyBulkFailed: false,
    ...overrides,
  };
}

// ── composeSnapshotRow tests ──────────────────────────────────────────────

describe('composeSnapshotRow', () => {
  // ── OK path (all sources for tradingDate) ────────────────────────────────

  it('marks all sections OK when every source is for tradingDate', () => {
    const row = composeSnapshotRow(buildSources(), 1, ASSEMBLED_AT);

    expect(row.provenance.eligibility).toBe('OK');
    expect(row.provenance.signals).toBe('OK');
    expect(row.provenance.calibration).toBe('OK');
    expect(row.provenance.decision).toBe('OK');
    expect(row.provenance.tradePlan).toBe('OK');
    expect(row.provenance.context).toBe('OK');
    expect(row.provenance.earnings).toBe('OK');
    expect(row.provenance.smartMoney).toBe('OK');
    // derivatives is always N_A (OI buildup keyed by symbol, not instrumentId)
    expect(row.provenance.derivatives).toBe('N_A');
  });

  it('copies eligibility verdicts and scores', () => {
    const row = composeSnapshotRow(buildSources(), 1, ASSEMBLED_AT);
    expect(row.signalEligible).toBe(true);
    expect(row.reviewEligible).toBe(true);
    expect(row.backtestEligible).toBe(false);
    expect(row.calibrationEligible).toBe(true);
    expect(row.readinessScore).toBe(80);
    expect(row.readinessStatus).toBe('READY');
  });

  it('copies signal fields', () => {
    const row = composeSnapshotRow(buildSources(), 1, ASSEMBLED_AT);
    expect(row.signalScore).toBe(72);
    expect(row.signalDirection).toBe('BULLISH');
    expect(row.signalModelVersion).toBe('signal-engine-v1');
  });

  it('copies calibration fields', () => {
    const row = composeSnapshotRow(buildSources(), 1, ASSEMBLED_AT);
    expect(row.calibratedScore).toBe(75);
    expect(row.calibrationAuthority).toBe('calib-v1');
  });

  it('copies decision and extracts rulesFired from entryRulesPassed', () => {
    const row = composeSnapshotRow(buildSources(), 1, ASSEMBLED_AT);
    expect(row.strategyDecision).toBe('TRADE_CANDIDATE');
    expect(row.rulesFired).toContain('rule-A');
  });

  it('extracts stopLoss and target prices from Json object', () => {
    const row = composeSnapshotRow(buildSources(), 1, ASSEMBLED_AT);
    expect(row.stopLoss).toBe(145.0);
    expect(row.target).toBe(170.0);
    expect(row.rrRatio).toBe(2.5);
    expect(row.planStatus).toBe('READY');
  });

  it('copies context regime and breadth', () => {
    const row = composeSnapshotRow(buildSources(), 1, ASSEMBLED_AT);
    expect(row.marketRegime).toBe('BULL');
    expect(row.breadthPct).toBe(62.5);
    expect(row.sectorRelativeStrength).toBe(1.2);
  });

  it('copies earnings proximity days', () => {
    const row = composeSnapshotRow(buildSources(), 1, ASSEMBLED_AT);
    expect(row.earningsProximityDays).toBe(12);
  });

  it('copies smart money code and score', () => {
    const row = composeSnapshotRow(buildSources(), 1, ASSEMBLED_AT);
    expect(row.smartMoneyCode).toBe('ACCUMULATION');
    expect(row.smartMoneyScore).toBe(0.7);
  });

  // ── STALE path (source rows are for a prior day) ─────────────────────────

  it('marks sections STALE when source rows are from a prior trading date', () => {
    const priorDate = new Date('2026-06-09T00:00:00.000Z');
    const sources = buildSources({
      eligibility: {
        instrumentId: INSTRUMENT_ID,
        tradingDate: priorDate,
        signalEligible: true,
        reviewEligible: false,
        backtestEligible: false,
        calibrationEligible: false,
        reviewReasons: ['INSUFFICIENT_BARS'],
        signalReasons: [],
        readinessScore: 50,
        readinessStatus: 'LIMITED',
      },
      signal: {
        instrumentId: INSTRUMENT_ID,
        score: 60,
        direction: 'NEUTRAL',
        modelVersion: 'signal-engine-v1',
        generatedDate: priorDate,
      },
      calibration: {
        instrumentId: INSTRUMENT_ID,
        calibratedScore: 62,
        calibrationModelVersion: 'calib-v1',
        generatedAt: priorDate,
      },
      decision: {
        instrumentId: INSTRUMENT_ID,
        decision: 'WAIT',
        entryRulesPassed: null,
        exitRulesTriggered: null,
        invalidationRulesTriggered: null,
        noiseFiltersTriggered: null,
        generatedDate: priorDate,
      },
      tradePlan: {
        instrumentId: INSTRUMENT_ID,
        planStatus: 'READY',
        stopLoss: null,
        target: null,
        rewardRiskRatio: 0,
        generatedDate: priorDate,
      },
      context: {
        snapshotDate: priorDate,
        regime: 'BEAR',
        breadthPercentAboveSma50: 35,
      },
      earnings: {
        stockId: INSTRUMENT_ID,
        snapshotDate: priorDate,
        daysToResult: 5,
      },
      smartMoney: {
        instrumentId: INSTRUMENT_ID,
        smartMoneyScore: 0.3,
        status: 'DISTRIBUTION',
        snapshotDate: priorDate,
      },
    });

    const row = composeSnapshotRow(sources, 1, ASSEMBLED_AT);

    expect(row.provenance.eligibility).toBe('STALE');
    expect(row.provenance.signals).toBe('STALE');
    expect(row.provenance.calibration).toBe('STALE');
    expect(row.provenance.decision).toBe('STALE');
    expect(row.provenance.tradePlan).toBe('STALE');
    expect(row.provenance.context).toBe('STALE');
    expect(row.provenance.earnings).toBe('STALE');
    expect(row.provenance.smartMoney).toBe('STALE');

    // STALE still copies the values
    expect(row.signalScore).toBe(60);
    expect(row.marketRegime).toBe('BEAR');
    expect(row.earningsProximityDays).toBe(5);
    expect(row.smartMoneyCode).toBe('DISTRIBUTION');
  });

  // ── FAILED path (bulk query failed) ─────────────────────────────────────

  it('marks sections FAILED when bulk query failed, nulls out values', () => {
    const sources = buildSources({
      signalBulkFailed: true,
      calibrationBulkFailed: true,
      decisionBulkFailed: true,
      tradePlanBulkFailed: true,
      contextBulkFailed: true,
      earningsBulkFailed: true,
      smartMoneyBulkFailed: true,
    });

    const row = composeSnapshotRow(sources, 1, ASSEMBLED_AT);

    expect(row.provenance.signals).toBe('FAILED');
    expect(row.provenance.calibration).toBe('FAILED');
    expect(row.provenance.decision).toBe('FAILED');
    expect(row.provenance.tradePlan).toBe('FAILED');
    expect(row.provenance.context).toBe('FAILED');
    expect(row.provenance.earnings).toBe('FAILED');
    expect(row.provenance.smartMoney).toBe('FAILED');

    // Values are null when FAILED
    expect(row.signalScore).toBeNull();
    expect(row.calibratedScore).toBeNull();
    expect(row.strategyDecision).toBeNull();
    expect(row.stopLoss).toBeNull();
    expect(row.marketRegime).toBeNull();
    expect(row.earningsProximityDays).toBeNull();
    expect(row.smartMoneyCode).toBeNull();
  });

  // ── N_A path (source row absent, no bulk failure) ────────────────────────

  it('marks sections N_A when no row exists and bulk did not fail', () => {
    const sources = buildSources({
      signal: null,
      calibration: null,
      decision: null,
      tradePlan: null,
      context: null,
      sectorForInstrument: null,
      earnings: null,
      smartMoney: null,
    });

    const row = composeSnapshotRow(sources, 1, ASSEMBLED_AT);

    expect(row.provenance.signals).toBe('N_A');
    expect(row.provenance.calibration).toBe('N_A');
    expect(row.provenance.decision).toBe('N_A');
    expect(row.provenance.tradePlan).toBe('N_A');
    expect(row.provenance.context).toBe('N_A');
    expect(row.provenance.earnings).toBe('N_A');
    expect(row.provenance.smartMoney).toBe('N_A');
  });

  it('marks eligibility N_A (not FAILED) when no eligibility row found', () => {
    const sources = buildSources({ eligibility: null });
    const row = composeSnapshotRow(sources, 1, ASSEMBLED_AT);
    expect(row.provenance.eligibility).toBe('N_A');
    // Default verdicts are false
    expect(row.signalEligible).toBe(false);
    expect(row.readinessScore).toBe(0);
  });

  // ── Null-safety for Json fields ──────────────────────────────────────────

  it('handles null stopLoss/target gracefully', () => {
    const sources = buildSources({
      tradePlan: {
        instrumentId: INSTRUMENT_ID,
        planStatus: 'PENDING',
        stopLoss: null,
        target: null,
        rewardRiskRatio: 0,
        generatedDate: TRADING_DATE,
      },
    });
    const row = composeSnapshotRow(sources, 1, ASSEMBLED_AT);
    expect(row.stopLoss).toBeNull();
    expect(row.target).toBeNull();
    // rewardRiskRatio=0 is finite, so it is copied as-is (0 means no R:R calculated)
    expect(row.rrRatio).toBe(0);
  });

  it('handles rulesFired when all Json rule fields are null', () => {
    const sources = buildSources({
      decision: {
        instrumentId: INSTRUMENT_ID,
        decision: 'AVOID',
        entryRulesPassed: null,
        exitRulesTriggered: null,
        invalidationRulesTriggered: null,
        noiseFiltersTriggered: null,
        generatedDate: TRADING_DATE,
      },
    });
    const row = composeSnapshotRow(sources, 1, ASSEMBLED_AT);
    expect(row.rulesFired).toEqual([]);
  });

  it('sets snapshotVersion and assembledAt correctly', () => {
    const row = composeSnapshotRow(buildSources(), 3, ASSEMBLED_AT);
    expect(row.snapshotVersion).toBe(3);
    expect(row.assembledAt).toBe(ASSEMBLED_AT);
  });

  it('derivatives section is always N_A', () => {
    const row = composeSnapshotRow(buildSources(), 1, ASSEMBLED_AT);
    expect(row.provenance.derivatives).toBe('N_A');
    expect(row.oiBuildup).toBeNull();
    expect(row.participantPositioning).toBeNull();
  });

  // ── A4: a legitimate 0 price must be preserved, not coerced to null ──────
  it('preserves a stopLoss/target price of 0 (does not drop it to null)', () => {
    const sources = buildSources({
      tradePlan: {
        instrumentId: INSTRUMENT_ID,
        planStatus: 'READY',
        stopLoss: { price: 0 },
        target: { price: 0 },
        rewardRiskRatio: 1,
        generatedDate: TRADING_DATE,
      },
    });
    const row = composeSnapshotRow(sources, 1, ASSEMBLED_AT);
    expect(row.stopLoss).toBe(0);
    expect(row.target).toBe(0);
  });

  it('parses a raw numeric stopLoss and rejects garbage', () => {
    const make = (sl: unknown) =>
      composeSnapshotRow(
        buildSources({
          tradePlan: {
            instrumentId: INSTRUMENT_ID,
            planStatus: 'READY',
            stopLoss: sl as any,
            target: null,
            rewardRiskRatio: 1,
            generatedDate: TRADING_DATE,
          },
        }),
        1,
        ASSEMBLED_AT,
      );
    expect(make(150.5).stopLoss).toBe(150.5);
    expect(make('not-a-number').stopLoss).toBeNull();
    expect(make({ note: 'x' }).stopLoss).toBeNull();
  });

  // ── A5: sector has its own provenance, independent of context ────────────
  it('marks sector STALE when the sector snapshot is from a prior day', () => {
    const priorDate = new Date('2026-06-09T00:00:00.000Z');
    const row = composeSnapshotRow(
      buildSources({
        sectorForInstrument: {
          sector: 'IT',
          snapshotDate: priorDate,
          relativeStrengthScore: 1.1,
        },
      }),
      1,
      ASSEMBLED_AT,
    );
    expect(row.provenance.sector).toBe('STALE');
    expect(row.sectorRelativeStrength).toBe(1.1);
  });

  it('marks sector N_A when no sector row is present', () => {
    const row = composeSnapshotRow(buildSources({ sectorForInstrument: null }), 1, ASSEMBLED_AT);
    expect(row.provenance.sector).toBe('N_A');
    expect(row.sectorRelativeStrength).toBeNull();
  });

  it('keeps sector OK even when the context section failed (decoupled sources)', () => {
    const row = composeSnapshotRow(
      buildSources({ contextBulkFailed: true }),
      1,
      ASSEMBLED_AT,
    );
    expect(row.provenance.context).toBe('FAILED');
    expect(row.provenance.sector).toBe('OK');
    expect(row.sectorRelativeStrength).toBe(1.2);
  });
});

// ── SnapshotAssemblerService.assemble tests ─────────────────────────────────

function makeRepository(overrides: Partial<ReturnType<typeof buildMockRepository>> = {}) {
  return { ...buildMockRepository(), ...overrides };
}

function buildMockRepository() {
  return {
    eligibleInstrumentIdsForDate: jest.fn().mockResolvedValue(['inst-1', 'inst-2']),
    filterInstrumentIdsByScope: jest.fn((ids: string[]) => Promise.resolve(ids)),
    bulkEligibility: jest.fn().mockResolvedValue([
      {
        instrumentId: 'inst-1',
        tradingDate: TRADING_DATE,
        signalEligible: true,
        reviewEligible: true,
        backtestEligible: true,
        calibrationEligible: true,
        reviewReasons: [],
        signalReasons: [],
        readinessScore: 75,
        readinessStatus: 'READY',
      },
      {
        instrumentId: 'inst-2',
        tradingDate: TRADING_DATE,
        signalEligible: false,
        reviewEligible: false,
        backtestEligible: false,
        calibrationEligible: false,
        reviewReasons: ['INSUFFICIENT_BARS'],
        signalReasons: [],
        readinessScore: 20,
        readinessStatus: 'NOT_READY',
      },
    ]),
    bulkSignals: jest.fn().mockResolvedValue([]),
    bulkCalibration: jest.fn().mockResolvedValue([]),
    bulkDecisions: jest.fn().mockResolvedValue([]),
    bulkTradePlans: jest.fn().mockResolvedValue([]),
    marketContextForDate: jest.fn().mockResolvedValue(null),
    sectorContextForDate: jest.fn().mockResolvedValue([]),
    bulkEarnings: jest.fn().mockResolvedValue([]),
    bulkSmartMoney: jest.fn().mockResolvedValue([]),
    instrumentSectors: jest.fn().mockResolvedValue(new Map()),
    // Atomic commit assigns the batch-wide version and writes rows + watermark.
    // Default mock echoes back rowCount = number of composed rows, version 1.
    commitAssembly: jest.fn(
      async ({ composedRows }: { composedRows: unknown[] }) => ({
        rowCount: composedRows.length,
        snapshotVersion: 1,
      }),
    ),
  };
}

function makeAlertsMock(rules: Array<{ userId: string | null; region?: string | null }> = []) {
  return {
    evaluate: jest.fn().mockResolvedValue(undefined),
    listEnabledRules: jest.fn().mockResolvedValue(rules),
  };
}

/** Pull the composedRows passed to the (single) commitAssembly call. */
function committedRows(repo: ReturnType<typeof buildMockRepository>): any[] {
  return repo.commitAssembly.mock.calls[0][0].composedRows;
}

describe('SnapshotAssemblerService.assemble', () => {
  it('composes a row for each resolved instrument and commits once', async () => {
    const repo = makeRepository();
    const svc = new SnapshotAssemblerService(repo as any, makeAlertsMock() as any);

    const summary = await svc.assemble({ tradingDate: '2026-06-10', region: 'IN', assetType: 'STOCK' });

    expect(repo.commitAssembly).toHaveBeenCalledTimes(1);
    const rows = committedRows(repo);
    expect(rows).toHaveLength(2);
    expect(rows[0].instrumentId).toBe('inst-1');
    expect(rows[1].instrumentId).toBe('inst-2');
    expect(summary.rowCount).toBe(2);
  });

  it('reports the snapshotVersion returned by the atomic commit', async () => {
    const repo = makeRepository({
      commitAssembly: jest.fn().mockResolvedValue({ rowCount: 2, snapshotVersion: 1 }),
    });
    const svc = new SnapshotAssemblerService(repo as any, makeAlertsMock() as any);

    const summary = await svc.assemble({ tradingDate: '2026-06-10', region: 'IN', assetType: 'STOCK' });
    expect(summary.snapshotVersion).toBe(1);
  });

  it('passes a higher commit version (e.g. re-assembly) straight through', async () => {
    const repo = makeRepository({
      commitAssembly: jest.fn().mockResolvedValue({ rowCount: 2, snapshotVersion: 2 }),
    });
    const svc = new SnapshotAssemblerService(repo as any, makeAlertsMock() as any);

    const summary = await svc.assemble({ tradingDate: '2026-06-10', region: 'IN', assetType: 'STOCK' });
    expect(summary.snapshotVersion).toBe(2);
  });

  it('commits with the correct scope and instrument set', async () => {
    const repo = makeRepository();
    const svc = new SnapshotAssemblerService(repo as any, makeAlertsMock() as any);

    await svc.assemble({ tradingDate: '2026-06-10', region: 'IN', assetType: 'STOCK' });

    expect(repo.commitAssembly).toHaveBeenCalledWith(
      expect.objectContaining({
        region: 'IN',
        assetType: 'STOCK',
        instrumentIds: ['inst-1', 'inst-2'],
      }),
    );
  });

  it('uses provided instrumentIds instead of resolving from eligibility', async () => {
    const repo = makeRepository({ bulkEligibility: jest.fn().mockResolvedValue([]) });
    const svc = new SnapshotAssemblerService(repo as any, makeAlertsMock() as any);

    await svc.assemble({
      tradingDate: '2026-06-10',
      region: 'IN',
      assetType: 'STOCK',
      instrumentIds: ['explicit-id-1'],
    });

    expect(repo.eligibleInstrumentIdsForDate).not.toHaveBeenCalled();
    // Default config does NOT enforce scope filtering on explicit ids.
    expect(repo.filterInstrumentIdsByScope).not.toHaveBeenCalled();
    expect(committedRows(repo)[0].instrumentId).toBe('explicit-id-1');
  });

  it('returns empty summary with warning when no instruments resolved', async () => {
    const repo = makeRepository({
      eligibleInstrumentIdsForDate: jest.fn().mockResolvedValue([]),
    });
    const svc = new SnapshotAssemblerService(repo as any, makeAlertsMock() as any);

    const summary = await svc.assemble({ tradingDate: '2026-06-10', region: 'IN', assetType: 'STOCK' });

    expect(summary.rowCount).toBe(0);
    expect(summary.warnings.some((w) => w.includes('No instruments'))).toBe(true);
    expect(repo.commitAssembly).not.toHaveBeenCalled();
  });

  it('continues and records a warning when a bulk source query fails', async () => {
    const repo = makeRepository({
      bulkSignals: jest.fn().mockRejectedValue(new Error('DB timeout')),
    });
    const svc = new SnapshotAssemblerService(repo as any, makeAlertsMock() as any);

    const summary = await svc.assemble({ tradingDate: '2026-06-10', region: 'IN', assetType: 'STOCK' });

    expect(summary.rowCount).toBe(2);
    expect(summary.warnings.some((w) => w.includes('signals bulk read failed'))).toBe(true);
    expect(committedRows(repo)[0].provenance.signals).toBe('FAILED');
  });

  it('records a warning but does not throw when alerts evaluation fails', async () => {
    const repo = makeRepository();
    const alerts = {
      evaluate: jest.fn().mockRejectedValue(new Error('alert DB error')),
      listEnabledRules: jest.fn().mockResolvedValue([{ userId: 'user-1', region: null }]),
    };
    const svc = new SnapshotAssemblerService(repo as any, alerts as any);

    const summary = await svc.assemble({ tradingDate: '2026-06-10', region: 'IN', assetType: 'STOCK' });

    expect(summary.rowCount).toBe(2);
    expect(summary.warnings.some((w) => w.includes('alerts evaluation failed'))).toBe(true);
  });

  it('evaluates alerts only for rules matching the run region (region-agnostic always run)', async () => {
    const repo = makeRepository();
    const alerts = makeAlertsMock([
      { userId: 'user-in', region: 'IN' },
      { userId: 'user-us', region: 'US' },
      { userId: 'user-global', region: null },
    ]);
    const svc = new SnapshotAssemblerService(repo as any, alerts as any);

    await svc.assemble({ tradingDate: '2026-06-10', region: 'IN', assetType: 'STOCK' });

    const evaluatedUsers = alerts.evaluate.mock.calls.map((c: any[]) => c[0]);
    expect(evaluatedUsers).toContain('user-in');
    expect(evaluatedUsers).toContain('user-global');
    expect(evaluatedUsers).not.toContain('user-us');
  });

  it('includes provenance counts in summary', async () => {
    const repo = makeRepository();
    const svc = new SnapshotAssemblerService(repo as any, makeAlertsMock() as any);

    const summary = await svc.assemble({ tradingDate: '2026-06-10', region: 'IN', assetType: 'STOCK' });

    expect(summary.provenanceCounts.eligibility.OK).toBe(2);
    expect(summary.provenanceCounts.signals.N_A).toBe(2);
    expect(summary.provenanceCounts.derivatives.N_A).toBe(2);
    // Sector key is present and tallied.
    expect(summary.provenanceCounts.sector.N_A).toBe(2);
  });

  // ── B2/B3: scope guard ────────────────────────────────────────────────────
  it('rejects an unsupported scope when supportedScopes is configured', async () => {
    const repo = makeRepository();
    const config = { ...DEFAULT_SNAPSHOT_ASSEMBLER_CONFIG, supportedScopes: [{ region: 'IN', assetType: 'STOCK' }] };
    const svc = new SnapshotAssemblerService(repo as any, makeAlertsMock() as any, config);

    const summary = await svc.assemble({ tradingDate: '2026-06-10', region: 'ZZ', assetType: 'STOCK' });

    expect(summary.rowCount).toBe(0);
    expect(summary.warnings.some((w) => w.includes('Scope not supported'))).toBe(true);
    expect(repo.commitAssembly).not.toHaveBeenCalled();
  });

  // ── B1: opt-in explicit-id scope enforcement ────────────────────────────────
  it('filters out-of-scope explicit ids and warns when enforceExplicitIdScope is on', async () => {
    const repo = makeRepository({
      filterInstrumentIdsByScope: jest.fn().mockResolvedValue(['in-scope-1']),
    });
    const config = { ...DEFAULT_SNAPSHOT_ASSEMBLER_CONFIG, enforceExplicitIdScope: true };
    const svc = new SnapshotAssemblerService(repo as any, makeAlertsMock() as any, config);

    const summary = await svc.assemble({
      tradingDate: '2026-06-10',
      region: 'IN',
      assetType: 'STOCK',
      instrumentIds: ['in-scope-1', 'out-of-scope-2'],
    });

    expect(repo.filterInstrumentIdsByScope).toHaveBeenCalled();
    expect(committedRows(repo).map((r) => r.instrumentId)).toEqual(['in-scope-1']);
    expect(summary.warnings.some((w) => w.includes('excluded'))).toBe(true);
  });
});
