import { PortfolioManagementService } from '../portfolio-management';
import type {
  AllocationBucketDto,
  HoldingValuationDto,
  PortfolioAllocationDto,
  PortfolioSummaryDto,
} from '../portfolio-management';
import type {
  GoodBadNeedsAttentionSummary,
  HoldingActionSuggestion,
  HoldingDecisionLabel,
  HoldingIntelligence,
  MarketPosture,
  PortfolioIntelligenceResponse,
  PortfolioIntelligenceThresholds,
  RedFlag,
  ReviewItem,
  ScoreBreakdown,
  SignalOverlaySummary,
} from './portfolio-intelligence.types';
import {
  DEFAULT_PORTFOLIO_INTELLIGENCE_THRESHOLDS,
  statusForHealthScore,
} from './portfolio-intelligence.validation';
import { PortfolioIntelligenceRepository } from './portfolio-intelligence.repository';

const SIGNAL_ORDER: Record<string, number> = { BEARISH: 0, NEUTRAL: 1, BULLISH: 2 };
const DECISION_ORDER: Record<HoldingDecisionLabel, number> = { HIGH_RISK: 0, REVIEW: 1, WATCH: 2, GOOD: 3 };

/** Minimal duck-type for the subset of CapitalPostureService used here. */
interface CapitalPostureLike {
  capitalPosture(region: string): Promise<{
    availability: 'READY' | 'UNAVAILABLE';
    postureLabel: string | null;
    assembledAt: string;
    message: string;
  }>;
}

export class PortfolioIntelligenceService {
  /**
   * capitalPostureService is optionally injected to avoid a circular-module
   * dependency.  When not supplied the class lazy-requires the specific file
   * '../market-context-intelligence/capital-posture.service' at runtime so the
   * module graph stays acyclic.
   */
  constructor(
    private readonly portfolioService = new PortfolioManagementService(),
    private readonly thresholds: PortfolioIntelligenceThresholds = DEFAULT_PORTFOLIO_INTELLIGENCE_THRESHOLDS,
    private readonly capitalPostureService?: CapitalPostureLike,
    private readonly repository = new PortfolioIntelligenceRepository()
  ) {}

  /**
   * PERSISTED-READ GET path (AUDIT-2).
   *
   * Approach: pure persisted-read + refresh-on-holdings-change.
   * - Returns the persisted snapshot immediately when available.
   * - If no snapshot exists yet (first view), computes-and-persists once
   *   (lazy materialisation), then returns the persisted result.
   * - Never recomputes when a fresh snapshot already exists.
   * - Callers that need a forced refresh invoke refreshPortfolioIntelligence().
   */
  async intelligence(portfolioId: string, userId = 'default-user'): Promise<PortfolioIntelligenceResponse | null> {
    // 1. Happy path: serve persisted snapshot directly (no recomputation).
    const cached = await this.repository.findByPortfolioId(portfolioId);
    if (cached) return cached;

    // 2. Lazy materialisation: no snapshot yet — verify portfolio exists, then
    //    compute-and-persist once so the next GET hits the fast path.
    const exists = await this.portfolioService.summary(portfolioId, userId);
    if (!exists) return null;

    return this.refreshPortfolioIntelligence(portfolioId, userId);
  }

  /**
   * Compute the full intelligence payload and UPSERT it into
   * portfolio_intelligence_snapshots.  Returns the persisted result.
   *
   * Trigger points:
   *  (a) On holdings add / edit / remove — called by the controller after
   *      mutating holdings (see portfolio-intelligence.controller.ts).
   *  (b) Daily refresh or manual admin request via
   *      POST /portfolios/:id/intelligence/refresh.
   *  (c) Lazy materialisation on first GET when no snapshot exists.
   */
  async refreshPortfolioIntelligence(portfolioId: string, userId = 'default-user'): Promise<PortfolioIntelligenceResponse | null> {
    const summary = await this.portfolioService.summary(portfolioId, userId);
    if (!summary) return null;
    const allocation = await this.portfolioService.allocation(portfolioId, userId);
    if (!allocation) return null;
    const payload = await this.buildIntelligence(summary, allocation);
    await this.repository.upsertSnapshot(payload);
    return payload;
  }

