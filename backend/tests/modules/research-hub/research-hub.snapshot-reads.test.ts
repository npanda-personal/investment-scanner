/**
 * research-hub.snapshot-reads.test.ts
 *
 * Tests for the RESEARCH_HUB_SNAPSHOT_READS snapshot-first path in buildOverview.
 *
 * Covers:
 *  1. Snapshot mode ON + rows available → skips live signal/smartMoney/candidate reads
 *  2. Snapshot mode ON + empty snapshot → falls back to live reads
 *  3. Snapshot mode OFF (RESEARCH_HUB_SNAPSHOT_READS='0') → pure legacy fan-out
 *  4. snapshotAssembledAt is present in result when snapshot rows are used
 *  5. Partial smartMoney provenance fallback → live smartMoney called
 */

import { ResearchHubService } from '../../../src/modules/research-hub/research-hub.service';
import { SignalGenerationEngineService } from '../../../src/modules/signal-generation-engine';
import { StrategyDecisionEngineService } from '../../../src/modules/strategy-decision-engine';
import { SmartMoneyIntelligenceService } from '../../../src/modules/smart-money-intelligence';
import { MarketContextIntelligenceService } from '../../../src/modules/market-context-intelligence';
import { StrategyFrameworkService } from '../../../src/modules/strategy-framework';
import { SignalCalibrationEngineService } from '../../../src/modules/signal-calibration-engine';
import type { ResearchHubSnapshotReader, SnapshotBulkRead } from '../../../src/modules/research-hub/research-hub.snapshot-reader';

jest.mock('../../../src/modules/signal-generation-engine');
jest.mock('../../../src/modules/strategy-decision-engine');
jest.mock('../../../src/modules/smart-money-intelligence');
jest.mock('../../../src/modules/market-context-intelligence');
jest.mock('../../../src/modules/strategy-framework');
jest.mock('../../../src/modules/signal-calibration-engine');

// ── Stub helpers ──────────────────────────────────────────────────────────────

const stubCalibrationHealth = {
  status: 'ok' as const,
  module: 'signal-calibration-engine' as const,
  calibrationModelVersion: 'v2',
  calibratedSignals: 0,
  latestGeneratedAt: null,
  dataStatus: 'MISSING' as const,
  gaps: [],
  calibrationEvidence: {} as any,
  calibrationReadiness: {
    status: 'UNAVAILABLE', confidenceTier: 'NONE', calibrationApplied: false,
    adjustmentCapApplied: 0, downstreamInfluence: 'NONE', authoritativeScore: 'RAW',
    reasons: [], blockers: [],
  } as any,
};

