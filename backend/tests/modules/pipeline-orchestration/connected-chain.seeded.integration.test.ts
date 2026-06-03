/// <reference types="@types/jest" />
const dotenv = require('dotenv') as typeof import('dotenv');
dotenv.config();
process.env.DATABASE_URL = withPrismaConnectionLimit(process.env.DATABASE_URL);

const { Prisma } = require('@prisma/client') as typeof import('@prisma/client');
const prisma = require('../../../src/db/prisma').default as any;
const {
  MarketDataFoundationRepository,
  MarketDataFoundationService,
} = require('../../../src/modules/market-data-foundation') as typeof import('../../../src/modules/market-data-foundation');
const {
  DataQualityEngineRepository,
  DataQualityEngineService,
} = require('../../../src/modules/data-quality-engine') as typeof import('../../../src/modules/data-quality-engine');
const {
  SignalGenerationEngineRepository,
  SignalGenerationEngineService,
} = require('../../../src/modules/signal-generation-engine') as typeof import('../../../src/modules/signal-generation-engine');
const {
  SignalCalibrationEngineRepository,
  SignalCalibrationEngineService,
} = require('../../../src/modules/signal-calibration-engine') as typeof import('../../../src/modules/signal-calibration-engine');
const {
  MarketContextIntelligenceRepository,
  MarketContextIntelligenceService,
  MarketPulseSnapshotService,
} = require('../../../src/modules/market-context-intelligence') as typeof import('../../../src/modules/market-context-intelligence');
const {
  SmartMoneyIntelligenceProvider,
  SmartMoneyIntelligenceRepository,
  SmartMoneyIntelligenceService,
} = require('../../../src/modules/smart-money-intelligence') as typeof import('../../../src/modules/smart-money-intelligence');
const {
  HistoricalContextSnapshotsRepository,
  HistoricalContextSnapshotsService,
} = require('../../../src/modules/historical-context-snapshots') as typeof import('../../../src/modules/historical-context-snapshots');
const {
  SignalQualityLabRepository,
  SignalQualityLabService,
} = require('../../../src/modules/signal-quality-lab') as typeof import('../../../src/modules/signal-quality-lab');
const {
  StrategyDecisionEngineRepository,
  StrategyDecisionEngineService,
} = require('../../../src/modules/strategy-decision-engine') as typeof import('../../../src/modules/strategy-decision-engine');
const { ResearchHubService } = require('../../../src/modules/research-hub') as typeof import('../../../src/modules/research-hub');
const {
  TodayTradeReviewRepository,
  TodayTradeReviewService,
} = require('../../../src/modules/today-trade-review') as typeof import('../../../src/modules/today-trade-review');
const {
  SignalPositionLedgerRepository,
  SignalPositionLedgerService,
} = require('../../../src/modules/signal-position-ledger') as typeof import('../../../src/modules/signal-position-ledger');
const {
  PipelineOrchestrationRepository,
  PipelineOrchestrationService,
} = require('../../../src/modules/pipeline-orchestration') as typeof import('../../../src/modules/pipeline-orchestration');
const { TradePlanRiskEngineService } = require('../../../src/modules/trade-plan-risk-engine') as typeof import('../../../src/modules/trade-plan-risk-engine');

const FIXED_CLOCK = new Date('2026-06-01T09:00:00.000Z');
const SNAPSHOT_DAY = new Date('2026-06-01T00:00:00.000Z');
const DATA_THROUGH_DAY = new Date('2026-05-29T00:00:00.000Z');
const DATA_THROUGH_DATE = '2026-05-29';
const FUNDAMENTAL_DAY = new Date('2026-03-31T00:00:00.000Z');
const START_DAY = new Date('2025-06-02T00:00:00.000Z');
const INFY_DQ_CUTOFF_DAY = new Date('2023-12-14T00:00:00.000Z');
const REGION = 'IN';
const ASSET_TYPE = 'STOCK';
const TIMEFRAME = '1d';
const TEST_SOURCE = 'TEST_CONNECTED_CHAIN';
const TEST_RUN_ID = 'connected-chain-seeded-20260601';
const TEST_SYMBOLS = ['RELIANCE', 'TCS', 'INFY'] as const;
const SIGNAL_GENERATED_DAY = new Date('2026-06-01T00:00:00.000Z');
const RealDate = Date;

type TestSymbol = typeof TEST_SYMBOLS[number];

type SeededInstrument = {
  id: string;
  symbol: TestSymbol;
  latestClose: number;
  priceRowCount: number;
};

type PriceSeedRow = {
  symbol: TestSymbol;
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
};

function withPrismaConnectionLimit(value: string | undefined): string | undefined {
  if (!value) return value;
  try {
    const parsed = new URL(value);
    if (!parsed.searchParams.has('connection_limit')) {
      parsed.searchParams.set('connection_limit', '1');
    }
    return parsed.toString();
  } catch {
    return value;
  }
}

function installFixedDate() {
  const fixedTime = FIXED_CLOCK.getTime();
  class FixedDate extends RealDate {
    constructor(...args: any[]) {
      if (args.length === 0) {
        super(fixedTime);
        return;
      }
      super(...(args as [any]));
    }

    static now() {
      return fixedTime;
    }
  }
  global.Date = FixedDate as DateConstructor;
}

function restoreFixedDate() {
  global.Date = RealDate;
}

