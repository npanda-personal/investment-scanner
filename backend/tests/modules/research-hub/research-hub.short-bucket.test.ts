/**
 * Tests for the research-hub short-review candidate bucket.
 *
 * Covers:
 * - shortReviewCandidates bucket exists in ResearchPriorities
 * - Short candidates from BREAKDOWN_MOMENTUM surface in the bucket
 * - Cash-only (non-derivatives-eligible) instruments do not surface in the short bucket
 * - Long trade candidates are unchanged
 * - No buy/sell language in next-action labels
 */

import { ResearchHubService } from '../../../src/modules/research-hub/research-hub.service';
import { SignalGenerationEngineService } from '../../../src/modules/signal-generation-engine';
import { StrategyDecisionEngineService } from '../../../src/modules/strategy-decision-engine';
import { SmartMoneyIntelligenceService } from '../../../src/modules/smart-money-intelligence';
import { MarketContextIntelligenceService } from '../../../src/modules/market-context-intelligence';
import { StrategyFrameworkService } from '../../../src/modules/strategy-framework';

jest.mock('../../../src/modules/signal-generation-engine');
jest.mock('../../../src/modules/strategy-decision-engine');
jest.mock('../../../src/modules/smart-money-intelligence');
jest.mock('../../../src/modules/market-context-intelligence');
jest.mock('../../../src/modules/strategy-framework');

