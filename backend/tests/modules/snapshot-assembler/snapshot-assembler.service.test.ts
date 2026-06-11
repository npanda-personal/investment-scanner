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
});

// ── SnapshotAssemblerService.assemble tests ─────────────────────────────────

function makeRepository(overrides: Partial<ReturnType<typeof buildMockRepository>> = {}) {
  return { ...buildMockRepository(), ...overrides };
}

function buildMockRepository() {
  return {
    eligibleInstrumentIdsForDate: jest.fn().mockResolvedValue(['inst-1', 'inst-2']),
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
    maxSnapshotVersions: jest.fn().mockResolvedValue(new Map()),
    createSnapshotRows: jest.fn().mockResolvedValue(2),
    upsertWatermark: jest.fn().mockResolvedValue(undefined),
  };
}

function makeAlertsMock() {
  return {
    evaluate: jest.fn().mockResolvedValue({ evaluated: 0, created: 0, skippedDuplicates: 0, errors: [], events: [], evaluatedAt: '' }),
    repository: {
      enabledRules: jest.fn().mockResolvedValue([]),
    },
  };
}

describe('SnapshotAssemblerService.assemble', () => {
  it('writes a row for each resolved instrument', async () => {
    const repo = makeRepository();
    const alerts = makeAlertsMock();
    const svc = new SnapshotAssemblerService(repo as any, alerts as any);

    const summary = await svc.assemble({ tradingDate: '2026-06-10', region: 'IN', assetType: 'STOCK' });

    expect(repo.createSnapshotRows).toHaveBeenCalledTimes(1);
    const rows = repo.createSnapshotRows.mock.calls[0][0];
    expect(rows).toHaveLength(2);
    expect(rows[0].instrumentId).toBe('inst-1');
    expect(rows[1].instrumentId).toBe('inst-2');
    expect(summary.rowCount).toBe(2);
  });

  it('uses version 1 on first assembly (no prior versions)', async () => {
    const repo = makeRepository({
      maxSnapshotVersions: jest.fn().mockResolvedValue(new Map()),
    });
    const alerts = makeAlertsMock();
    const svc = new SnapshotAssemblerService(repo as any, alerts as any);

    const summary = await svc.assemble({ tradingDate: '2026-06-10', region: 'IN', assetType: 'STOCK' });

    expect(summary.snapshotVersion).toBe(1);
    const rows = repo.createSnapshotRows.mock.calls[0][0];
    expect(rows[0].snapshotVersion).toBe(1);
    expect(rows[1].snapshotVersion).toBe(1);
  });

  it('writes version 2 on second assembly', async () => {
    const existingVersions = new Map([['inst-1', 1], ['inst-2', 1]]);
    const repo = makeRepository({
      maxSnapshotVersions: jest.fn().mockResolvedValue(existingVersions),
    });
    const alerts = makeAlertsMock();
    const svc = new SnapshotAssemblerService(repo as any, alerts as any);

    const summary = await svc.assemble({ tradingDate: '2026-06-10', region: 'IN', assetType: 'STOCK' });

    expect(summary.snapshotVersion).toBe(2);
    const rows = repo.createSnapshotRows.mock.calls[0][0];
    expect(rows[0].snapshotVersion).toBe(2);
    expect(rows[1].snapshotVersion).toBe(2);
  });

  it('upserts watermark with correct version and rowCount', async () => {
    const repo = makeRepository();
    const alerts = makeAlertsMock();
    const svc = new SnapshotAssemblerService(repo as any, alerts as any);

    await svc.assemble({ tradingDate: '2026-06-10', region: 'IN', assetType: 'STOCK' });

    expect(repo.upsertWatermark).toHaveBeenCalledWith(
      expect.objectContaining({
        region: 'IN',
        assetType: 'STOCK',
        snapshotVersion: 1,
        rowCount: 2,
      }),
    );
  });

  it('uses provided instrumentIds instead of resolving from eligibility', async () => {
    const repo = makeRepository({
      bulkEligibility: jest.fn().mockResolvedValue([]),
      createSnapshotRows: jest.fn().mockResolvedValue(1),
    });
    const alerts = makeAlertsMock();
    const svc = new SnapshotAssemblerService(repo as any, alerts as any);

    await svc.assemble({
      tradingDate: '2026-06-10',
      region: 'IN',
      assetType: 'STOCK',
      instrumentIds: ['explicit-id-1'],
    });

    // eligibleInstrumentIdsForDate should NOT be called
    expect(repo.eligibleInstrumentIdsForDate).not.toHaveBeenCalled();
    const rows = repo.createSnapshotRows.mock.calls[0][0];
    expect(rows[0].instrumentId).toBe('explicit-id-1');
  });

  it('returns empty summary with warning when no instruments resolved', async () => {
    const repo = makeRepository({
      eligibleInstrumentIdsForDate: jest.fn().mockResolvedValue([]),
    });
    const alerts = makeAlertsMock();
    const svc = new SnapshotAssemblerService(repo as any, alerts as any);

    const summary = await svc.assemble({ tradingDate: '2026-06-10', region: 'IN', assetType: 'STOCK' });

    expect(summary.rowCount).toBe(0);
    expect(summary.warnings.some((w) => w.includes('No instruments'))).toBe(true);
    expect(repo.createSnapshotRows).not.toHaveBeenCalled();
  });

  it('continues and records a warning when a bulk source query fails', async () => {
    const repo = makeRepository({
      bulkSignals: jest.fn().mockRejectedValue(new Error('DB timeout')),
    });
    const alerts = makeAlertsMock();
    const svc = new SnapshotAssemblerService(repo as any, alerts as any);

    const summary = await svc.assemble({ tradingDate: '2026-06-10', region: 'IN', assetType: 'STOCK' });

    // Still writes rows
    expect(summary.rowCount).toBe(2);
    // Warning recorded
    expect(summary.warnings.some((w) => w.includes('signals bulk read failed'))).toBe(true);
    // Rows have FAILED provenance for signals
    const rows = repo.createSnapshotRows.mock.calls[0][0];
    expect(rows[0].provenance.signals).toBe('FAILED');
  });

  it('records a warning but does not throw when alerts evaluation fails', async () => {
    const repo = makeRepository();
    const alerts = {
      evaluate: jest.fn().mockRejectedValue(new Error('alert DB error')),
      repository: {
        enabledRules: jest.fn().mockResolvedValue([{ userId: 'user-1' }]),
      },
    };
    const svc = new SnapshotAssemblerService(repo as any, alerts as any);

    const summary = await svc.assemble({ tradingDate: '2026-06-10', region: 'IN', assetType: 'STOCK' });

    // Rows still written
    expect(summary.rowCount).toBe(2);
    // Warning about alerts failure
    expect(summary.warnings.some((w) => w.includes('alerts evaluation failed'))).toBe(true);
  });

  it('includes provenance counts in summary', async () => {
    const repo = makeRepository();
    const alerts = makeAlertsMock();
    const svc = new SnapshotAssemblerService(repo as any, alerts as any);

    const summary = await svc.assemble({ tradingDate: '2026-06-10', region: 'IN', assetType: 'STOCK' });

    // With eligibility rows present (OK) and all other sections null (N_A)
    expect(summary.provenanceCounts.eligibility.OK).toBe(2);
    // Signals has no rows → N_A for both instruments
    expect(summary.provenanceCounts.signals.N_A).toBe(2);
    // derivatives is always N_A
    expect(summary.provenanceCounts.derivatives.N_A).toBe(2);
  });
});