function makeSnapshotBulkRead(overrides: Partial<SnapshotBulkRead> = {}): SnapshotBulkRead {
  const instrumentId = 'INST-SNAP-1';
  const row: any = {
    instrumentId,
    tradingDate: new Date('2026-06-11'),
    snapshotVersion: 1,
    region: 'IN',
    assetType: 'STOCK',
    signalEligible: true,
    reviewEligible: true,
    backtestEligible: true,
    calibrationEligible: true,
    reviewReasons: [],
    signalReasons: [],
    readinessScore: 80,
    readinessStatus: 'READY',
    signalScore: 75,
    signalDirection: 'BULLISH',
    signalModelVersion: 'sgv1',
    calibratedScore: 78,
    calibrationAuthority: 'v2',
    strategyDecision: 'TRADE_CANDIDATE',
    rulesFired: ['BREAKOUT_ENTRY'],
    stopLoss: 100,
    target: 120,
    rrRatio: 2.0,
    planStatus: 'VALID',
    marketRegime: 'RISK_ON',
    breadthPct: 0.65,
    sectorRelativeStrength: 72,
    oiBuildup: null,
    participantPositioning: null,
    earningsProximityDays: 30,
    smartMoneyCode: 'ACCUMULATION',
    smartMoneyScore: 70,
    provenance: {
      eligibility: 'OK',
      signals: 'OK',
      calibration: 'OK',
      decision: 'OK',
      tradePlan: 'OK',
      context: 'OK',
      derivatives: 'N_A',
      earnings: 'OK',
      smartMoney: 'OK',
    },
    assembledAt: new Date('2026-06-11T18:00:00Z'),
  };

  const rows = new Map([[instrumentId, row]]);
  return {
    rows,
    assembledAt: '2026-06-11T18:00:00.000Z',
    signalCounts: { total: 1, bullish: 1, bearish: 0, neutral: 0, byDirection: { BULLISH: 1, BEARISH: 0, NEUTRAL: 0 } },
    candidates: [
      {
        instrumentId,
        symbol: 'SNAPLTD',
        strategy: 'UNKNOWN_FROM_SNAPSHOT' as any,
        decision: 'TRADE_CANDIDATE' as any,
        decisionScore: 78,
        action: 'CONSIDER_ENTRY',
        confidence: 'HIGH',
        marketGate: 'UNKNOWN' as any,
        marketCondition: 'UNKNOWN' as any,
        frameworkBacked: true,
        reasons: ['BREAKOUT_ENTRY'],
        blockers: [],
        warnings: [],
        dataGaps: [],
        modelVersion: 'sgv1',
        generatedAt: '2026-06-11T18:00:00.000Z',
        _fromSnapshot: true,
      } as any,
    ],
    smartMoney: [
      { instrumentId, status: 'ACCUMULATION', smartMoneyScore: 70 },
    ],
    ...overrides,
  };
}

function makeSnapshotReader(read: jest.Mock): ResearchHubSnapshotReader {
  return { read } as any;
}

// ── Shared service setup ───────────────────────────────────────────────────────

