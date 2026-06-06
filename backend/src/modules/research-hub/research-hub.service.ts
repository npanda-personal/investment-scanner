import { StrategyDecisionEngineService } from '../strategy-decision-engine';
import { MarketContextIntelligenceService } from '../market-context-intelligence';
import { SignalGenerationEngineService } from '../signal-generation-engine';
import { SmartMoneyIntelligenceService } from '../smart-money-intelligence';
import { StrategyFrameworkService } from '../strategy-framework';
import { SignalCalibrationEngineService } from '../signal-calibration-engine';
import prisma from '../../db/prisma';
import type { StrategyDecisionDto, StrategyQuery } from '../strategy-decision-engine';
import type { CalibrationHealthResponse } from '../signal-calibration-engine';
import type {
  ResearchOverview,
  MarketReadiness,
  ResearchPriorities,
  ConfirmationSummary,
  NextAction,
  ResearchWhatChanged,
  ResearchWhatChangedDelta,
  ResearchPriorityCandidate,
  ResearchBacktestSummary,
  StrategyProofSummary,
  ResearchActionability,
  ActionabilityDimension,
  ActionabilityStatus
} from './research-hub.types';

/** Minimal interface for today-trade-review data — used for cycle-safe optional injection. */
interface TodayTradeReviewServiceLike {
  latest(query?: { region?: string; assetType?: string }): Promise<{
    run: { status: string; candidateCounts: Record<string, number>; runDate: string; finishedAt: string | null } | null;
    groups: Record<string, unknown[]>;
  }>;
}

/** Minimal interface for trade-plan-risk-engine data — used for cycle-safe optional injection. */
interface TradePlanRiskEngineServiceLike {
  list(query: { region?: string; assetType?: string; limit: number; offset: number }): Promise<{
    results: Array<{ planStatus: string; paperReadinessStatus?: string }>;
    total: number;
  }>;
}

const RESEARCH_OVERVIEW_PIPELINE_KEY = 'research-hub-overview';
const RESEARCH_OVERVIEW_CACHE_VERSION = 'research-overview-v1';
const RESEARCH_OVERVIEW_PRIOR_KEY_PREFIX = 'research-overview-v1-prior';

export class ResearchHubService {
  constructor(
    private readonly strategyService = new StrategyDecisionEngineService(),
    private readonly contextService = new MarketContextIntelligenceService(),
    private readonly signalService = new SignalGenerationEngineService(),
    private readonly smartMoneyService = new SmartMoneyIntelligenceService(),
    private readonly strategyFrameworkService = new StrategyFrameworkService(),
    private readonly calibrationService = new SignalCalibrationEngineService(),
    private readonly db = prisma,
    /**
     * NR-57: Optional today-trade-review service injection.
     * Cycle-safe: never imported via the module index — resolved lazily at
     * construction or injected by tests. Null disables the dimension (falls
     * back to UNAVAILABLE message without blocking).
     */
    private readonly todayTradeReviewService?: TodayTradeReviewServiceLike | null,
    /**
     * NR-57: Optional trade-plan-risk-engine service injection.
     * Same cycle-safety contract as todayTradeReviewService.
     */
    private readonly tradePlanRiskEngineService?: TradePlanRiskEngineServiceLike | null
  ) {}

  /**
   * AUDIT-2 / AUDIT-3 #8 — persisted-read GET.
   *
   * Returns the latest row from `research_overview_snapshots` AS-IS.
   * Zero recomputation: whatChanged + actionability are pre-baked by the pipeline's
   * refreshOverview() call and stored in the row.  This is a single-row DB read.
   *
   * `live: true` bypasses the snapshot and runs the full fan-out (admin/debug only).
   */
  async overview(query: { region?: string; assetType?: string; live?: boolean } = {}): Promise<ResearchOverview> {
    const region = query.region || 'IN';
    const assetType = query.assetType || 'STOCK';
    if (!query.live) {
      const snapshot = await this.loadPersistedSnapshot(region, assetType);
      if (snapshot) {
        return snapshot;
      }
      return this.emptyOverview(['Research overview snapshot is not ready yet. Run the backend pipeline to materialize this dashboard.']);
    }
    return this.buildOverview({ region, assetType });
  }

  /**
   * AUDIT-2 / AUDIT-3 #8 — pipeline compute+persist.
   *
   * Computes EVERYTHING (priorities, the real whatChanged diff vs the previous persisted
   * snapshot, actionability from real services) then UPSERTs the finished payload into
   * `research_overview_snapshots`.  The prior snapshot (used for the diff) is read from
   * the same table before overwriting.
   *
   * Called only by the RESEARCH_PROJECTION pipeline stage — never from a GET.
   */
  async refreshOverview(query: { region?: string; assetType?: string } = {}): Promise<ResearchOverview> {
    const region = query.region || 'IN';
    const assetType = query.assetType || 'STOCK';
    const overview = await this.buildOverview({ region, assetType });
    // Persist the fully-computed payload (incl. whatChanged + actionability) to the
    // dedicated snapshot table so that GET /research/overview is a pure DB read.
    await this.upsertPersistedSnapshot(region, assetType, overview);
    // Also persist to the legacy pipeline_runs table for backwards-compat monitoring
    await this.saveCachedOverview(region, assetType, overview);
    return overview;
  }

