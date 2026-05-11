import { DataQualityEngineService } from '../data-quality-engine';
import { MarketContextIntelligenceService } from '../market-context-intelligence';
import { MarketDataFoundationService } from '../market-data-foundation';
import { SignalCalibrationEngineService } from '../signal-calibration-engine';
import { SignalGenerationEngineService } from '../signal-generation-engine';
import { SmartMoneyIntelligenceService } from '../smart-money-intelligence';
import { StrategyDecisionEngineService, type StrategyDecisionDto } from '../strategy-decision-engine';
import { TradePlanRiskEngineService, type TradePlanResultDto } from '../trade-plan-risk-engine';
import { TodayTradeReviewRepository } from './today-trade-review.repository';
import type {
  TodayReviewCandidateDto,
  TodayReviewCandidateSource,
  TodayReviewCandidateState,
  TodayReviewDirection,
  TodayReviewGrade,
  TodayReviewGroupedCandidates,
  TodayReviewQuery,
  TodayReviewRepository,
  TodayReviewRunDto,
  TodayReviewRunHistoryResponse,
  TodayReviewRunRequest,
  TodayReviewRunResponse,
  TodayReviewRunStatus,
  TodayReviewSourceSnapshot,
  TodayReviewUpstreamServices,
} from './today-trade-review.types';