function makeService(
  snapshotReader: ResearchHubSnapshotReader | null,
  strategyService: jest.Mocked<StrategyDecisionEngineService>,
  contextService: jest.Mocked<MarketContextIntelligenceService>,
  signalService: jest.Mocked<SignalGenerationEngineService>,
  smartMoneyService: jest.Mocked<SmartMoneyIntelligenceService>,
  strategyFrameworkService: jest.Mocked<StrategyFrameworkService>,
  calibrationService: jest.Mocked<SignalCalibrationEngineService>,
) {
  const db = {
    researchOverviewSnapshot: { findUnique: jest.fn().mockResolvedValue(null) },
    pipelineRun: { findFirst: jest.fn().mockResolvedValue(null), upsert: jest.fn() },
  };
  return new ResearchHubService(
    strategyService,
    contextService,
    signalService,
    smartMoneyService,
    strategyFrameworkService,
    calibrationService,
    db as any,
    undefined, // todayTradeReviewService
    undefined, // tradePlanRiskEngineService
    snapshotReader,
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('ResearchHubService — snapshot-first reads', () => {
  let strategyService: jest.Mocked<StrategyDecisionEngineService>;
  let contextService: jest.Mocked<MarketContextIntelligenceService>;
  let signalService: jest.Mocked<SignalGenerationEngineService>;
  let smartMoneyService: jest.Mocked<SmartMoneyIntelligenceService>;
  let strategyFrameworkService: jest.Mocked<StrategyFrameworkService>;
  let calibrationService: jest.Mocked<SignalCalibrationEngineService>;
  const originalEnv = process.env['RESEARCH_HUB_SNAPSHOT_READS'];

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env['RESEARCH_HUB_SNAPSHOT_READS']; // default = ON

    strategyService = new StrategyDecisionEngineService() as any;
    contextService = new MarketContextIntelligenceService() as any;
    signalService = new SignalGenerationEngineService() as any;
    smartMoneyService = new SmartMoneyIntelligenceService() as any;
    strategyFrameworkService = new StrategyFrameworkService() as any;
    calibrationService = new SignalCalibrationEngineService() as any;

    // Region-level deps: always called (not replaced by snapshot)
    (strategyService.marketGate as jest.Mock).mockResolvedValue({
      marketGate: 'OPEN', marketCondition: 'HEALTHY',
      reasons: [], blockers: [], allowedActions: [], dataStatus: 'COMPLETE',
    });
    (contextService.latestPersistedSummary as jest.Mock).mockResolvedValue({
      topSectors: [], weakSectors: [], breadth: {}, explanation: [],
    });
    (strategyService.exits as jest.Mock).mockResolvedValue([]);
    (calibrationService.health as jest.Mock).mockResolvedValue(stubCalibrationHealth);
    // Short-review candidates: always live (strategy code required for gate)
    (strategyService.candidates as jest.Mock).mockResolvedValue({ results: [] });
    (strategyFrameworkService.performance as jest.Mock).mockResolvedValue([]);
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env['RESEARCH_HUB_SNAPSHOT_READS'];
    } else {
      process.env['RESEARCH_HUB_SNAPSHOT_READS'] = originalEnv;
    }
  });

  // ── 1. Snapshot mode ON + rows available ─────────────────────────────────────

  it('skips live signal/smartMoney reads when snapshot rows are available', async () => {
    const mockRead = jest.fn().mockResolvedValue(makeSnapshotBulkRead());
    const reader = makeSnapshotReader(mockRead);
    const service = makeService(reader, strategyService, contextService, signalService, smartMoneyService, strategyFrameworkService, calibrationService);

    await service.overview({ live: true });

    // Snapshot reader was called
    expect(mockRead).toHaveBeenCalledWith('IN', 'STOCK');
    // Live signal diagnostics NOT called (replaced by snapshot.signalCounts)
    expect(signalService.funnelDiagnostics).not.toHaveBeenCalled();
    // Live smart money NOT called (replaced by snapshot.smartMoney)
    expect(smartMoneyService.top).not.toHaveBeenCalled();
    // Region-level deps STILL called (not in snapshot)
    expect(strategyService.marketGate).toHaveBeenCalledWith('IN');
    expect(contextService.latestPersistedSummary).toHaveBeenCalledWith('IN');
  });

  it('uses snapshot signal counts in the confirmation summary', async () => {
    const snap = makeSnapshotBulkRead({
      signalCounts: { total: 3, bullish: 2, bearish: 1, neutral: 0, byDirection: { BULLISH: 2, BEARISH: 1, NEUTRAL: 0 } },
    });
    const reader = makeSnapshotReader(jest.fn().mockResolvedValue(snap));
    const service = makeService(reader, strategyService, contextService, signalService, smartMoneyService, strategyFrameworkService, calibrationService);

    const result = await service.overview({ live: true });

    expect(result.confirmationSummary.signalSummary.topBullishCount).toBe(2);
    expect(result.confirmationSummary.signalSummary.topBearishCount).toBe(1);
    expect(signalService.funnelDiagnostics).not.toHaveBeenCalled();
  });

  it('uses snapshot smart money entries for confirmations/contradictions', async () => {
    const snap = makeSnapshotBulkRead({
      smartMoney: [
        { instrumentId: 'INST-SNAP-1', status: 'ACCUMULATION', smartMoneyScore: 70 },
      ],
      candidates: [
        {
          instrumentId: 'INST-SNAP-1', symbol: 'SNAPLTD',
          strategy: 'UNKNOWN_FROM_SNAPSHOT' as any,
          decision: 'TRADE_CANDIDATE' as any,
          decisionScore: 78, action: 'CONSIDER_ENTRY', confidence: 'HIGH',
          marketGate: 'UNKNOWN' as any, marketCondition: 'UNKNOWN' as any,
          frameworkBacked: true, reasons: ['BREAKOUT_ENTRY'],
          blockers: [], warnings: [], dataGaps: [],
          modelVersion: 'sgv1', generatedAt: '2026-06-11T18:00:00.000Z',
        } as any,
      ],
    });
    const reader = makeSnapshotReader(jest.fn().mockResolvedValue(snap));
    const service = makeService(reader, strategyService, contextService, signalService, smartMoneyService, strategyFrameworkService, calibrationService);

    const result = await service.overview({ live: true });

    // Smart money ACCUMULATION confirmation should appear
    expect(result.confirmationSummary.smartMoneySummary.accumulationCount).toBeGreaterThanOrEqual(1);
    expect(smartMoneyService.top).not.toHaveBeenCalled();
  });

  it('surfaces snapshotAssembledAt in the result when snapshot rows are used', async () => {
    const snap = makeSnapshotBulkRead({ assembledAt: '2026-06-11T18:00:00.000Z' });
    const reader = makeSnapshotReader(jest.fn().mockResolvedValue(snap));
    const service = makeService(reader, strategyService, contextService, signalService, smartMoneyService, strategyFrameworkService, calibrationService);

    const result = await service.overview({ live: true });

    expect(result.snapshotAssembledAt).toBe('2026-06-11T18:00:00.000Z');
  });

  it('does NOT set snapshotAssembledAt when snapshot is empty (live fallback)', async () => {
    (signalService.funnelDiagnostics as jest.Mock).mockResolvedValue({
      total: 0, bullish: 0, bearish: 0, neutral: 0, byDirection: {},
    });
    (smartMoneyService.top as jest.Mock).mockResolvedValue({ results: [], total: 0 });

    // Empty snapshot
    const emptyRead: SnapshotBulkRead = {
      rows: new Map(),
      assembledAt: null,
      signalCounts: { total: 0, bullish: 0, bearish: 0, neutral: 0, byDirection: {} },
      candidates: [],
      smartMoney: [],
    };
    const reader = makeSnapshotReader(jest.fn().mockResolvedValue(emptyRead));
    const service = makeService(reader, strategyService, contextService, signalService, smartMoneyService, strategyFrameworkService, calibrationService);

    const result = await service.overview({ live: true });

    // snapshotAssembledAt not present (or null/undefined)
    expect(result.snapshotAssembledAt == null).toBe(true);
  });

  // ── 2. Snapshot mode ON + empty rows → live fallback ─────────────────────────

  it('falls back to live signal/smartMoney reads when snapshot has no rows', async () => {
    (signalService.funnelDiagnostics as jest.Mock).mockResolvedValue({
      total: 2, bullish: 1, bearish: 1, neutral: 0, byDirection: { BULLISH: 1, BEARISH: 1 },
    });
    (smartMoneyService.top as jest.Mock).mockResolvedValue({ results: [], total: 0 });

    const emptyRead: SnapshotBulkRead = {
      rows: new Map(),
      assembledAt: null,
      signalCounts: { total: 0, bullish: 0, bearish: 0, neutral: 0, byDirection: {} },
      candidates: [],
      smartMoney: [],
    };
    const reader = makeSnapshotReader(jest.fn().mockResolvedValue(emptyRead));
    const service = makeService(reader, strategyService, contextService, signalService, smartMoneyService, strategyFrameworkService, calibrationService);

    await service.overview({ live: true });

    // Live reads called because snapshot was empty
    expect(signalService.funnelDiagnostics).toHaveBeenCalledWith({ region: 'IN', assetType: 'STOCK' });
    expect(smartMoneyService.top).toHaveBeenCalled();
  });

  it('falls back to live when snapshot reader throws', async () => {
    (signalService.funnelDiagnostics as jest.Mock).mockResolvedValue({
      total: 0, bullish: 0, bearish: 0, neutral: 0, byDirection: {},
    });
    (smartMoneyService.top as jest.Mock).mockResolvedValue({ results: [], total: 0 });

    const throwingReader = makeSnapshotReader(jest.fn().mockRejectedValue(new Error('DB error')));
    const service = makeService(throwingReader, strategyService, contextService, signalService, smartMoneyService, strategyFrameworkService, calibrationService);

    // Should not throw
    const result = await service.overview({ live: true });
    expect(result).toBeDefined();
    // Live reads used after snapshot failure
    expect(signalService.funnelDiagnostics).toHaveBeenCalled();
    expect(smartMoneyService.top).toHaveBeenCalled();
  });

  // ── 3. Snapshot mode OFF (flag = '0') → pure legacy ──────────────────────────

  it('does NOT call snapshot reader when RESEARCH_HUB_SNAPSHOT_READS=0', async () => {
    process.env['RESEARCH_HUB_SNAPSHOT_READS'] = '0';

    (signalService.funnelDiagnostics as jest.Mock).mockResolvedValue({
      total: 0, bullish: 0, bearish: 0, neutral: 0, byDirection: {},
    });
    (smartMoneyService.top as jest.Mock).mockResolvedValue({ results: [], total: 0 });

    const mockRead = jest.fn().mockResolvedValue(makeSnapshotBulkRead());
    const reader = makeSnapshotReader(mockRead);
    const service = makeService(reader, strategyService, contextService, signalService, smartMoneyService, strategyFrameworkService, calibrationService);

    await service.overview({ live: true });

    // Snapshot reader must NOT have been called
    expect(mockRead).not.toHaveBeenCalled();
    // Live reads used instead
    expect(signalService.funnelDiagnostics).toHaveBeenCalled();
    expect(smartMoneyService.top).toHaveBeenCalled();
  });

  it('does NOT call snapshot reader when RESEARCH_HUB_SNAPSHOT_READS=false', async () => {
    process.env['RESEARCH_HUB_SNAPSHOT_READS'] = 'false';

    (signalService.funnelDiagnostics as jest.Mock).mockResolvedValue({
      total: 0, bullish: 0, bearish: 0, neutral: 0, byDirection: {},
    });
    (smartMoneyService.top as jest.Mock).mockResolvedValue({ results: [], total: 0 });

    const mockRead = jest.fn().mockResolvedValue(makeSnapshotBulkRead());
    const reader = makeSnapshotReader(mockRead);
    const service = makeService(reader, strategyService, contextService, signalService, smartMoneyService, strategyFrameworkService, calibrationService);

    await service.overview({ live: true });

    expect(mockRead).not.toHaveBeenCalled();
    expect(signalService.funnelDiagnostics).toHaveBeenCalled();
    expect(smartMoneyService.top).toHaveBeenCalled();
  });

  // ── 4. Smart money provenance fallback ───────────────────────────────────────

  it('falls back to live smartMoney when snapshot has no smart money entries', async () => {
    (smartMoneyService.top as jest.Mock).mockResolvedValue({
      results: [{ instrumentId: 'LIVE-1', status: 'DISTRIBUTION' }],
      total: 1,
    });
    (signalService.funnelDiagnostics as jest.Mock).mockResolvedValue({
      total: 0, bullish: 0, bearish: 0, neutral: 0, byDirection: {},
    });

    // Snapshot available but smartMoney section empty (FAILED provenance)
    const snap = makeSnapshotBulkRead({ smartMoney: [] });
    const reader = makeSnapshotReader(jest.fn().mockResolvedValue(snap));
    const service = makeService(reader, strategyService, contextService, signalService, smartMoneyService, strategyFrameworkService, calibrationService);

    await service.overview({ live: true });

    // Live smart money must have been called as fallback
    expect(smartMoneyService.top).toHaveBeenCalled();
    // Signal counts still from snapshot (not live)
    expect(signalService.funnelDiagnostics).not.toHaveBeenCalled();
  });

  // ── 5. Short-review candidates always live ────────────────────────────────────

  it('always calls live fetchShortReviewCandidates even when snapshot is available', async () => {
    const snap = makeSnapshotBulkRead();
    const reader = makeSnapshotReader(jest.fn().mockResolvedValue(snap));
    const service = makeService(reader, strategyService, contextService, signalService, smartMoneyService, strategyFrameworkService, calibrationService);

    await service.overview({ live: true });

    // Short candidates require strategy code gating — always called live
    // (strategyService.candidates is called for BREAKDOWN_MOMENTUM and TREND_LOSS_SHORT)
    expect(strategyService.candidates).toHaveBeenCalledWith(
      expect.objectContaining({ strategy: 'BREAKDOWN_MOMENTUM' })
    );
  });
});