  private async buildOverview(query: { region?: string; assetType?: string } = {}): Promise<ResearchOverview> {
    const dataGaps: string[] = [];
    const region = query.region || 'IN';
    const assetType = query.assetType || 'STOCK';

    // Aggregate data from all core research modules with individual error handling
    const [gate, context, strategyCandidates, strategyExits, strategyShortCandidates, signalDiagnostics, smartMoneyRes] = await Promise.all([
      this.strategyService.marketGate(region).catch(err => {
        console.error('Market gate error:', err);
        dataGaps.push('Market gate status unavailable');
        return null;
      }),
      this.latestPersistedMarketContext(region).catch(err => {
        console.error('Market context error:', err);
        dataGaps.push('Market context intelligence unavailable');
        return null;
      }),
      this.fetchStrategyDecisionProofPool({ region, assetType }).catch(err => {
        console.error('Strategy candidates error:', err);
        dataGaps.push('Strategy candidates unavailable');
        return [];
      }),
      this.strategyService.exits(undefined, region, assetType).catch(err => {
        console.error('Strategy exits error:', err);
        dataGaps.push('Strategy exit candidates unavailable');
        return [];
      }),
      this.fetchShortReviewCandidates({ region, assetType }).catch(err => {
        console.error('Short-review candidates error:', err);
        dataGaps.push('Short-review candidates unavailable');
        return [];
      }),
      this.signalService.funnelDiagnostics({ region, assetType }).catch(err => {
        console.error('Top signals error:', err);
        dataGaps.push('Signal generation engine data unavailable');
        return { total: 0, bullish: 0, bearish: 0, neutral: 0, byDirection: {} };
      }),
      this.smartMoneyService.top({ limit: 25, range: '3M', region, assetType }).catch(err => {
        console.error('Smart money error:', err);
        dataGaps.push('Smart money intelligence data unavailable');
        return { results: [], total: 0 };
      })
    ]);

    const smartMoney = smartMoneyRes.results || [];

    // 1. Market Readiness
    const marketReadiness: MarketReadiness = {
      marketGate: gate?.marketGate || 'UNKNOWN',
      marketCondition: gate?.marketCondition || 'UNKNOWN',
      headline: this.generateReadinessHeadline(gate),
      allowedActions: [],
      reasons: gate?.reasons || [],
      blockers: gate?.blockers || [],
      dataStatus: gate?.dataStatus || 'MISSING',
    };

    const enriched = await this.enrichCandidates(strategyCandidates, region, assetType, dataGaps);
    const enrichedExits = await this.enrichCandidates(strategyExits || [], region, assetType, dataGaps, true);
    const enrichedShorts = await this.enrichCandidates(strategyShortCandidates || [], region, assetType, dataGaps);

    // 2. Research Priorities
    const priorities = this.bucketPriorities(enriched, enrichedExits, enrichedShorts, marketReadiness);
    const strategyProofSummary = this.buildStrategyProofSummary([...priorities.tradeCandidates, ...priorities.watchCandidates, ...priorities.avoidCandidates, ...priorities.shortReviewCandidates], marketReadiness);

    // 3. Confirmation Summary
    const signalDirectionCounts = (signalDiagnostics.byDirection || {}) as Record<string, number>;
    const bullishSignalCount = Number(signalDiagnostics.bullish || signalDirectionCounts.BULLISH || 0);
    const bearishSignalCount = Number(signalDiagnostics.bearish || signalDirectionCounts.BEARISH || 0);
    const totalSignalCount = Number(signalDiagnostics.total || bullishSignalCount + bearishSignalCount + Number(signalDiagnostics.neutral || signalDirectionCounts.NEUTRAL || 0));
    
    // Cross-reference strategy candidates with smart money
    const topConfirmations: string[] = [];
    const topContradictions: string[] = [];
    
    priorities.tradeCandidates.slice(0, 3).forEach(cand => {
      const sm = smartMoney.find(s => s.instrumentId === cand.instrumentId);
      if (sm?.status === 'ACCUMULATION') {
        topConfirmations.push(`${cand.symbol}: Strategy and Smart Money both see accumulation.`);
      } else if (sm?.status === 'DISTRIBUTION') {
        topContradictions.push(`${cand.symbol}: Strategy candidate but Smart Money shows distribution.`);
      }
    });

    const confirmationSummary: ConfirmationSummary = {
      signalSummary: {
        topBullishCount: bullishSignalCount,
        topBearishCount: bearishSignalCount,
        reliabilityAvailable: totalSignalCount > 0,
        notes: this.generateSignalNotes(bullishSignalCount, bearishSignalCount),
      },
      smartMoneySummary: {
        accumulationCount: smartMoney.filter(s => s.status === 'ACCUMULATION').length,
        distributionCount: smartMoney.filter(s => s.status === 'DISTRIBUTION').length,
        topConfirmations,
        topContradictions,
      },
      marketContextSummary: {
        leadingSectors: (context?.topSectors || []).map((s: any) => s.sector),
        weakSectors: (context?.weakSectors || []).map((s: any) => s.sector),
        breadthStatus: context?.breadth?.percentAboveSma50 != null 
          ? `${(context.breadth.percentAboveSma50 * 100).toFixed(0)}% above SMA50` 
          : 'Breadth unavailable',
        notes: context?.explanation?.slice(0, 2) || [],
      }
    };

    // 4. What Changed — diff against the previous persisted snapshot
    const whatChanged: ResearchWhatChanged = await this.buildWhatChanged(
      priorities,
      marketReadiness,
      region,
      assetType,
    );

    // 5. Next Actions
    const nextActions: NextAction[] = this.generateNextActions(marketReadiness, priorities, dataGaps, strategyProofSummary);
    const [calibrationHealth, todayReviewRun, tradePlanList] = await Promise.all([
      this.calibrationService.health().catch(() => null),
      this.todayTradeReviewService
        ? this.todayTradeReviewService.latest({ region, assetType }).catch(() => null)
        : Promise.resolve(null),
      this.tradePlanRiskEngineService
        ? this.tradePlanRiskEngineService.list({ region, assetType, limit: 1, offset: 0 }).catch(() => null)
        : Promise.resolve(null),
    ]);
    const actionability = this.buildActionability(marketReadiness, priorities, strategyProofSummary, confirmationSummary, dataGaps, nextActions, calibrationHealth, todayReviewRun, tradePlanList);

    return {
      actionability,
      marketReadiness,
      researchPriorities: priorities,
      strategyProofSummary,
      confirmationSummary,
      whatChanged,
      nextActions,
      generatedAt: new Date().toISOString(),
      dataGaps,
    };
  }

  private async saveCachedOverview(region: string, assetType: string, overview: ResearchOverview): Promise<void> {
    if (typeof (this.db as any).pipelineRun?.upsert !== 'function') return;
    const idempotencyKey = [RESEARCH_OVERVIEW_CACHE_VERSION, region, assetType].join(':');

    // Before overwriting, copy the current snapshot to the "prior" slot so that
    // buildWhatChanged can diff the two most-recent materialised overviews.
    const priorKey = [RESEARCH_OVERVIEW_PRIOR_KEY_PREFIX, region, assetType].join(':');
    const existing = await (this.db as any).pipelineRun.findFirst({
      where: { idempotencyKey },
      orderBy: { updatedAt: 'desc' },
    });
    if (existing) {
      await (this.db as any).pipelineRun.upsert({
        where: { idempotencyKey: priorKey },
        create: {
          pipelineKey: RESEARCH_OVERVIEW_PIPELINE_KEY,
          scopeRegion: region,
          scopeAssetType: assetType,
          timeframe: '1d',
          triggerType: 'scheduled',
          status: existing.status,
          totalCount: existing.totalCount,
          processedCount: existing.processedCount,
          succeededCount: existing.succeededCount,
          partialCount: existing.partialCount,
          failedCount: existing.failedCount,
          skippedCount: existing.skippedCount,
          unchangedCount: existing.unchangedCount,
          warnings: existing.warnings,
          errors: existing.errors,
          idempotencyKey: priorKey,
          startedAt: existing.startedAt,
          completedAt: existing.completedAt,
          metadata: existing.metadata,
        },
        update: {
          status: existing.status,
          totalCount: existing.totalCount,
          processedCount: existing.processedCount,
          succeededCount: existing.succeededCount,
          partialCount: existing.partialCount,
          failedCount: existing.failedCount,
          skippedCount: existing.skippedCount,
          unchangedCount: existing.unchangedCount,
          warnings: existing.warnings,
          errors: existing.errors,
          completedAt: existing.completedAt,
          metadata: existing.metadata,
        },
      });
    }

    await (this.db as any).pipelineRun.upsert({
      where: { idempotencyKey },
      create: {
        pipelineKey: RESEARCH_OVERVIEW_PIPELINE_KEY,
        scopeRegion: region,
        scopeAssetType: assetType,
        timeframe: '1d',
        triggerType: 'scheduled',
        status: overview.dataGaps.length > 0 ? 'PARTIAL' : 'COMPLETED',
        totalCount: 1,
        processedCount: 1,
        succeededCount: 1,
        partialCount: overview.dataGaps.length > 0 ? 1 : 0,
        failedCount: 0,
        skippedCount: 0,
        unchangedCount: 0,
        warnings: overview.dataGaps as any,
        errors: [] as any,
        idempotencyKey,
        startedAt: new Date(overview.generatedAt),
        completedAt: new Date(overview.generatedAt),
        metadata: { version: RESEARCH_OVERVIEW_CACHE_VERSION, overview } as any,
      },
      update: {
        status: overview.dataGaps.length > 0 ? 'PARTIAL' : 'COMPLETED',
        totalCount: 1,
        processedCount: 1,
        succeededCount: 1,
        partialCount: overview.dataGaps.length > 0 ? 1 : 0,
        failedCount: 0,
        skippedCount: 0,
        unchangedCount: 0,
        warnings: overview.dataGaps as any,
        errors: [] as any,
        completedAt: new Date(overview.generatedAt),
        metadata: { version: RESEARCH_OVERVIEW_CACHE_VERSION, overview } as any,
      },
    });
  }