  async redFlags(portfolioId: string, userId = 'default-user'): Promise<RedFlag[] | null> {
    const result = await this.intelligence(portfolioId, userId);
    return result?.redFlags ?? null;
  }

  async review(portfolioId: string, userId = 'default-user'): Promise<ReviewItem[] | null> {
    const result = await this.intelligence(portfolioId, userId);
    return result?.reviewRanking ?? null;
  }

  async buildIntelligence(summary: PortfolioSummaryDto, allocation: PortfolioAllocationDto): Promise<PortfolioIntelligenceResponse> {
    const holdings = summary.holdings.map((holding) => this.classifyHolding(holding));
    const redFlags = this.detectRedFlags(summary, allocation);
    const scoreBreakdown = this.scoreBreakdown(summary, allocation, holdings);
    const healthScore = this.clampScore(Math.round(
      scoreBreakdown.concentration * 0.2 +
      scoreBreakdown.pnlHealth * 0.25 +
      scoreBreakdown.signalQuality * 0.25 +
      scoreBreakdown.dataCompleteness * 0.2 +
      scoreBreakdown.sectorConcentration * 0.1
    ));
    const status = statusForHealthScore(healthScore);
    const reviewRanking = this.reviewRanking(holdings);
    const marketPosture = await this.resolveMarketPosture(summary.holdings);

    return {
      portfolioId: summary.portfolio.id,
      generatedAt: new Date().toISOString(),
      healthScore,
      status,
      explanation: this.explanation(status, healthScore, redFlags, holdings),
      scoreBreakdown,
      holdings,
      redFlags,
      reviewRanking,
      groupedSummary: this.groupedSummary(holdings),
      signalOverlay: this.signalOverlay(summary.holdings),
      marketPosture,
      thresholds: this.thresholds,
      source: 'portfolio-intelligence',
      dataStatus: summary.dataStatus,
    };
  }

  classifyHolding(holding: HoldingValuationDto): HoldingIntelligence {
    const reasons: string[] = [];
    const signal = holding.signal;
    const staleSignal = signal ? this.isStale(signal.generatedAt) : false;
    const pnl = holding.unrealizedPnLPercent;
    const allocation = holding.allocationPercent;
    const missingPrice = holding.currentPrice === null;
    const bearish = signal?.direction === 'BEARISH';
    let decisionLabel: HoldingDecisionLabel = 'GOOD';
    let actionSuggestion: HoldingActionSuggestion = 'HOLD';

    if (missingPrice) reasons.push('Latest price is missing.');
    if (!signal) reasons.push('Latest signal is missing.');
    if (staleSignal) reasons.push('Latest signal is stale.');
    if (pnl !== null && pnl <= this.thresholds.lossThreshold) reasons.push('Unrealized loss is beyond the review threshold.');
    if (holding.dailyChangePercent !== null && holding.dailyChangePercent <= this.thresholds.dailyDropThreshold) reasons.push('Daily move is below the drop threshold.');
    if (allocation >= this.thresholds.topHoldingConcentration) reasons.push('Allocation is above the concentration threshold.');
    if (bearish) reasons.push('Latest signal is bearish.');
    if (pnl !== null && pnl > 0) reasons.push('Position has positive unrealized P&L.');
    if (signal?.direction === 'BULLISH') reasons.push('Latest signal is bullish.');

    if (missingPrice || allocation >= 0.4 || (pnl !== null && pnl <= -0.25) || (bearish && pnl !== null && pnl <= this.thresholds.lossThreshold)) {
      decisionLabel = 'HIGH_RISK';
      actionSuggestion = missingPrice ? 'REVIEW' : 'REDUCE_RISK';
    } else if (bearish || staleSignal || (pnl !== null && pnl <= this.thresholds.lossThreshold)) {
      decisionLabel = 'REVIEW';
      actionSuggestion = 'REVIEW';
    } else if ((pnl !== null && pnl < 0) || signal?.direction === 'NEUTRAL' || !signal || allocation >= this.thresholds.topHoldingConcentration) {
      decisionLabel = 'WATCH';
      actionSuggestion = 'REVIEW';
    }

    if (reasons.length === 0) reasons.push('Holding has no major red flags in the MVP checks.');

    return {
      holdingId: holding.id,
      instrumentId: holding.instrumentId,
      symbol: holding.symbol,
      companyName: holding.companyName,
      allocationPercent: holding.allocationPercent,
      marketValue: holding.marketValue,
      unrealizedPnL: holding.unrealizedPnL,
      unrealizedPnLPercent: holding.unrealizedPnLPercent,
      dailyChangePercent: holding.dailyChangePercent,
      latestSignal: signal ? {
        score: signal.score,
        direction: signal.direction,
        confidence: signal.confidence,
        generatedAt: signal.generatedAt,
      } : null,
      decisionLabel,
      actionSuggestion,
      reasons,
    };
  }

