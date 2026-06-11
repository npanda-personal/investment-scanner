import { DataQualityEngineService } from '../data-quality-engine';
import { EarningsIntelligenceService } from '../earnings-intelligence';
import { MarketContextIntelligenceService } from '../market-context-intelligence';
import type { MarketContextSummary } from '../market-context-intelligence';
import { MarketDataFoundationService } from '../market-data-foundation';
import type { TrustedReviewUniverseHealth, TrustedReviewUniverseInstrument } from '../market-data-foundation';
import { SignalCalibrationEngineService } from '../signal-calibration-engine';
import { SignalGenerationEngineService } from '../signal-generation-engine';
import { SmartMoneyIntelligenceService } from '../smart-money-intelligence';
import { getLatestOiBuildup, type OiBuildupRow } from '../derivatives-intelligence/derivatives-intelligence.oi-buildup.service';
import { StrategyDecisionEngineService, type StrategyDecisionDto } from '../strategy-decision-engine';
import { TradePlanRiskEngineService, type TradePlanResultDto } from '../trade-plan-risk-engine';
import { SnapshotAssemblerRepository } from '../snapshot-assembler';
import type { ComposedSnapshotRow, ProvenanceStatus } from '../snapshot-assembler';
import { TodayTradeReviewRepository } from './today-trade-review.repository';
import type {
  TodayReviewBoardSection,
  TodayReviewBoardSelection,
  TodayReviewBoardSourceType,
  TodayReviewCandidateDto,
  TodayReviewCandidateReason,
  TodayReviewCandidateSource,
  TodayReviewCandidateState,
  TodayReviewDirection,
  TodayReviewEarningsProximity,
  TodayReviewExcludedExample,
  TodayReviewExplainability,
  TodayReviewGrade,
  TodayReviewGroupedCandidates,
  TodayReviewMarketPosture,
  TodayReviewReasonCategory,
  TodayReviewQuery,
  TodayReviewRepository,
  TodayReviewRunDto,
  TodayReviewRunHistoryResponse,
  TodayReviewRunRequest,
  TodayReviewRunResponse,
  TodayReviewRunStatus,
  TodayReviewScanFunnel,
  TodayReviewSourceSnapshot,
  TodayReviewTrustedLoadStatus,
  TodayReviewUpstreamServices,
} from './today-trade-review.types';

const DEFAULT_REGION = 'IN';
const DEFAULT_ASSET_TYPE = 'STOCK';
const ENTRY_LIMIT = 30;
/**
 * Number of trading days to the next result within which today-review attaches
 * an earnings-blackout caveat to long-entry candidates.
 * 3 trading days = roughly Mon-Wed for a Thursday result; keeps the trader alert
 * without being too noisy for distant upcoming results.
 */
const EARNINGS_BLACKOUT_TRADING_DAYS = 3;
const EXIT_LIMIT = 20;
const TRUSTED_REVIEW_PAGE_SIZE = 250;
const TRUSTED_REVIEW_SCAN_ORDERING = 'recentVolumeDesc_priceHistoryCompleteness_latestFreshness_symbol';
const TRUSTED_REVIEW_UNAVAILABLE_WARNING = 'Trusted Review Universe unavailable or not ready; Today Review cannot publish candidates.';
const TODAY_REVIEW_BOARD_CONTRACT_VERSION = 'today-review-board-v1';
const TODAY_REVIEW_BOARD_TOTAL_LIMIT = 40;
const TODAY_REVIEW_BOARD_QUOTAS: Record<TodayReviewBoardSection, number> = {
  LONG_REVIEW: 20,
  WATCH_ONLY: 10,
  EXIT_RISK: 5,
  SPECIAL_CASES: 5,
};
const LONG_REVIEW_SOURCE_QUOTAS = {
  strategyBacked: 8,
  lite: 8,
  flexible: 4,
};

interface TrustedLoadResult {
  status: TodayReviewTrustedLoadStatus;
  instruments: TrustedReviewUniverseInstrument[];
  scanLimit: number;
  scanComplete: boolean;
  scanOrdering: string;
  failureReason?: string;
}

interface StrategyFunnelStats {
  strategyCandidatesSeen: number;
  strategyCandidatesEligible: number;
  strategyCandidatesExcluded: number;
  outsideTrustedUniverse: number;
  excludedExamples: TodayReviewExcludedExample[];
}

interface BoardAssemblyResult {
  candidates: TodayReviewCandidateDto[];
  boardSelection: TodayReviewBoardSelection;
}

/** Minimal interface for capital posture — used for cycle-safe optional injection. */
interface CapitalPostureServiceLike {
  capitalPosture(region: string): Promise<{ availability: string; postureLabel: string | null; action: string | null; message: string }>;
}

export class TodayTradeReviewService {
  constructor(
    private readonly repository: TodayReviewRepository = new TodayTradeReviewRepository(),
    private readonly services: TodayReviewUpstreamServices = {
      strategyDecisionService: new StrategyDecisionEngineService(),
      tradePlanService: new TradePlanRiskEngineService(),
      marketDataService: new MarketDataFoundationService(),
      dataQualityService: new DataQualityEngineService(),
      marketContextService: new MarketContextIntelligenceService(),
      signalService: new SignalGenerationEngineService(),
      calibrationService: new SignalCalibrationEngineService(),
      smartMoneyService: new SmartMoneyIntelligenceService(),
      earningsService: new EarningsIntelligenceService(),
      snapshotReaderService: new SnapshotAssemblerRepository(),
    },
    private readonly clock: () => Date = () => new Date(),
    /**
     * Optional CapitalPostureService injection.
     * Cycle-safe: injected at construction or resolved via lazy-require of the SPECIFIC file
     * (never the market-context-intelligence index, which imports signal-generation-engine).
     */
    private readonly capitalPostureService?: CapitalPostureServiceLike | null
  ) {}

  async run(request: TodayReviewRunRequest = {}): Promise<TodayReviewRunResponse> {
    const scope = this.normalizeScope(request);
    const startedAt = this.clock();
    const runDate = this.utcDay(startedAt);
    const warnings: string[] = [];
    const sourceSnapshot: TodayReviewSourceSnapshot = {
      generatedAt: startedAt.toISOString(),
    };
    const startedRun = await this.repository.markRunStarted({
      runDate,
      region: scope.region,
      assetType: scope.assetType,
      startedAt,
      warnings,
      sourceSnapshot,
    });

    try {
      const [sources, marketPosture, oiBuildupBySymbol] = await Promise.all([
        this.loadRunSources(scope, warnings),
        this.loadMarketPosture(scope.region),
        this.loadOiBuildupBySymbol(),
      ]);
      sourceSnapshot.marketData = sources.marketData;
      sourceSnapshot.reviewReadiness = sources.reviewReadiness;
      sourceSnapshot.reviewUniverse = sources.reviewUniverse;
      sourceSnapshot.marketGate = sources.marketGate;
      sourceSnapshot.marketContext = sources.marketContext;
      sourceSnapshot.rawSignalUniverse = sources.rawSignalUniverse;

      const liteResult = this.buildLiteCandidates(sources.trustedInstruments, sources.reviewUniverse, sources.scanEvidence, sources.strategyFunnel, sources.earningsProximity, sources.marketContext, oiBuildupBySymbol);
      sourceSnapshot.scanFunnel = liteResult.scanFunnel;
      const candidateSources = sources.reviewUniverse?.mode === 'NO_REVIEW'
        ? []
        : await this.buildCandidateSources(sources.entryDecisions, sources.exitDecisions, sources, scope, warnings, Boolean(request.skipTradePlanGeneration), sources.trustedInstruments);
      const strategyCandidates = candidateSources.map((candidateSource) => this.mapCandidate(candidateSource, sources.earningsProximity));
      const board = this.assembleBoardCandidates(this.mergeCandidates([...liteResult.candidates, ...strategyCandidates]));
      sourceSnapshot.boardSelection = board.boardSelection;
      const candidates = board.candidates;
      const candidateCounts = this.countCandidates(candidates);
      sourceSnapshot.explainability = this.buildRunExplainability(startedRun.id, scope, sources.reviewUniverse, liteResult.scanFunnel, candidates, sources.strategyFunnel.excludedExamples);
      const status: TodayReviewRunStatus = warnings.length > 0 || sources.reviewUniverse?.mode === 'NO_REVIEW' || sources.reviewUniverse?.mode === 'LIMITED_REVIEW' || !sources.scanEvidence.scanComplete ? 'PARTIAL' : 'COMPLETED';
      const completed = await this.repository.completeRun({
        runId: startedRun.id,
        status,
        dataThroughDate: this.parseDataThroughDate(sources.marketData, sources.reviewUniverse),
        finishedAt: this.clock(),
        warnings,
        candidateCounts,
        sourceSnapshot,
        candidates,
      });
      // Load snapshot watermark (additive — never blocks the run)
      const snapshotAssembledAt = await this.loadSnapshotAssembledAt(scope, runDate);
      return this.toRunResponse(completed, scope, marketPosture, snapshotAssembledAt);
    } catch (error: any) {
      warnings.push(`Today review run failed: ${error?.message || 'unknown error'}`);
      const failed = await this.repository.completeRun({
        runId: startedRun.id,
        status: 'FAILED',
        dataThroughDate: null,
        finishedAt: this.clock(),
        warnings,
        candidateCounts: {},
        sourceSnapshot,
        candidates: [],
      });
      return this.toRunResponse(failed, scope);
    }
  }

  async latest(query: TodayReviewQuery = {}): Promise<TodayReviewRunResponse> {
    const scope = this.normalizeScope(query);
    const [run, marketPosture] = await Promise.all([
      this.repository.latest(scope.region, scope.assetType, { enrich: query.enrich }),
      this.loadMarketPosture(scope.region),
    ]);
    // For latest read, use the run's date to look up the watermark.
    const runDate = run?.runDate ? this.utcDay(new Date(run.runDate)) : this.utcDay(this.clock());
    const snapshotAssembledAt = await this.loadSnapshotAssembledAt(scope, runDate);
    return this.toRunResponse(run, scope, marketPosture, snapshotAssembledAt);
  }

  async runs(query: TodayReviewQuery = {}): Promise<TodayReviewRunHistoryResponse> {
    const scope = this.normalizeScope(query);
    const limit = this.limit(query.limit);
    const offset = Math.max(0, query.offset ?? 0);
    const result = await this.repository.listRuns({ ...scope, limit, offset });
    const nextOffset = offset + result.items.length;
    return {
      items: result.items,
      pagination: {
        total: result.total,
        limit,
        offset,
        nextOffset: nextOffset < result.total ? nextOffset : null,
        hasMore: nextOffset < result.total,
      },
    };
  }

  async runById(id: string): Promise<TodayReviewRunResponse | null> {
    const run = await this.repository.getRun(id);
    return run ? this.toRunResponse(run, { region: run.region, assetType: run.assetType }) : null;
  }

  async candidate(id: string): Promise<TodayReviewCandidateDto | null> {
    return this.repository.getCandidate(id);
  }

  groupCandidates(candidates: TodayReviewCandidateDto[]): TodayReviewGroupedCandidates {
    const isSpecialCase = (candidate: TodayReviewCandidateDto) => candidate.boardSection === 'SPECIAL_CASES';
    const isBoardSection = (candidate: TodayReviewCandidateDto, section: TodayReviewBoardSection) => candidate.boardSection === section;
    const nonSpecial = candidates.filter((candidate) => !isSpecialCase(candidate));
    return {
      longReview: nonSpecial.filter((candidate) => isBoardSection(candidate, 'LONG_REVIEW') || (!candidate.boardSection && candidate.state === 'LONG_REVIEW')),
      shortReview: nonSpecial.filter((candidate) => (isBoardSection(candidate, 'EXIT_RISK') && candidate.state === 'SHORT_REVIEW') || (!candidate.boardSection && candidate.state === 'SHORT_REVIEW')),
      exitRiskReview: nonSpecial.filter((candidate) => (isBoardSection(candidate, 'EXIT_RISK') && candidate.state === 'EXIT_RISK_REVIEW') || (!candidate.boardSection && candidate.state === 'EXIT_RISK_REVIEW')),
      watchOnly: nonSpecial.filter((candidate) => isBoardSection(candidate, 'WATCH_ONLY') || (!candidate.boardSection && candidate.state === 'WATCH_ONLY')),
      specialCases: candidates.filter(isSpecialCase),
      blocked: nonSpecial.filter((candidate) => candidate.state === 'BLOCKED'),
      avoid: nonSpecial.filter((candidate) => candidate.state === 'AVOID'),
      insufficientData: nonSpecial.filter((candidate) => candidate.state === 'INSUFFICIENT_DATA'),
      unproven: nonSpecial.filter((candidate) => candidate.state === 'UNPROVEN'),
    };
  }