describe('ResearchHubService — short-review bucket', () => {
  let service: ResearchHubService;
  let strategyService: jest.Mocked<StrategyDecisionEngineService>;
  let contextService: jest.Mocked<MarketContextIntelligenceService>;
  let signalService: jest.Mocked<SignalGenerationEngineService>;
  let smartMoneyService: jest.Mocked<SmartMoneyIntelligenceService>;
  let strategyFrameworkService: jest.Mocked<StrategyFrameworkService>;

  const mockGateOpen = {
    marketGate: 'OPEN',
    marketCondition: 'HEALTHY',
    reasons: ['Strong trend'],
    blockers: [],
    allowedActions: ['NEW_LONG_TRADES_ALLOWED'],
    dataStatus: 'AVAILABLE',
  };

  const mockBacktestSummary = [{
    strategyCode: 'BREAKDOWN_MOMENTUM',
    strategyVersion: '1.0.0',
    timeframe: '3Y',
    region: 'IN',
    assetType: 'STOCK',
    universeKey: 'ALL_ELIGIBLE',
    startingCapital: 100000,
    endingCapital: 118000,
    totalReturn: 0.18,
    cagr: 0.06,
    maxDrawdown: -0.15,
    volatility: 0.22,
    sharpe: 0.8,
    winRate: 0.52,
    profitFactor: 1.2,
    tradeCount: 28,
    averageHoldingDays: 15,
    exposurePercent: null,
    ratingScore: 55,
    ratingGrade: 'AVERAGE',
    automationEligibility: 'WATCHLIST_ONLY',
    readinessLabel: 'WATCHLIST_CANDIDATE',
    generatedAt: new Date().toISOString(),
  }];

  beforeEach(() => {
    jest.clearAllMocks();
    // Disable snapshot-first reads in legacy-path tests to isolate live service mocks.
    // Snapshot-first behaviour is covered by research-hub.snapshot-reads.test.ts.
    process.env['RESEARCH_HUB_SNAPSHOT_READS'] = '0';

    strategyService = new StrategyDecisionEngineService() as any;
    contextService = new MarketContextIntelligenceService() as any;
    signalService = new SignalGenerationEngineService() as any;
    smartMoneyService = new SmartMoneyIntelligenceService() as any;
    strategyFrameworkService = new StrategyFrameworkService() as any;

    (signalService.funnelDiagnostics as jest.Mock).mockResolvedValue({
      total: 5, bullish: 3, bearish: 2, neutral: 0, byDirection: { BULLISH: 3, BEARISH: 2 },
    });
    (contextService.latestPersistedSummary as jest.Mock).mockResolvedValue({
      topSectors: [], weakSectors: [], breadth: {}, explanation: [],
    });
    (smartMoneyService.top as jest.Mock).mockResolvedValue({ results: [], total: 0 });
    (strategyFrameworkService.performance as jest.Mock).mockResolvedValue(mockBacktestSummary);

    service = new ResearchHubService(
      strategyService,
      contextService,
      signalService,
      smartMoneyService,
      strategyFrameworkService,
    );
  });

  afterEach(() => {
    delete process.env['RESEARCH_HUB_SNAPSHOT_READS'];
  });

  function setupMocks(opts: {
    shortCandidates?: any[];
    longCandidates?: any[];
    exitCandidates?: any[];
    gate?: any;
  }) {
    const { shortCandidates = [], longCandidates = [], exitCandidates = [], gate = mockGateOpen } = opts;

    (strategyService.marketGate as jest.Mock).mockResolvedValue(gate);
    (strategyService.exits as jest.Mock).mockResolvedValue(exitCandidates);

    // candidates is called multiple times:
    // 1. For long decisions pool: TRADE_CANDIDATE, WATCH, WAIT, AVOID (4 calls)
    // 2. For short candidates: BREAKDOWN_MOMENTUM TRADE_CANDIDATE (1-2 calls)
    // We use mockImplementation to respond per strategyCode
    (strategyService.candidates as jest.Mock).mockImplementation(async (query: any) => {
      const code = (query.strategy || '').toUpperCase();
      if (code === 'BREAKDOWN_MOMENTUM' || code === 'TREND_LOSS_SHORT') {
        return { results: shortCandidates.filter((c: any) => !code || c.strategy === code || code === 'BREAKDOWN_MOMENTUM'), total: shortCandidates.length };
      }
      return { results: longCandidates, total: longCandidates.length };
    });
  }

  it('includes shortReviewCandidates in ResearchPriorities', async () => {
    setupMocks({ shortCandidates: [], longCandidates: [] });

    const overview = await service.overview({ live: true });

    expect(overview.researchPriorities).toHaveProperty('shortReviewCandidates');
    expect(Array.isArray(overview.researchPriorities.shortReviewCandidates)).toBe(true);
  });

  it('surfaces a derivatives-eligible BREAKDOWN_MOMENTUM candidate in the short bucket', async () => {
    const shortCandidate = {
      id: 'dec-short-1',
      instrumentId: 'INST-SHORT-1',
      symbol: 'SHORTLTD',
      strategy: 'BREAKDOWN_MOMENTUM',
      strategyVersion: '1.0.0',
      frameworkBacked: true,
      decision: 'TRADE_CANDIDATE',
      action: 'CONSIDER_ENTRY',
      direction: 'BEARISH',
      derivativesEligible: true,
      decisionScore: 75,
      confidence: 'HIGH',
      marketGate: 'SELECTIVE',
      marketCondition: 'SELECTIVE',
      reasons: ['Price below SMA50/SMA200 with bearish signal.'],
      blockers: [],
      warnings: [],
      dataGaps: [],
      modelVersion: 'strategy-decision-v1',
      generatedAt: new Date().toISOString(),
    };

    setupMocks({ shortCandidates: [shortCandidate], longCandidates: [] });

    const overview = await service.overview({ live: true });

    expect(overview.researchPriorities.shortReviewCandidates.length).toBeGreaterThan(0);
    expect(overview.researchPriorities.shortReviewCandidates[0].symbol).toBe('SHORTLTD');
  });

  it('does NOT surface a cash-only (non-derivatives-eligible) candidate in the short bucket', async () => {
    const cashOnlyShortCandidate = {
      id: 'dec-short-cash',
      instrumentId: 'INST-CASH',
      symbol: 'CASHLTD',
      strategy: 'BREAKDOWN_MOMENTUM',
      strategyVersion: '1.0.0',
      frameworkBacked: true,
      decision: 'TRADE_CANDIDATE',
      action: 'CONSIDER_ENTRY',
      direction: 'BEARISH',
      derivativesEligible: false, // cash-only
      decisionScore: 75,
      confidence: 'HIGH',
      marketGate: 'SELECTIVE',
      marketCondition: 'SELECTIVE',
      reasons: ['Bearish signal.'],
      blockers: [],
      warnings: [],
      dataGaps: [],
      modelVersion: 'strategy-decision-v1',
      generatedAt: new Date().toISOString(),
    };

    setupMocks({ shortCandidates: [cashOnlyShortCandidate], longCandidates: [] });

    const overview = await service.overview({ live: true });

    // Cash-only instrument must not appear in the short-review bucket
    const shortBucket = overview.researchPriorities.shortReviewCandidates;
    expect(shortBucket.every((c) => (c as any).derivativesEligible !== false)).toBe(true);
  });

  it('keeps long trade candidates unchanged when short candidates exist', async () => {
    const longCandidate = {
      id: 'dec-long-1',
      instrumentId: 'INST-LONG-1',
      symbol: 'LONGLTD',
      strategy: 'TREND_MOMENTUM',
      strategyVersion: '1.0.0',
      frameworkBacked: true,
      decision: 'TRADE_CANDIDATE',
      action: 'CONSIDER_ENTRY',
      direction: 'BULLISH',
      decisionScore: 88,
      confidence: 'HIGH',
      marketGate: 'OPEN',
      marketCondition: 'HEALTHY',
      reasons: ['Bullish trend confirmed.'],
      blockers: [],
      warnings: [],
      dataGaps: [],
      modelVersion: 'strategy-decision-v1',
      generatedAt: new Date().toISOString(),
      backtestSummary: mockBacktestSummary[0],
    };
    const shortCandidate = {
      id: 'dec-short-2',
      instrumentId: 'INST-SHORT-2',
      symbol: 'SHORTLTD2',
      strategy: 'BREAKDOWN_MOMENTUM',
      strategyVersion: '1.0.0',
      frameworkBacked: true,
      decision: 'TRADE_CANDIDATE',
      action: 'CONSIDER_ENTRY',
      direction: 'BEARISH',
      derivativesEligible: true,
      decisionScore: 72,
      confidence: 'HIGH',
      marketGate: 'SELECTIVE',
      reasons: ['Bearish breakdown.'],
      blockers: [],
      warnings: [],
      dataGaps: [],
      modelVersion: 'strategy-decision-v1',
      generatedAt: new Date().toISOString(),
    };

    (strategyService.marketGate as jest.Mock).mockResolvedValue(mockGateOpen);
    (strategyService.exits as jest.Mock).mockResolvedValue([]);
    (strategyService.candidates as jest.Mock).mockImplementation(async (query: any) => {
      const code = (query.strategy || '').toUpperCase();
      if (code === 'BREAKDOWN_MOMENTUM') {
        return { results: [shortCandidate], total: 1 };
      }
      return { results: [longCandidate], total: 1 };
    });

    const overview = await service.overview({ live: true });

    // Long candidates should still exist
    expect(overview.researchPriorities.tradeCandidates.length).toBeGreaterThan(0);
    expect(overview.researchPriorities.tradeCandidates.some((c) => c.symbol === 'LONGLTD')).toBe(true);
    // Short bucket should also exist
    expect(overview.researchPriorities.shortReviewCandidates.length).toBeGreaterThan(0);
  });

  it('does NOT use buy/sell language in short-related next actions', async () => {
    const shortCandidate = {
      id: 'dec-short-3',
      instrumentId: 'INST-SHORT-3',
      symbol: 'SHORTLTD3',
      strategy: 'BREAKDOWN_MOMENTUM',
      strategyVersion: '1.0.0',
      frameworkBacked: true,
      decision: 'TRADE_CANDIDATE',
      action: 'CONSIDER_ENTRY',
      direction: 'BEARISH',
      derivativesEligible: true,
      decisionScore: 73,
      confidence: 'HIGH',
      marketGate: 'SELECTIVE',
      reasons: ['Bearish breakdown.'],
      blockers: [],
      warnings: [],
      dataGaps: [],
      modelVersion: 'strategy-decision-v1',
      generatedAt: new Date().toISOString(),
    };

    setupMocks({ shortCandidates: [shortCandidate], longCandidates: [] });

    const overview = await service.overview({ live: true });

    const allActionLabels = overview.nextActions.map((a) => a.label.toLowerCase());
    for (const label of allActionLabels) {
      expect(label).not.toContain('buy');
      expect(label).not.toContain('sell');
    }
  });
});