  detectRedFlags(summary: PortfolioSummaryDto, allocation: PortfolioAllocationDto): RedFlag[] {
    const flags: RedFlag[] = [];
    const holdings = summary.holdings;
    for (const holding of holdings) {
      const affectedHoldings = [this.affected(holding)];
      if (holding.unrealizedPnLPercent !== null && holding.unrealizedPnLPercent <= this.thresholds.lossThreshold) {
        flags.push({
          severity: holding.unrealizedPnLPercent <= -0.25 ? 'HIGH' : 'MEDIUM',
          category: 'holding-loss',
          title: `${holding.symbol} has a large unrealized loss`,
          description: `Unrealized loss is ${(holding.unrealizedPnLPercent * 100).toFixed(1)}%, below the ${(this.thresholds.lossThreshold * 100).toFixed(0)}% review threshold.`,
          affectedHoldings,
        });
      }
      if (holding.dailyChangePercent !== null && holding.dailyChangePercent <= this.thresholds.dailyDropThreshold) {
        flags.push({
          severity: 'HIGH',
          category: 'daily-drop',
          title: `${holding.symbol} dropped sharply today`,
          description: `Daily change is ${(holding.dailyChangePercent * 100).toFixed(1)}%.`,
          affectedHoldings,
        });
      }
      if (holding.signal?.direction === 'BEARISH') {
        flags.push({
          severity: 'MEDIUM',
          category: 'signal',
          title: `${holding.symbol} has a bearish signal`,
          description: 'Latest signal direction is bearish, so the holding deserves review.',
          affectedHoldings,
        });
      }
      if (holding.currentPrice === null) {
        flags.push({
          severity: 'HIGH',
          category: 'data',
          title: `${holding.symbol} is missing latest price data`,
          description: 'Valuation is incomplete because latest price is unavailable.',
          affectedHoldings,
        });
      }
      if (!holding.signal) {
        flags.push({
          severity: 'LOW',
          category: 'data',
          title: `${holding.symbol} is missing a signal`,
          description: 'Signal overlay is incomplete for this holding.',
          affectedHoldings,
        });
      } else if (this.isStale(holding.signal.generatedAt)) {
        flags.push({
          severity: 'MEDIUM',
          category: 'data',
          title: `${holding.symbol} has a stale signal`,
          description: `Signal is older than ${this.thresholds.staleSignalDays} days.`,
          affectedHoldings,
        });
      }
      if (holding.allocationPercent >= this.thresholds.topHoldingConcentration) {
        flags.push({
          severity: holding.allocationPercent >= 0.4 ? 'HIGH' : 'MEDIUM',
          category: 'concentration',
          title: `${holding.symbol} allocation is concentrated`,
          description: `Holding allocation is ${(holding.allocationPercent * 100).toFixed(1)}%.`,
          affectedHoldings,
        });
      }
    }

    const topHolding = this.maxBucket(allocation.byHolding);
    if (topHolding && topHolding.allocationPercent >= this.thresholds.topHoldingConcentration) {
      flags.push({
        severity: topHolding.allocationPercent >= 0.4 ? 'HIGH' : 'MEDIUM',
        category: 'portfolio-concentration',
        title: 'Top holding concentration is high',
        description: `${topHolding.key} is ${(topHolding.allocationPercent * 100).toFixed(1)}% of the portfolio.`,
      });
    }
    const topSector = this.maxBucket(allocation.bySector);
    if (topSector && topSector.allocationPercent >= this.thresholds.sectorConcentration) {
      flags.push({
        severity: 'MEDIUM',
        category: 'sector-concentration',
        title: 'Sector concentration is high',
        description: `${topSector.key} is ${(topSector.allocationPercent * 100).toFixed(1)}% of the portfolio.`,
      });
    }
    const topCountry = this.maxBucket(allocation.byCountry);
    if (topCountry && topCountry.allocationPercent >= this.thresholds.countryConcentration) {
      flags.push({
        severity: 'LOW',
        category: 'country-concentration',
        title: 'Country concentration is high',
        description: `${topCountry.key} is ${(topCountry.allocationPercent * 100).toFixed(1)}% of the portfolio.`,
      });
    }
    if (holdings.length < this.thresholds.minimumHoldings) {
      flags.push({
        severity: holdings.length === 0 ? 'HIGH' : 'LOW',
        category: 'diversification',
        title: 'Portfolio has few holdings',
        description: `Portfolio has ${holdings.length} holdings; MVP threshold is ${this.thresholds.minimumHoldings}.`,
      });
    }
    const bearishCount = holdings.filter((holding) => holding.signal?.direction === 'BEARISH').length;
    if (holdings.length > 0 && bearishCount / holdings.length >= 0.3) {
      flags.push({
        severity: 'MEDIUM',
        category: 'signal',
        title: 'Bearish signal exposure is elevated',
        description: `${bearishCount} of ${holdings.length} holdings have bearish signals.`,
      });
    }
    if (holdings.some((holding) => holding.currentPrice === null)) {
      flags.push({
        severity: 'HIGH',
        category: 'data',
        title: 'Portfolio has missing valuation data',
        description: 'One or more holdings cannot be fully valued because latest price data is missing.',
      });
    }
    return flags;
  }