  private async loadRunSources(scope: { region: string; assetType: string }, warnings: string[]) {
    const [marketData, reviewReadiness, reviewUniverseResult, marketContext, marketGate, rawSignalUniverse, entryCandidates, exitCandidates, earningsProximity] = await Promise.all([
      this.safe(() => this.services.marketDataService.latestStoredCandleInfo(scope.region, scope.assetType, this.clock()), 'Market data freshness is unavailable.', warnings),
      this.services.marketDataService.reviewReadinessSummary
        ? this.safe(() => this.services.marketDataService.reviewReadinessSummary!({ region: scope.region, assetType: scope.assetType, recompute: true }), TRUSTED_REVIEW_UNAVAILABLE_WARNING, warnings)
        : Promise.resolve(null),
      this.services.marketDataService.trustedReviewUniverseHealth
        ? this.safe(() => this.services.marketDataService.trustedReviewUniverseHealth!({ region: scope.region, assetType: scope.assetType }), TRUSTED_REVIEW_UNAVAILABLE_WARNING, warnings)
        : Promise.resolve(null),
      this.safe(() => this.services.marketContextService.latestPersistedSummary(scope.region), 'Market context snapshot is unavailable.', warnings),
      this.safe(() => this.services.strategyDecisionService.marketGate(scope.region), 'Market gate is unavailable.', warnings),
      this.safe(() => this.services.signalService.latestSignalUniverse({ region: scope.region, assetType: scope.assetType, limit: 25, offset: 0 }), 'Raw signal support is unavailable.', warnings),
      this.safe(() => this.services.strategyDecisionService.candidates({
        region: scope.region,
        assetType: scope.assetType,
        decision: 'TRADE_CANDIDATE',
        limit: ENTRY_LIMIT,
        offset: 0,
        sortBy: 'decisionScore',
        sortDirection: 'desc',
      }), 'Strategy entry candidates are unavailable.', warnings),
      this.safe(() => this.services.strategyDecisionService.exits(undefined, scope.region, scope.assetType), 'Strategy exit-risk candidates are unavailable.', warnings),
      this.services.earningsService
        ? this.safe(() => this.services.earningsService!.latestProximityBySymbol(scope.region, scope.assetType), 'Earnings proximity data is unavailable.', warnings)
        : Promise.resolve(null),
    ]);
    const reviewUniverseUnavailable = !reviewUniverseResult;
    let reviewUniverse = reviewUniverseResult || this.noReviewUniverse(scope, TRUSTED_REVIEW_UNAVAILABLE_WARNING);
    if (reviewReadiness) {
      reviewUniverse = {
        ...reviewUniverse,
        mode: reviewReadiness.reviewMode,
        status: reviewReadiness.reviewMode === 'FULL_REVIEW' ? 'READY' : reviewReadiness.reviewMode === 'LIMITED_REVIEW' ? 'LIMITED' : 'NOT_READY',
        catalogCount: reviewReadiness.reviewUniverse.catalogCount,
        providerSupportedCount: reviewReadiness.reviewUniverse.providerSupportedCount,
        trustedCount: reviewReadiness.reviewUniverse.trustedCount,
        targetTradingDate: reviewReadiness.reviewUniverse.targetTradingDate,
        requiredDataThroughDate: reviewReadiness.reviewUniverse.requiredDataThroughDate,
        storedDataThroughDate: reviewReadiness.reviewUniverse.storedDataThroughDate,
        dataThroughDate: reviewReadiness.reviewUniverse.storedDataThroughDate,
        warnings: [...new Set([...(reviewUniverse.warnings || []), ...reviewReadiness.warnings])],
      };
    }
    if (reviewUniverseUnavailable || reviewUniverse.mode === 'NO_REVIEW') this.addWarning(warnings, TRUSTED_REVIEW_UNAVAILABLE_WARNING);
    let trustedLoad: TrustedLoadResult = {
      status: reviewUniverseUnavailable ? 'LOAD_FAILED' : 'COMPLETE',
      instruments: [],
      scanLimit: 0,
      scanComplete: !reviewUniverseUnavailable,
      scanOrdering: reviewUniverse.scanPolicy?.scanOrdering || TRUSTED_REVIEW_SCAN_ORDERING,
      failureReason: reviewUniverseUnavailable ? TRUSTED_REVIEW_UNAVAILABLE_WARNING : undefined,
    };
    if (reviewUniverse.mode !== 'NO_REVIEW') {
      if (!this.services.marketDataService.listTrustedReviewUniverseInstruments) {
        trustedLoad = {
          status: 'LOAD_FAILED',
          instruments: [],
          scanLimit: Math.max(0, Number(reviewUniverse.trustedCount || 0)),
          scanComplete: false,
          scanOrdering: reviewUniverse.scanPolicy?.scanOrdering || TRUSTED_REVIEW_SCAN_ORDERING,
          failureReason: 'Trusted universe membership loader is unavailable.',
        };
        this.addWarning(warnings, TRUSTED_REVIEW_UNAVAILABLE_WARNING);
        if (trustedLoad.failureReason) this.addWarning(warnings, trustedLoad.failureReason);
        reviewUniverse = this.noReviewUniverse(scope, TRUSTED_REVIEW_UNAVAILABLE_WARNING, reviewUniverse);
      } else {
        trustedLoad = await this.loadTrustedInstrumentsForReview(scope, reviewUniverse);
        if (trustedLoad.status === 'LOAD_FAILED') {
          this.addWarning(warnings, TRUSTED_REVIEW_UNAVAILABLE_WARNING);
          if (trustedLoad.failureReason) this.addWarning(warnings, trustedLoad.failureReason);
          trustedLoad = { ...trustedLoad, instruments: [] };
          reviewUniverse = this.noReviewUniverse(scope, TRUSTED_REVIEW_UNAVAILABLE_WARNING, reviewUniverse);
        } else if (trustedLoad.status === 'CONFIGURED_PARTIAL') {
          this.addWarning(warnings, `Trusted universe scan is partial: scanned ${trustedLoad.instruments.length} of ${reviewUniverse.trustedCount} instruments.`);
        }
      }
    }
    for (const warning of reviewUniverse?.warnings || []) this.addWarning(warnings, warning);
    const rawEntryDecisions = (entryCandidates?.results || []).filter((decision) => Boolean(decision.instrumentId && decision.symbol)).slice(0, ENTRY_LIMIT);
    const rawExitDecisions = (exitCandidates || []).filter((decision) => Boolean(decision.instrumentId && decision.symbol)).slice(0, EXIT_LIMIT);
    const strategyFilter = this.filterDecisionsByTrustedUniverse(rawEntryDecisions, rawExitDecisions, trustedLoad.instruments);

    return {
      marketData,
      reviewReadiness,
      reviewUniverse,
      trustedInstruments: trustedLoad.instruments,
      scanEvidence: {
        trustedUniverseCount: reviewUniverse.trustedCount || 0,
        scanLimit: trustedLoad.scanLimit,
        scanComplete: trustedLoad.scanComplete,
        scanOrdering: trustedLoad.scanOrdering,
        trustedLoadStatus: trustedLoad.status,
        membershipLoadFailureReason: trustedLoad.failureReason || null,
      },
      strategyFunnel: strategyFilter.stats,
      marketContext,
      marketGate,
      rawSignalUniverse: rawSignalUniverse ? {
        supportOnly: true,
        sampleCount: rawSignalUniverse.length,
        bullishCount: rawSignalUniverse.filter((signal) => signal.direction === 'BULLISH').length,
        bearishCount: rawSignalUniverse.filter((signal) => signal.direction === 'BEARISH').length,
      } : null,
      entryDecisions: strategyFilter.entryDecisions,
      exitDecisions: strategyFilter.exitDecisions,
      earningsProximity: earningsProximity ?? new Map<string, TodayReviewEarningsProximity>(),
    };
  }

  private async loadTrustedInstrumentsForReview(
    scope: { region: string; assetType: string },
    reviewUniverse: TrustedReviewUniverseHealth
  ): Promise<TrustedLoadResult> {
    const trustedCount = Math.max(0, Number(reviewUniverse.trustedCount || 0));
    const configuredLimit = this.configuredTrustedScanLimit();
    const scanLimit = configuredLimit ? Math.min(configuredLimit, trustedCount) : trustedCount;
    const scanOrdering = reviewUniverse.scanPolicy?.scanOrdering || TRUSTED_REVIEW_SCAN_ORDERING;
    if (trustedCount === 0) {
      return {
        status: 'COMPLETE',
        instruments: [],
        scanLimit: 0,
        scanComplete: true,
        scanOrdering,
      };
    }
    const instruments: TrustedReviewUniverseInstrument[] = [];
    let offset = 0;
    while (offset < scanLimit) {
      const limit = Math.min(TRUSTED_REVIEW_PAGE_SIZE, scanLimit - offset);
      let page: TrustedReviewUniverseInstrument[] | null | undefined;
      try {
        page = await this.services.marketDataService.listTrustedReviewUniverseInstruments!({ region: scope.region, assetType: scope.assetType, limit, offset });
      } catch {
        return this.failedTrustedLoad(scanLimit, scanOrdering, `Trusted universe membership page failed at offset ${offset}.`);
      }
      if (!Array.isArray(page)) {
        return this.failedTrustedLoad(scanLimit, scanOrdering, `Trusted universe membership page returned no data at offset ${offset}.`);
      }
      if (page.length === 0) {
        return this.failedTrustedLoad(scanLimit, scanOrdering, 'Trusted universe membership returned empty page before expected scan limit.');
      }
      instruments.push(...page);
      offset += page.length;
      if (page.length < limit && offset < scanLimit) {
        return this.failedTrustedLoad(scanLimit, scanOrdering, 'Trusted universe membership returned fewer instruments than expected.');
      }
    }
    if (instruments.length === trustedCount) {
      return {
        status: 'COMPLETE',
        instruments,
        scanLimit,
        scanComplete: true,
        scanOrdering,
      };
    }
    if (configuredLimit && instruments.length === scanLimit && scanLimit < trustedCount) {
      return {
        status: 'CONFIGURED_PARTIAL',
        instruments,
        scanLimit,
        scanComplete: false,
        scanOrdering,
      };
    }
    if (instruments.length < trustedCount) {
      return this.failedTrustedLoad(scanLimit, scanOrdering, 'Trusted universe membership returned fewer instruments than expected.');
    }
    return {
      status: 'COMPLETE',
      instruments,
      scanLimit,
      scanComplete: true,
      scanOrdering,
    };
  }

  private failedTrustedLoad(scanLimit: number, scanOrdering: string, failureReason: string): TrustedLoadResult {
    return {
      status: 'LOAD_FAILED',
      instruments: [],
      scanLimit,
      scanComplete: false,
      scanOrdering,
      failureReason,
    };
  }

  private filterDecisionsByTrustedUniverse(
    entryDecisions: StrategyDecisionDto[],
    exitDecisions: StrategyDecisionDto[],
    trustedInstruments: TrustedReviewUniverseInstrument[]
  ) {
    const trustedIds = new Set(trustedInstruments.map((instrument) => this.normalizedMembershipKey(instrument.id)).filter(Boolean));
    const trustedSymbols = new Set(
      trustedInstruments
        .flatMap((instrument) => [instrument.symbol, instrument.providerSymbol])
        .map((value) => this.normalizedMembershipKey(value))
        .filter(Boolean)
    );
    const all = [
      ...entryDecisions.map((decision) => ({ decision, sourceKind: 'ENTRY' as const })),
      ...exitDecisions.map((decision) => ({ decision, sourceKind: 'EXIT' as const })),
    ];
    const eligible = all.filter(({ decision }) => {
      const id = this.normalizedMembershipKey(decision.instrumentId);
      const symbol = this.normalizedMembershipKey(decision.symbol);
      return Boolean((id && trustedIds.has(id)) || (symbol && trustedSymbols.has(symbol)));
    });
    const excludedExamples = all
      .filter(({ decision }) => !eligible.some((item) => item.decision === decision))
      .slice(0, 8)
      .map(({ decision }) => ({
        instrumentId: decision.instrumentId || 'UNKNOWN',
        symbol: decision.symbol || 'UNKNOWN',
        companyName: null,
        primaryReasonCode: 'OUTSIDE_TRUSTED_UNIVERSE',
        primaryReasonLabel: 'Strategy Decision candidate is outside the trusted review universe.',
        reasonCategories: ['OUTSIDE_SCOPE' as TodayReviewReasonCategory],
        promoted: false as const,
      }));
    const strategyCandidatesSeen = all.length;
    const strategyCandidatesEligible = eligible.length;
    const strategyCandidatesExcluded = strategyCandidatesSeen - strategyCandidatesEligible;
    return {
      entryDecisions: eligible.filter((item) => item.sourceKind === 'ENTRY').map((item) => item.decision),
      exitDecisions: eligible.filter((item) => item.sourceKind === 'EXIT').map((item) => item.decision),
      stats: {
        strategyCandidatesSeen,
        strategyCandidatesEligible,
        strategyCandidatesExcluded,
        outsideTrustedUniverse: strategyCandidatesExcluded,
        excludedExamples,
      },
    };
  }

  private noReviewUniverse(
    scope: { region: string; assetType: string },
    warning: string,
    base?: TrustedReviewUniverseHealth | null
  ): TrustedReviewUniverseHealth {
    const now = this.clock().toISOString().slice(0, 10);
    return {
      scope,
      asOfDate: base?.asOfDate || now,
      targetTradingDate: base?.targetTradingDate || null,
      requiredDataThroughDate: base?.requiredDataThroughDate || null,
      storedDataThroughDate: base?.storedDataThroughDate || base?.dataThroughDate || null,
      catalogCount: base?.catalogCount || 0,
      providerSupportedCount: base?.providerSupportedCount || 0,
      trustedCount: base?.trustedCount || 0,
      status: 'NOT_READY',
      mode: 'NO_REVIEW',
      minLiteCount: base?.minLiteCount || 100,
      minFullCount: base?.minFullCount || 300,
      dataThroughDate: base?.dataThroughDate || base?.storedDataThroughDate || null,
      scanPolicy: {
        scanLimit: 0,
        scanComplete: true,
        scanOrdering: base?.scanPolicy?.scanOrdering || TRUSTED_REVIEW_SCAN_ORDERING,
      },
      excludedCounts: base?.excludedCounts || {
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
      },
      contextGapCounts: base?.contextGapCounts || {
        missingSector: 0,
        missingIndustry: 0,
        missingMarketCap: 0,
        missingIsin: 0,
        missingListingDate: 0,
      },
      warnings: Array.from(new Set([...(base?.warnings || []), warning])),
    };
  }