describe('Pipeline Orchestration seeded connected-chain integration', () => {
  const db = prisma as any;
  let originalTrustedMinLite: string | undefined;
  let originalTrustedMinFull: string | undefined;
  let seeded: Record<TestSymbol, SeededInstrument>;

  beforeAll(async () => {
    originalTrustedMinLite = process.env.TRUSTED_REVIEW_MIN_LITE;
    originalTrustedMinFull = process.env.TRUSTED_REVIEW_MIN_FULL;
    process.env.TRUSTED_REVIEW_MIN_LITE = '1';
    process.env.TRUSTED_REVIEW_MIN_FULL = '2';
    installFixedDate();
    await cleanupConnectedChainRows();
    seeded = await seedConnectedChainUniverse();
  }, 120_000);

  afterAll(async () => {
    process.env.TRUSTED_REVIEW_MIN_LITE = originalTrustedMinLite;
    process.env.TRUSTED_REVIEW_MIN_FULL = originalTrustedMinFull;
    restoreFixedDate();
    await prisma.$disconnect();
  }, 30_000);

  it('fans out a terminal MARKET_DATA snapshot through persisted downstream chain outputs', async () => {
    const services = createConnectedChainServices();
    const changedInstrumentIds = TEST_SYMBOLS.map((symbol) => seeded[symbol].id);

    await services.pipeline.recordMarketDataStageSnapshot({
      region: REGION,
      assetType: ASSET_TYPE,
      timeframe: TIMEFRAME,
      pipelineKey: 'market-intelligence',
      triggerType: 'scheduled',
      operation: 'PRICE_BACKFILL',
      runId: TEST_RUN_ID,
      status: 'COMPLETED',
      dataThroughDate: DATA_THROUGH_DATE,
      totalCount: changedInstrumentIds.length,
      processedCount: changedInstrumentIds.length,
      succeededCount: changedInstrumentIds.length,
      failedCount: 0,
      skippedCount: 0,
      unchangedCount: 0,
      changedInstrumentIds,
      downstreamInstrumentIds: changedInstrumentIds,
      batchSize: changedInstrumentIds.length,
      nextOffset: null,
      hasMore: false,
      startedAt: FIXED_CLOCK.toISOString(),
      completedAt: FIXED_CLOCK.toISOString(),
      warnings: [],
      errors: [],
      metadata: {
        fixture: 'connected-chain.seeded.integration',
        sourceTables: [
          'SourceFileImport',
          'Stock',
          'PriceTick',
          'LatestPrice',
          'MarketDeliverySnapshot',
          'Fundamental',
          'SectorContextSnapshot',
        ],
      },
    }, FIXED_CLOCK);

    const dataQuality = await db.dataQualityEvaluation.findMany({
      where: { instrumentId: { in: changedInstrumentIds } },
    });
    const dqBySymbol = bySymbol(dataQuality);
    expect(dqBySymbol.RELIANCE?.signalReadinessStatus).toBe('READY');
    expect(dqBySymbol.RELIANCE?.eligibleForSignals).toBe(true);
    expect(dqBySymbol.TCS?.signalReadinessStatus).toBe('READY');
    expect(dqBySymbol.TCS?.eligibleForSignals).toBe(true);
    expect(dqBySymbol.INFY?.signalReadinessStatus).toBe('NOT_READY');
    expect(dqBySymbol.INFY?.eligibleForSignals).toBe(false);

    const signals = await db.signalResult.findMany({
      where: {
        instrumentId: { in: changedInstrumentIds },
        modelVersion: 'signal-engine-v1',
        generatedDate: SIGNAL_GENERATED_DAY,
      },
      orderBy: { symbol: 'asc' },
    });
    const signalBySymbol = bySymbol(signals);
    expect(signalBySymbol.RELIANCE?.direction).toBe('BULLISH');
    expect(signalBySymbol.RELIANCE?.dataQualityEligibilitySnapshot?.eligible).toBe(true);
    expect(signalBySymbol.TCS?.direction).toBe('NEUTRAL');
    expect(signalBySymbol.TCS?.dataQualityEligibilitySnapshot?.eligible).toBe(true);
    expect(signalBySymbol.INFY).toBeUndefined();

    const calibrations = await db.signalCalibrationResult.findMany({
      where: { instrumentId: { in: changedInstrumentIds } },
      orderBy: { symbol: 'asc' },
    });
    const calibrationBySymbol = bySymbol(calibrations);
    expect(calibrationBySymbol.RELIANCE).toBeTruthy();
    expect(calibrationBySymbol.TCS).toBeTruthy();
    expect(calibrationBySymbol.INFY).toBeUndefined();

    const decisions = await db.strategyDecisionResult.findMany({
      where: {
        instrumentId: { in: changedInstrumentIds },
        modelVersion: 'strategy-decision-v1',
        generatedDate: SIGNAL_GENERATED_DAY,
      },
      orderBy: [{ symbol: 'asc' }, { strategy: 'asc' }],
    });
    const relianceDecisions = decisions.filter((decision: any) => decision.symbol === 'RELIANCE');
    const tcsDecisions = decisions.filter((decision: any) => decision.symbol === 'TCS');
    const infyDecisions = decisions.filter((decision: any) => decision.symbol === 'INFY');
    expect(relianceDecisions.some((decision: any) =>
      decision.frameworkBacked === true &&
      decision.decision === 'TRADE_CANDIDATE' &&
      decision.strategy === 'TREND_MOMENTUM'
    )).toBe(true);
    expect(tcsDecisions.length).toBeGreaterThan(0);
    expect(tcsDecisions.every((decision: any) => decision.decision !== 'TRADE_CANDIDATE')).toBe(true);
    expect(infyDecisions.every((decision: any) => decision.decision !== 'TRADE_CANDIDATE')).toBe(true);

    const researchOverview = await db.pipelineRun.findUnique({
      where: { idempotencyKey: 'research-overview-v1:IN:STOCK' },
    });
    expect(researchOverview?.pipelineKey).toBe('research-hub-overview');
    expect(['COMPLETED', 'PARTIAL']).toContain(researchOverview?.status);
    expect((researchOverview?.metadata as any)?.overview).toBeTruthy();

    const todayReviewRun = await db.todayReviewRun.findUnique({
      where: {
        runDate_region_assetType: {
          runDate: SIGNAL_GENERATED_DAY,
          region: REGION,
          assetType: ASSET_TYPE,
        },
      },
      include: { candidates: true },
    });
    expect(todayReviewRun).toBeTruthy();
    expect(['COMPLETED', 'PARTIAL']).toContain(todayReviewRun?.status);
    const reviewCandidates = todayReviewRun?.candidates || [];
    expect(reviewCandidates.some((candidate: any) => candidate.symbol === 'RELIANCE' && candidate.state === 'LONG_REVIEW')).toBe(true);
    expect(reviewCandidates.filter((candidate: any) => candidate.symbol === 'TCS').every((candidate: any) => candidate.state !== 'LONG_REVIEW')).toBe(true);
    expect(reviewCandidates.filter((candidate: any) => candidate.symbol === 'INFY').every((candidate: any) => candidate.state !== 'LONG_REVIEW')).toBe(true);

    const ledgerRows = await db.signalPositionLedgerEntry.findMany({
      where: {
        instrumentId: { in: changedInstrumentIds },
        scopeRegion: REGION,
        scopeAssetType: ASSET_TYPE,
      },
      orderBy: { symbol: 'asc' },
    });
    const ledgerBySymbol = bySymbol(ledgerRows);
    expect(ledgerBySymbol.RELIANCE).toEqual(expect.objectContaining({
      status: 'ACTIVE',
      entryTriggerType: 'bullish_entry_trigger',
      strategyDecision: 'ENTRY_CANDIDATE',
      currentDataQualityStatus: 'READY',
      trustEvidenceStatus: 'SOURCE_PROVEN',
    }));
    expect(ledgerBySymbol.RELIANCE?.entryTriggerPrice).toBeCloseTo(seeded.RELIANCE.latestClose, 4);
    expect(ledgerBySymbol.TCS).toBeUndefined();
    expect(ledgerBySymbol.INFY).toBeUndefined();

    const stageRows = await db.pipelineStageRun.findMany({
      where: {
        scopeRegion: REGION,
        scopeAssetType: ASSET_TYPE,
        timeframe: TIMEFRAME,
        dataThroughDate: DATA_THROUGH_DAY,
      },
      orderBy: { stageOrder: 'asc' },
    });
    const stageByKey = new Map<string, any>(stageRows.map((stage: any) => [stage.stageKey, stage]));
    for (const stageKey of [
      'MARKET_DATA',
      'DATA_QUALITY',
      'RAW_SIGNALS',
      'SIGNAL_CALIBRATION',
      'STRATEGY_DECISION',
      'RESEARCH_PROJECTION',
      'TODAY_REVIEW',
      'SIGNAL_POSITION_LEDGER',
    ]) {
      expect(['COMPLETED', 'PARTIAL', 'SKIPPED']).toContain(stageByKey.get(stageKey)?.status);
    }
    const runAllMarker = ['PIPELINE', 'RUN', 'ALL'].join('_');
    expect(stageByKey.get('MARKET_DATA')?.idempotencyKey).not.toContain(runAllMarker);
  }, 300_000);

  function createConnectedChainServices() {
    const marketDataService = new MarketDataFoundationService(new MarketDataFoundationRepository(prisma as any));
    const dataQualityService = new DataQualityEngineService(
      new DataQualityEngineRepository(prisma as any),
      marketDataService,
    );
    const marketContextService = new MarketContextIntelligenceService(
      new MarketContextIntelligenceRepository(prisma as any),
      marketDataService,
    );
    jest.spyOn(marketContextService as any, 'latestPersistedSummary').mockImplementation(async (region?: unknown) => {
      return seededMarketContextSummary(typeof region === 'string' ? region : REGION);
    });
    const providerGuard = new SmartMoneyIntelligenceProvider();
    jest.spyOn(providerGuard, 'fetchInsiderOwnership').mockRejectedValue(new Error('Provider calls are disabled for seeded connected-chain tests.'));
    const smartMoneyService = new SmartMoneyIntelligenceService(
      new SmartMoneyIntelligenceRepository(prisma as any),
      marketDataService,
      providerGuard,
      dataQualityService,
    );
    const signalGenerationService = new SignalGenerationEngineService(
      new SignalGenerationEngineRepository(prisma as any),
      marketDataService,
      undefined as any,
      dataQualityService,
      undefined as any,
      undefined,
      marketContextService,
      smartMoneyService,
    );
    const historicalContextService = new HistoricalContextSnapshotsService(
      new HistoricalContextSnapshotsRepository(prisma as any),
      marketContextService,
      smartMoneyService,
      marketDataService,
    );
    const signalQualityService = new SignalQualityLabService(
      new SignalQualityLabRepository(),
      signalGenerationService,
      marketDataService,
      historicalContextService,
      dataQualityService,
    );
    const signalCalibrationService = new SignalCalibrationEngineService(
      new SignalCalibrationEngineRepository(prisma as any),
      signalGenerationService,
      signalQualityService,
      historicalContextService,
      dataQualityService,
    );
    const strategyDecisionService = new StrategyDecisionEngineService(
      new StrategyDecisionEngineRepository(prisma as any),
      marketDataService,
      marketContextService,
      signalGenerationService,
      signalCalibrationService,
      dataQualityService,
      smartMoneyService,
    );
    installSeededTodayReviewHarness(marketDataService as any, strategyDecisionService as any);
    const researchHubService = new ResearchHubService(
      strategyDecisionService,
      marketContextService,
      signalGenerationService,
      smartMoneyService,
      undefined as any,
      prisma,
    );
    const tradePlanService = new TradePlanRiskEngineService();
    installSeededTradePlanHarness(tradePlanService as any);
    const todayReviewService = new TodayTradeReviewService(
      new TodayTradeReviewRepository(prisma as any),
      {
        strategyDecisionService,
        tradePlanService,
        marketDataService,
        dataQualityService,
        marketContextService,
        signalService: signalGenerationService,
        calibrationService: signalCalibrationService,
        smartMoneyService,
      },
      () => new Date(FIXED_CLOCK),
    );
    const signalPositionLedgerService = new SignalPositionLedgerService(
      new SignalPositionLedgerRepository(prisma as any),
      signalGenerationService,
    );

    return {
      pipeline: new PipelineOrchestrationService(
        new PipelineOrchestrationRepository(prisma as any),
        dataQualityService,
        signalGenerationService,
        signalCalibrationService,
        marketContextService,
        smartMoneyService,
        historicalContextService,
        signalQualityService,
        strategyDecisionService,
        researchHubService,
        todayReviewService,
        signalPositionLedgerService,
        marketDataService,
        new MarketPulseSnapshotService(),
      ),
    };
  }

  function installSeededTodayReviewHarness(marketDataService: any, strategyDecisionService: any) {
    jest.spyOn(marketDataService, 'latestStoredCandleInfo').mockResolvedValue({
      region: REGION,
      assetType: ASSET_TYPE,
      latestTradingDate: DATA_THROUGH_DATE,
      latestStoredDate: DATA_THROUGH_DATE,
      finalConfirmed: true,
      source: TEST_SOURCE,
    });
    jest.spyOn(marketDataService, 'trustedReviewUniverseHealth').mockImplementation(async () => seededTrustedReviewUniverseHealth());
    jest.spyOn(marketDataService, 'reviewReadinessSummary').mockImplementation(async () => seededReviewReadinessSummary());
    jest.spyOn(marketDataService, 'listTrustedReviewUniverseInstruments').mockImplementation(async (options: any = {}) => {
      const instruments = await seededTrustedReviewInstruments();
      const offset = Number(options.offset || 0);
      const limit = Number(options.limit || instruments.length);
      return instruments.slice(offset, offset + limit);
    });

    jest.spyOn(strategyDecisionService, 'candidates').mockImplementation(async (query: any = {}) => {
      const histories = await Promise.all(TEST_SYMBOLS.map((symbol) => strategyDecisionService.history(seeded[symbol].id)));
      const filtered = histories.flat()
        .filter((result: any) => String(result.generatedAt || '').startsWith(SIGNAL_GENERATED_DAY.toISOString().slice(0, 10)))
        .filter((result: any) => !query.decision || result.decision === query.decision)
        .filter((result: any) => !query.strategy || result.strategy === query.strategy)
        .filter((result: any) => query.frameworkBacked === undefined || result.frameworkBacked === query.frameworkBacked)
        .map((result: any) => result.instrumentId === seeded.RELIANCE.id && result.strategy === 'TREND_MOMENTUM'
          ? {
              ...result,
              strategyRating: {
                ratingScore: 72,
                ratingGrade: 'GOOD',
                readinessLabel: 'PAPER_TEST_CANDIDATE',
              },
              readinessLabel: 'PAPER_TEST_CANDIDATE',
            }
          : result)
        .sort((a: any, b: any) => {
          const direction = query.sortDirection === 'asc' ? 1 : -1;
          if (query.sortBy === 'symbol') return a.symbol.localeCompare(b.symbol) * direction;
          return ((a.decisionScore || 0) - (b.decisionScore || 0)) * direction || a.symbol.localeCompare(b.symbol);
        });
      const offset = Number(query.offset || 0);
      const limit = Number(query.limit || filtered.length);
      return {
        results: filtered.slice(offset, offset + limit),
        total: filtered.length,
      };
    });
  }

  function installSeededTradePlanHarness(tradePlanService: any) {
    const latestForInstrument = async (instrumentIdInput: unknown, strategyInput: unknown = 'TREND_MOMENTUM') => {
      const instrumentId = String(instrumentIdInput || '');
      const strategy = typeof strategyInput === 'string' ? strategyInput : 'TREND_MOMENTUM';
      if (instrumentId !== seeded.RELIANCE.id) return null;
      const entry = seeded.RELIANCE.latestClose;
      const referencePrice = round(entry * 0.985);
      return {
        id: 'connected-chain-reliance-trade-plan',
        instrumentId,
        symbol: 'RELIANCE',
        strategy,
        strategyVersion: '1.2.0',
        modelVersion: 'connected-chain-seeded-v1',
        generatedAt: FIXED_CLOCK.toISOString(),
        planStatus: 'VALID',
        paperReadinessStatus: 'READY_FOR_PAPER_REVIEW',
        paperReadinessReasons: ['Seeded strategy proof and rule-based risk context are available.'],
        paperReadinessBlockers: [],
        strategyRating: 'GOOD',
        readinessLabel: 'PAPER_TEST_CANDIDATE',
        rewardRiskRatio: 2.1,
        targetPrice: null,
        targetPriceCompatibilityNote: 'No arbitrary target price is produced; review uses rule-based exit and invalidation evidence.',
        entryZone: {
          type: 'BREAKOUT',
          referencePrice,
          preferredEntryMin: referencePrice,
          preferredEntryMax: round(entry * 1.015),
          rationale: 'Seeded RELIANCE review is based on bullish trend momentum evidence.',
        },
        riskPlan: {
          stopLoss: round(referencePrice * 0.96).toFixed(2),
          targetPrice: null,
          targetPriceCompatibilityNote: 'Deprecated compatibility field. Strategy Decision uses rule-based exit and invalidation review.',
          rewardRiskRatio: 2.1,
          riskReviewLevel: 'LOW',
          rationale: 'Risk review uses SMA50 support, market gate, data quality, calibrated score, and smart-money evidence.',
          reasonSummary: 'Candidate review is based on rule evidence.',
          invalidationRules: [
            'Data quality becomes NOT_READY.',
            'Price closes below SMA50 for 2 consecutive days.',
            'Calibrated score drops below 40.',
          ],
          exitRules: [
            'Exit condition met: momentum evidence weakened.',
            'Risk review required when smart money status turns to DISTRIBUTION.',
          ],
        },
        blockers: [],
        warnings: [],
        dataGaps: [],
        invalidationRules: [
          'Data quality becomes NOT_READY.',
          'Price closes below SMA50 for 2 consecutive days.',
          'Calibrated score drops below 40.',
        ],
        exitRules: [
          'Exit condition met: momentum evidence weakened.',
          'Risk review required when smart money status turns to DISTRIBUTION.',
        ],
      };
    };

    jest.spyOn(tradePlanService, 'latestForInstrument').mockImplementation(latestForInstrument);
    jest.spyOn(tradePlanService, 'generatePlan').mockImplementation(async (request: any) => (
      latestForInstrument(request.instrumentId, request.strategy || 'TREND_MOMENTUM')
    ));
  }

  async function cleanupConnectedChainRows() {
    const existingStocks = await db.stock.findMany({
      where: { symbol: { in: [...TEST_SYMBOLS] } },
      select: { id: true, symbol: true },
    });
    const existingIds = existingStocks.map((stock: any) => stock.id);
    const existingSymbols = existingStocks.map((stock: any) => stock.symbol);
    const signalIds = existingIds.length
      ? (await db.signalResult.findMany({
          where: { instrumentId: { in: existingIds } },
          select: { id: true },
        })).map((row: any) => row.id)
      : [];
    const todayRuns = await db.todayReviewRun.findMany({
      where: { runDate: SIGNAL_GENERATED_DAY, region: REGION, assetType: ASSET_TYPE },
      select: { id: true },
    });
    const todayRunIds = todayRuns.map((row: any) => row.id);

    await db.signalPositionLedgerEntry.deleteMany({
      where: {
        OR: [
          { instrumentId: { in: existingIds } },
          { entrySignalId: { in: signalIds } },
          { ledgerKey: { contains: TEST_RUN_ID } },
        ],
      },
    });
    if (todayRunIds.length > 0) {
      await db.todayReviewCandidate.deleteMany({ where: { runId: { in: todayRunIds } } });
    }
    await db.todayReviewRun.deleteMany({
      where: { runDate: SIGNAL_GENERATED_DAY, region: REGION, assetType: ASSET_TYPE },
    });
    await db.strategyDecisionResult.deleteMany({
      where: { instrumentId: { in: existingIds }, generatedDate: SIGNAL_GENERATED_DAY },
    });
    await db.signalCalibrationResult.deleteMany({
      where: { instrumentId: { in: existingIds } },
    });
    await db.signalResult.deleteMany({
      where: { instrumentId: { in: existingIds } },
    });
    await db.signalGenerationRun.deleteMany({
      where: { region: REGION, assetType: ASSET_TYPE, generatedDate: SIGNAL_GENERATED_DAY },
    });
    await db.dataQualityEvaluation.deleteMany({ where: { instrumentId: { in: existingIds } } });
    await db.smartMoneyContextSnapshot.deleteMany({ where: { instrumentId: { in: existingIds } } });
    await db.dataQualitySnapshot.deleteMany({ where: { instrumentId: { in: existingIds } } });
    await db.earningsIntelligenceSnapshot.deleteMany({
      where: {
        stockId: { in: existingIds },
        snapshotDate: DATA_THROUGH_DAY,
        scopeRegion: REGION,
        scopeAssetType: ASSET_TYPE,
      },
    });
    await db.stockInterestSnapshot.deleteMany({
      where: {
        stockId: { in: existingIds },
        snapshotDate: DATA_THROUGH_DAY,
        scopeRegion: REGION,
        scopeAssetType: ASSET_TYPE,
      },
    });
    await db.pipelineRun.deleteMany({
      where: {
        OR: [
          { idempotencyKey: { contains: TEST_RUN_ID } },
          { idempotencyKey: 'research-overview-v1:IN:STOCK' },
          {
            pipelineKey: 'market-intelligence',
            scopeRegion: REGION,
            scopeAssetType: ASSET_TYPE,
            timeframe: TIMEFRAME,
            dataThroughDate: DATA_THROUGH_DAY,
          },
          {
            pipelineKey: 'signal-position-ledger',
            scopeRegion: REGION,
            scopeAssetType: ASSET_TYPE,
            startedAt: FIXED_CLOCK,
          },
        ],
      },
    });
    await db.marketContextSnapshot.deleteMany({ where: { snapshotDate: SNAPSHOT_DAY, region: REGION } });
    await db.sectorContextSnapshot.deleteMany({ where: { snapshotDate: SNAPSHOT_DAY, region: REGION } });
    await db.countryContextSnapshot.deleteMany({ where: { snapshotDate: SNAPSHOT_DAY, region: REGION } });
    await db.marketContextSnapshot.deleteMany({ where: { snapshotDate: DATA_THROUGH_DAY, region: REGION } });
    await db.sectorContextSnapshot.deleteMany({ where: { snapshotDate: DATA_THROUGH_DAY, region: REGION } });
    await db.countryContextSnapshot.deleteMany({ where: { snapshotDate: DATA_THROUGH_DAY, region: REGION } });
    await db.sectorSnapshot.deleteMany({
      where: {
        snapshotDate: SNAPSHOT_DAY,
        dataThroughDate: DATA_THROUGH_DAY,
        scopeRegion: REGION,
        scopeAssetType: ASSET_TYPE,
      },
    });
    await db.fundamental.deleteMany({
      where: { stockId: { in: existingIds }, source: TEST_SOURCE },
    });
    await db.marketDeliverySnapshot.deleteMany({
      where: { stockId: { in: existingIds }, source: TEST_SOURCE },
    });
    await db.priceTick.deleteMany({
      where: {
        symbol: { in: [...TEST_SYMBOLS] },
        timestamp: { gte: START_DAY, lte: DATA_THROUGH_DAY },
        source: TEST_SOURCE,
      },
    });
    await db.latestPrice.deleteMany({
      where: {
        symbol: { in: existingSymbols.length ? existingSymbols : [...TEST_SYMBOLS] },
        timestamp: DATA_THROUGH_DAY,
      },
    });
    await db.sourceFileImport.deleteMany({
      where: {
        source: TEST_SOURCE,
        tradingDate: DATA_THROUGH_DAY,
      },
    });
  }

  async function seedConnectedChainUniverse(): Promise<Record<TestSymbol, SeededInstrument>> {
    const [cmImport, deliveryImport] = await Promise.all([
      upsertSourceImport('CM', 'connected-chain-cm-20260529-v1', 550),
      upsertSourceImport('DELIVERY', 'connected-chain-delivery-20260529-v1', 3),
    ]);
    await upsertSourceImport('FUNDAMENTAL', 'connected-chain-fundamental-20260331-v1', 2);

    const stocks = await Promise.all([
      upsertStock({
        id: 'connected-chain-reliance',
        symbol: 'RELIANCE',
        name: 'Reliance Industries Limited',
        sector: 'Energy',
        industry: 'Integrated Oil and Gas',
        marketCap: 19_500_000_000_000,
        isin: 'INE002A01018',
      }),
      upsertStock({
        id: 'connected-chain-tcs',
        symbol: 'TCS',
        name: 'Tata Consultancy Services Limited',
        sector: 'Information Technology',
        industry: 'IT Services',
        marketCap: 13_000_000_000_000,
        isin: 'INE467B01029',
      }),
      upsertStock({
        id: 'connected-chain-infy',
        symbol: 'INFY',
        name: 'Infosys Limited',
        sector: null,
        industry: null,
        marketCap: 6_000_000_000_000,
        isin: 'INE009A01021',
      }),
    ]);
    const stockBySymbol = bySymbol(stocks);
    await seedSectorContextSnapshots();

    const fullWindow = tradingDaysEnding(DATA_THROUGH_DAY, 260);
    const blockedWindow = tradingDaysEnding(DATA_THROUGH_DAY, 30);
    const relianceRows = buildRelianceRows(fullWindow);
    const tcsRows = buildTcsRows(fullWindow);
    const infyRows = buildInfyRows(blockedWindow);
    const rows = [...relianceRows, ...tcsRows, ...infyRows];

    await db.priceTick.deleteMany({
      where: {
        OR: [
          {
            symbol: { in: ['RELIANCE', 'TCS'] },
            timestamp: { gte: START_DAY, lte: FIXED_CLOCK },
          },
          {
            symbol: 'INFY',
            timestamp: { gte: INFY_DQ_CUTOFF_DAY, lte: FIXED_CLOCK },
          },
        ],
      },
    });

    for (const row of rows) {
      const data = priceTickWriteData(row, cmImport.id);
      await db.priceTick.upsert({
        where: {
          symbol_timestamp: {
            symbol: row.symbol,
            timestamp: row.date,
          },
        },
        create: data,
        update: data,
      });
    }

    await Promise.all(TEST_SYMBOLS.map(async (symbol) => {
      const latest = rows.filter((row) => row.symbol === symbol).at(-1)!;
      await db.latestPrice.upsert({
        where: { symbol },
        create: {
          symbol,
          region: REGION,
          price: decimal(latest.close),
          timestamp: latest.date,
        },
        update: {
          region: REGION,
          price: decimal(latest.close),
          timestamp: latest.date,
        },
      });
    }));

    await Promise.all([
      upsertFundamental(stockBySymbol.RELIANCE.id, {
        revenue: 9_750_000_000_000,
        eps: 102.5,
        netIncome: 790_000_000_000,
        peRatio: 24,
        marketCap: 19_500_000_000_000,
      }),
      upsertFundamental(stockBySymbol.TCS.id, {
        revenue: 2_480_000_000_000,
        eps: 132,
        netIncome: 465_000_000_000,
        peRatio: 31,
        marketCap: 13_000_000_000_000,
      }),
    ]);

    await Promise.all(TEST_SYMBOLS.map((symbol) => {
      const stock = stockBySymbol[symbol];
      const latest = rows.filter((row) => row.symbol === symbol).at(-1)!;
      return db.marketDeliverySnapshot.upsert({
        where: {
          stockId_exchange_tradingDate_source: {
            stockId: stock.id,
            exchange: 'NSE',
            tradingDate: DATA_THROUGH_DAY,
            source: TEST_SOURCE,
          },
        },
        create: {
          stockId: stock.id,
          symbol,
          exchange: 'NSE',
          tradingDate: DATA_THROUGH_DAY,
          tradedQuantity: BigInt(latest.volume || 0),
          deliverableQuantity: BigInt(Math.floor((latest.volume || 0) * (symbol === 'RELIANCE' ? 0.58 : 0.42))),
          deliveryPercent: decimal(symbol === 'RELIANCE' ? 58 : 42),
          source: TEST_SOURCE,
          sourceFileImportId: deliveryImport.id,
        },
        update: {
          tradedQuantity: BigInt(latest.volume || 0),
          deliverableQuantity: BigInt(Math.floor((latest.volume || 0) * (symbol === 'RELIANCE' ? 0.58 : 0.42))),
          deliveryPercent: decimal(symbol === 'RELIANCE' ? 58 : 42),
          sourceFileImportId: deliveryImport.id,
        },
      });
    }));

    return {
      RELIANCE: {
        id: stockBySymbol.RELIANCE.id,
        symbol: 'RELIANCE',
        latestClose: relianceRows.at(-1)!.close,
        priceRowCount: relianceRows.length,
      },
      TCS: {
        id: stockBySymbol.TCS.id,
        symbol: 'TCS',
        latestClose: tcsRows.at(-1)!.close,
        priceRowCount: tcsRows.length,
      },
      INFY: {
        id: stockBySymbol.INFY.id,
        symbol: 'INFY',
        latestClose: infyRows.at(-1)!.close,
        priceRowCount: infyRows.length,
      },
    };
  }

  async function upsertSourceImport(segment: string, fileHash: string, rowsAccepted: number) {
    return db.sourceFileImport.upsert({
      where: {
        source_segment_tradingDate_fileHash: {
          source: TEST_SOURCE,
          segment,
          tradingDate: DATA_THROUGH_DAY,
          fileHash,
        },
      },
      create: {
        source: TEST_SOURCE,
        segment,
        tradingDate: DATA_THROUGH_DAY,
        fileName: `${fileHash}.csv`,
        fileHash,
        fileSize: rowsAccepted * 128,
        status: 'COMPLETED',
        rowsRaw: rowsAccepted,
        rowsAccepted,
        rowsRejected: 0,
        parserVersion: 'connected-chain-seeded-v1',
      },
      update: {
        status: 'COMPLETED',
        rowsRaw: rowsAccepted,
        rowsAccepted,
        rowsRejected: 0,
        parserVersion: 'connected-chain-seeded-v1',
      },
    });
  }

  async function upsertStock(input: {
    id: string;
    symbol: TestSymbol;
    name: string;
    sector: string | null;
    industry: string | null;
    marketCap: number;
    isin: string;
  }) {
    const data = {
      name: input.name,
      region: REGION,
      exchange: 'NSE',
      country: 'India',
      sector: input.sector,
      industry: input.industry,
      currency: 'INR',
      marketCap: decimal(input.marketCap),
      assetType: ASSET_TYPE,
      instrumentSegment: 'CASH',
      displaySymbol: input.symbol,
      providerSymbol: input.symbol,
      sourceSymbol: input.symbol,
      catalogSource: TEST_SOURCE,
      providerSupportStatus: 'SUPPORTED',
      providerError: null,
      isDelisted: false,
      ipoDate: START_DAY,
      isin: input.isin,
      source: TEST_SOURCE,
      dataStatus: 'COMPLETE',
      isActive: true,
      lastSuccessfulDataLoadTimestamp: DATA_THROUGH_DAY,
    };
    return db.stock.upsert({
      where: { symbol: input.symbol },
      create: {
        id: input.id,
        symbol: input.symbol,
        ...data,
      },
      update: data,
    });
  }

  async function upsertFundamental(stockId: string, values: {
    revenue: number;
    eps: number;
    netIncome: number;
    peRatio: number;
    marketCap: number;
  }) {
    return db.fundamental.upsert({
      where: {
        stockId_periodType_periodEndDate_source: {
          stockId,
          periodType: 'TTM',
          periodEndDate: FUNDAMENTAL_DAY,
          source: TEST_SOURCE,
        },
      },
      create: {
        stockId,
        revenue: decimal(values.revenue),
        eps: decimal(values.eps),
        netIncome: decimal(values.netIncome),
        peRatio: decimal(values.peRatio),
        dividendYield: decimal(0.5),
        sharesOutstanding: BigInt(6_750_000_000),
        marketCap: decimal(values.marketCap),
        currency: 'INR',
        periodType: 'TTM',
        periodEndDate: FUNDAMENTAL_DAY,
        source: TEST_SOURCE,
        sourceNote: 'Deterministic seeded integration fixture.',
        validatedBy: 'connected-chain.seeded.integration.test',
        validatedAt: FIXED_CLOCK,
        dataStatus: 'COMPLETE',
      },
      update: {
        revenue: decimal(values.revenue),
        eps: decimal(values.eps),
        netIncome: decimal(values.netIncome),
        peRatio: decimal(values.peRatio),
        dividendYield: decimal(0.5),
        sharesOutstanding: BigInt(6_750_000_000),
        marketCap: decimal(values.marketCap),
        currency: 'INR',
        validatedAt: FIXED_CLOCK,
        dataStatus: 'COMPLETE',
      },
    });
  }

  async function seedSectorContextSnapshots() {
    const rows = [
      {
        sector: 'Energy',
        oneMonthReturn: 8.4,
        threeMonthReturn: 16.2,
        sixMonthReturn: 24.1,
        relativeStrengthScore: 72,
        instrumentCount: 1,
        bullishSignalCount: 1,
        bearishSignalCount: 0,
        leadershipStatus: 'LEADING',
      },
      {
        sector: 'Information Technology',
        oneMonthReturn: 1.1,
        threeMonthReturn: -0.8,
        sixMonthReturn: 3.2,
        relativeStrengthScore: 52,
        instrumentCount: 1,
        bullishSignalCount: 0,
        bearishSignalCount: 0,
        leadershipStatus: 'IMPROVING',
      },
    ];

    for (const row of rows) {
      await db.sectorContextSnapshot.upsert({
        where: {
          snapshotDate_region_sector: {
            snapshotDate: SNAPSHOT_DAY,
            region: REGION,
            sector: row.sector,
          },
        },
        create: {
          snapshotDate: SNAPSHOT_DAY,
          region: REGION,
          sector: row.sector,
          oneMonthReturn: row.oneMonthReturn,
          threeMonthReturn: row.threeMonthReturn,
          sixMonthReturn: row.sixMonthReturn,
          relativeStrengthScore: row.relativeStrengthScore,
          instrumentCount: row.instrumentCount,
          bullishSignalCount: row.bullishSignalCount,
          bearishSignalCount: row.bearishSignalCount,
          leadershipStatus: row.leadershipStatus,
          source: TEST_SOURCE,
          dataStatus: 'COMPLETE',
        },
        update: {
          oneMonthReturn: row.oneMonthReturn,
          threeMonthReturn: row.threeMonthReturn,
          sixMonthReturn: row.sixMonthReturn,
          relativeStrengthScore: row.relativeStrengthScore,
          instrumentCount: row.instrumentCount,
          bullishSignalCount: row.bullishSignalCount,
          bearishSignalCount: row.bearishSignalCount,
          leadershipStatus: row.leadershipStatus,
          source: TEST_SOURCE,
          dataStatus: 'COMPLETE',
        },
      });
    }
  }

  function seededMarketContextSummary(region = REGION) {
    return {
      regime: {
        regime: 'RISK_ON',
        score: 82,
        explanation: 'Seeded connected-chain fixture uses a fixed healthy market context.',
        updatedAt: FIXED_CLOCK.toISOString(),
        dataStatus: 'PARTIAL',
      },
      topSectors: [
        {
          sector: 'Energy',
          return1M: 8.4,
          return3M: 16.2,
          return6M: 24.1,
          relativeStrengthScore: 72,
          instrumentCount: 1,
          bullishSignalCount: 1,
          bearishSignalCount: 0,
          leadershipStatus: 'LEADING',
        },
        {
          sector: 'Information Technology',
          return1M: 1.1,
          return3M: -0.8,
          return6M: 3.2,
          relativeStrengthScore: 52,
          instrumentCount: 1,
          bullishSignalCount: 0,
          bearishSignalCount: 0,
          leadershipStatus: 'IMPROVING',
        },
      ],
      weakSectors: [],
      breadth: {
        percentAboveSma50: 0.68,
        percentAboveSma200: 0.64,
        sma50SampleCount: 3,
        sma200SampleCount: 3,
        advanceDeclineRatio: 1.8,
        newHigh52WeekCount: 1,
        newLow52WeekCount: 0,
        bullishSignalCount: 1,
        bearishSignalCount: 0,
        instrumentCount: 3,
        dataStatus: 'PARTIAL',
      },
      countryStrength: [
        {
          country: region === 'IN' ? 'India' : region,
          return1M: 4.1,
          return3M: 8.8,
          return6M: 12.6,
          relativeStrengthScore: 68,
          instrumentCount: 3,
          bullishSignalCount: 1,
        },
      ],
      macro: {
        interestRateProxy: null,
        inflationProxy: null,
        usdStrengthProxy: null,
        commodityProxy: null,
        macroStatus: 'UNKNOWN',
        dataStatus: 'MISSING',
        explanation: 'Macro providers are not configured in the seeded connected-chain fixture.',
      },
      explanation: ['Seeded fixed-day market context for connected-chain integration.'],
      updatedAt: FIXED_CLOCK.toISOString(),
      dataStatus: 'PARTIAL',
    };
  }

  function seededTrustedReviewUniverseHealth() {
    return {
      scope: { region: REGION, assetType: ASSET_TYPE },
      asOfDate: FIXED_CLOCK.toISOString().slice(0, 10),
      targetTradingDate: DATA_THROUGH_DATE,
      requiredDataThroughDate: DATA_THROUGH_DATE,
      storedDataThroughDate: DATA_THROUGH_DATE,
      catalogCount: 3,
      providerSupportedCount: 3,
      trustedCount: 3,
      status: 'READY',
      mode: 'FULL_REVIEW',
      minLiteCount: 1,
      minFullCount: 2,
      dataThroughDate: DATA_THROUGH_DATE,
      scanPolicy: {
        scanLimit: 3,
        scanComplete: true,
        scanOrdering: 'connected-chain-seeded-symbol-order',
      },
      excludedCounts: zeroExcludedCounts(),
      contextGapCounts: {
        missingSector: 1,
        missingIndustry: 1,
        missingMarketCap: 0,
        missingIsin: 0,
        missingListingDate: 0,
      },
      warnings: [],
    };
  }

  function seededReviewReadinessSummary() {
    return {
      scope: { region: REGION, assetType: ASSET_TYPE },
      generatedAt: FIXED_CLOCK.toISOString(),
      reviewMode: 'FULL_REVIEW',
      trustStatus: 'OK',
      userDecision: 'READY_FOR_REVIEW',
      reviewUniverse: {
        catalogCount: 3,
        providerSupportedCount: 3,
        trustedCount: 3,
        targetTradingDate: DATA_THROUGH_DATE,
        requiredDataThroughDate: DATA_THROUGH_DATE,
        storedDataThroughDate: DATA_THROUGH_DATE,
      },
      readinessCounts: {
        priceReady: 3,
        contextReady: 2,
        reviewReady: 3,
        missingLatestPrice: 0,
        staleLatestPrice: 0,
        inadequateHistory: 0,
        missingRecentVolume: 1,
        providerUnknown: 0,
        providerValidationFailedRetryable: 0,
        unsupportedExcluded: 0,
      },
      blockers: [],
      nextAction: null,
      warnings: [],
    };
  }

  function zeroExcludedCounts() {
    return {
      providerUnknown: 0,
      providerRetryFailed: 0,
      providerUnsupported: 0,
      inactiveOrDelisted: 0,
      noLatestPrice: 0,
      staleLatestPrice: 0,
      requiredHistoryIncomplete: 0,
      insufficientBarsUnder120: 0,
      insufficientBarsUnder252: 0,
      missingRecentVolume: 0,
      corporateActionBlocked: 0,
    };
  }

  async function seededTrustedReviewInstruments() {
    const stocks = await db.stock.findMany({
      where: { id: { in: TEST_SYMBOLS.map((symbol) => seeded[symbol].id) } },
      orderBy: { symbol: 'asc' },
    });
    const stockBySymbol = bySymbol(stocks);
    const rows = await db.priceTick.findMany({
      where: {
        symbol: { in: [...TEST_SYMBOLS] },
        timestamp: { gte: START_DAY, lte: DATA_THROUGH_DAY },
        source: TEST_SOURCE,
      },
      orderBy: [{ symbol: 'asc' }, { timestamp: 'asc' }],
    });
    const rowsBySymbol = TEST_SYMBOLS.reduce<Record<TestSymbol, any[]>>((acc, symbol) => {
      acc[symbol] = rows.filter((row: any) => row.symbol === symbol);
      return acc;
    }, {} as Record<TestSymbol, any[]>);

    return TEST_SYMBOLS.map((symbol) => {
      const stock = stockBySymbol[symbol];
      const fullHistory = rowsBySymbol[symbol].map(toTrustedPriceRow);
      const priceHistory = symbol === 'RELIANCE'
        ? fullHistory
        : symbol === 'TCS'
          ? fullHistory.slice(-59)
          : fullHistory.slice(-30);
      const latest = priceHistory.at(-1) || null;
      const contextGaps = symbol === 'INFY' ? ['Missing sector metadata.', 'Missing industry metadata.'] : [];
      const warnings = symbol === 'INFY' ? ['Seeded data quality blocked instrument.'] : [];
      return {
        id: seeded[symbol].id,
        symbol,
        companyName: stock?.name || null,
        region: REGION,
        assetType: ASSET_TYPE,
        exchange: 'NSE',
        providerSymbol: symbol,
        latestPriceDate: latest?.date || null,
        priceHistoryBars: priceHistory.length,
        rollingWindowBars: priceHistory.length,
        hasRecentVolume: symbol !== 'INFY',
        latestClose: latest?.close ?? null,
        latestVolume: latest?.volume ?? null,
        adjustedCloseAvailable: true,
        usesAdjustedCloseFallback: false,
        trustedBaselineResidualState: symbol === 'INFY' ? 'REQUIRED_HISTORY_INCOMPLETE' : 'REVIEW_READY',
        trustedBaselineBlockerCodes: symbol === 'INFY' ? ['DATA_QUALITY_NOT_READY'] : [],
        latestCompletedEodDate: DATA_THROUGH_DATE,
        latestCompletedEodPresent: true,
        storedDataThroughDate: DATA_THROUGH_DATE,
        requiredHistoryStartDate: START_DAY.toISOString().slice(0, 10),
        requiredHistoryEndDate: DATA_THROUGH_DATE,
        requiredHistoryStatus: symbol === 'INFY' ? 'INCOMPLETE' : 'COMPLETE',
        listingDate: START_DAY.toISOString().slice(0, 10),
        listingDateStatus: 'PRESENT_USED_LISTING_DATE',
        providerFallbackState: 'PROVIDER_SUPPORTED',
        primarySourceAttempted: 'NSE_BSE_EXCHANGE_EOD',
        fallbackSourcesAttempted: [],
        sourceFallbackReason: null,
        contextGaps,
        warnings,
        priceHistory,
      };
    });
  }

  function toTrustedPriceRow(row: any) {
    return {
      date: new Date(row.timestamp).toISOString().slice(0, 10),
      open: numberValue(row.open),
      high: numberValue(row.high),
      low: numberValue(row.low),
      close: numberValue(row.close),
      adjustedClose: numberValue(row.adjustedClose ?? row.adjusted_close ?? row.close),
      volume: row.volume === null || row.volume === undefined ? null : Number(row.volume),
    };
  }

  function buildRelianceRows(dates: Date[]): PriceSeedRow[] {
    return dates.map((date, index) => {
      const finalWindow = index >= dates.length - 6;
      const close = 100 + index * 0.34 + Math.sin(index / 7) * 0.55 + (finalWindow ? (index - (dates.length - 6)) * 1.1 : 0);
      const volume = finalWindow
        ? 2_200_000 + (index - (dates.length - 6)) * 420_000
        : 1_150_000 + (index % 11) * 16_000;
      const open = finalWindow ? close * 0.982 : close * 0.996;
      const high = finalWindow ? close * 1.005 : close * 1.008;
      const low = finalWindow ? close * 0.968 : close * 0.99;
      return normalizedPriceRow('RELIANCE', date, open, high, low, close, volume);
    });
  }

  function buildTcsRows(dates: Date[]): PriceSeedRow[] {
    return dates.map((date, index) => {
      const close = index < 230
        ? 111 - index * 0.046 + Math.sin(index / 9) * 0.35
        : 99.05 + (index - 230) * 0.048 + Math.sin(index / 5) * 0.1;
      const volume = 610_000 + (index % 7) * 7_500;
      return normalizedPriceRow('TCS', date, close * 0.998, close * 1.006, close * 0.992, close, volume);
    });
  }

  function buildInfyRows(dates: Date[]): PriceSeedRow[] {
    return dates.map((date, index) => {
      const close = 96 - index * 0.2 + Math.sin(index / 3) * 0.15;
      return normalizedPriceRow('INFY', date, close * 1.005, close * 1.008, close * 0.992, close, null);
    });
  }

  function normalizedPriceRow(
    symbol: TestSymbol,
    date: Date,
    open: number,
    high: number,
    low: number,
    close: number,
    volume: number | null,
  ): PriceSeedRow {
    const roundedClose = round(close);
    return {
      symbol,
      date,
      open: round(Math.min(open, high, roundedClose)),
      high: round(Math.max(high, open, roundedClose)),
      low: round(Math.min(low, open, roundedClose)),
      close: roundedClose,
      volume,
    };
  }

  function tradingDaysEnding(endDate: Date, count: number): Date[] {
    const days: Date[] = [];
    const cursor = new Date(endDate);
    while (days.length < count) {
      const day = cursor.getUTCDay();
      if (day !== 0 && day !== 6) {
        days.push(new Date(cursor));
      }
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
    return days.reverse();
  }

  function bySymbol(items: Array<{ symbol: string } & Record<string, any>>): Record<string, any> {
    return Object.fromEntries(items.map((item) => [item.symbol, item]));
  }

  function priceTickWriteData(row: PriceSeedRow, sourceFileImportId: string) {
    return {
      symbol: row.symbol,
      region: REGION,
      exchange: 'NSE',
      timestamp: row.date,
      open: decimal(row.open),
      high: decimal(row.high),
      low: decimal(row.low),
      close: decimal(row.close),
      adjustedClose: decimal(row.close),
      volume: row.volume === null ? null : BigInt(row.volume),
      source: TEST_SOURCE,
      sourceFileImportId,
      dataStatus: 'COMPLETE',
    };
  }

  function decimal(value: number) {
    return new Prisma.Decimal(Number(value).toFixed(4));
  }

  function round(value: number) {
    return Number(value.toFixed(4));
  }

  function numberValue(value: any): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value.toNumber === 'function') return value.toNumber();
    return Number(value);
  }
});