  reviewRanking(holdings: HoldingIntelligence[]): ReviewItem[] {
    return [...holdings]
      .sort((a, b) => {
        const decisionDelta = DECISION_ORDER[a.decisionLabel] - DECISION_ORDER[b.decisionLabel];
        if (decisionDelta !== 0) return decisionDelta;
        const signalDelta = (SIGNAL_ORDER[a.latestSignal?.direction || ''] ?? 3) - (SIGNAL_ORDER[b.latestSignal?.direction || ''] ?? 3);
        if (signalDelta !== 0) return signalDelta;
        const lossDelta = (a.unrealizedPnLPercent ?? 0) - (b.unrealizedPnLPercent ?? 0);
        if (lossDelta !== 0) return lossDelta;
        return b.allocationPercent - a.allocationPercent;
      })
      .map((holding) => ({
        holdingId: holding.holdingId,
        instrumentId: holding.instrumentId,
        symbol: holding.symbol,
        companyName: holding.companyName,
        decisionLabel: holding.decisionLabel,
        actionSuggestion: holding.actionSuggestion,
        allocationPercent: holding.allocationPercent,
        unrealizedPnLPercent: holding.unrealizedPnLPercent,
        signalDirection: holding.latestSignal?.direction ?? null,
        reasons: holding.reasons.slice(0, 3),
      }));
  }