  private async buildCandidateSources(
    entryDecisions: StrategyDecisionDto[],
    exitDecisions: StrategyDecisionDto[],
    sources: {
      marketContext: Awaited<ReturnType<TodayReviewUpstreamServices['marketContextService']['latestPersistedSummary']>>;
      marketGate: Record<string, unknown> | null;
    },
    scope: { region: string; assetType: string },
    warnings: string[],
    skipTradePlanGeneration = false,
    trustedInstruments: TrustedReviewUniverseInstrument[] = []
  ): Promise<TodayReviewCandidateSource[]> {
    // Build derivativesEligible lookup by instrumentId and symbol for F&O gating
    const derivativesEligibleById = new Map<string, boolean | null>(
      trustedInstruments.map((instrument) => [instrument.id, instrument.derivativesEligible])
    );
    const derivativesEligibleBySymbol = new Map<string, boolean | null>(
      trustedInstruments.flatMap((instrument) => [
        [instrument.symbol, instrument.derivativesEligible],
        ...(instrument.providerSymbol ? [[instrument.providerSymbol, instrument.derivativesEligible] as [string, boolean | null]] : []),
      ])
    );
    const decisions = this.dedupeDecisions([
      ...entryDecisions.map((decision) => ({ decision, sourceKind: 'ENTRY' as const })),
      ...exitDecisions.map((decision) => ({ decision, sourceKind: 'EXIT' as const })),
    ]);
    const instrumentIds = [...new Set(decisions.map(({ decision }) => decision.instrumentId!).filter(Boolean))];
    const hasBulkRawSignals = typeof this.services.signalService.latestPersistedForInstruments === 'function';
    const hasBulkCalibration = typeof this.services.calibrationService.latestPersistedForInstruments === 'function';
    const hasBulkSmartMoney = typeof this.services.smartMoneyService.latestPersistedStocks === 'function';
    const hasGetEligibility = typeof this.services.dataQualityService.getEligibility === 'function';
    const hasBulkTradePlans = typeof this.services.tradePlanService.latestForInstruments === 'function';

    // Determine snapshot-reads flag: ON by default, disabled by TODAY_REVIEW_SNAPSHOT_READS=0 or =false
    const snapshotReadsEnabled = this.isSnapshotReadsEnabled();
    const hasSnapshotReader = snapshotReadsEnabled && typeof this.services.snapshotReaderService?.latestSnapshotsForInstruments === 'function';

    // Snapshot-first: resolve the run's trading date from the market data context
    // Use the clock's UTC day as a best-effort tradingDate for the snapshot query
    const snapshotTradingDate = this.utcDay(this.clock());

    // ── Phase A: fetch snapshot rows first so we can gate downstream bulk reads ──
    // When the snapshot is fresh and covers all instruments, the signal and
    // calibration bulk reads are skipped entirely (the '11 deps → 1' design).
    const snapshotMap = hasSnapshotReader && instrumentIds.length > 0
      ? await this.safe(() => this.services.snapshotReaderService!.latestSnapshotsForInstruments!(instrumentIds, snapshotTradingDate), 'Daily instrument snapshot read is unavailable.', warnings)
      : null;
    // snapshotByInstrument is Map<instrumentId, ComposedSnapshotRow> | null
    const snapshotByInstrument: Map<string, ComposedSnapshotRow> = (snapshotMap as Map<string, ComposedSnapshotRow> | null) ?? new Map();

    // Determine which bulk reads can be skipped because the snapshot fully covers them.
    // "Fully covered" = every decision instrument has a usable (OK or STALE) snapshot row
    // for that section with a non-null value.
    const snapshotSignalsUsableFor = (id: string): boolean => {
      const row = snapshotByInstrument.get(id);
      if (!row) return false;
      const prov = row.provenance?.signals;
      return (prov === 'OK' || prov === 'STALE') && row.signalScore !== null && row.signalDirection !== null;
    };
    const snapshotCalibrationUsableFor = (id: string): boolean => {
      const row = snapshotByInstrument.get(id);
      if (!row) return false;
      const prov = row.provenance?.calibration;
      return (prov === 'OK' || prov === 'STALE') && row.calibratedScore !== null;
    };
    // Skip bulk reads only when ALL instruments in this run are covered by the snapshot.
    const allInstrumentsCoveredBySnapshot = instrumentIds.length > 0 && snapshotByInstrument.size > 0;
    const skipSignalBulkRead = snapshotReadsEnabled && allInstrumentsCoveredBySnapshot && instrumentIds.every(snapshotSignalsUsableFor);
    const skipCalibrationBulkRead = snapshotReadsEnabled && allInstrumentsCoveredBySnapshot && instrumentIds.every(snapshotCalibrationUsableFor);

    // ── Phase B: remaining bulk reads (signal/calibration conditionally skipped) ──
    const entryInstrumentIds = decisions.filter((item) => item.sourceKind === 'ENTRY').map(({ decision }) => decision.instrumentId!).filter(Boolean);
    const [dataQualityRows, eligibilityRows, rawSignalRows, calibrationRows, smartMoneyRows, bulkTradePlanMap] = await Promise.all([
      this.safe(() => this.services.dataQualityService.getEvaluationsForInstruments(instrumentIds), 'Data quality snapshots are unavailable.', warnings),
      hasGetEligibility
        ? this.safe(() => this.services.dataQualityService.getEligibility!(instrumentIds), 'Instrument eligibility rows are unavailable.', warnings)
        : Promise.resolve(null),
      // Signal bulk: skip when snapshot fully covers all instruments for this section.
      (!skipSignalBulkRead && hasBulkRawSignals)
        ? this.safe(() => this.services.signalService.latestPersistedForInstruments!(instrumentIds), 'Raw signal snapshots are unavailable.', warnings)
        : Promise.resolve(null),
      // Calibration bulk: skip when snapshot fully covers all instruments for this section.
      (!skipCalibrationBulkRead && hasBulkCalibration)
        ? this.safe(() => this.services.calibrationService.latestPersistedForInstruments!(instrumentIds), 'Calibration snapshots are unavailable.', warnings)
        : Promise.resolve(null),
      hasBulkSmartMoney
        ? this.safe(() => this.services.smartMoneyService.latestPersistedStocks!(instrumentIds, '3M'), 'Smart-money snapshots are unavailable.', warnings)
        : Promise.resolve(null),
      // BULK trade plan read: replaces per-instrument N+1 loop for entry decisions
      hasBulkTradePlans && entryInstrumentIds.length > 0
        ? this.safe(() => this.services.tradePlanService.latestForInstruments!(entryInstrumentIds, scope), 'Bulk trade plan read is unavailable; falling back to per-instrument load.', warnings)
        : Promise.resolve(null),
    ]);
    const dataQualityByInstrument = new Map((dataQualityRows || []).map((evaluation) => [evaluation.instrumentId, evaluation]));
    const eligibilityByInstrument = new Map((eligibilityRows || []).map((row) => [row.instrumentId, row]));
    const rawSignalByInstrument = new Map((rawSignalRows || []).map((signal) => [signal.instrument_id, signal]));
    const calibrationByInstrument = new Map((calibrationRows || []).map((calibration) => [calibration.instrumentId, calibration]));
    const smartMoneyByInstrument = new Map((smartMoneyRows || []).map((summary) => [summary.instrumentId, summary]));
    // bulkTradePlanMap is Map<instrumentId, TradePlanResultDto> | null (null = bulk failed or unavailable)
    const persistedTradePlanByInstrument: Map<string, TradePlanResultDto> = bulkTradePlanMap ?? new Map();

    const result: TodayReviewCandidateSource[] = [];
    for (const item of decisions) {
      const instrumentId = item.decision.instrumentId!;
      const snapshot = snapshotByInstrument.get(instrumentId) ?? null;

      // --- Snapshot-first: smart money ---
      const snapshotSmartMoneyProvenance: ProvenanceStatus | null = snapshot?.provenance?.smartMoney ?? null;
      const useSnapshotSmartMoney = snapshotReadsEnabled && snapshot !== null && (snapshotSmartMoneyProvenance === 'OK' || snapshotSmartMoneyProvenance === 'STALE') && snapshot.smartMoneyCode !== null;

      // --- Snapshot-first: raw signal ---
      // When signals provenance is OK/STALE and the bulk read was skipped, produce a
      // minimal synthetic SignalResultDto from snapshot fields. Fields unused by today-review
      // scoring (deliveryPercent, sector, etc.) are left null — the snapshot does not store them.
      const useSnapshotSignal = snapshotReadsEnabled && snapshotSignalsUsableFor(instrumentId);

      // --- Snapshot-first: calibration ---
      // When calibration provenance is OK/STALE, produce a minimal synthetic calibration
      // result. calibratedDirection is inferred from signalDirection (same source data),
      // since the snapshot does not store it separately.
      const useSnapshotCalibration = snapshotReadsEnabled && snapshotCalibrationUsableFor(instrumentId);

      // --- Trade plan: use bulk result if available, else fall back to per-instrument load ---
      let tradePlanPromise: Promise<TradePlanResultDto | null>;
      if (item.sourceKind !== 'ENTRY') {
        tradePlanPromise = Promise.resolve(null);
      } else if (hasBulkTradePlans && bulkTradePlanMap !== null) {
        // Bulk succeeded: use map result directly (null = no plan for this instrument)
        const persistedPlan = persistedTradePlanByInstrument.get(instrumentId) ?? null;
        if (persistedPlan) {
          tradePlanPromise = Promise.resolve(persistedPlan);
        } else if (skipTradePlanGeneration) {
          warnings.push(`${item.decision.symbol} persisted legacy risk snapshot is unavailable; scheduler publication skipped compatibility snapshot generation.`);
          tradePlanPromise = Promise.resolve(null);
        } else {
          // No persisted plan in bulk result → fall back to generatePlan
          tradePlanPromise = this.safe(
            () => this.services.tradePlanService.generatePlan({
              instrumentId: item.decision.instrumentId!,
              symbol: item.decision.symbol!,
              strategyDecisionId: item.decision.id,
              region: scope.region,
              assetType: scope.assetType,
            }),
            `${item.decision.symbol} exit/invalidation evidence snapshot could not be generated.`,
            warnings
          );
        }
      } else {
        // Bulk unavailable → fall back to per-instrument load (original behavior)
        tradePlanPromise = this.loadTradePlan(item.decision, scope, warnings, skipTradePlanGeneration);
      }

      // Determine smart money source: snapshot (when provenance OK/STALE) skips the live call entirely.
      const smartMoneyPromise: Promise<import('../smart-money-intelligence').SmartMoneyStockSummary | null> =
        useSnapshotSmartMoney
          ? Promise.resolve(this.snapshotSmartMoneyToSummary(snapshot!, instrumentId, item.decision.symbol))
          : hasBulkSmartMoney
            ? Promise.resolve(smartMoneyByInstrument.get(instrumentId) || null)
            : this.safe(() => this.services.smartMoneyService.latestPersistedStock(instrumentId, '3M'), `${item.decision.symbol} smart-money support is unavailable.`, warnings);

      // Determine signal source: snapshot (when provenance OK/STALE) → synthetic minimal
      // SignalResultDto; otherwise fall through to bulk/per-instrument live read.
      const rawSignalPromise: Promise<import('../signal-generation-engine').SignalResultDto | null> =
        useSnapshotSignal
          ? Promise.resolve(this.snapshotSignalToRawSignal(snapshot!, instrumentId, item.decision.symbol))
          : hasBulkRawSignals
            ? Promise.resolve(rawSignalByInstrument.get(instrumentId) || null)
            : this.safe(() => this.services.signalService.latestForInstrument(instrumentId), `${item.decision.symbol} raw signal support is unavailable.`, warnings);

      // Determine calibration source: snapshot (when provenance OK/STALE) → synthetic
      // minimal calibration result; otherwise fall through to bulk/per-instrument live read.
      const calibrationPromise: Promise<import('../signal-calibration-engine').SignalCalibrationResultDto | null> =
        useSnapshotCalibration
          ? Promise.resolve(this.snapshotCalibrationToResult(snapshot!, instrumentId, item.decision.symbol))
          : hasBulkCalibration
            ? Promise.resolve(calibrationByInstrument.get(instrumentId) || null)
            : this.safe(() => this.services.calibrationService.latestPersistedForInstrument(instrumentId), `${item.decision.symbol} calibration support is unavailable.`, warnings);

      const [tradePlan, rawSignal, calibration, smartMoney] = await Promise.all([
        tradePlanPromise,
        rawSignalPromise,
        calibrationPromise,
        smartMoneyPromise,
      ]);

      const derivativesEligible = derivativesEligibleById.get(instrumentId)
        ?? derivativesEligibleBySymbol.get(item.decision.symbol || '')
        ?? null;
      result.push({
        decision: item.decision,
        dataQuality: dataQualityByInstrument.get(instrumentId) || null,
        eligibilityRow: eligibilityByInstrument.get(instrumentId) || null,
        marketContext: sources.marketContext || null,
        marketGate: sources.marketGate,
        tradePlan,
        rawSignal,
        calibration,
        smartMoney,
        sourceKind: item.sourceKind,
        derivativesEligible,
      });
    }
    return result;
  }

  /**
   * Whether snapshot reads are enabled (TODAY_REVIEW_SNAPSHOT_READS env flag).
   * Defaults to enabled; set to '0' or 'false' to disable → pure legacy path.
   */
  private isSnapshotReadsEnabled(): boolean {
    const flag = process.env.TODAY_REVIEW_SNAPSHOT_READS;
    if (flag === '0' || flag === 'false') return false;
    return true;
  }

  /**
   * Convert a ComposedSnapshotRow smart-money fields into a SmartMoneyStockSummary-compatible shape
   * for the candidate source (best-effort — only carries the fields used by today-review scoring).
   */
  private snapshotSmartMoneyToSummary(snapshot: ComposedSnapshotRow, instrumentId: string, symbol?: string | null): import('../smart-money-intelligence').SmartMoneyStockSummary {
    return {
      instrumentId,
      symbol: symbol || instrumentId,
      companyName: null,
      sector: null,
      smartMoneyScore: snapshot.smartMoneyScore ?? 0,
      status: (snapshot.smartMoneyCode as any) ?? 'NEUTRAL',
      confidence: 'MEDIUM',
      explanation: 'From daily_instrument_snapshot (snapshot-first).',
      updatedAt: snapshot.assembledAt.toISOString(),
      dataStatus: 'COMPLETE',
      source: 'snapshot',
      range: '3M',
      latestClose: null,
      latestVolume: null,
      averageVolume20: null,
      dailyChangePercent: null,
      signals: [],
      insiderOwnership: { insiderBuyCount: null, insiderSellCount: null, netInsiderActivity: null, institutionalOwnershipPercent: null, ownershipDataStatus: 'MISSING', source: 'snapshot', explanation: 'Snapshot-first.' },
      researchUrl: `/research/stocks/${instrumentId}`,
    } as any;
  }

  /**
   * Convert ComposedSnapshotRow signal fields into a minimal SignalResultDto-compatible shape
   * for the candidate source. Only carries the fields used by today-review scoring/display:
   * direction, score. Fields not stored in the snapshot (deliveryPercent, sector, company_name,
   * dailyChangePercent, deliveryEvidence) are left null — the DTO consumers handle null gracefully.
   */
  private snapshotSignalToRawSignal(snapshot: ComposedSnapshotRow, instrumentId: string, symbol?: string | null): import('../signal-generation-engine').SignalResultDto {
    return {
      instrument_id: instrumentId,
      symbol: symbol || instrumentId,
      company_name: null,
      sector: null,
      country: null,
      currentPrice: null,
      previousClose: null,
      dailyChange: null,
      dailyChangePercent: null,
      currency: null,
      priceTimestamp: null,
      score: snapshot.signalScore ?? 0,
      direction: (snapshot.signalDirection as any) ?? null,
      confidence: null,
      triggered_signals: [],
      negative_signals: [],
      explanation: 'From daily_instrument_snapshot (snapshot-first).',
      generated_at: snapshot.assembledAt.toISOString(),
      source: 'snapshot',
      data_status: 'COMPLETE',
      deliveryPercent: null,
      deliveryEvidence: null,
    } as any;
  }

  /**
   * Convert ComposedSnapshotRow calibration fields into a minimal SignalCalibrationResultDto-compatible shape
   * for the candidate source. calibratedDirection is inferred from signalDirection (the snapshot does not store
   * calibrated direction separately — it is the same source signal direction after calibration adjustment).
   * Fields not stored in the snapshot (calibratedConfidence, evidenceStatus) are set to safe defaults.
   */
  private snapshotCalibrationToResult(snapshot: ComposedSnapshotRow, instrumentId: string, symbol?: string | null): import('../signal-calibration-engine').SignalCalibrationResultDto {
    return {
      signalResultId: null,
      instrumentId,
      symbol: symbol || instrumentId,
      companyName: null,
      sector: null,
      country: null,
      rawScore: snapshot.signalScore ?? 0,
      calibratedScore: snapshot.calibratedScore ?? 0,
      scoreDelta: snapshot.calibratedScore !== null && snapshot.signalScore !== null ? snapshot.calibratedScore - snapshot.signalScore : 0,
      rawDirection: (snapshot.signalDirection as any) ?? null,
      calibratedDirection: (snapshot.signalDirection as any) ?? null,
      rawConfidence: null,
      calibratedConfidence: null,
      boosts: [],
      penalties: [],
      calibrationReasons: [],
      dataGaps: [],
      calibrationModelVersion: snapshot.calibrationAuthority ?? null,
      rawSignalModelVersion: snapshot.signalModelVersion ?? null,
      generatedAt: snapshot.assembledAt.toISOString(),
      dataStatus: 'COMPLETE',
      evidenceStatus: null,
      researchUrl: `/research/stocks/${instrumentId}`,
    } as any;
  }

  /**
   * Load the snapshot watermark's assembledAt for the run's trading date.
   * Returns null on any error — never blocks the run.
   */
  private async loadSnapshotAssembledAt(scope: { region: string; assetType: string }, tradingDate: Date): Promise<string | null> {
    if (!this.isSnapshotReadsEnabled()) return null;
    if (typeof this.services.snapshotReaderService?.latestWatermark !== 'function') return null;
    try {
      const watermark = await this.services.snapshotReaderService.latestWatermark(scope.region, scope.assetType, tradingDate);
      return watermark?.assembledAt?.toISOString() ?? null;
    } catch {
      return null;
    }
  }

  private async loadTradePlan(decision: StrategyDecisionDto, scope: { region: string; assetType: string }, warnings: string[], skipGeneration = false) {
    if (!decision.instrumentId || !decision.symbol) return null;
    const latest = await this.safe(
      () => this.services.tradePlanService.latestForInstrument(decision.instrumentId!, decision.strategy, undefined, scope),
      `${decision.symbol} persisted exit/invalidation evidence snapshot is unavailable.`,
      warnings
    );
    if (latest) return latest;
    if (skipGeneration) {
      warnings.push(`${decision.symbol} persisted legacy risk snapshot is unavailable; scheduler publication skipped compatibility snapshot generation.`);
      return null;
    }
    return this.safe(
      () => this.services.tradePlanService.generatePlan({
        instrumentId: decision.instrumentId!,
        symbol: decision.symbol!,
        strategyDecisionId: decision.id,
        region: scope.region,
        assetType: scope.assetType,
      }),
      `${decision.symbol} exit/invalidation evidence snapshot could not be generated.`,
      warnings
    );
  }