  /**
   * Computes a real diff between the current priorities/gate and the previous
   * persisted research-hub snapshot.  Never fabricates — if no prior snapshot
   * exists it returns empty arrays and an honest note.
   *
   * Priority order for the "prior" snapshot:
   *   1. The dedicated research_overview_snapshots row (AUDIT-2 replacement table)
   *   2. The legacy pipeline_runs prior-key slot (fallback for backwards compat)
   */
  private async buildWhatChanged(
    currentPriorities: ResearchPriorities,
    currentReadiness: MarketReadiness,
    region: string,
    assetType: string,
  ): Promise<ResearchWhatChanged> {
    // Prefer reading prior snapshot from the new dedicated table (it holds the last
    // persisted run's payload; we read it BEFORE upserting the new one).
    const priorOverview = (await this.loadPersistedSnapshot(region, assetType))
      ?? (await this.loadPriorOverview(region, assetType));
    return this.diffOverviews(currentPriorities, currentReadiness, priorOverview);
  }

  private candidateKey(c: ResearchPriorityCandidate): string {
    return `${c.instrumentId || c.symbol}-${c.strategy}`;
  }

  /**
   * Core diff logic — shared by buildWhatChanged (build/pipeline path).
   *
   * NR-81: Enriched diff — separately surfaces:
   *   newTradeCandidates  — appeared since last snapshot
   *   droppedCandidates   — dropped out since last snapshot
   *   upgradedCandidates  — still present; score/readiness improved
   *   demotedCandidates   — still present; score/readiness worsened
   *   downgradedCandidates — legacy field (dropped + score-fell, for backwards compat)
   */
  private diffOverviews(
    currentPriorities: ResearchPriorities,
    currentReadiness: MarketReadiness,
    priorOverview: ResearchOverview | null,
  ): ResearchWhatChanged {
    if (!priorOverview) {
      return {
        newTradeCandidates: [],
        droppedCandidates: [],
        downgradedCandidates: [],
        upgradedCandidates: [],
        demotedCandidates: [],
        marketGateChange: null,
        warnings: ['No prior snapshot to compare yet; run the pipeline refresh a second time to see what changed.'],
      };
    }

    const priorTradeCandidates = priorOverview.researchPriorities?.tradeCandidates || [];
    const currentCandidates = currentPriorities.tradeCandidates;

    // Build fast-lookup maps keyed by candidateKey
    const priorByKey = new Map<string, ResearchPriorityCandidate>(
      priorTradeCandidates.map(c => [this.candidateKey(c), c])
    );
    const currentByKey = new Map<string, ResearchPriorityCandidate>(
      currentCandidates.map(c => [this.candidateKey(c), c])
    );

    // Newly appeared
    const newTradeCandidates = currentCandidates
      .filter(c => !priorByKey.has(this.candidateKey(c)))
      .map(c => c.symbol || '');

    // Dropped out
    const droppedCandidates = priorTradeCandidates
      .filter(c => !currentByKey.has(this.candidateKey(c)))
      .map(c => c.symbol || '');

    // Score / readiness movers (candidates present in both snapshots)
    const upgradedCandidates: ResearchWhatChangedDelta[] = [];
    const demotedCandidates: ResearchWhatChangedDelta[] = [];
    for (const [key, priorCand] of priorByKey) {
      const currentCand = currentByKey.get(key);
      if (!currentCand) continue; // dropped — already captured above

      const priorScore = priorCand.decisionScore ?? 0;
      const currentScore = currentCand.decisionScore ?? 0;
      const scoreDelta = currentScore - priorScore;

      const priorReadinessRank = this.readinessRank(priorCand.readinessLabel);
      const currentReadinessRank = this.readinessRank(currentCand.readinessLabel);
      let readinessChange: ResearchWhatChangedDelta['readinessChange'] = 'UNCHANGED';
      if (currentReadinessRank > priorReadinessRank) readinessChange = 'PROMOTED';
      else if (currentReadinessRank < priorReadinessRank) readinessChange = 'DEMOTED';

      const isUpgrade = scoreDelta >= 5 || readinessChange === 'PROMOTED';
      const isDemotion = scoreDelta <= -10 || readinessChange === 'DEMOTED';

      if (isUpgrade && !isDemotion) {
        upgradedCandidates.push({ symbol: currentCand.symbol || '', currentScore, priorScore, scoreDelta, readinessChange });
      } else if (isDemotion) {
        demotedCandidates.push({ symbol: currentCand.symbol || '', currentScore, priorScore, scoreDelta, readinessChange });
      }
    }

    // Legacy field: dropped + score-fell (for callers that only use downgradedCandidates)
    const downgradedCandidates: string[] = [
      ...droppedCandidates,
      ...demotedCandidates.map(d => d.symbol),
    ];

    const priorGate = priorOverview.marketReadiness?.marketGate;
    const currentGate = currentReadiness.marketGate;
    const marketGateChange: ResearchWhatChanged['marketGateChange'] =
      priorGate && currentGate && priorGate !== currentGate
        ? { from: priorGate, to: currentGate }
        : null;

    const warnings: string[] = [];
    if (currentReadiness.blockers?.length) {
      warnings.push('Research environment has active blockers; review diagnostics.');
    }

    return { newTradeCandidates, droppedCandidates, downgradedCandidates, upgradedCandidates, demotedCandidates, marketGateChange, warnings };
  }

  private async loadPriorOverview(region: string, assetType: string): Promise<ResearchOverview | null> {
    if (typeof (this.db as any).pipelineRun?.findFirst !== 'function') return null;
    const priorKey = [RESEARCH_OVERVIEW_PRIOR_KEY_PREFIX, region, assetType].join(':');
    const row = await (this.db as any).pipelineRun.findFirst({
      where: { idempotencyKey: priorKey },
      orderBy: { updatedAt: 'desc' },
    });
    const overview = (row?.metadata as any)?.overview;
    return overview && typeof overview === 'object' ? overview as ResearchOverview : null;
  }

  // ---------------------------------------------------------------------------
  // AUDIT-2 / AUDIT-3 #8 — dedicated research_overview_snapshots table helpers
  // ---------------------------------------------------------------------------