  signalOverlay(holdings: HoldingValuationDto[]): SignalOverlaySummary {
    const totalValue = holdings.reduce((total, holding) => total + holding.marketValue, 0);
    let weightedScore = 0;
    let scoredValue = 0;
    let bullishValue = 0;
    let bearishValue = 0;
    let bullishCount = 0;
    let neutralCount = 0;
    let bearishCount = 0;
    let missingSignalCount = 0;

    for (const holding of holdings) {
      if (!holding.signal) {
        missingSignalCount += 1;
        continue;
      }
      weightedScore += holding.signal.score * holding.marketValue;
      scoredValue += holding.marketValue;
      if (holding.signal.direction === 'BULLISH') {
        bullishCount += 1;
        bullishValue += holding.marketValue;
      } else if (holding.signal.direction === 'BEARISH') {
        bearishCount += 1;
        bearishValue += holding.marketValue;
      } else {
        neutralCount += 1;
      }
    }

    return {
      bullishCount,
      neutralCount,
      bearishCount,
      missingSignalCount,
      weightedAverageSignalScore: scoredValue > 0 ? Math.round(weightedScore / scoredValue) : null,
      bullishMarketValuePercent: totalValue > 0 ? bullishValue / totalValue : 0,
      bearishMarketValuePercent: totalValue > 0 ? bearishValue / totalValue : 0,
    };
  }

  /**
   * Derives the portfolio-level market regime context from persisted snapshots.
   *
   * Cycle-safe: does NOT static-import the market-context-intelligence index.
   * Instead it uses the optionally-injected capitalPostureService, falling back
   * to a lazy require of the specific file so the module graph stays acyclic.
   *
   * Region is derived from holdings; defaults to 'IN'.
   */
  private async resolveMarketPosture(holdings: HoldingValuationDto[]): Promise<MarketPosture> {
    // Derive region: use the most common country across holdings, fallback 'IN'
    const region = this.deriveRegion(holdings);

    let svc: CapitalPostureLike | undefined = this.capitalPostureService;
    if (!svc) {
      // Lazy-require the specific file — NOT the market-context-intelligence index
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { CapitalPostureService } = require('../market-context-intelligence/capital-posture.service') as {
        CapitalPostureService: new () => CapitalPostureLike;
      };
      svc = new CapitalPostureService();
    }

    try {
      const dto = await svc.capitalPosture(region);
      if (dto.availability === 'UNAVAILABLE' || dto.postureLabel === null) {
        return {
          postureLabel: null,
          contextNote: 'Market regime is currently unavailable — no persisted snapshot found. Portfolio context cannot be derived from market conditions at this time.',
          region,
          assembledAt: dto.assembledAt ?? null,
        };
      }

      const label = dto.postureLabel;
      let contextNote: string;
      if (label === 'RISK_OFF') {
        contextNote = `Market regime is RISK_OFF — environment warrants caution; consider reviewing exposure and reducing positions in weaker holdings.`;
      } else if (label === 'RISK_ON') {
        contextNote = `Market regime is RISK_ON — environment is broadly supportive; high-conviction positions may warrant continued holding, subject to individual holding signals.`;
      } else {
        contextNote = `Market regime is NEUTRAL — selective environment; review each holding on its own merits and avoid aggressive additions until regime strengthens.`;
      }

      return {
        postureLabel: label,
        contextNote,
        region,
        assembledAt: dto.assembledAt ?? null,
      };
    } catch {
      return {
        postureLabel: null,
        contextNote: 'Market regime context could not be read at this time. Portfolio intelligence is based on holding-level data only.',
        region,
        assembledAt: null,
      };
    }
  }

  /** Derives region from holdings' country field; defaults to 'IN'. */
  private deriveRegion(holdings: HoldingValuationDto[]): string {
    if (holdings.length === 0) return 'IN';
    const counts: Record<string, number> = {};
    for (const h of holdings) {
      const c = (h as any).country as string | undefined;
      if (c) counts[c] = (counts[c] ?? 0) + 1;
    }
    const entries = Object.entries(counts);
    if (entries.length === 0) return 'IN';
    return entries.sort((a, b) => b[1] - a[1])[0][0];
  }