  private buildLiteCandidates(
    instruments: TrustedReviewUniverseInstrument[],
    reviewUniverse: TrustedReviewUniverseHealth | null,
    scanEvidence: {
      trustedUniverseCount: number;
      scanLimit: number;
      scanComplete: boolean;
      scanOrdering: string;
      trustedLoadStatus: TodayReviewTrustedLoadStatus;
      membershipLoadFailureReason: string | null;
    },
    strategyFunnel: StrategyFunnelStats,
    earningsProximity: Map<string, TodayReviewEarningsProximity> = new Map(),
    marketContext?: MarketContextSummary | null,
    oiBuildupBySymbol: Map<string, OiBuildupRow> = new Map()
  ): { candidates: TodayReviewCandidateDto[]; scanFunnel: TodayReviewScanFunnel } {
    const scanFunnel: TodayReviewScanFunnel = {
      trustedUniverseCount: scanEvidence.trustedUniverseCount,
      trustedInstrumentsScanned: instruments.length,
      trustedInstrumentsSkipped: Math.max(0, scanEvidence.trustedUniverseCount - instruments.length),
      scanLimit: scanEvidence.scanLimit,
      scanComplete: scanEvidence.scanComplete,
      scanOrdering: scanEvidence.scanOrdering,
      trustedLoadStatus: scanEvidence.trustedLoadStatus,
      membershipLoadFailureReason: scanEvidence.membershipLoadFailureReason,
      strategyCandidatesSeen: strategyFunnel.strategyCandidatesSeen,
      strategyCandidatesEligible: strategyFunnel.strategyCandidatesEligible,
      strategyCandidatesExcluded: strategyFunnel.strategyCandidatesExcluded,
      outsideTrustedUniverse: strategyFunnel.outsideTrustedUniverse,
      setupsDetected: 0,
      promotedCandidates: 0,
      watchOnly: 0,
      unproven: 0,
      blocked: 0,
      noSetup: 0,
      topNoPromotionReasons: {},
    };
    if (!reviewUniverse || reviewUniverse.mode === 'NO_REVIEW') {
      if (reviewUniverse?.mode === 'NO_REVIEW') scanFunnel.topNoPromotionReasons.NO_REVIEW_UNIVERSE = reviewUniverse.trustedCount;
      return { candidates: [], scanFunnel };
    }

    const candidates: TodayReviewCandidateDto[] = [];
    for (const instrument of instruments) {
      const setup = this.detectLiteSetup(instrument.priceHistory);
      if (!setup) {
        scanFunnel.noSetup += 1;
        continue;
      }
      scanFunnel.setupsDetected += 1;
      const evidence = this.liteHistoricalEvidence(instrument.priceHistory, setup);
      const tradePlan = this.liteTradePlan(instrument, setup);
      const blockers = [...tradePlan.blockers];
      const contextGapPenalty = this.contextGapPenalty(instrument.contextGaps);
      let state: TodayReviewCandidateState;
      if (blockers.length > 0) {
        state = 'BLOCKED';
        scanFunnel.blocked += 1;
        this.incrementReason(scanFunnel, 'hard blocker');
      } else if (evidence.label === 'UNPROVEN') {
        state = 'WATCH_ONLY';
        scanFunnel.watchOnly += 1;
        scanFunnel.unproven += 1;
        this.incrementReason(scanFunnel, 'historical evidence unproven');
      } else if (tradePlan.rewardRiskRatio < 1.2) {
        state = 'WATCH_ONLY';
        scanFunnel.watchOnly += 1;
        this.incrementReason(scanFunnel, 'exit/invalidation evidence incomplete');
      } else if (setup.direction === 'SHORT') {
        // F&O-gate (#28a): short candidates are only actionable on F&O/derivatives-eligible names.
        // Cash-only (non-F&O) bearish setups are classified as AVOID (caution/exit-review context),
        // never SHORT_REVIEW, since shorts are not executable in the cash segment in India.
        if (instrument.derivativesEligible === true) {
          state = 'SHORT_REVIEW';
        } else {
          state = 'AVOID';
          this.incrementReason(scanFunnel, 'non-F&O name: short review reclassified as avoid/caution');
        }
        scanFunnel.promotedCandidates += 1;
      } else {
        state = 'LONG_REVIEW';
        scanFunnel.promotedCandidates += 1;
      }
      const earningsCaveat = this.earningsCaveat(instrument.symbol, earningsProximity);
      const earningsProximityForCandidate = this.resolvedEarningsProximity(instrument.symbol, earningsProximity);
      const rawScore = state === 'BLOCKED' || state === 'AVOID' ? 0 : this.liteScore(setup, evidence, tradePlan.rewardRiskRatio, instrument, contextGapPenalty);
      // Down-rank long entries by 10 points when results are imminent; short/blocked paths unaffected.
      const score = (earningsCaveat && state === 'LONG_REVIEW') ? Math.max(0, rawScore - 10) : rawScore;
      // F&O OI corroboration for short candidates (#FNO-4): if the futures OI
      // buildup confirms (SHORT_BUILDUP) or contradicts (SHORT_COVERING) the
      // bearish setup, surface it as descriptive evidence (research-support only).
      const oiEvidence = setup.direction === 'SHORT'
        ? this.oiBuildupEvidence(instrument.symbol, oiBuildupBySymbol)
        : null;
      const watchReasons = [
        ...(state === 'WATCH_ONLY' && evidence.label === 'UNPROVEN' ? ['Historical evidence is UNPROVEN; keep as watch only until more occurrences are available.'] : []),
        ...(tradePlan.rewardRiskRatio < 1.2 ? ['Exit/invalidation evidence is incomplete for research review.'] : []),
        ...(instrument.contextGaps.length > 0 ? [`Context gaps: ${instrument.contextGaps.join(', ')}.`] : []),
        ...(earningsCaveat ? [earningsCaveat] : []),
        ...(oiEvidence ? [oiEvidence] : []),
        ...instrument.warnings.slice(0, 2),
      ];
      // Resolve sector leadership from the run's persisted market context (if available).
      const instrumentSector = instrument.sector ?? null;
      let sectorLeadershipStatus: string | null = null;
      if (instrumentSector && marketContext) {
        const top = marketContext.topSectors.find((item) => item.sector === instrumentSector);
        const weak = marketContext.weakSectors.find((item) => item.sector === instrumentSector);
        sectorLeadershipStatus = top?.leadershipStatus ?? weak?.leadershipStatus ?? null;
      }
      candidates.push({
        instrumentId: instrument.id,
        symbol: instrument.symbol,
        companyName: instrument.companyName,
        direction: state === 'BLOCKED' ? 'BLOCKED' : state === 'AVOID' ? 'AVOID' : state === 'WATCH_ONLY' ? 'WATCH' : setup.direction,
        state,
        setupType: setup.type,
        strategyCode: 'TODAY_REVIEW_LITE',
        strategyVersion: '1.0.0',
        rank: 0,
        grade: this.gradeFor(state, score),
        confidenceScore: state === 'BLOCKED' ? 0 : score,
        reasonSummary: this.liteReasonSummary(state, evidence, blockers, watchReasons),
        blockers,
        watchReasons,
        earningsProximity: earningsProximityForCandidate,
        dataQualitySnapshot: {
          source: 'trusted-review-universe',
          latestPriceDate: instrument.latestPriceDate,
          priceHistoryBars: instrument.priceHistoryBars,
          hasRecentVolume: instrument.hasRecentVolume,
          contextGaps: instrument.contextGaps,
          dataStatus: 'PRICE_ACTION_READY',
          /** sector: from instrument catalog metadata; null when absent (appears in contextGaps). */
          sector: instrumentSector,
        },
        marketContextSnapshot: {
          reviewUniverseMode: reviewUniverse.mode,
          trustedUniverseCount: reviewUniverse.trustedCount,
          dataThroughDate: reviewUniverse.dataThroughDate,
          targetTradingDate: reviewUniverse.targetTradingDate,
          requiredDataThroughDate: reviewUniverse.requiredDataThroughDate,
          storedDataThroughDate: reviewUniverse.storedDataThroughDate,
          contextGapCounts: reviewUniverse.contextGapCounts,
          /** regime: from the run's persisted market context; null when market context was unavailable. */
          regime: marketContext?.regime ?? null,
          /** sectorLeadershipStatus: resolved from market context topSectors/weakSectors for this candidate's sector. */
          sectorLeadershipStatus,
        },
        strategyProofSnapshot: {
          proofType: 'OHLCV_LITE_HISTORICAL_EVIDENCE',
          evidenceLabel: evidence.label,
          sampleSize: evidence.sampleSize,
          medianForwardReturn5D: evidence.medianForwardReturn5D,
          medianForwardReturn20D: evidence.medianForwardReturn20D,
          winRate: evidence.winRate,
          maxAdverseExcursion: evidence.maxAdverseExcursion,
          maxFavorableExcursion: evidence.maxFavorableExcursion,
          setupType: setup.type,
        },
        tradePlanSnapshot: tradePlan,
        sourceSignalSnapshot: {
          supportOnly: true,
          setup: {
            type: setup.type,
            direction: setup.direction,
            signalStrength: setup.signalStrength,
            reason: setup.reason,
          },
          priceBehaviour: this.litePriceBehaviourSnapshot(instrument.priceHistory, instrumentSector),
        },
      });
    }

    return { candidates, scanFunnel };
  }

  /**
   * Load the latest persisted futures OI-buildup keyed by underlying symbol.
   * Persisted-read only; never ingests. Returns an empty map on any error so
   * the review run never fails because derivatives data is missing.
   */
  private async loadOiBuildupBySymbol(): Promise<Map<string, OiBuildupRow>> {
    try {
      const resp = await getLatestOiBuildup({ limit: 500 });
      if (resp.status !== 'ready') return new Map();
      return new Map(resp.rows.map((row) => [row.underlying.toUpperCase(), row]));
    } catch {
      return new Map();
    }
  }

  /**
   * Build a one-line OI-buildup corroboration note for a short candidate.
   * SHORT_BUILDUP confirms the bearish thesis; SHORT_COVERING contradicts it.
   * Descriptive only — never an instruction to trade.
   */
  private oiBuildupEvidence(symbol: string, oiBuildupBySymbol: Map<string, OiBuildupRow>): string | null {
    const row = oiBuildupBySymbol.get((symbol || '').toUpperCase());
    if (!row) return null;
    const oiPct = row.oiChangePct === null ? null : `${row.oiChangePct >= 0 ? '+' : ''}${row.oiChangePct.toFixed(1)}%`;
    switch (row.buildupLabel) {
      case 'SHORT_BUILDUP':
        return `Derivatives corroboration: futures show SHORT BUILDUP (price down with rising open interest${oiPct ? `, OI ${oiPct}` : ''}) — consistent with the bearish setup.`;
      case 'SHORT_COVERING':
        return `Derivatives caution: futures show SHORT COVERING (price up with falling open interest${oiPct ? `, OI ${oiPct}` : ''}) — contradicts the bearish setup.`;
      case 'LONG_BUILDUP':
        return `Derivatives caution: futures show LONG BUILDUP (price up with rising open interest${oiPct ? `, OI ${oiPct}` : ''}) — contradicts the bearish setup.`;
      case 'LONG_UNWINDING':
        return `Derivatives context: futures show LONG UNWINDING (price down with falling open interest${oiPct ? `, OI ${oiPct}` : ''}).`;
      default:
        return null;
    }
  }

  private detectLiteSetup(history: TrustedReviewUniverseInstrument['priceHistory']) {
    if (history.length < 60) return null;
    const latestIndex = history.length - 1;
    const latest = history[latestIndex];
    const prior20 = history.slice(Math.max(0, latestIndex - 20), latestIndex);
    const prior50 = history.slice(Math.max(0, latestIndex - 50), latestIndex);
    if (prior20.length < 20 || prior50.length < 50) return null;
    const high20 = Math.max(...prior20.map((row) => row.high));
    const low20 = Math.min(...prior20.map((row) => row.low));
    const avgVol20 = this.average(prior20.map((row) => row.volume || 0));
    const sma20 = this.average(prior20.map((row) => row.close));
    const sma50 = this.average(prior50.map((row) => row.close));
    const ret20 = (latest.close - history[latestIndex - 20].close) / Math.max(history[latestIndex - 20].close, 0.01);
    const avgRange20 = this.average(prior20.map((row) => row.high - row.low));
    const latestRange = latest.high - latest.low;
    const volumeConfirmed = (latest.volume || 0) > avgVol20 * 1.05;

    if (latest.close > high20 && volumeConfirmed) return { type: 'BREAKOUT_20D', direction: 'LONG' as const, signalStrength: 30, reason: 'Close is above the prior 20-day high with volume confirmation.' };
    if (latest.close < low20 && volumeConfirmed) return { type: 'BREAKDOWN_20D', direction: 'SHORT' as const, signalStrength: 30, reason: 'Close is below the prior 20-day low with volume confirmation.' };
    if (ret20 > 0.05 && latest.close >= high20 * 0.96 && (latest.volume || 0) >= avgVol20) return { type: 'MOMENTUM_CONTINUATION', direction: 'LONG' as const, signalStrength: 25, reason: 'Positive 20-day return near recent highs with volume support.' };
    if (latest.close > sma50 && Math.abs(latest.close - sma20) / Math.max(latest.close, 0.01) <= 0.035 && latest.low > Math.min(...history.slice(latestIndex - 10, latestIndex - 5).map((row) => row.low))) return { type: 'PULLBACK_TO_TREND', direction: 'LONG' as const, signalStrength: 22, reason: 'Pullback is near the 20-day average while price remains above the 50-day average.' };
    if (latest.close < sma50 && ret20 < -0.03) return { type: 'TREND_LOSS', direction: 'SHORT' as const, signalStrength: 22, reason: 'Close is below the 50-day average with weak 20-day return.' };
    if (latest.close < latest.open && latestRange > avgRange20 * 1.5 && volumeConfirmed) return { type: 'VOLATILITY_EXPANSION_DOWN', direction: 'SHORT' as const, signalStrength: 20, reason: 'Downside range expansion happened on elevated volume.' };
    return null;
  }

  private liteHistoricalEvidence(history: TrustedReviewUniverseInstrument['priceHistory'], setup: { type: string; direction: 'LONG' | 'SHORT' }) {
    const outcomes: Array<{ five: number; twenty: number; mae: number; mfe: number }> = [];
    for (let index = 60; index < history.length - 20; index += 1) {
      if (!this.setupMatchesAt(history, index, setup.type)) continue;
      const entry = history[index].close;
      const next5 = history[index + 5].close;
      const forward = history.slice(index + 1, index + 21);
      const raw5 = (next5 - entry) / Math.max(entry, 0.01);
      const raw20 = (history[index + 20].close - entry) / Math.max(entry, 0.01);
      const favorable = setup.direction === 'SHORT'
        ? (entry - Math.min(...forward.map((row) => row.low))) / Math.max(entry, 0.01)
        : (Math.max(...forward.map((row) => row.high)) - entry) / Math.max(entry, 0.01);
      const adverse = setup.direction === 'SHORT'
        ? (Math.max(...forward.map((row) => row.high)) - entry) / Math.max(entry, 0.01)
        : (entry - Math.min(...forward.map((row) => row.low))) / Math.max(entry, 0.01);
      outcomes.push({
        five: setup.direction === 'SHORT' ? -raw5 : raw5,
        twenty: setup.direction === 'SHORT' ? -raw20 : raw20,
        mae: adverse,
        mfe: favorable,
      });
    }
    const sampleSize = outcomes.length;
    const median5 = this.median(outcomes.map((item) => item.five));
    const median20 = this.median(outcomes.map((item) => item.twenty));
    const winRate = sampleSize > 0 ? outcomes.filter((item) => item.twenty > 0).length / sampleSize : 0;
    const label = sampleSize >= 30 && median20 > 0 && winRate >= 0.52 ? 'PROVEN' : sampleSize >= 10 ? 'WEAK' : 'UNPROVEN';
    return {
      label,
      sampleSize,
      medianForwardReturn5D: Number((median5 * 100).toFixed(2)),
      medianForwardReturn20D: Number((median20 * 100).toFixed(2)),
      winRate: Number((winRate * 100).toFixed(1)),
      maxAdverseExcursion: Number((this.median(outcomes.map((item) => item.mae)) * 100).toFixed(2)),
      maxFavorableExcursion: Number((this.median(outcomes.map((item) => item.mfe)) * 100).toFixed(2)),
    };
  }

  private setupMatchesAt(history: TrustedReviewUniverseInstrument['priceHistory'], index: number, setupType: string) {
    const latest = history[index];
    const prior20 = history.slice(index - 20, index);
    const prior50 = history.slice(index - 50, index);
    if (!latest || prior20.length < 20 || prior50.length < 50) return false;
    const high20 = Math.max(...prior20.map((row) => row.high));
    const low20 = Math.min(...prior20.map((row) => row.low));
    const avgVol20 = this.average(prior20.map((row) => row.volume || 0));
    const sma20 = this.average(prior20.map((row) => row.close));
    const sma50 = this.average(prior50.map((row) => row.close));
    const ret20 = (latest.close - history[index - 20].close) / Math.max(history[index - 20].close, 0.01);
    const avgRange20 = this.average(prior20.map((row) => row.high - row.low));
    const volumeConfirmed = (latest.volume || 0) > avgVol20 * 1.05;
    if (setupType === 'BREAKOUT_20D') return latest.close > high20 && volumeConfirmed;
    if (setupType === 'BREAKDOWN_20D') return latest.close < low20 && volumeConfirmed;
    if (setupType === 'MOMENTUM_CONTINUATION') return ret20 > 0.05 && latest.close >= high20 * 0.96 && (latest.volume || 0) >= avgVol20;
    if (setupType === 'PULLBACK_TO_TREND') return latest.close > sma50 && Math.abs(latest.close - sma20) / Math.max(latest.close, 0.01) <= 0.035;
    if (setupType === 'TREND_LOSS') return latest.close < sma50 && ret20 < -0.03;
    if (setupType === 'VOLATILITY_EXPANSION_DOWN') return latest.close < latest.open && (latest.high - latest.low) > avgRange20 * 1.5 && volumeConfirmed;
    return false;
  }