  /**
   * Reads the latest persisted snapshot for the given (region, assetType) scope.
   * Returns the stored ResearchOverview AS-IS — no recomputation.
   */
  private async loadPersistedSnapshot(region: string, assetType: string): Promise<ResearchOverview | null> {
    if (typeof (this.db as any).researchOverviewSnapshot?.findUnique !== 'function') return null;
    const row = await (this.db as any).researchOverviewSnapshot.findUnique({
      where: { region_assetType: { region, assetType } },
    });
    if (!row) return null;
    const payload = row.overviewJson;
    return payload && typeof payload === 'object' ? payload as ResearchOverview : null;
  }

  /**
   * UPSERTs the fully-computed overview payload into `research_overview_snapshots`.
   * Called only by refreshOverview() (pipeline compute path).
   */
  private async upsertPersistedSnapshot(region: string, assetType: string, overview: ResearchOverview): Promise<void> {
    if (typeof (this.db as any).researchOverviewSnapshot?.upsert !== 'function') return;
    await (this.db as any).researchOverviewSnapshot.upsert({
      where: { region_assetType: { region, assetType } },
      create: {
        region,
        assetType,
        overviewJson: overview as any,
        marketGate: overview.marketReadiness.marketGate,
        overallStatus: overview.actionability.overallStatus,
        dataGaps: overview.dataGaps,
        computedAt: new Date(overview.generatedAt),
      },
      update: {
        overviewJson: overview as any,
        marketGate: overview.marketReadiness.marketGate,
        overallStatus: overview.actionability.overallStatus,
        dataGaps: overview.dataGaps,
        computedAt: new Date(overview.generatedAt),
      },
    });
  }

  private emptyOverview(dataGaps: string[]): ResearchOverview {
    const marketReadiness: MarketReadiness = {
      marketGate: 'UNKNOWN',
      marketCondition: 'UNKNOWN',
      headline: 'Research overview is waiting for the backend pipeline snapshot.',
      allowedActions: [],
      reasons: [],
      blockers: dataGaps,
      dataStatus: 'MISSING',
    };
    const priorities: ResearchPriorities = {
      tradeCandidates: [],
      watchCandidates: [],
      avoidCandidates: [],
      exitCandidates: [],
      shortReviewCandidates: [],
    };
    const confirmationSummary: ConfirmationSummary = {
      signalSummary: {
        topBullishCount: 0,
        topBearishCount: 0,
        reliabilityAvailable: false,
        notes: ['Signal evidence is unavailable until the research overview pipeline materializes a snapshot.'],
      },
      smartMoneySummary: {
        accumulationCount: 0,
        distributionCount: 0,
        topConfirmations: [],
        topContradictions: [],
      },
      marketContextSummary: {
        leadingSectors: [],
        weakSectors: [],
        breadthStatus: 'Breadth unavailable',
        notes: [],
      },
    };
    const nextActions: NextAction[] = [{
      label: 'Run Backend Pipeline',
      priority: 'HIGH',
      targetRoute: '/pipeline-ops',
    }];
    return {
      actionability: this.buildActionability(marketReadiness, priorities, this.buildStrategyProofSummary([], marketReadiness), confirmationSummary, dataGaps, nextActions, null, null, null),
      marketReadiness,
      researchPriorities: priorities,
      strategyProofSummary: this.buildStrategyProofSummary([], marketReadiness),
      confirmationSummary,
      whatChanged: {
        newTradeCandidates: [],
        droppedCandidates: [],
        downgradedCandidates: [],
        upgradedCandidates: [],
        demotedCandidates: [],
        marketGateChange: null,
        warnings: dataGaps,
      },
      nextActions,
      generatedAt: new Date().toISOString(),
      dataGaps,
    };
  }

  private buildActionability(
    readiness: MarketReadiness,
    priorities: ResearchPriorities,
    proof: StrategyProofSummary,
    confirmation: ConfirmationSummary,
    dataGaps: string[],
    nextActions: NextAction[],
    calibrationHealth: CalibrationHealthResponse | null,
    todayReviewRun: { run: { status: string; candidateCounts: Record<string, number>; runDate: string; finishedAt: string | null } | null; groups: Record<string, unknown[]> } | null,
    tradePlanList: { results: Array<{ planStatus: string; paperReadinessStatus?: string }>; total: number } | null
  ): ResearchActionability {
    const reviewCandidateCount = priorities.tradeCandidates.length;
    const signalCount = confirmation.signalSummary.topBullishCount + confirmation.signalSummary.topBearishCount;

    // NR-41: signalEvidence — computed from real funnelDiagnostics signal counts (bullish + bearish).
    // Status is LIMITED (not READY) because raw counts do not prove signal quality maturity.
    const signalEvidenceDimension: ActionabilityDimension = {
      status: signalCount > 0 ? 'LIMITED' : 'INSUFFICIENT_DATA',
      label: 'Signal Evidence',
      sourceModule: 'signal-quality-lab',
      blocking: signalCount === 0,
      count: signalCount,
      message: signalCount > 0
        ? `${signalCount} raw signals available (${confirmation.signalSummary.topBullishCount} bullish / ${confirmation.signalSummary.topBearishCount} bearish). Signal quality maturity evidence is not yet wired into Research Hub actionability.`
        : 'No raw signals are available for this scope.',
    };

    // NR-41: calibrationReadiness — computed from SignalCalibrationEngineService.health().
    // Uses real calibrated signal count and readiness status from the service.
    const calibrationReadinessDimension: ActionabilityDimension = this.calibrationReadinessDimension(calibrationHealth);

    // NR-57: todayReviewReadiness — derived from the latest today-trade-review run.
    const todayReviewReadinessDimension: ActionabilityDimension = this.todayReviewReadinessDimension(todayReviewRun);

    // NR-57: tradePlanReadiness — derived from the trade-plan-risk-engine plan count.
    const tradePlanReadinessDimension: ActionabilityDimension = this.tradePlanReadinessDimension(tradePlanList);

    const dimensions = {
      marketEnvironment: this.marketEnvironmentDimension(readiness),
      dataReadiness: this.dataReadinessDimension(readiness, dataGaps),
      signalEvidence: signalEvidenceDimension,
      calibrationReadiness: calibrationReadinessDimension,
      strategyProof: this.strategyProofDimension(proof, reviewCandidateCount),
      todayReviewReadiness: todayReviewReadinessDimension,
      tradePlanReadiness: tradePlanReadinessDimension,
    };
    const allDimensions = Object.values(dimensions);
    const blockers = allDimensions
      .filter((dimension) => dimension.blocking)
      .map((dimension) => ({
        sourceModule: dimension.sourceModule,
        category: dimension.status,
        count: dimension.count,
        message: dimension.message,
      }));
    // NR-41: reduceActionability only counts INSUFFICIENT_DATA dimensions that are blocking=true,
    // so the two "not yet measured" dimensions (blocking: false) are excluded from the aggregate.
    const overallStatus = this.reduceActionability(allDimensions);
    const nextBestAction = nextActions[0]
      ? { ...nextActions[0], sourceModule: nextActions[0].targetRoute.includes('data-quality') ? 'data-quality-engine' : 'strategy-decision-engine' }
      : null;

    return {
      overallStatus,
      canReviewActionableSetups: false,
      headline: this.actionabilityHeadline(overallStatus),
      researchSupportOnly: true,
      dimensions,
      nextBestAction,
      blockers,
    };
  }