const DEFAULT_REGION = 'IN';
const DEFAULT_ASSET_TYPE = 'STOCK';
const ENTRY_LIMIT = 30;
const EXIT_LIMIT = 20;

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
    },
    private readonly clock: () => Date = () => new Date()
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
      const sources = await this.loadRunSources(scope, warnings);
      sourceSnapshot.marketData = sources.marketData;
      sourceSnapshot.marketGate = sources.marketGate;
      sourceSnapshot.marketContext = sources.marketContext;
      sourceSnapshot.rawSignalUniverse = sources.rawSignalUniverse;

      const candidateSources = await this.buildCandidateSources(sources.entryDecisions, sources.exitDecisions, sources, scope, warnings);
      const candidates = this.rankCandidates(candidateSources.map((candidateSource) => this.mapCandidate(candidateSource)));
      const candidateCounts = this.countCandidates(candidates);
      const status: TodayReviewRunStatus = warnings.length > 0 ? 'PARTIAL' : 'COMPLETED';
      const completed = await this.repository.completeRun({
        runId: startedRun.id,
        status,
        dataThroughDate: this.parseDataThroughDate(sources.marketData),
        finishedAt: this.clock(),
        warnings,
        candidateCounts,
        sourceSnapshot,
        candidates,
      });
      return this.toRunResponse(completed, scope);
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
    const run = await this.repository.latest(scope.region, scope.assetType);
    return this.toRunResponse(run, scope);
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
    return {
      longReview: candidates.filter((candidate) => candidate.state === 'LONG_REVIEW'),
      shortReview: candidates.filter((candidate) => candidate.state === 'SHORT_REVIEW'),
      exitRiskReview: candidates.filter((candidate) => candidate.state === 'EXIT_RISK_REVIEW'),
      watchOnly: candidates.filter((candidate) => candidate.state === 'WATCH_ONLY'),
      blocked: candidates.filter((candidate) => candidate.state === 'BLOCKED'),
      avoid: candidates.filter((candidate) => candidate.state === 'AVOID'),
      insufficientData: candidates.filter((candidate) => candidate.state === 'INSUFFICIENT_DATA'),
      unproven: candidates.filter((candidate) => candidate.state === 'UNPROVEN'),
    };
  }

  private async loadRunSources(scope: { region: string; assetType: string }, warnings: string[]) {
    const [marketData, marketContext, marketGate, rawSignalUniverse, entryCandidates, exitCandidates] = await Promise.all([
      this.safe(() => this.services.marketDataService.latestStoredCandleInfo(scope.region, scope.assetType, this.clock()), 'Market data freshness is unavailable.', warnings),
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
    ]);

    return {
      marketData,
      marketContext,
      marketGate,
      rawSignalUniverse: rawSignalUniverse ? {
        supportOnly: true,
        sampleCount: rawSignalUniverse.length,
        bullishCount: rawSignalUniverse.filter((signal) => signal.direction === 'BULLISH').length,
        bearishCount: rawSignalUniverse.filter((signal) => signal.direction === 'BEARISH').length,
      } : null,
      entryDecisions: (entryCandidates?.results || []).filter((decision) => Boolean(decision.instrumentId && decision.symbol)).slice(0, ENTRY_LIMIT),
      exitDecisions: (exitCandidates || []).filter((decision) => Boolean(decision.instrumentId && decision.symbol)).slice(0, EXIT_LIMIT),
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
    warnings: string[]
  ): Promise<TodayReviewCandidateSource[]> {
    const decisions = this.dedupeDecisions([
      ...entryDecisions.map((decision) => ({ decision, sourceKind: 'ENTRY' as const })),
      ...exitDecisions.map((decision) => ({ decision, sourceKind: 'EXIT' as const })),
    ]);
    const instrumentIds = decisions.map(({ decision }) => decision.instrumentId!).filter(Boolean);
    const dataQualityByInstrument = new Map(
      (await this.safe(() => this.services.dataQualityService.getEvaluationsForInstruments(instrumentIds), 'Data quality snapshots are unavailable.', warnings) || [])
        .map((evaluation) => [evaluation.instrumentId, evaluation])
    );

    const result: TodayReviewCandidateSource[] = [];
    for (const item of decisions) {
      const instrumentId = item.decision.instrumentId!;
      const [tradePlan, rawSignal, calibration, smartMoney] = await Promise.all([
        item.sourceKind === 'ENTRY'
          ? this.loadTradePlan(item.decision, scope, warnings)
          : Promise.resolve(null),
        this.safe(() => this.services.signalService.latestForInstrument(instrumentId), `${item.decision.symbol} raw signal support is unavailable.`, warnings),
        this.safe(() => this.services.calibrationService.latestPersistedForInstrument(instrumentId), `${item.decision.symbol} calibration support is unavailable.`, warnings),
        this.safe(() => this.services.smartMoneyService.latestPersistedStock(instrumentId, '3M'), `${item.decision.symbol} smart-money support is unavailable.`, warnings),
      ]);
      result.push({
        decision: item.decision,
        dataQuality: dataQualityByInstrument.get(instrumentId) || null,
        marketContext: sources.marketContext || null,
        marketGate: sources.marketGate,
        tradePlan,
        rawSignal,
        calibration,
        smartMoney,
        sourceKind: item.sourceKind,
      });
    }
    return result;
  }

  private async loadTradePlan(decision: StrategyDecisionDto, scope: { region: string; assetType: string }, warnings: string[]) {
    if (!decision.instrumentId || !decision.symbol) return null;
    const latest = await this.safe(
      () => this.services.tradePlanService.latestForInstrument(decision.instrumentId!, decision.strategy, undefined, scope),
      `${decision.symbol} persisted trade-plan snapshot is unavailable.`,
      warnings
    );
    if (latest) return latest;
    return this.safe(
      () => this.services.tradePlanService.generatePlan({
        instrumentId: decision.instrumentId!,
        symbol: decision.symbol!,
        strategyDecisionId: decision.id,
        region: scope.region,
        assetType: scope.assetType,
      }),
      `${decision.symbol} trade-plan snapshot could not be generated.`,
      warnings
    );
  }

  private mapCandidate(source: TodayReviewCandidateSource): TodayReviewCandidateDto {
    const blockers = this.blockersFor(source);
    const watchReasons = this.watchReasonsFor(source);
    const hardBlocked = blockers.length > 0;
    const hasProof = this.hasUsableProof(source);
    const dataQualityMissing = !source.dataQuality;
    const tradePlan = source.tradePlan;
    const score = hardBlocked ? 0 : this.scoreCandidate(source);
    const state = this.stateFor(source, hardBlocked, hasProof, dataQualityMissing);
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
      watchReasons: state === 'LONG_REVIEW' || state === 'EXIT_RISK_REVIEW' ? watchReasons.slice(0, 2) : watchReasons,
      dataQualitySnapshot: source.dataQuality,
      marketContextSnapshot: this.marketContextSnapshotFor(source),
      strategyProofSnapshot: this.strategyProofSnapshotFor(source),
      tradePlanSnapshot: tradePlan,
      sourceSignalSnapshot: this.sourceSignalSnapshotFor(source),
    };
  }

  private stateFor(source: TodayReviewCandidateSource, hardBlocked: boolean, hasProof: boolean, dataQualityMissing: boolean): TodayReviewCandidateState {
    if (hardBlocked) return 'BLOCKED';
    if (dataQualityMissing || source.decision.decision === 'INSUFFICIENT_DATA' || source.tradePlan?.planStatus === 'INSUFFICIENT_DATA') return 'INSUFFICIENT_DATA';
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
      if (!source.tradePlan) add('Trade-plan snapshot is missing for long review candidate.');
      if (source.tradePlan?.planStatus === 'BLOCKED') add('Trade-plan snapshot has hard blockers.');
      for (const blocker of source.tradePlan?.blockers || []) add(blocker);
      for (const blocker of source.tradePlan?.paperReadinessBlockers || []) {
        const text = blocker.toLowerCase();
        if (text.includes('market gate is closed') || text.includes('trade plan has active blockers') || text.includes('stop loss')) add(blocker);
      }
      if (source.tradePlan?.paperReadinessStatus === 'BLOCKED') add('Paper review readiness is BLOCKED by the trade-plan snapshot.');
    }
    if (source.dataQuality?.coverageStatus === 'UNUSABLE') add('Data quality coverage is UNUSABLE.');
    if (source.dataQuality?.liquidityStatus === 'ILLIQUID') add('Liquidity status is ILLIQUID.');
    if (source.decision.decision === 'AVOID') add('Strategy Decision classified the setup as avoid.');
    return [...blockers];
  }

  private watchReasonsFor(source: TodayReviewCandidateSource): string[] {
    const reasons = new Set<string>();
    const add = (message?: string | null) => {
      if (message) reasons.add(message);
    };
    if (!source.dataQuality) add('Data quality snapshot is missing.');
    if (source.dataQuality?.signalReadinessStatus === 'LIMITED') add('Signal readiness is LIMITED.');
    if (source.dataQuality?.coverageStatus === 'PARTIAL') add('Data coverage is PARTIAL.');
    if (source.dataQuality?.liquidityStatus === 'THIN') add('Liquidity is THIN.');
    if (!this.hasUsableProof(source)) add('Strategy Framework proof is missing or weak.');
    if (!source.marketContext) add('Market context snapshot is missing.');
    if (source.decision.confidence === 'LOW') add('Strategy Decision confidence is LOW.');
    if (source.tradePlan?.rewardRiskRatio !== undefined && source.tradePlan.rewardRiskRatio < 1.5) add('Reward/risk is below the paper review threshold.');
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
    if (state === 'WATCH_ONLY') return `Watch only: ${watchReasons[0] || 'evidence is not strong enough for paper review.'}`;
    return 'Long review candidate with Strategy Framework proof, acceptable data quality, market alignment, and valid trade-plan geometry.';
  }

  private marketContextSnapshotFor(source: TodayReviewCandidateSource) {
    if (!source.marketContext) return null;
    return {
      regime: source.marketContext.regime,
      breadth: source.marketContext.breadth,
      dataStatus: source.marketContext.dataStatus,
      updatedAt: source.marketContext.updatedAt,
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
    };
  }

  private rankCandidates(candidates: TodayReviewCandidateDto[]): TodayReviewCandidateDto[] {
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
      .sort((a, b) => statePriority[a.state] - statePriority[b.state] || b.confidenceScore - a.confidenceScore || a.symbol.localeCompare(b.symbol))
      .slice(0, 40)
      .map((candidate, index) => ({ ...candidate, rank: index + 1 }));
  }

  private countCandidates(candidates: TodayReviewCandidateDto[]) {
    return candidates.reduce<Record<string, number>>((acc, candidate) => {
      acc[candidate.state] = (acc[candidate.state] || 0) + 1;
      return acc;
    }, {});
  }

  private toRunResponse(run: TodayReviewRunDto | null, scope: { region: string; assetType: string }): TodayReviewRunResponse {
    return {
      run,
      groups: this.groupCandidates(run?.candidates || []),
      scope,
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

  private parseDataThroughDate(marketData: Record<string, unknown> | null) {
    const raw = marketData?.latestTradingDate || marketData?.latestStoredTradingDate;
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