  private liteTradePlan(instrument: TrustedReviewUniverseInstrument, setup: { type: string; direction: 'LONG' | 'SHORT'; reason: string }) {
    const history = instrument.priceHistory;
    const latest = history[history.length - 1];
    const recent = history.slice(Math.max(0, history.length - 14));
    const avgRange = Math.max(this.average(recent.map((row) => row.high - row.low)), latest.close * 0.015);
    const blockers: string[] = [];
    if (setup.direction === 'LONG') {
      const entryFloor = Number((latest.close * 0.995).toFixed(2));
      const entryCeiling = Number((Math.max(latest.close * 1.01, latest.high)).toFixed(2));
      const recentLow = Math.min(...recent.map((row) => row.low));
      const stop = Number((Math.min(recentLow, entryFloor - avgRange)).toFixed(2));
      if (stop >= entryFloor) blockers.push('Invalid long review geometry: stop/invalidation is not below the entry floor.');
      const risk = Math.max(entryFloor - stop, latest.close * 0.01);
      const target1 = Number((entryCeiling + risk * 2).toFixed(2));
      const target2 = Number((entryCeiling + risk * 3).toFixed(2));
      return this.liteTradePlanDto(instrument, setup, entryFloor, entryCeiling, stop, target1, target2, blockers);
    }
    const entryCeiling = Number((latest.close * 1.005).toFixed(2));
    const entryFloor = Number((Math.min(latest.close * 0.99, latest.low)).toFixed(2));
    const recentHigh = Math.max(...recent.map((row) => row.high));
    const stop = Number((Math.max(recentHigh, entryCeiling + avgRange)).toFixed(2));
    if (stop <= entryCeiling) blockers.push('Invalid short review geometry: stop/invalidation is not above the entry ceiling.');
    const risk = Math.max(stop - entryCeiling, latest.close * 0.01);
    const target1 = Number(Math.max(entryFloor - risk * 2, 0.01).toFixed(2));
    const target2 = Number(Math.max(entryFloor - risk * 3, 0.01).toFixed(2));
    return this.liteTradePlanDto(instrument, setup, entryFloor, entryCeiling, stop, target1, target2, blockers);
  }

  private liteTradePlanDto(
    instrument: TrustedReviewUniverseInstrument,
    setup: { type: string; direction: 'LONG' | 'SHORT'; reason: string },
    entryFloor: number,
    entryCeiling: number,
    stop: number,
    target1: number,
    target2: number,
    blockers: string[]
  ) {
    const reward = setup.direction === 'SHORT' ? entryFloor - target1 : target1 - entryCeiling;
    const risk = setup.direction === 'SHORT' ? stop - entryCeiling : entryFloor - stop;
    const rewardRiskRatio = Number((Math.max(reward, 0) / Math.max(risk, 0.01)).toFixed(2));
    return {
      id: null,
      instrumentId: instrument.id,
      symbol: instrument.symbol,
      strategy: 'TODAY_REVIEW_LITE',
      strategyVersion: '1.0.0',
      planStatus: blockers.length > 0 ? 'BLOCKED' : 'VALID',
      riskGrade: blockers.length > 0 ? 'HIGH' : rewardRiskRatio >= 1.8 ? 'LOW' : 'MEDIUM',
      entryTrigger: setup.reason,
      entryZone: {
        type: setup.type,
        referencePrice: entryFloor,
        preferredEntryMin: entryFloor,
        preferredEntryMax: entryCeiling,
        quality: 'LITE',
        rationale: setup.reason,
      },
      stopLoss: {
        price: stop,
        method: setup.direction === 'SHORT' ? 'ABOVE_ENTRY_CEILING' : 'BELOW_ENTRY_FLOOR',
        quality: blockers.length > 0 ? 'BLOCKED' : 'ACCEPTABLE',
        rationale: setup.direction === 'SHORT' ? 'Invalidation sits above the short review entry ceiling.' : 'Invalidation sits below the long review entry floor.',
      },
      target: {
        price: target1,
        target2,
        method: 'LITE_REWARD_RISK_MULTIPLE',
        quality: rewardRiskRatio >= 1.8 ? 'ACCEPTABLE' : 'WATCH_ONLY',
        rationale: 'Compatibility range is derived from entry and invalidation distance for legacy consumers only.',
      },
      rewardRiskRatio,
      invalidationRules: [
        setup.direction === 'SHORT'
          ? `Do nothing unless price remains below the entry zone; invalidation is a daily close above INR ${stop.toFixed(2)}.`
          : `Do nothing unless price remains above the entry trigger; invalidation is a daily close below INR ${stop.toFixed(2)}.`,
      ],
      timeHorizon: '5-20 trading days',
      doNothingUnless: setup.reason,
      warnings: instrument.warnings,
      blockers,
      dataGaps: instrument.contextGaps,
      paperReadinessStatus: blockers.length > 0 ? 'BLOCKED' : 'READY_FOR_PAPER_REVIEW',
      paperReadinessReasons: blockers.length > 0 ? [] : ['Lite entry and invalidation evidence is valid for research support.'],
      paperReadinessBlockers: blockers,
      marketDataSnapshot: {
        latestStoredTradingDate: instrument.latestPriceDate,
        latestPriceTimestamp: instrument.latestPriceDate,
        currency: 'INR',
        priceHistoryBars: instrument.priceHistoryBars,
      },
      generatedAt: this.clock().toISOString(),
      modelVersion: 'today-review-lite-v1',
    };
  }

  private liteScore(
    setup: { signalStrength: number },
    evidence: { label: string },
    rewardRiskRatio: number,
    instrument: TrustedReviewUniverseInstrument,
    contextGapPenalty: number
  ) {
    const signal = setup.signalStrength;
    const historical = evidence.label === 'PROVEN' ? 25 : evidence.label === 'WEAK' ? 16 : 4;
    const rewardRisk = Math.min(20, Math.max(0, rewardRiskRatio / 2 * 20));
    const liquidity = instrument.latestVolume && instrument.latestVolume > 0 ? 15 : 0;
    const freshness = 10;
    const rrPenalty = rewardRiskRatio < 1.2 ? 10 : 0;
    return Math.max(0, Math.min(100, Math.round(signal + historical + rewardRisk + liquidity + freshness - contextGapPenalty - rrPenalty)));
  }

  private contextGapPenalty(gaps: string[]) {
    return gaps.reduce((total, gap) => total + (gap === 'marketCap' ? 3 : gap === 'sector' || gap === 'industry' ? 2 : 0), 0);
  }

  /**
   * Returns a human-readable earnings-proximity caveat string when persisted
   * earnings data shows results are within EARNINGS_BLACKOUT_TRADING_DAYS.
   * Returns null when no proximity data exists for the symbol or daysToResult
   * is outside the window.  Never generates data — reads persisted only.
   */
  private earningsCaveat(symbol: string, earningsProximity: Map<string, TodayReviewEarningsProximity>): string | null {
    const key = symbol.toUpperCase();
    const proximity = earningsProximity.get(key);
    if (!proximity || proximity.daysToResult === null) return null;
    if (proximity.daysToResult > EARNINGS_BLACKOUT_TRADING_DAYS) return null;
    const days = proximity.daysToResult;
    const label = proximity.resultDateLabel ?? (proximity.resultDateSource === 'OFFICIAL_CALENDAR' ? 'Official' : 'Estimated');
    const dateStr = proximity.resultDate ? ` (${proximity.resultDate.slice(0, 10)})` : '';
    if (days === 0) return `Earnings result today${dateStr} [${label}] — long entry is high risk; consider waiting for post-result price discovery.`;
    if (days === 1) return `Earnings result in 1 trading day${dateStr} [${label}] — long entry caution: results are imminent.`;
    return `Earnings result in ${days} trading days${dateStr} [${label}] — long entry caution: consider waiting until after results.`;
  }

  /**
   * Returns the persisted TodayReviewEarningsProximity for a symbol when
   * daysToResult is within the blackout window (≤ EARNINGS_BLACKOUT_TRADING_DAYS).
   * Returns null when no proximity data exists or results are outside the window.
   */
  private resolvedEarningsProximity(symbol: string, earningsProximity: Map<string, TodayReviewEarningsProximity>): TodayReviewEarningsProximity | null {
    const key = symbol.toUpperCase();
    const proximity = earningsProximity.get(key);
    if (!proximity || proximity.daysToResult === null) return null;
    if (proximity.daysToResult > EARNINGS_BLACKOUT_TRADING_DAYS) return null;
    return proximity;
  }

  private liteReasonSummary(state: TodayReviewCandidateState, evidence: { label: string; sampleSize: number }, blockers: string[], watchReasons: string[]) {
    if (state === 'BLOCKED') return `Blocked: ${blockers[0] || 'hard blocker exists.'}`;
    if (state === 'WATCH_ONLY') return `Watch only: ${watchReasons[0] || 'lite evidence is not strong enough for research review.'}`;
    if (state === 'SHORT_REVIEW') return `Short review candidate from price-action setup and ${evidence.label.toLowerCase()} price-history evidence across ${evidence.sampleSize} prior occurrences.`;
    if (state === 'AVOID') return 'Caution/avoid context: bearish setup detected but instrument is not F&O-eligible; short is not executable in the cash segment. Review for risk context only.';
    return `Long review candidate from price-action setup and ${evidence.label.toLowerCase()} price-history evidence across ${evidence.sampleSize} prior occurrences.`;
  }

  private mergeCandidates(candidates: TodayReviewCandidateDto[]) {
    const priority: Record<TodayReviewCandidateState, number> = {
      LONG_REVIEW: 0,
      SHORT_REVIEW: 1,
      EXIT_RISK_REVIEW: 2,
      WATCH_ONLY: 3,
      UNPROVEN: 4,
      INSUFFICIENT_DATA: 5,
      BLOCKED: 6,
      AVOID: 7,
    };
    const byKey = new Map<string, TodayReviewCandidateDto>();
    for (const candidate of candidates) {
      const key = `${candidate.symbol}:${candidate.direction}:${candidate.setupType || candidate.strategyCode}`;
      const current = byKey.get(key);
      if (!current || priority[candidate.state] < priority[current.state] || candidate.confidenceScore > current.confidenceScore) {
        byKey.set(key, candidate);
      }
    }
    return [...byKey.values()];
  }

  private incrementReason(scanFunnel: TodayReviewScanFunnel, reason: string) {
    scanFunnel.topNoPromotionReasons[reason] = (scanFunnel.topNoPromotionReasons[reason] || 0) + 1;
  }

  private addWarning(warnings: string[], warning: string) {
    if (!warnings.includes(warning)) warnings.push(warning);
  }

  private normalizedMembershipKey(value?: string | null) {
    return value ? value.trim().toUpperCase() : '';
  }

  private configuredTrustedScanLimit() {
    const configured = Number(process.env.TODAY_REVIEW_TRUSTED_SCAN_LIMIT);
    if (Number.isFinite(configured) && configured > 0) return Math.max(1, Math.floor(configured));
    return null;
  }

  private average(values: number[]) {
    const usable = values.filter((value) => Number.isFinite(value));
    return usable.length > 0 ? usable.reduce((sum, value) => sum + value, 0) / usable.length : 0;
  }

  private median(values: number[]) {
    const usable = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
    if (usable.length === 0) return 0;
    const mid = Math.floor(usable.length / 2);
    return usable.length % 2 ? usable[mid] : (usable[mid - 1] + usable[mid]) / 2;
  }

  private mapCandidate(source: TodayReviewCandidateSource, earningsProximity: Map<string, TodayReviewEarningsProximity> = new Map()): TodayReviewCandidateDto {
    const blockers = this.blockersFor(source);
    const earningsCaveat = this.earningsCaveat(source.decision.symbol || '', earningsProximity);
    const earningsProximityForCandidate = this.resolvedEarningsProximity(source.decision.symbol || '', earningsProximity);
    const baseWatchReasons = this.watchReasonsFor(source);
    const watchReasons = earningsCaveat ? [earningsCaveat, ...baseWatchReasons] : baseWatchReasons;
    const hardBlocked = blockers.length > 0;
    const hasProof = this.hasUsableProof(source);
    const dataQualityMissing = !source.dataQuality;
    const tradePlan = source.tradePlan;
    const rawScore = hardBlocked ? 0 : this.scoreCandidate(source);
    const state = this.stateFor(source, hardBlocked, hasProof, dataQualityMissing);
    // Down-rank long entries by 10 points when results are imminent; exits/blocks unaffected.
    const score = (earningsCaveat && state === 'LONG_REVIEW') ? Math.max(0, rawScore - 10) : rawScore;
    const grade = this.gradeFor(state, score);
    const confidenceScore = state === 'BLOCKED' || state === 'AVOID' ? 0 : score;
    const direction = this.directionFor(state, source);

    return {
      instrumentId: source.decision.instrumentId || 'UNKNOWN',
      symbol: source.decision.symbol || 'UNKNOWN',
      companyName: source.rawSignal?.company_name || source.dataQuality?.companyName || source.smartMoney?.companyName || null,
      direction,
      state,
      setupType: source.decision.entryZone?.type || source.decision.action || source.decision.decision,
      strategyCode: source.decision.strategy,
      strategyVersion: source.decision.strategyVersion || source.tradePlan?.strategyVersion || null,
      rank: 0,
      grade,
      confidenceScore,
      reasonSummary: this.reasonSummaryFor(state, blockers, watchReasons),
      blockers,
      watchReasons: state === 'LONG_REVIEW' || state === 'EXIT_RISK_REVIEW' ? watchReasons.slice(0, 3) : watchReasons,
      dataQualitySnapshot: source.dataQuality,
      marketContextSnapshot: this.marketContextSnapshotFor(source),
      strategyProofSnapshot: this.strategyProofSnapshotFor(source),
      tradePlanSnapshot: tradePlan,
      sourceSignalSnapshot: this.sourceSignalSnapshotFor(source),
      earningsProximity: earningsProximityForCandidate,
    };
  }

  private stateFor(source: TodayReviewCandidateSource, hardBlocked: boolean, hasProof: boolean, dataQualityMissing: boolean): TodayReviewCandidateState {
    if (hardBlocked) return 'BLOCKED';
    // Phase-1 gate: no eligibility row means we cannot certify the instrument — INSUFFICIENT_DATA.
    // Legacy fallback: when eligibility row is unavailable but dataQuality is also missing, also INSUFFICIENT_DATA.
    const noEligibilityRow = source.eligibilityRow === null;
    if (noEligibilityRow || dataQualityMissing || source.decision.decision === 'INSUFFICIENT_DATA' || source.tradePlan?.planStatus === 'INSUFFICIENT_DATA') return 'INSUFFICIENT_DATA';
    if (!hasProof) return 'UNPROVEN';
    if (source.sourceKind === 'EXIT') return 'EXIT_RISK_REVIEW';
    if (source.decision.decision === 'WATCH' || source.tradePlan?.planStatus === 'WATCH' || source.tradePlan?.paperReadinessStatus === 'WATCH_ONLY') return 'WATCH_ONLY';
    if (source.decision.decision === 'AVOID') return 'AVOID';
    if (source.decision.confidence === 'LOW') return 'WATCH_ONLY';
    return 'LONG_REVIEW';
  }

  private blockersFor(source: TodayReviewCandidateSource): string[] {
    const blockers = new Set<string>();
    const add = (message?: string | null) => {
      if (message) blockers.add(message);
    };
    for (const blocker of source.decision.blockers || []) add(blocker);
    if (source.sourceKind === 'ENTRY') {
      const marketGate = String(source.marketGate?.marketGate || source.decision.marketGate || 'UNKNOWN');
      if (marketGate === 'CLOSED') add('Market gate is CLOSED for new long review candidates.');
      if (!source.tradePlan) add('Exit/invalidation evidence snapshot is missing for long review candidate.');
      if (source.tradePlan?.planStatus === 'BLOCKED') add('Exit/invalidation evidence snapshot has hard blockers.');
      for (const blocker of source.tradePlan?.blockers || []) add(this.safeReviewLanguage(blocker));
      for (const blocker of source.tradePlan?.paperReadinessBlockers || []) {
        const text = blocker.toLowerCase();
        if (text.includes('market gate is closed') || text.includes('trade plan has active blockers') || text.includes('stop loss')) add(this.safeReviewLanguage(blocker));
      }
      if (source.tradePlan?.paperReadinessStatus === 'BLOCKED') add('Exit/invalidation evidence is BLOCKED by the risk snapshot.');
    }
    // Phase-1 gate: source blockers from reviewEligible verdict + reason codes.
    // Reason codes ARE the new blocker strings — map to human-readable form so DTO shapes are unchanged.
    // Fall back to legacy dataQuality fields when no eligibility row is available (keeps backward compat).
    if (source.eligibilityRow) {
      if (!source.eligibilityRow.verdicts.reviewEligible) {
        for (const code of source.eligibilityRow.verdicts.reviewReasons) {
          if (code === 'INSUFFICIENT_BARS') add('Instrument has insufficient price history bars.');
          else if (code === 'STALE_PRICE') add('Latest price is stale.');
          else if (code === 'NO_RECENT_VOLUME') add('No recent volume — liquidity check failed.');
          else if (code === 'ILLIQUID') add('Liquidity status is ILLIQUID.');
          else if (code === 'COVERAGE_UNUSABLE') add('Data quality coverage is UNUSABLE.');
          else if (code === 'LOW_VOLUME_COVERAGE') add('Volume coverage is too low.');
          else add(code);
        }
      }
    } else {
      // Legacy fallback when no eligibility row exists
      if (source.dataQuality?.coverageStatus === 'UNUSABLE') add('Data quality coverage is UNUSABLE.');
      if (source.dataQuality?.liquidityStatus === 'ILLIQUID') add('Liquidity status is ILLIQUID.');
    }
    if (source.decision.decision === 'AVOID') add('Strategy Decision classified the setup as avoid.');
    return [...blockers];
  }