  private scoreBreakdown(summary: PortfolioSummaryDto, allocation: PortfolioAllocationDto, holdings: HoldingIntelligence[]): ScoreBreakdown {
    const topHolding = this.maxBucket(allocation.byHolding)?.allocationPercent ?? 0;
    const topSector = this.maxBucket(allocation.bySector)?.allocationPercent ?? 0;
    const missingPriceRatio = summary.holdings.length > 0 ? summary.holdings.filter((holding) => holding.currentPrice === null).length / summary.holdings.length : 1;
    const missingSignalRatio = summary.holdings.length > 0 ? summary.holdings.filter((holding) => !holding.signal).length / summary.holdings.length : 1;
    const avgSignal = this.signalOverlay(summary.holdings).weightedAverageSignalScore;
    const highRiskRatio = holdings.length > 0 ? holdings.filter((holding) => holding.decisionLabel === 'HIGH_RISK').length / holdings.length : 1;
    return {
      concentration: this.clampScore(100 - Math.max(0, topHolding - this.thresholds.topHoldingConcentration) * 180),
      pnlHealth: this.clampScore(60 + (summary.totalUnrealizedPnLPercent ?? 0) * 160 - highRiskRatio * 30),
      signalQuality: this.clampScore((avgSignal ?? 50) - missingSignalRatio * 25),
      dataCompleteness: this.clampScore(100 - missingPriceRatio * 60 - missingSignalRatio * 25),
      sectorConcentration: this.clampScore(100 - Math.max(0, topSector - this.thresholds.sectorConcentration) * 120),
    };
  }

  private groupedSummary(holdings: HoldingIntelligence[]): GoodBadNeedsAttentionSummary {
    const toSummary = (holding: HoldingIntelligence) => ({
      holdingId: holding.holdingId,
      instrumentId: holding.instrumentId,
      symbol: holding.symbol,
      companyName: holding.companyName,
      reasons: holding.reasons.slice(0, 2),
    });
    return {
      strongHoldings: holdings.filter((holding) => holding.decisionLabel === 'GOOD').map(toSummary),
      weakHoldings: holdings.filter((holding) => holding.decisionLabel === 'HIGH_RISK').map(toSummary),
      needsReview: holdings.filter((holding) => holding.decisionLabel === 'REVIEW' || holding.decisionLabel === 'WATCH').map(toSummary),
      dataIssues: holdings.filter((holding) => holding.reasons.some((reason) => reason.toLowerCase().includes('missing') || reason.toLowerCase().includes('stale'))).map(toSummary),
    };
  }

  private explanation(status: string, healthScore: number, redFlags: RedFlag[], holdings: HoldingIntelligence[]): string {
    if (holdings.length === 0) return 'Portfolio has no holdings yet, so intelligence is limited.';
    const highFlags = redFlags.filter((flag) => flag.severity === 'HIGH').length;
    const reviewCount = holdings.filter((holding) => holding.decisionLabel === 'REVIEW' || holding.decisionLabel === 'HIGH_RISK').length;
    if (status === 'HEALTHY') return `Portfolio health is ${healthScore}; most holdings have acceptable signals, data coverage, and concentration.`;
    if (status === 'WATCH') return `Portfolio health is ${healthScore}; ${reviewCount} holdings need monitoring and ${redFlags.length} red flags were detected.`;
    return `Portfolio health is ${healthScore}; ${highFlags} high-severity red flags and ${reviewCount} holdings need review.`;
  }

  private isStale(timestamp: string): boolean {
    return Date.now() - new Date(timestamp).getTime() > this.thresholds.staleSignalDays * 24 * 60 * 60 * 1000;
  }

  private maxBucket(buckets: AllocationBucketDto[]): AllocationBucketDto | null {
    return buckets.length > 0 ? [...buckets].sort((a, b) => b.allocationPercent - a.allocationPercent)[0] : null;
  }

  private affected(holding: HoldingValuationDto) {
    return { holdingId: holding.id, instrumentId: holding.instrumentId, symbol: holding.symbol };
  }

  private clampScore(value: number): number {
    return Math.max(0, Math.min(100, Math.round(value)));
  }
}