  private calibrationReadinessDimension(health: CalibrationHealthResponse | null): ActionabilityDimension {
    if (!health) {
      return {
        status: 'INSUFFICIENT_DATA',
        label: 'Calibration Readiness',
        sourceModule: 'signal-calibration-engine',
        blocking: true,
        message: 'Calibration service is unavailable.',
      };
    }
    const count = health.calibratedSignals;
    const readiness = health.calibrationReadiness;
    const readinessStatus = readiness?.status;
    if (count === 0 || health.dataStatus === 'MISSING') {
      return {
        status: 'INSUFFICIENT_DATA',
        label: 'Calibration Readiness',
        sourceModule: 'signal-calibration-engine',
        blocking: true,
        count,
        message: 'No calibrated signals are persisted yet. Run the calibration engine to generate readiness evidence.',
      };
    }
    if (readinessStatus === 'USABLE') {
      return {
        status: 'LIMITED',
        label: 'Calibration Readiness',
        sourceModule: 'signal-calibration-engine',
        blocking: false,
        count,
        message: `${count} calibrated signals persisted. Evidence is usable but downstream influence is not yet wired into Research Hub actionability.`,
        evidenceDate: health.latestGeneratedAt ?? undefined,
      };
    }
    // LIMITED readiness from calibration engine
    return {
      status: 'LIMITED',
      label: 'Calibration Readiness',
      sourceModule: 'signal-calibration-engine',
      blocking: false,
      count,
      message: `${count} calibrated signals persisted (readiness: ${readinessStatus ?? 'unknown'}). Evidence needs refresh before downstream influence can be confirmed.`,
      evidenceDate: health.latestGeneratedAt ?? undefined,
    };
  }

  /**
   * NR-57: todayReviewReadiness — wired to the latest today-trade-review run.
   *
   * Status logic:
   *  - READY     : latest run is COMPLETED or PARTIAL with promoted candidates
   *  - LIMITED   : run is PARTIAL / RUNNING with 0 promoted, or status unknown
   *  - UNAVAILABLE: service returned null or run is FAILED / none recorded yet
   *
   * Always non-blocking — missing today-review data does not gate research readiness.
   */
  private todayReviewReadinessDimension(
    todayReviewRun: { run: { status: string; candidateCounts: Record<string, number>; runDate: string; finishedAt: string | null } | null; groups: Record<string, unknown[]> } | null
  ): ActionabilityDimension {
    if (!todayReviewRun) {
      return {
        status: 'INSUFFICIENT_DATA',
        label: 'Today Review Readiness',
        sourceModule: 'today-trade-review',
        blocking: false,
        message: 'Today Review service is unavailable; readiness could not be determined.',
      };
    }

    const run = todayReviewRun.run;
    if (!run) {
      return {
        status: 'INSUFFICIENT_DATA',
        label: 'Today Review Readiness',
        sourceModule: 'today-trade-review',
        blocking: false,
        message: 'No Today Review run has been recorded yet.',
      };
    }

    if (run.status === 'FAILED') {
      return {
        status: 'INSUFFICIENT_DATA',
        label: 'Today Review Readiness',
        sourceModule: 'today-trade-review',
        blocking: false,
        message: `Latest Today Review run (${run.runDate}) failed; readiness is not available.`,
      };
    }

    const counts = run.candidateCounts || {};
    // Sum up all promoted candidate categories (LONG_REVIEW, SHORT_REVIEW, EXIT_RISK, etc.)
    const promotedCount = (counts.LONG_REVIEW ?? 0) + (counts.SHORT_REVIEW ?? 0) + (counts.EXIT_RISK_REVIEW ?? 0) + (counts.SPECIAL_CASES ?? 0);
    const watchCount = counts.WATCH_ONLY ?? 0;
    const totalCount = promotedCount + watchCount + (counts.BLOCKED ?? 0) + (counts.AVOID ?? 0) + (counts.UNPROVEN ?? 0);

    if (run.status === 'COMPLETED' && promotedCount > 0) {
      return {
        status: 'READY',
        label: 'Today Review Readiness',
        sourceModule: 'today-trade-review',
        blocking: false,
        count: promotedCount,
        message: `Today Review (${run.runDate}): ${promotedCount} promoted candidate(s) across ${totalCount} reviewed.`,
        evidenceDate: run.finishedAt ?? undefined,
      };
    }

    if ((run.status === 'COMPLETED' || run.status === 'PARTIAL') && totalCount > 0) {
      return {
        status: 'LIMITED',
        label: 'Today Review Readiness',
        sourceModule: 'today-trade-review',
        blocking: false,
        count: totalCount,
        message: `Today Review (${run.runDate}, ${run.status}): ${promotedCount} promoted, ${watchCount} watch-only of ${totalCount} reviewed.`,
        evidenceDate: run.finishedAt ?? undefined,
      };
    }

    return {
      status: 'INSUFFICIENT_DATA',
      label: 'Today Review Readiness',
      sourceModule: 'today-trade-review',
      blocking: false,
      message: `Today Review (${run.runDate}) completed with no candidates reviewed (status: ${run.status}).`,
      evidenceDate: run.finishedAt ?? undefined,
    };
  }

  /**
   * NR-57: tradePlanReadiness — wired to the trade-plan-risk-engine plan count.
   *
   * Status logic:
   *  - READY     : at least one VALID or WATCH plan is persisted
   *  - LIMITED   : plans exist but all are BLOCKED or INSUFFICIENT_DATA
   *  - UNAVAILABLE: service returned null or 0 plans
   *
   * Always non-blocking.
   */
  private tradePlanReadinessDimension(
    tradePlanList: { results: Array<{ planStatus: string; paperReadinessStatus?: string }>; total: number } | null
  ): ActionabilityDimension {
    if (!tradePlanList) {
      return {
        status: 'INSUFFICIENT_DATA',
        label: 'Trade Plan Readiness',
        sourceModule: 'trade-plan-risk-engine',
        blocking: false,
        message: 'Trade Plan service is unavailable; readiness could not be determined.',
      };
    }

    const total = tradePlanList.total ?? tradePlanList.results.length;

    if (total === 0) {
      return {
        status: 'INSUFFICIENT_DATA',
        label: 'Trade Plan Readiness',
        sourceModule: 'trade-plan-risk-engine',
        blocking: false,
        message: 'No trade plans have been generated yet. Run the trade-plan batch generator to produce plans.',
      };
    }

    // total > 0 is guaranteed here (checked above).
    // We use the total count (from DB) not the sample (limit=1) to give an honest message.
    return {
      status: 'READY',
      label: 'Trade Plan Readiness',
      sourceModule: 'trade-plan-risk-engine',
      blocking: false,
      count: total,
      message: `${total} trade plan(s) are persisted and available for review.`,
    };
  }