  private watchReasonsFor(source: TodayReviewCandidateSource): string[] {
    const reasons = new Set<string>();
    const add = (message?: string | null) => {
      if (message) reasons.add(message);
    };
    if (!source.dataQuality) add('Data quality snapshot is missing.');
    // Phase-1 watch-reason gate: prefer eligibility row signal reasons over legacy fields.
    if (source.eligibilityRow) {
      if (!source.eligibilityRow.verdicts.signalEligible) {
        for (const code of source.eligibilityRow.verdicts.signalReasons) {
          if (code === 'SCORE_BELOW_THRESHOLD') add('Signal readiness is LIMITED.');
          else if (code === 'STALE_PRICE') add('Latest price is stale.');
          else if (code === 'MISSING_FUNDAMENTALS') add('Fundamentals are missing.');
          else if (code === 'ILLIQUID') add('Liquidity is THIN.');
          else if (code === 'LOW_VOLUME_COVERAGE') add('Volume coverage is too low.');
        }
      }
      // Surface readiness tiers as watch reasons
      if (source.eligibilityRow.readinessStatus === 'LIMITED') add('Signal readiness is LIMITED.');
    } else {
      // Legacy fallback
      if (source.dataQuality?.signalReadinessStatus === 'LIMITED') add('Signal readiness is LIMITED.');
      if (source.dataQuality?.coverageStatus === 'PARTIAL') add('Data coverage is PARTIAL.');
      if (source.dataQuality?.liquidityStatus === 'THIN') add('Liquidity is THIN.');
    }
    if (!this.hasUsableProof(source)) add('Strategy Framework proof is missing or weak.');
    if (!source.marketContext) add('Market context snapshot is missing.');
    if (source.decision.confidence === 'LOW') add('Strategy Decision confidence is LOW.');
    if (source.tradePlan?.rewardRiskRatio !== undefined && source.tradePlan.rewardRiskRatio < 1.5) add('Exit/invalidation evidence is incomplete for research review.');
    // F&O-gate (#28a): surface caution note on exit/bearish decisions for non-F&O names in the strategy path
    if (source.sourceKind === 'EXIT' && source.derivativesEligible !== true) add('Exit/bearish setup detected but instrument is not F&O-eligible; short is not executable in the cash segment. Treat as exit-risk context only, not short review.');
    for (const warning of source.decision.warnings || []) add(warning);
    for (const warning of source.tradePlan?.warnings || []) add(warning);
    return [...reasons];
  }

  private hasUsableProof(source: TodayReviewCandidateSource): boolean {
    const rating = String(source.decision.strategyRating?.ratingGrade || source.tradePlan?.strategyRating || 'UNPROVEN').toUpperCase();
    const readiness = String(source.decision.readinessLabel || source.tradePlan?.readinessLabel || '').toUpperCase();
    return Boolean(source.decision.frameworkBacked)
      && !['WEAK', 'POOR', 'UNPROVEN'].includes(rating)
      && readiness !== 'NOT_AUTOMATION_READY';
  }

  private scoreCandidate(source: TodayReviewCandidateSource): number {
    const proof = this.proofScore(source);
    const tradePlan = source.sourceKind === 'EXIT' ? 12 : this.tradePlanScore(source.tradePlan);
    const market = this.marketScore(source);
    const sector = this.sectorScore(source);
    const signal = this.signalScore(source);
    const dataQuality = this.dataQualityScore(source);
    const smartMoney = this.smartMoneyScore(source);
    return Math.max(0, Math.min(100, Math.round(proof + tradePlan + market + sector + signal + dataQuality + smartMoney)));
  }

  private proofScore(source: TodayReviewCandidateSource): number {
    if (!source.decision.frameworkBacked) return 0;
    const rating = String(source.decision.strategyRating?.ratingGrade || source.tradePlan?.strategyRating || '').toUpperCase();
    if (['EXCELLENT', 'A'].includes(rating)) return 25;
    if (['GOOD', 'B'].includes(rating)) return 22;
    if (['FAIR', 'AVERAGE', 'C'].includes(rating)) return 15;
    return 8;
  }

  private tradePlanScore(plan: TradePlanResultDto | null): number {
    if (!plan) return 0;
    if (plan.planStatus === 'BLOCKED' || plan.paperReadinessStatus === 'BLOCKED') return 0;
    const geometry = plan.planStatus === 'VALID' ? 10 : plan.planStatus === 'WATCH' ? 6 : 0;
    const rr = Math.min(10, Math.max(0, (plan.rewardRiskRatio || 0) / 2.5 * 10));
    return geometry + rr;
  }

  private marketScore(source: TodayReviewCandidateSource): number {
    const gate = String(source.marketGate?.marketGate || source.decision.marketGate || 'UNKNOWN');
    if (source.sourceKind === 'EXIT') return gate === 'CLOSED' ? 15 : gate === 'SELECTIVE' ? 10 : 7;
    if (gate === 'OPEN') return 15;
    if (gate === 'SELECTIVE') return 10;
    if (gate === 'CLOSED') return 0;
    return 5;
  }

  private sectorScore(source: TodayReviewCandidateSource): number {
    const sector = source.dataQuality?.sector || source.rawSignal?.sector || source.smartMoney?.sector;
    if (!sector || !source.marketContext) return 5;
    const top = source.marketContext.topSectors.find((item) => item.sector === sector);
    if (top && ['LEADING', 'IMPROVING'].includes(top.leadershipStatus)) return 10;
    const weak = source.marketContext.weakSectors.find((item) => item.sector === sector);
    if (weak && ['WEAKENING', 'LAGGING'].includes(weak.leadershipStatus)) return source.sourceKind === 'EXIT' ? 8 : 1;
    return 5;
  }

  private signalScore(source: TodayReviewCandidateSource): number {
    let score = 0;
    if (source.sourceKind === 'ENTRY' && source.rawSignal?.direction === 'BULLISH') score += 5;
    if (source.sourceKind === 'EXIT' && source.rawSignal?.direction === 'BEARISH') score += 5;
    if (source.sourceKind === 'ENTRY' && source.calibration?.calibratedDirection === 'BULLISH') score += 5;
    if (source.sourceKind === 'EXIT' && source.calibration?.calibratedDirection === 'BEARISH') score += 5;
    return score;
  }

  private dataQualityScore(source: TodayReviewCandidateSource): number {
    const dataQuality = source.dataQuality;
    if (!dataQuality) return 0;
    let score = 0;
    if (dataQuality.coverageStatus === 'GOOD') score += 6;
    else if (dataQuality.coverageStatus === 'PARTIAL') score += 3;
    if (dataQuality.signalReadinessStatus === 'READY') score += 5;
    else if (dataQuality.signalReadinessStatus === 'LIMITED') score += 2;
    if (dataQuality.liquidityStatus === 'LIQUID') score += 4;
    else if (dataQuality.liquidityStatus === 'THIN') score += 2;
    return score;
  }

  private smartMoneyScore(source: TodayReviewCandidateSource): number {
    if (source.sourceKind === 'ENTRY' && source.smartMoney?.status === 'ACCUMULATION') return 5;
    if (source.sourceKind === 'EXIT' && source.smartMoney?.status === 'DISTRIBUTION') return 5;
    if (source.smartMoney?.status === 'NEUTRAL') return 2;
    return 0;
  }

  private gradeFor(state: TodayReviewCandidateState, score: number): TodayReviewGrade {
    if (state === 'BLOCKED' || state === 'AVOID') return 'D';
    if (state === 'INSUFFICIENT_DATA' || state === 'UNPROVEN') return 'UNPROVEN';
    if (state === 'WATCH_ONLY') return 'C';
    if (score >= 80) return 'A';
    if (score >= 60) return 'B';
    return 'C';
  }

  private directionFor(state: TodayReviewCandidateState, source: TodayReviewCandidateSource): TodayReviewDirection {
    if (state === 'BLOCKED') return 'BLOCKED';
    if (state === 'AVOID') return 'AVOID';
    if (state === 'EXIT_RISK_REVIEW') return 'EXIT_RISK';
    if (state === 'SHORT_REVIEW') return 'SHORT';
    if (state === 'WATCH_ONLY' || state === 'UNPROVEN' || state === 'INSUFFICIENT_DATA') return 'WATCH';
    return source.sourceKind === 'EXIT' ? 'EXIT_RISK' : 'LONG';
  }

  private reasonSummaryFor(state: TodayReviewCandidateState, blockers: string[], watchReasons: string[]): string {
    if (state === 'BLOCKED') return `Blocked: ${blockers[0] || 'hard blocker exists.'}`;
    if (state === 'INSUFFICIENT_DATA') return `Insufficient data: ${watchReasons[0] || 'required snapshot is missing.'}`;
    if (state === 'UNPROVEN') return 'Unproven: Strategy Framework proof is missing or weak.';
    if (state === 'EXIT_RISK_REVIEW') return 'Exit-risk review candidate from Strategy Decision evidence and supporting diagnostics.';
    if (state === 'WATCH_ONLY') return `Watch only: ${watchReasons[0] || 'evidence is not strong enough for research review.'}`;
    return 'Long review candidate with Strategy Framework proof, acceptable data quality, market alignment, entry trigger context, and exit/invalidation evidence.';
  }

  private marketContextSnapshotFor(source: TodayReviewCandidateSource) {
    if (!source.marketContext) return null;
    // Resolve sector leadership for the candidate's sector so the FE price-behaviour card can reference it.
    const sector = source.rawSignal?.sector ?? source.dataQuality?.sector ?? null;
    let sectorLeadershipStatus: string | null = null;
    if (sector) {
      const top = source.marketContext.topSectors.find((item) => item.sector === sector);
      const weak = source.marketContext.weakSectors.find((item) => item.sector === sector);
      sectorLeadershipStatus = top?.leadershipStatus ?? weak?.leadershipStatus ?? null;
    }
    return {
      regime: source.marketContext.regime,
      breadth: source.marketContext.breadth,
      dataStatus: source.marketContext.dataStatus,
      updatedAt: source.marketContext.updatedAt,
      /** Sector leadership status for this candidate's sector, derived at run time. Null when sector is unavailable. */
      sectorLeadershipStatus,
    };
  }

  private strategyProofSnapshotFor(source: TodayReviewCandidateSource) {
    return {
      strategyDecisionId: source.decision.id || null,
      strategyCode: source.decision.strategy,
      strategyVersion: source.decision.strategyVersion || null,
      frameworkBacked: Boolean(source.decision.frameworkBacked),
      strategyRating: source.decision.strategyRating || source.tradePlan?.strategyProofSnapshot || null,
      readinessLabel: source.decision.readinessLabel || source.tradePlan?.readinessLabel || null,
      decision: source.decision.decision,
      action: source.decision.action,
      confidence: source.decision.confidence,
      decisionScore: source.decision.decisionScore,
      reasons: source.decision.reasons || [],
      blockers: source.decision.blockers || [],
      dataGaps: source.decision.dataGaps || [],
      generatedAt: source.decision.generatedAt,
    };
  }

  private sourceSignalSnapshotFor(source: TodayReviewCandidateSource) {
    return {
      rawSignal: source.rawSignal ? {
        direction: source.rawSignal.direction,
        score: source.rawSignal.score,
        confidence: source.rawSignal.confidence,
        generatedAt: source.rawSignal.generated_at,
        supportOnly: true,
      } : null,
      calibration: source.calibration ? {
        calibratedDirection: source.calibration.calibratedDirection,
        calibratedScore: source.calibration.calibratedScore,
        calibratedConfidence: source.calibration.calibratedConfidence,
        evidenceStatus: source.calibration.evidenceStatus,
        supportOnly: true,
      } : null,
      smartMoney: source.smartMoney ? {
        status: source.smartMoney.status,
        score: source.smartMoney.smartMoneyScore,
        confidence: source.smartMoney.confidence,
        supportOnly: true,
      } : null,
      /** Price-behaviour inputs assembled at run time from the raw signal; read-only. */
      priceBehaviour: {
        deliveryPercent: source.rawSignal?.deliveryPercent ?? null,
        deliveryEvidence: source.rawSignal?.deliveryEvidence ?? null,
        sector: source.rawSignal?.sector ?? source.dataQuality?.sector ?? null,
        dailyChangePercent: source.rawSignal?.dailyChangePercent ?? null,
      },
    };
  }

  private assembleBoardCandidates(candidates: TodayReviewCandidateDto[]): BoardAssemblyResult {
    const ordered = this.orderBoardCandidates(candidates);
    const selected = new Map<string, TodayReviewCandidateDto>();
    const fillBackfillReasons: string[] = [];
    const sourceTypesBySymbol = this.sourceTypesBySymbol(candidates);
    const specialReasons = new Map<string, string>();
    for (const candidate of ordered) {
      const reason = this.specialCaseReason(candidate, sourceTypesBySymbol);
      if (reason) specialReasons.set(this.boardCandidateKey(candidate), reason);
    }

    const longPool = ordered.filter((candidate) => candidate.state === 'LONG_REVIEW');
    const watchPool = ordered.filter((candidate) => candidate.state === 'WATCH_ONLY');
    // EXIT_RISK section includes SHORT_REVIEW (F&O-eligible bearish), EXIT_RISK_REVIEW (strategy exits),
    // and AVOID (non-F&O bearish setups reclassified for caution/exit context — #28a).
    const exitRiskPool = ordered.filter((candidate) => candidate.state === 'EXIT_RISK_REVIEW' || candidate.state === 'SHORT_REVIEW' || candidate.state === 'AVOID');
    const specialPool = ordered.filter((candidate) => specialReasons.has(this.boardCandidateKey(candidate)));

    const select = (
      pool: TodayReviewCandidateDto[],
      section: TodayReviewBoardSection,
      limit: number,
      reason: string | ((candidate: TodayReviewCandidateDto) => string)
    ) => {
      let selectedCount = 0;
      for (const candidate of pool) {
        if (selectedCount >= limit || selected.size >= TODAY_REVIEW_BOARD_TOTAL_LIMIT) break;
        const key = this.boardCandidateKey(candidate);
        if (selected.has(key)) continue;
        const boardReason = typeof reason === 'function' ? reason(candidate) : reason;
        selected.set(key, this.withBoardMetadata(candidate, section, boardReason));
        selectedCount += 1;
      }
      return selectedCount;
    };
    const remaining = (pool: TodayReviewCandidateDto[]) => pool.filter((candidate) => !selected.has(this.boardCandidateKey(candidate)));

    const strategyLongPool = longPool.filter((candidate) => this.boardSourceType(candidate) === 'STRATEGY_BACKED');
    const liteLongPool = longPool.filter((candidate) => this.boardSourceType(candidate) === 'LITE');
    const strategyReserved = select(strategyLongPool, 'LONG_REVIEW', LONG_REVIEW_SOURCE_QUOTAS.strategyBacked, 'Strategy Decision-backed LONG_REVIEW reserved slot.');
    const liteReserved = select(liteLongPool, 'LONG_REVIEW', LONG_REVIEW_SOURCE_QUOTAS.lite, 'Lite discovery LONG_REVIEW reserved slot.');
    select(remaining(longPool), 'LONG_REVIEW', LONG_REVIEW_SOURCE_QUOTAS.flexible, 'Flexible LONG_REVIEW slot filled by next ranked eligible candidate.');
    const longDisplayed = () => [...selected.values()].filter((candidate) => candidate.boardSection === 'LONG_REVIEW').length;
    const longBackfilled = select(
      remaining(longPool),
      'LONG_REVIEW',
      Math.max(0, TODAY_REVIEW_BOARD_QUOTAS.LONG_REVIEW - longDisplayed()),
      'Unused LONG_REVIEW source-reserve slot backfilled by next ranked eligible long review candidate.'
    );
    if (strategyLongPool.length > strategyReserved) fillBackfillReasons.push(`Strategy-backed LONG_REVIEW reserve displayed ${strategyReserved} of ${strategyLongPool.length} eligible candidates.`);
    if (liteLongPool.length > liteReserved) fillBackfillReasons.push(`Lite LONG_REVIEW reserve displayed ${liteReserved} of ${liteLongPool.length} eligible candidates.`);
    if (longBackfilled > 0) fillBackfillReasons.push(`LONG_REVIEW flex/backfill added ${longBackfilled} candidates after source reserves.`);

    select(watchPool, 'WATCH_ONLY', TODAY_REVIEW_BOARD_QUOTAS.WATCH_ONLY, 'WATCH_ONLY visibility reserved by board contract.');
    select(exitRiskPool, 'EXIT_RISK', TODAY_REVIEW_BOARD_QUOTAS.EXIT_RISK, (candidate) => (
      candidate.state === 'SHORT_REVIEW'
        ? 'SHORT_REVIEW visibility reserved by board contract.'
        : candidate.state === 'AVOID'
          ? 'AVOID/caution context surfaced by board contract: bearish setup on non-F&O name — not executable as a short in cash segment.'
          : 'EXIT_RISK_REVIEW visibility reserved by board contract.'
    ));
    select(specialPool, 'SPECIAL_CASES', TODAY_REVIEW_BOARD_QUOTAS.SPECIAL_CASES, (candidate) => specialReasons.get(this.boardCandidateKey(candidate)) || 'Special-case evidence overlap selected by board contract.');

    const rankedCandidates = [...selected.values()]
      .slice(0, TODAY_REVIEW_BOARD_TOTAL_LIMIT)
      .map((candidate, index) => this.withCandidateExplainability({ ...candidate, rank: index + 1 }));
    const displayedCounts = this.countBoardSections(rankedCandidates);
    const eligibleCounts: Record<TodayReviewBoardSection, number> = {
      LONG_REVIEW: longPool.length,
      WATCH_ONLY: watchPool.length,
      EXIT_RISK: exitRiskPool.length,
      SPECIAL_CASES: specialPool.length,
    };
    for (const section of Object.keys(TODAY_REVIEW_BOARD_QUOTAS) as TodayReviewBoardSection[]) {
      if (displayedCounts[section] < Math.min(TODAY_REVIEW_BOARD_QUOTAS[section], eligibleCounts[section])) {
        fillBackfillReasons.push(`${section} quota displayed ${displayedCounts[section]} of ${eligibleCounts[section]} eligible candidates.`);
      } else if (eligibleCounts[section] < TODAY_REVIEW_BOARD_QUOTAS[section]) {
        fillBackfillReasons.push(`${section} quota underfilled because only ${eligibleCounts[section]} eligible candidate(s) existed.`);
      }
    }

    return {
      candidates: rankedCandidates,
      boardSelection: {
        contractVersion: TODAY_REVIEW_BOARD_CONTRACT_VERSION,
        quotas: { ...TODAY_REVIEW_BOARD_QUOTAS },
        eligibleCounts,
        displayedCounts,
        strategyBackedCount: rankedCandidates.filter((candidate) => candidate.boardSourceType === 'STRATEGY_BACKED').length,
        liteCount: rankedCandidates.filter((candidate) => candidate.boardSourceType === 'LITE').length,
        suppressedCount: Math.max(0, candidates.length - rankedCandidates.length),
        fillBackfillReasons,
      },
    };
  }

  private orderBoardCandidates(candidates: TodayReviewCandidateDto[]): TodayReviewCandidateDto[] {
    const statePriority: Record<TodayReviewCandidateState, number> = {
      LONG_REVIEW: 0,
      EXIT_RISK_REVIEW: 1,
      SHORT_REVIEW: 2,
      WATCH_ONLY: 3,
      UNPROVEN: 4,
      INSUFFICIENT_DATA: 5,
      BLOCKED: 6,
      AVOID: 7,
    };
    return [...candidates]
      .sort((a, b) => statePriority[a.state] - statePriority[b.state] || b.confidenceScore - a.confidenceScore || a.symbol.localeCompare(b.symbol));
  }

  private withBoardMetadata(candidate: TodayReviewCandidateDto, section: TodayReviewBoardSection, boardReason: string): TodayReviewCandidateDto {
    const boardSourceType = this.boardSourceType(candidate);
    const boardMetadata = {
      section,
      sourceType: boardSourceType,
      reason: boardReason,
      contractVersion: TODAY_REVIEW_BOARD_CONTRACT_VERSION,
    };
    return {
      ...candidate,
      boardSection: section,
      boardSourceType,
      boardReason,
      boardContractVersion: TODAY_REVIEW_BOARD_CONTRACT_VERSION,
      sourceSignalSnapshot: {
        ...(candidate.sourceSignalSnapshot || {}),
        todayReviewBoard: boardMetadata,
      },
    };
  }

  private boardCandidateKey(candidate: TodayReviewCandidateDto) {
    return `${candidate.instrumentId}:${candidate.symbol}:${candidate.direction}:${candidate.setupType || candidate.strategyCode}`;
  }

  private boardSourceType(candidate: TodayReviewCandidateDto): TodayReviewBoardSourceType {
    if (candidate.strategyCode === 'TODAY_REVIEW_LITE') return 'LITE';
    const proof = candidate.strategyProofSnapshot as any;
    if (proof?.frameworkBacked || proof?.strategyDecisionId || candidate.strategyCode) return 'STRATEGY_BACKED';
    return 'OTHER';
  }

  private sourceTypesBySymbol(candidates: TodayReviewCandidateDto[]) {
    const bySymbol = new Map<string, Set<TodayReviewBoardSourceType>>();
    for (const candidate of candidates) {
      const symbol = this.normalizedMembershipKey(candidate.symbol);
      if (!symbol) continue;
      const sourceTypes = bySymbol.get(symbol) || new Set<TodayReviewBoardSourceType>();
      sourceTypes.add(this.boardSourceType(candidate));
      bySymbol.set(symbol, sourceTypes);
    }
    return bySymbol;
  }

  private specialCaseReason(candidate: TodayReviewCandidateDto, sourceTypesBySymbol: Map<string, Set<TodayReviewBoardSourceType>>) {
    if (candidate.state === 'BLOCKED' || candidate.state === 'AVOID') return null;
    const sourceTypes = sourceTypesBySymbol.get(this.normalizedMembershipKey(candidate.symbol));
    if (sourceTypes?.has('STRATEGY_BACKED') && sourceTypes.has('LITE')) return 'Strategy + Lite overlap.';
    if (this.hasEvidenceKey(candidate, ['stockinterest', 'stockinterestsnapshot'])) return 'Stock Interest overlap.';
    if (this.hasEvidenceKey(candidate, ['activeledger', 'ledgersnapshot', 'ledgeroverlap', 'positionledger'])) return 'Active Ledger overlap.';
    if (this.hasEvidenceKey(candidate, ['newlyappeared', 'newcandidate', 'firstseenat'])) return 'Newly appeared candidate.';
    const missingEvidenceAreas = this.missingEvidenceAreas(candidate);
    if (candidate.confidenceScore >= 60 && missingEvidenceAreas.length === 1) {
      return `High-quality candidate with one missing evidence area: ${missingEvidenceAreas[0]}.`;
    }
    return null;
  }

  private missingEvidenceAreas(candidate: TodayReviewCandidateDto) {
    const sourceSignal = candidate.sourceSignalSnapshot as any;
    const missing: string[] = [];
    if (!candidate.dataQualitySnapshot) missing.push('Data Quality');
    if (!candidate.marketContextSnapshot) missing.push('Market Context');
    if (!candidate.strategyProofSnapshot) missing.push('Strategy Decision');
    if (!candidate.tradePlanSnapshot) missing.push('Exit/invalidation evidence');
    if (!sourceSignal?.rawSignal && !sourceSignal?.setup && !sourceSignal?.calibration) missing.push('Signal');
    return missing;
  }

  private hasEvidenceKey(candidate: TodayReviewCandidateDto, normalizedKeys: string[]) {
    return [candidate.sourceSignalSnapshot, candidate.strategyProofSnapshot, candidate.tradePlanSnapshot, candidate.dataQualitySnapshot]
      .some((snapshot) => this.containsEvidenceKey(snapshot, normalizedKeys));
  }