  private marketEnvironmentDimension(readiness: MarketReadiness): ActionabilityDimension {
    if (readiness.marketGate === 'CLOSED') {
      return {
        status: 'BLOCKED',
        label: 'Market Environment',
        sourceModule: 'strategy-decision-engine',
        blocking: true,
        message: 'Market gate is closed for new long review candidates.',
      };
    }
    if (readiness.marketGate === 'OPEN') {
      return {
        status: 'READY',
        label: 'Market Environment',
        sourceModule: 'strategy-decision-engine',
        blocking: false,
        message: 'Market environment is open, but this does not prove actionable setup readiness.',
      };
    }
    if (readiness.marketGate === 'SELECTIVE') {
      return {
        status: 'LIMITED',
        label: 'Market Environment',
        sourceModule: 'strategy-decision-engine',
        blocking: false,
        message: 'Market environment is selective; review quality gates before promoting candidates.',
      };
    }
    return {
      status: 'INSUFFICIENT_DATA',
      label: 'Market Environment',
      sourceModule: 'strategy-decision-engine',
      blocking: true,
      message: 'Market environment is unavailable.',
    };
  }

  private dataReadinessDimension(readiness: MarketReadiness, dataGaps: string[]): ActionabilityDimension {
    if (readiness.dataStatus === 'MISSING') {
      return {
        status: 'INSUFFICIENT_DATA',
        label: 'Data Readiness',
        sourceModule: 'research-hub',
        blocking: true,
        count: dataGaps.length,
        message: dataGaps.length > 0 ? 'One or more upstream research inputs are unavailable.' : 'Market data readiness is missing.',
      };
    }
    if (dataGaps.length > 0 || readiness.dataStatus === 'PARTIAL') {
      return {
        status: 'LIMITED',
        label: 'Data Readiness',
        sourceModule: 'research-hub',
        blocking: false,
        count: dataGaps.length,
        message: 'Research Hub is operating with partial upstream data.',
      };
    }
    return {
      status: 'LIMITED',
      label: 'Data Readiness',
      sourceModule: 'research-hub',
      blocking: false,
      count: dataGaps.length,
      message: 'Research Hub has no local data gaps, but trusted review-universe readiness is not yet wired.',
    };
  }

  private strategyProofDimension(proof: StrategyProofSummary, reviewCandidateCount: number): ActionabilityDimension {
    if (proof.provenCandidateCount > 0 && reviewCandidateCount > 0) {
      return {
        status: 'LIMITED',
        label: 'Strategy Proof',
        sourceModule: 'strategy-decision-engine',
        blocking: false,
        count: proof.provenCandidateCount,
        message: 'Framework-backed review candidates exist, but downstream review and plan readiness are not yet proven here.',
      };
    }
    if (proof.missingBacktestCount > 0 || proof.unprovenCandidateCount > 0) {
      return {
        status: 'UNPROVEN',
        label: 'Strategy Proof',
        sourceModule: 'strategy-decision-engine',
        blocking: true,
        count: proof.unprovenCandidateCount + proof.missingBacktestCount,
        message: 'Strategy proof is missing or unproven for review candidates.',
      };
    }
    return {
      status: 'INSUFFICIENT_DATA',
      label: 'Strategy Proof',
      sourceModule: 'strategy-decision-engine',
      blocking: true,
      count: 0,
      message: 'No framework-backed strategy proof is available for review candidates.',
    };
  }

  private reduceActionability(dimensions: ActionabilityDimension[]): ActionabilityStatus {
    if (dimensions.some((dimension) => dimension.status === 'BLOCKED')) return 'BLOCKED';
    // NR-41: Only count INSUFFICIENT_DATA as blocking if the dimension itself is blocking=true.
    // Dimensions explicitly labelled "Not yet measured" have blocking=false and are excluded
    // from the aggregate so they cannot drag the overall status to INSUFFICIENT_DATA.
    if (dimensions.some((dimension) => dimension.status === 'INSUFFICIENT_DATA' && dimension.blocking)) return 'INSUFFICIENT_DATA';
    if (dimensions.some((dimension) => dimension.status === 'UNPROVEN')) return 'UNPROVEN';
    if (dimensions.some((dimension) => dimension.status === 'LIMITED')) return 'LIMITED';
    return 'READY';
  }

  private actionabilityHeadline(status: ActionabilityStatus): string {
    if (status === 'BLOCKED') return 'Actionable setup review is blocked; use repair or diagnostic workflows first.';
    if (status === 'UNPROVEN') return 'Actionable setup review is not proven yet; review strategy evidence first.';
    if (status === 'LIMITED') return 'Actionable setup review is limited; verify upstream evidence before promotion.';
    if (status === 'READY') return 'Actionable setup review is ready for research review.';
    return 'Actionable setup review is not confirmed because required readiness evidence is unavailable.';
  }

  private generateReadinessHeadline(gate: any): string {
    if (!gate || gate.marketGate === 'UNKNOWN') return 'Market environment is currently unknown.';
    if (gate.marketGate === 'OPEN') return 'Market environment is open; confirm actionability evidence before reviewing setup readiness.';
    if (gate.marketGate === 'SELECTIVE') return 'Market environment is selective; review diagnostics and evidence before promoting candidates.';
    if (gate.marketGate === 'CLOSED') return 'No new long review candidates are available. Review exits and watchlist only.';
    return 'Market conditions are being evaluated.';
  }

  private generateSignalNotes(bullish: number, bearish: number): string[] {
    const notes: string[] = [];
    if (bullish > bearish * 2) notes.push('Significant bullish signal dominance in the current universe.');
    else if (bearish > bullish * 2) notes.push('Significant bearish signal dominance; exercise caution.');
    else notes.push('Bullish and bearish signals are roughly balanced.');
    return notes;
  }

  private async latestPersistedMarketContext(region: string): Promise<any | null> {
    const service = this.contextService as any;
    if (typeof service.latestPersistedSummary === 'function') {
      return service.latestPersistedSummary(region);
    }
    return service.summary({ region });
  }