  private containsEvidenceKey(value: unknown, normalizedKeys: string[], depth = 0): boolean {
    if (!value || typeof value !== 'object' || depth > 5) return false;
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normalizedKeys.some((candidateKey) => normalizedKey.includes(candidateKey))) return true;
      if (this.containsEvidenceKey(nested, normalizedKeys, depth + 1)) return true;
    }
    return false;
  }

  private countBoardSections(candidates: TodayReviewCandidateDto[]) {
    const counts: Record<TodayReviewBoardSection, number> = {
      LONG_REVIEW: 0,
      WATCH_ONLY: 0,
      EXIT_RISK: 0,
      SPECIAL_CASES: 0,
    };
    for (const candidate of candidates) {
      if (candidate.boardSection) counts[candidate.boardSection] += 1;
    }
    return counts;
  }

  private withCandidateExplainability(candidate: TodayReviewCandidateDto): TodayReviewCandidateDto {
    const blockers = candidate.blockers.map((label) => this.reasonFromText(label, 'BLOCKER', candidate));
    const watchReasons = candidate.watchReasons.map((label) => this.reasonFromText(label, 'WATCH', candidate));
    const promotionReasons = candidate.state === 'LONG_REVIEW' || candidate.state === 'SHORT_REVIEW' || candidate.state === 'EXIT_RISK_REVIEW'
      ? [
        this.reason('READINESS', 'TRUSTED_REVIEW_READY', 'Trusted review data is available for this candidate.', 'INFO', 'Market Data Foundation', candidate.dataQualitySnapshot as any, '/market-data'),
        this.reason('STRATEGY_PROOF', 'STRATEGY_PROOF_USABLE', 'Strategy proof is usable for research review.', 'INFO', 'Strategy Framework', candidate.strategyProofSnapshot as any, '/strategy'),
        this.reason('TRADE_PLAN_PROOF_CHAIN', 'EXIT_INVALIDATION_EVIDENCE_READY', 'Exit and invalidation evidence is available for research review.', 'INFO', 'Today Review', candidate.tradePlanSnapshot as any, `/today-review/candidates/${candidate.id || candidate.instrumentId}`),
      ]
      : [];
    const sourceSignal = candidate.sourceSignalSnapshot as any;
    const explainability = {
      candidateId: candidate.id || `${candidate.runId || 'pending'}:${candidate.instrumentId}:${candidate.strategyCode}`,
      state: candidate.state,
      rankingComponents: {
        strategyProof: this.componentScoreFromCandidate(candidate, 'strategyProof'),
        tradePlan: this.componentScoreFromCandidate(candidate, 'tradePlan'),
        marketRegime: this.componentScoreFromCandidate(candidate, 'marketRegime'),
        sectorAlignment: this.componentScoreFromCandidate(candidate, 'sectorAlignment'),
        signalCalibration: this.componentScoreFromCandidate(candidate, 'signalCalibration'),
        dataQuality: this.componentScoreFromCandidate(candidate, 'dataQuality'),
        smartMoney: this.componentScoreFromCandidate(candidate, 'smartMoney'),
        hardBlockerOverride: blockers.length > 0,
      },
      promotionReasons,
      watchReasons,
      blockers,
      upstreamEvidence: {
        readiness: candidate.dataQualitySnapshot,
        signalEvidence: sourceSignal?.rawSignal || sourceSignal?.setup || null,
        calibrationReadiness: sourceSignal?.calibration || null,
        strategyProof: candidate.strategyProofSnapshot,
        tradePlanProofChain: candidate.tradePlanSnapshot,
      },
    };
    return { ...candidate, explainability };
  }

  private componentScoreFromCandidate(
    candidate: TodayReviewCandidateDto,
    component: 'strategyProof' | 'tradePlan' | 'marketRegime' | 'sectorAlignment' | 'signalCalibration' | 'dataQuality' | 'smartMoney' | 'hardBlockerOverride'
  ) {
    if (component === 'hardBlockerOverride') return 0;
    const anyCandidate = candidate as any;
    const source = anyCandidate.__sourceForExplainability as TodayReviewCandidateSource | undefined;
    if (source) {
      if (component === 'strategyProof') return this.proofScore(source);
      if (component === 'tradePlan') return source.sourceKind === 'EXIT' ? 12 : this.tradePlanScore(source.tradePlan);
      if (component === 'marketRegime') return this.marketScore(source);
      if (component === 'sectorAlignment') return this.sectorScore(source);
      if (component === 'signalCalibration') return this.signalScore(source);
      if (component === 'dataQuality') return this.dataQualityScore(source);
      if (component === 'smartMoney') return this.smartMoneyScore(source);
    }
    const plan = candidate.tradePlanSnapshot as any;
    const proof = candidate.strategyProofSnapshot as any;
    const dataQuality = candidate.dataQualitySnapshot as any;
    const signal = candidate.sourceSignalSnapshot as any;
    if (component === 'strategyProof') return proof?.evidenceLabel === 'STRONG' ? 25 : proof?.frameworkBacked ? 22 : proof?.evidenceLabel === 'UNPROVEN' ? 0 : 8;
    if (component === 'tradePlan') return plan?.planStatus === 'VALID' ? Math.min(20, 10 + Number(plan.rewardRiskRatio || 0) * 4) : 0;
    if (component === 'marketRegime') return candidate.marketContextSnapshot ? 10 : 0;
    if (component === 'sectorAlignment') return dataQuality?.sector ? 10 : 5;
    if (component === 'signalCalibration') return signal?.calibration || signal?.setup ? 5 : 0;
    if (component === 'dataQuality') return dataQuality?.coverageStatus === 'GOOD' || dataQuality?.dataStatus === 'PRICE_ACTION_READY' ? 15 : dataQuality ? 6 : 0;
    if (component === 'smartMoney') return signal?.smartMoney ? 5 : 0;
    return 0;
  }

  private reasonFromText(label: string, severity: 'WATCH' | 'BLOCKER', candidate: TodayReviewCandidateDto): TodayReviewCandidateReason {
    const text = label.toLowerCase();
    if (text.includes('trade-plan') || text.includes('trade plan') || text.includes('reward/risk') || text.includes('stop loss') || text.includes('paper review')) {
      const safeLabel = this.safeReviewLanguage(label);
      return this.reason('TRADE_PLAN_PROOF_CHAIN', this.reasonCode(safeLabel), safeLabel, severity, 'Today Review', candidate.tradePlanSnapshot as any, `/today-review/candidates/${candidate.id || candidate.instrumentId}`);
    }
    if (text.includes('market gate')) return this.reason('MARKET_GATE', this.reasonCode(label), label, severity, 'Strategy Decision Engine', candidate.strategyProofSnapshot as any, '/strategy');
    if (text.includes('strategy') || text.includes('framework') || text.includes('proof')) return this.reason('STRATEGY_PROOF', this.reasonCode(label), label, severity, 'Strategy Framework', candidate.strategyProofSnapshot as any, '/strategy');
    if (text.includes('signal')) return this.reason('SIGNAL_MATURITY', this.reasonCode(label), label, severity, 'Signal Quality', candidate.sourceSignalSnapshot as any, '/signals/quality');
    if (text.includes('calibration')) return this.reason('CALIBRATION', this.reasonCode(label), label, severity, 'Signal Calibration Engine', candidate.sourceSignalSnapshot as any, '/signals/calibration');
    if (text.includes('data') || text.includes('coverage') || text.includes('liquidity') || text.includes('context gaps')) return this.reason('DATA_QUALITY', this.reasonCode(label), label, severity, 'Market Data Foundation', candidate.dataQualitySnapshot as any, '/market-data');
    return this.reason('STRATEGY_DECISION', this.reasonCode(label), label, severity, 'Strategy Decision Engine', candidate.strategyProofSnapshot as any, '/strategy');
  }

  private safeReviewLanguage(label: string): string {
    return label
      .replace(/Trade-plan proof-chain snapshot supports paper-review research\./gi, 'Exit and invalidation evidence is available for research review.')
      .replace(/Paper review readiness is BLOCKED by the trade-plan snapshot\./gi, 'Exit/invalidation evidence is BLOCKED by the risk snapshot.')
      .replace(/Reward\/risk is below the paper review threshold\./gi, 'Exit/invalidation evidence is incomplete for research review.')
      .replace(/Reward\/risk is incomplete for paper review\./gi, 'Exit/invalidation evidence is incomplete for research review.')
      .replace(/Trade-plan snapshot/gi, 'Exit/invalidation evidence snapshot')
      .replace(/Trade plan has active blockers/gi, 'Exit/invalidation evidence has active blockers')
      .replace(/Trade plan status/gi, 'Risk snapshot status')
      .replace(/Trade plan/gi, 'Risk evidence')
      .replace(/trade plan/gi, 'risk evidence')
      .replace(/trade-plan/gi, 'risk-evidence')
      .replace(/Stop loss/gi, 'Invalidation level')
      .replace(/stop loss/gi, 'invalidation level')
      .replace(/stop level/gi, 'invalidation level')
      .replace(/paper-readiness/gi, 'research-readiness')
      .replace(/paper review/gi, 'research review')
      .replace(/paper-review/gi, 'research-review')
      .replace(/reward\/risk/gi, 'exit/invalidation evidence')
      .replace(/modeled reward/gi, 'modeled compatibility range')
      .replace(/target\/reward/gi, 'exit/invalidation')
      .replace(/target price/gi, 'compatibility price')
      .replace(/price target/gi, 'compatibility price');
  }

  private reason(category: TodayReviewReasonCategory, code: string, label: string, severity: 'INFO' | 'WATCH' | 'BLOCKER', sourceModule: string, evidence?: Record<string, any> | null, targetRoute?: string): TodayReviewCandidateReason {
    return {
      category,
      code,
      label,
      severity,
      sourceModule,
      evidenceDate: evidence?.generatedAt || evidence?.lastEvaluatedAt || evidence?.latestPriceDate || null,
      targetRoute,
    };
  }

  private reasonCode(label: string) {
    const code = label.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 64);
    return code || 'TODAY_REVIEW_REASON';
  }

  private buildRunExplainability(
    runId: string,
    scope: { region: string; assetType: string },
    reviewUniverse: TrustedReviewUniverseHealth | null,
    scanFunnel: TodayReviewScanFunnel,
    candidates: TodayReviewCandidateDto[],
    excludedExamples: TodayReviewExcludedExample[]
  ): TodayReviewExplainability {
    const summaries = new Map<string, { category: TodayReviewReasonCategory; code: string; label: string; count: number; blocking: boolean; sourceModule: string; targetRoute?: string }>();
    const add = (category: TodayReviewReasonCategory, code: string, label: string, count: number, blocking: boolean, sourceModule: string, targetRoute?: string) => {
      if (count <= 0) return;
      const key = `${category}:${code}`;
      const current = summaries.get(key);
      summaries.set(key, current ? { ...current, count: current.count + count } : { category, code, label, count, blocking, sourceModule, targetRoute });
    };
    add('READINESS', 'NO_REVIEW_UNIVERSE', 'Trusted review universe is not ready for Today Review.', reviewUniverse?.mode === 'NO_REVIEW' ? Math.max(1, scanFunnel.trustedUniverseCount) : 0, true, 'Market Data Foundation', '/market-data');
    add('OUTSIDE_SCOPE', 'OUTSIDE_TRUSTED_UNIVERSE', 'Strategy candidates were outside the trusted review universe.', scanFunnel.outsideTrustedUniverse, true, 'Market Data Foundation', '/market-data');
    add('NO_SETUP', 'NO_PRICE_ACTION_SETUP', 'Trusted instruments had no Today Review setup.', scanFunnel.noSetup, false, 'Today Review', '/today-review');
    add('STRATEGY_PROOF', 'UNPROVEN_EVIDENCE', 'Strategy or lite historical evidence is unproven.', scanFunnel.unproven, false, 'Strategy Framework', '/strategy');
    add('TRADE_PLAN_PROOF_CHAIN', 'HARD_BLOCKER', 'Exit/invalidation evidence produced a hard blocker.', scanFunnel.blocked, true, 'Today Review', '/today-review');
    add('DATA_QUALITY', 'INSUFFICIENT_DATA', 'Required data quality evidence is missing or insufficient.', candidates.filter((candidate) => candidate.state === 'INSUFFICIENT_DATA').length, true, 'Market Data Foundation', '/market-data');
    for (const candidate of candidates) {
      for (const reason of [...(candidate.explainability?.blockers || []), ...(candidate.explainability?.watchReasons || [])]) {
        if (reason.category === 'SIGNAL_MATURITY' || reason.category === 'CALIBRATION') {
          add(reason.category, reason.code, reason.label, 1, reason.severity === 'BLOCKER', reason.sourceModule, reason.targetRoute);
        }
      }
    }
    for (const [key, count] of Object.entries(reviewUniverse?.excludedCounts || {})) {
      const category = key.toLowerCase().includes('provider') ? 'OUTSIDE_SCOPE' : 'DATA_QUALITY';
      add(category, this.reasonCode(key), this.exclusionLabel(key), Number(count), true, 'Market Data Foundation', '/market-data');
    }
    const watchCount = candidates.filter((candidate) => candidate.state === 'WATCH_ONLY').length;
    const promotedCount = candidates.filter((candidate) => ['LONG_REVIEW', 'SHORT_REVIEW', 'EXIT_RISK_REVIEW'].includes(candidate.state)).length;
    const rawExamples = [
      ...excludedExamples,
      ...candidates
        .filter((candidate) => ['BLOCKED', 'AVOID', 'INSUFFICIENT_DATA', 'UNPROVEN'].includes(candidate.state))
        .slice(0, Math.max(0, 8 - excludedExamples.length))
        .map((candidate) => ({
          instrumentId: candidate.instrumentId,
          symbol: candidate.symbol,
          companyName: candidate.companyName,
          primaryReasonCode: candidate.state,
          primaryReasonLabel: candidate.reasonSummary,
          reasonCategories: candidate.explainability?.blockers[0]?.category ? [candidate.explainability.blockers[0].category] : candidate.explainability?.watchReasons[0]?.category ? [candidate.explainability.watchReasons[0].category] : ['STRATEGY_DECISION' as TodayReviewReasonCategory],
          promoted: false as const,
        })),
    ];
    // NR-82: dedupe by symbol+primaryReasonCode (true duplicates).
    // If the same symbol appears with DIFFERENT reason codes, keep each as a separate row (legitimate multi-reason).
    const examplesSeen = new Set<string>();
    const examples = rawExamples.filter((example) => {
      const dedupKey = `${example.symbol.toUpperCase()}:${example.primaryReasonCode}`;
      if (examplesSeen.has(dedupKey)) return false;
      examplesSeen.add(dedupKey);
      return true;
    }).slice(0, 8);
    return {
      runId,
      scope,
      reviewMode: reviewUniverse?.mode || 'NO_REVIEW',
      trustedUniverseCount: scanFunnel.trustedUniverseCount,
      scannedCount: scanFunnel.trustedInstrumentsScanned,
      promotedCount,
      watchCount,
      blockedCount: candidates.filter((candidate) => candidate.state === 'BLOCKED' || candidate.state === 'AVOID').length,
      unprovenCount: candidates.filter((candidate) => candidate.state === 'UNPROVEN').length + scanFunnel.unproven,
      insufficientDataCount: candidates.filter((candidate) => candidate.state === 'INSUFFICIENT_DATA').length,
      excludedCount: scanFunnel.outsideTrustedUniverse + scanFunnel.noSetup + candidates.filter((candidate) => ['BLOCKED', 'AVOID', 'INSUFFICIENT_DATA', 'UNPROVEN'].includes(candidate.state)).length,
      exclusionSummaries: [...summaries.values()].sort((a, b) => b.count - a.count || a.code.localeCompare(b.code)),
      inspectableExcludedExamples: examples,
    };
  }

  private exclusionLabel(key: string) {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase()).trim();
  }

  private countCandidates(candidates: TodayReviewCandidateDto[]) {
    return candidates.reduce<Record<string, number>>((acc, candidate) => {
      acc[candidate.state] = (acc[candidate.state] || 0) + 1;
      return acc;
    }, {});
  }

  private toRunResponse(run: TodayReviewRunDto | null, scope: { region: string; assetType: string }, marketPosture?: TodayReviewMarketPosture | null, snapshotAssembledAt?: string | null): TodayReviewRunResponse {
    return {
      run,
      groups: this.groupCandidates(run?.candidates || []),
      scope,
      marketPosture: marketPosture ?? null,
      snapshotAssembledAt: snapshotAssembledAt ?? null,
    };
  }

  /**
   * Loads Capital Posture from persisted snapshots.
   * Cycle-safe: uses lazy-require of the SPECIFIC file, never the market-context-intelligence index.
   * If posture is unavailable (no snapshot), returns an honest UNAVAILABLE note — never fabricates.
   */
  private async loadMarketPosture(region: string): Promise<TodayReviewMarketPosture> {
    try {
      // Resolve the injected service or lazy-require the specific file to avoid cycles with signal-generation-engine
      const svc: CapitalPostureServiceLike = this.capitalPostureService
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        ?? new (require('../market-context-intelligence/capital-posture.service').CapitalPostureService)();
      const posture = await svc.capitalPosture(region);
      if (posture.availability === 'UNAVAILABLE' || !posture.postureLabel) {
        return {
          availability: 'UNAVAILABLE',
          postureLabel: null,
          action: null,
          note: posture.message || 'Capital Posture regime is unavailable — no persisted snapshot exists for this scope.',
        };
      }
      const postureLabel = posture.postureLabel as 'RISK_ON' | 'NEUTRAL' | 'RISK_OFF';
      const postureNotes: Record<'RISK_ON' | 'NEUTRAL' | 'RISK_OFF', string> = {
        RISK_ON: 'RISK_ON — broad deployment environment favored; long setups are contextually supported.',
        NEUTRAL: 'NEUTRAL — selective deployment acceptable; review entries carefully; avoid aggressive new positions.',
        RISK_OFF: 'RISK_OFF — favor caution; long entries are discouraged; short context is only valid selectively on F&O-eligible names.',
      };
      return {
        availability: 'READY',
        postureLabel,
        action: (posture.action as 'DEPLOY' | 'HOLD' | 'RAISE_CASH' | 'STAY_OUT') ?? null,
        note: postureNotes[postureLabel],
      };
    } catch {
      return {
        availability: 'UNAVAILABLE',
        postureLabel: null,
        action: null,
        note: 'Capital Posture regime is unavailable — posture service could not be reached.',
      };
    }
  }

  /**
   * Assembles price-behaviour inputs from the trusted-universe priceHistory at
   * run time (lite path).  All values are derived from persisted OHLCV rows;
   * never fabricated.  Returns null fields when data is insufficient.
   *
   * Stored as `sourceSignalSnapshot.priceBehaviour` so the FE detail page can
   * compose a deterministic "Price behaviour" paragraph without a live compute.
   */
  private litePriceBehaviourSnapshot(history: TrustedReviewUniverseInstrument['priceHistory'], sector: string | null = null): {
    recentReturn3D: number | null;
    volumeVsAvg20D: number | null;
    deliveryPercent: null;
    deliveryEvidence: null;
    sector: string | null;
    dailyChangePercent: number | null;
    price52wHigh: number | null;
    price52wLow: number | null;
    price52wPositionPct: number | null;
    price52wCurrentClose: number | null;
  } {
    const n = history.length;
    const absent = { recentReturn3D: null, volumeVsAvg20D: null, deliveryPercent: null as null, deliveryEvidence: null as null, sector, dailyChangePercent: null, price52wHigh: null, price52wLow: null, price52wPositionPct: null, price52wCurrentClose: null };
    if (n < 2) return absent;
    const latest = history[n - 1];
    const prev = history[n - 2];
    const dailyChangePercent = prev.close > 0
      ? Number((((latest.close - prev.close) / prev.close) * 100).toFixed(2))
      : null;

    // 3-day return: latest close vs close 3 bars ago (index n-4)
    const bar3DaysAgo = n >= 4 ? history[n - 4] : null;
    const recentReturn3D = bar3DaysAgo && bar3DaysAgo.close > 0
      ? Number((((latest.close - bar3DaysAgo.close) / bar3DaysAgo.close) * 100).toFixed(2))
      : null;

    // Volume vs 20-day average (prior 20 bars before latest)
    const prior20 = history.slice(Math.max(0, n - 21), n - 1);
    const avgVol20 = prior20.length >= 5 ? this.average(prior20.map((row) => row.volume || 0)) : 0;
    const latestVol = latest.volume ?? 0;
    const volumeVsAvg20D = avgVol20 > 0
      ? Number((latestVol / avgVol20).toFixed(2))
      : null;

    // NR-85: 52-week (252-bar) range position from persisted OHLCV price history.
    // Uses up to the 252 most recent bars (the full priceHistory window loaded for the run).
    // Derived entirely from persisted data; never live-computed.
    const window252 = history.slice(Math.max(0, n - 252));
    let price52wHigh: number | null = null;
    let price52wLow: number | null = null;
    let price52wPositionPct: number | null = null;
    const price52wCurrentClose: number | null = latest.close > 0 ? latest.close : null;
    if (window252.length >= 2) {
      const highs = window252.map((row) => row.high).filter(Number.isFinite);
      const lows = window252.map((row) => row.low).filter(Number.isFinite);
      if (highs.length > 0 && lows.length > 0) {
        price52wHigh = Number(Math.max(...highs).toFixed(2));
        price52wLow = Number(Math.min(...lows).toFixed(2));
        const range = price52wHigh - price52wLow;
        if (range > 0 && price52wCurrentClose !== null) {
          price52wPositionPct = Number(((price52wCurrentClose - price52wLow) / range * 100).toFixed(1));
        }
      }
    }

    return {
      recentReturn3D,
      volumeVsAvg20D,
      deliveryPercent: null,   // not available on lite path (no rawSignal)
      deliveryEvidence: null,
      sector,   // from instrument catalog metadata; null when absent
      dailyChangePercent,
      price52wHigh,
      price52wLow,
      price52wPositionPct,
      price52wCurrentClose,
    };
  }

  private dedupeDecisions(items: Array<{ decision: StrategyDecisionDto; sourceKind: 'ENTRY' | 'EXIT' }>) {
    const byKey = new Map<string, { decision: StrategyDecisionDto; sourceKind: 'ENTRY' | 'EXIT' }>();
    for (const item of items) {
      const key = `${item.sourceKind}:${item.decision.instrumentId}:${item.decision.strategy}`;
      const current = byKey.get(key);
      if (!current || item.decision.decisionScore > current.decision.decisionScore) byKey.set(key, item);
    }
    return [...byKey.values()];
  }

  private async safe<T>(fn: () => Promise<T>, warning: string, warnings: string[]): Promise<T | null> {
    try {
      return await fn();
    } catch {
      warnings.push(warning);
      return null;
    }
  }

  private parseDataThroughDate(
    marketData: Record<string, unknown> | null,
    reviewUniverse?: { dataThroughDate?: string | null; storedDataThroughDate?: string | null } | null
  ) {
    const raw = marketData?.latestTradingDate || marketData?.latestStoredTradingDate || reviewUniverse?.storedDataThroughDate || reviewUniverse?.dataThroughDate;
    if (typeof raw !== 'string' || raw.length === 0) return null;
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private normalizeScope(input: TodayReviewRunRequest): { region: string; assetType: string } {
    return {
      region: (input.region || DEFAULT_REGION).toUpperCase(),
      assetType: (input.assetType || DEFAULT_ASSET_TYPE).toUpperCase(),
    };
  }

  private utcDay(date: Date) {
    const runDate = new Date(date);
    runDate.setUTCHours(0, 0, 0, 0);
    return runDate;
  }

  private limit(value?: number) {
    if (!value || !Number.isFinite(value)) return 20;
    return Math.max(1, Math.min(100, Math.floor(value)));
  }
}