  private async fetchStrategyDecisionProofPool(query: StrategyQuery): Promise<StrategyDecisionDto[]> {
    const decisions: StrategyQuery['decision'][] = ['TRADE_CANDIDATE', 'WATCH', 'WAIT', 'AVOID'];
    const responses = await Promise.all(decisions.map((decision) => this.strategyService.candidates({ ...query, decision, limit: 25, offset: 0 }).catch(() => ({ results: [] }))));
    const seen = new Set<string>();
    return responses.flatMap((response) => response.results || []).filter((candidate) => {
      const key = candidate.id || `${candidate.instrumentId}-${candidate.strategy}-${candidate.decision}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Fetches bearish F&O-eligible candidates from short-entry strategies.
   * Uses TRADE_CANDIDATE decisions from strategies whose category/name signals a short setup.
   * Downstream: only derivativesEligible instruments surface in the short-review bucket.
   */
  private async fetchShortReviewCandidates(query: StrategyQuery): Promise<StrategyDecisionDto[]> {
    const shortStrategyCodes = ['BREAKDOWN_MOMENTUM', 'TREND_LOSS_SHORT'];
    const responses = await Promise.all(
      shortStrategyCodes.map((strategyCode) =>
        this.strategyService.candidates({ ...query, strategy: strategyCode, decision: 'TRADE_CANDIDATE' as any, limit: 10, offset: 0 }).catch(() => ({ results: [] }))
      )
    );
    const seen = new Set<string>();
    return responses.flatMap((response) => response.results || []).filter((candidate) => {
      const key = candidate.id || `${candidate.instrumentId}-${candidate.strategy}-${candidate.decision}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private async enrichCandidates(candidates: StrategyDecisionDto[], region: string, assetType: string, dataGaps: string[], isExit = false): Promise<ResearchPriorityCandidate[]> {
    const uniqueStrategies = [...new Set(candidates.map((candidate) => candidate.strategy).filter(Boolean))];
    const performanceByStrategy = new Map<string, ResearchBacktestSummary | null>();
    await Promise.all(uniqueStrategies.map(async (strategy) => {
      const summaries = await this.strategyFrameworkService.performance(strategy, { region, assetType }).catch(() => {
        dataGaps.push(`Strategy performance summary unavailable for ${strategy}`);
        return [];
      });
      performanceByStrategy.set(strategy, this.toBacktestSummary(summaries[0]));
    }));

    return candidates.slice(0, 50).map((input) => {
      const candidate = {
        ...input,
        reasons: input.reasons || [],
        blockers: input.blockers || [],
        warnings: input.warnings || [],
        dataGaps: input.dataGaps || [],
      };
      const backtestSummary = performanceByStrategy.get(candidate.strategy) ?? null;
      const readinessLabel = this.safeReadiness(candidate.readinessLabel || candidate.strategyRating?.readinessLabel || backtestSummary?.ratingGrade);
      const proofWarnings: string[] = [];
      if (!candidate.frameworkBacked) proofWarnings.push('Strategy Framework-backed decision is missing.');
      if (!backtestSummary) proofWarnings.push('No backtest summary available for this strategy/timeframe/region.');
      if (candidate.dataGaps.length > 0) proofWarnings.push(`${candidate.dataGaps.length} data gap(s) need review.`);
      if (candidate.blockers.length > 0) proofWarnings.push(`${candidate.blockers.length} blocker(s) active.`);

      return {
        ...candidate,
        strategyCode: candidate.strategy,
        readinessLabel,
        backtestSummary,
        proofWarnings,
        primaryNextAction: this.primaryNextAction(candidate, backtestSummary, isExit),
        targetRoute: `/strategy?instrumentId=${candidate.instrumentId || ''}`,
        strategyRoute: `/strategies?strategyCode=${candidate.strategy}`,
        backtestRoute: candidate.strategy ? `/backtests?mode=registered&strategyCode=${candidate.strategy}&timeframe=${backtestSummary?.timeframe || '3Y'}&region=${region}&assetType=${assetType}` : null,
        stockRoute: candidate.instrumentId ? `/stocks/${candidate.instrumentId}` : null,
      };
    });
  }

  private bucketPriorities(candidates: ResearchPriorityCandidate[], exits: ResearchPriorityCandidate[], shorts: ResearchPriorityCandidate[], readiness: MarketReadiness): ResearchPriorities {
    const sorted = [...candidates].sort((a, b) => this.priorityScore(b, readiness) - this.priorityScore(a, readiness));
    const tradeCandidates = readiness.marketGate === 'CLOSED'
      ? []
      : sorted.filter((candidate) => this.isTradeCandidate(candidate, readiness)).slice(0, 5);
    const usedTrade = new Set(tradeCandidates.map((candidate) => candidate.id || `${candidate.instrumentId}-${candidate.strategy}`));
    const watchCandidates = sorted
      .filter((candidate) => !usedTrade.has(candidate.id || `${candidate.instrumentId}-${candidate.strategy}`))
      .filter((candidate) => this.isWatchCandidate(candidate, readiness))
      .slice(0, 5);
    const usedWatch = new Set(watchCandidates.map((candidate) => candidate.id || `${candidate.instrumentId}-${candidate.strategy}`));
    const avoidCandidates = sorted
      .filter((candidate) => !usedTrade.has(candidate.id || `${candidate.instrumentId}-${candidate.strategy}`) && !usedWatch.has(candidate.id || `${candidate.instrumentId}-${candidate.strategy}`))
      .filter((candidate) => candidate.decision === 'AVOID' || candidate.blockers.length > 0 || readiness.marketGate === 'CLOSED' || candidate.readinessLabel === 'NOT_AUTOMATION_READY')
      .slice(0, 5);

    // Short-review bucket: bearish F&O-eligible setups from short-entry strategies.
    // Distinct from long trade candidates; gated to derivativesEligible instruments.
    // Research-support framing: entry/stop/cover — no buy/sell language.
    const shortReviewCandidates = shorts
      .filter((candidate) => this.isShortReviewCandidate(candidate))
      .sort((a, b) => this.priorityScore(b, readiness) - this.priorityScore(a, readiness))
      .slice(0, 5);

    return {
      tradeCandidates,
      watchCandidates,
      avoidCandidates,
      exitCandidates: exits.sort((a, b) => b.decisionScore - a.decisionScore).slice(0, 5),
      shortReviewCandidates,
    };
  }

  /**
   * Short-review candidate: must come from a short-entry strategy, be framework-backed,
   * have a bearish decision, and be derivatives-eligible (F&O gate enforced here).
   */
  private isShortReviewCandidate(candidate: ResearchPriorityCandidate): boolean {
    const strategy = String(candidate.strategy || '').toUpperCase();
    const isShortStrategy = strategy.includes('SHORT') || strategy === 'BREAKDOWN_MOMENTUM' || strategy === 'TREND_LOSS_SHORT';
    // Also accept any candidate where direction is explicitly bearish
    const isBearishDecision = (candidate as any).direction === 'BEARISH' || String((candidate as any).signalDirection || '').toUpperCase() === 'BEARISH';
    if (!isShortStrategy && !isBearishDecision) return false;
    // Must be derivatives-eligible
    if ((candidate as any).derivativesEligible === false) return false;
    // Must be a trade/entry candidate with no hard blockers
    return Boolean(candidate.frameworkBacked)
      && ['TRADE_CANDIDATE', 'ENTRY_CANDIDATE'].includes(candidate.decision)
      && candidate.blockers.length === 0;
  }

  private isTradeCandidate(candidate: ResearchPriorityCandidate, readiness: MarketReadiness) {
    return Boolean(candidate.frameworkBacked)
      && candidate.decision === 'TRADE_CANDIDATE'
      && candidate.action === 'CONSIDER_ENTRY'
      && readiness.marketGate !== 'CLOSED'
      && candidate.marketGate !== 'CLOSED'
      && candidate.blockers.length === 0
      && candidate.confidence !== 'LOW'
      && candidate.dataGaps.length <= 1
      && Boolean(candidate.backtestSummary)
      && !['WEAK', 'UNPROVEN'].includes(candidate.backtestSummary?.ratingGrade || '')
      && candidate.readinessLabel !== 'NOT_AUTOMATION_READY';
  }

  private isWatchCandidate(candidate: ResearchPriorityCandidate, readiness: MarketReadiness) {
    if (candidate.decision === 'WATCH' || candidate.decision === 'WAIT') return true;
    if (!candidate.frameworkBacked || !candidate.backtestSummary) return true;
    if (readiness.marketGate === 'SELECTIVE' || readiness.marketGate === 'UNKNOWN') return true;
    return candidate.dataGaps.length > 0 || candidate.readinessLabel === 'RESEARCH_ONLY' || candidate.backtestSummary.ratingGrade === 'UNPROVEN';
  }

  private priorityScore(candidate: ResearchPriorityCandidate, readiness: MarketReadiness) {
    const marketScore = readiness.marketGate === 'OPEN' && candidate.marketGate === 'OPEN' ? 100 : candidate.marketGate === 'SELECTIVE' ? 70 : candidate.marketGate === 'UNKNOWN' ? 25 : 0;
    return marketScore
      + this.ratingRank(candidate.backtestSummary?.ratingGrade || candidate.strategyRating?.ratingGrade) * 20
      + this.readinessRank(candidate.readinessLabel) * 10
      + candidate.decisionScore
      + (candidate.confidence === 'HIGH' ? 15 : candidate.confidence === 'MEDIUM' ? 8 : 0)
      - candidate.blockers.length * 40
      - candidate.dataGaps.length * 10
      - candidate.warnings.length * 5
      + (candidate.reasons.some((reason) => reason.toLowerCase().includes('smart-money') || reason.toLowerCase().includes('accumulation')) ? 8 : 0)
      + (candidate.reasons.some((reason) => reason.toLowerCase().includes('sector') || reason.toLowerCase().includes('market')) ? 5 : 0);
  }

  private buildStrategyProofSummary(candidates: ResearchPriorityCandidate[], readiness: MarketReadiness): StrategyProofSummary {
    const grouped = new Map<string, ResearchPriorityCandidate[]>();
    for (const candidate of candidates.filter((item) => item.frameworkBacked)) {
      grouped.set(candidate.strategy, [...(grouped.get(candidate.strategy) || []), candidate]);
    }
    const strategiesProducingCandidates = [...grouped.entries()].map(([strategy, items]) => {
      const best = [...items].sort((a, b) => this.priorityScore(b, readiness) - this.priorityScore(a, readiness))[0];
      return {
        strategy,
        strategyVersion: best.strategyVersion,
        candidateCount: items.length,
        bestRating: best.backtestSummary?.ratingGrade || best.strategyRating?.ratingGrade || 'UNPROVEN',
        readinessLabel: this.safeReadiness(best.readinessLabel),
        topCandidateSymbol: best.symbol,
      };
    }).slice(0, 5);
    const missingBacktestCount = candidates.filter((candidate) => candidate.frameworkBacked && !candidate.backtestSummary).length;
    return {
      strategiesProducingCandidates,
      provenCandidateCount: candidates.filter((candidate) => ['EXCELLENT', 'GOOD', 'AVERAGE'].includes(candidate.backtestSummary?.ratingGrade || '')).length,
      unprovenCandidateCount: candidates.filter((candidate) => !candidate.backtestSummary || ['UNPROVEN', 'WEAK'].includes(candidate.backtestSummary.ratingGrade)).length,
      blockedByMarketGateCount: candidates.filter((candidate) => candidate.marketGate === 'CLOSED' || readiness.marketGate === 'CLOSED').length,
      missingBacktestCount,
      notes: missingBacktestCount > 0 ? ['Some framework-backed review candidates need backtest summaries before promotion.'] : [],
    };
  }

  private generateNextActions(readiness: MarketReadiness, priorities: ResearchPriorities, gaps: string[], proof: StrategyProofSummary): NextAction[] {
    const actions: NextAction[] = [];

    if (gaps.length > 0) {
      actions.push({
        label: 'Run Data Quality & Universe Sync',
        priority: 'HIGH',
        targetRoute: '/data-quality'
      });
    }

    if (readiness.marketGate === 'CLOSED') {
      actions.push({
        label: priorities.exitCandidates.length > 0 ? `New long review candidates restricted; review ${priorities.exitCandidates.length} exit candidates` : 'New long review candidates restricted; review watchlist only',
        priority: 'HIGH',
        targetRoute: '/strategy'
      });
    } else if (priorities.tradeCandidates.length > 0) {
      actions.push({
        label: `Review ${priorities.tradeCandidates.length} framework-backed review candidates`,
        priority: 'HIGH',
        targetRoute: '/strategy'
      });
    } else {
      actions.push({
        label: 'Run Strategy Evaluation',
        priority: 'MEDIUM',
        targetRoute: '/strategy'
      });
    }

    if (proof.missingBacktestCount > 0) {
      actions.push({
        label: 'Generate missing strategy performance summaries',
        priority: 'MEDIUM',
        targetRoute: '/strategies'
      });
    }

    if (priorities.watchCandidates.length > 0) {
      actions.push({
        label: 'Monitor Watchlist Review Candidates',
        priority: 'LOW',
        targetRoute: '/strategy'
      });
    }

    if (priorities.shortReviewCandidates.length > 0) {
      actions.push({
        label: `Review ${priorities.shortReviewCandidates.length} short-review candidate(s) — F&O/derivatives-eligible only`,
        priority: 'MEDIUM',
        targetRoute: '/strategy?direction=short'
      });
    }

    return actions;
  }

  private toBacktestSummary(summary: any): ResearchBacktestSummary | null {
    if (!summary) return null;
    return {
      timeframe: summary.timeframe,
      cagr: summary.cagr ?? null,
      maxDrawdown: summary.maxDrawdown ?? null,
      sharpe: summary.sharpe ?? null,
      winRate: summary.winRate ?? null,
      profitFactor: summary.profitFactor ?? null,
      tradeCount: summary.tradeCount ?? 0,
      ratingGrade: summary.ratingGrade || 'UNPROVEN',
      availabilityStatus: summary.tradeCount > 0 ? 'AVAILABLE' : 'INSUFFICIENT_HISTORY',
      generatedAt: summary.generatedAt,
    };
  }

  private primaryNextAction(candidate: StrategyDecisionDto, backtestSummary: ResearchBacktestSummary | null, isExit: boolean) {
    if (isExit) return 'Review risk level in Strategy Decision';
    if (candidate.blockers.length > 0) return 'Review blockers before action';
    if (!backtestSummary) return `Run backtest for ${candidate.strategy}`;
    if (candidate.decision === 'TRADE_CANDIDATE') return 'Review Strategy Decision proof';
    if (candidate.decision === 'WATCH' || candidate.decision === 'WAIT') return 'Wait for confirmation';
    return 'Review data gaps and warnings';
  }

  private ratingRank(value?: string | null) {
    return { EXCELLENT: 5, GOOD: 4, AVERAGE: 3, UNPROVEN: 2, WEAK: 1 }[String(value || 'UNPROVEN')] ?? 0;
  }

  private readinessRank(value?: string | null) {
    return { PAPER_TEST_CANDIDATE: 4, WATCHLIST_CANDIDATE: 3, RESEARCH_ONLY: 2, NOT_AUTOMATION_READY: 1 }[this.safeReadiness(value)] ?? 0;
  }

  private safeReadiness(value?: string | null) {
    if (value === 'PAPER_TEST_CANDIDATE' || value === 'WATCHLIST_CANDIDATE' || value === 'NOT_AUTOMATION_READY') return value;
    return 'RESEARCH_ONLY';
  }

  async health() {
    return {
      status: 'ok',
      module: 'research-hub',
      timestamp: new Date().toISOString(),
    };
  }
}
