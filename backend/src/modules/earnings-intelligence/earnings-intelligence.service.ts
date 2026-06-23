import { EarningsIntelligenceRepository } from './earnings-intelligence.repository';
import { addTradingSessions } from '../market-data-foundation';
import { SignalGenerationEngineService } from '../signal-generation-engine';
import type { SignalResultDto } from '../signal-generation-engine';
import { CALCULATION_VERSION } from './earnings-intelligence.constants';
import {
  EARNINGS_INTELLIGENCE_CATEGORIES,
  emptyCategoryBuckets,
  emptyCategoryCounts,
} from './earnings-intelligence.categories';
import {
  classifyPeriod,
  isAnnualPeriod,
  isQuarterlyPeriod,
  isTtmPeriod,
  type EarningsPeriodClass,
} from './earnings-intelligence.period';
import { addDays, addMonths, dateTime, daysBetween, maxDate, round2, safeUtcDay, startOfUtcDay } from './earnings-intelligence.date-utils';
import { resultDateLabelFor, rowWarningsForSource } from './earnings-intelligence.presentation';
import { deriveRecentResult } from './earnings-intelligence.derived-result';
import { computeEarningsTechnicals } from './earnings-intelligence.technicals';
import {
  DEFAULT_EARNINGS_REGION,
  getEarningsRegionConfig,
  isSupportedEarningsRegion,
  normalizeRegionCode,
  supportedEarningsRegions,
  type EarningsRegionConfig,
  type EarningsRegionConfigResolver,
} from './earnings-intelligence.region-config';
import type {
  EarningsFreshness,
  EarningsFundamentalInput,
  EarningsIntelligenceCategory,
  EarningsIntelligenceQuery,
  EarningsIntelligenceRefreshRequest,
  EarningsIntelligenceRefreshResult,
  EarningsIntelligenceResponse,
  EarningsPricePointInput,
  EarningsProvenanceSummary,
  EarningsResultDateSource,
  EarningsSignalSummary,
  EarningsSnapshotCalculationInput,
  EarningsSnapshotDto,
  EarningsSnapshotUpsertInput,
} from './earnings-intelligence.types';

/**
 * Minimal read surface the earnings module needs from the signal engine.
 * Declared structurally so tests can inject a stub and so the dependency stays
 * one-directional (earnings → signals, never the reverse).
 */
export interface EarningsSignalReader {
  latestPersistedForInstruments(instrumentIds: string[]): Promise<SignalResultDto[]>;
}

export class EarningsIntelligenceService {
  /**
   * @param repository      persistence layer (injected for tests).
   * @param resolveConfig   region-config resolver (injected for tests/runtime
   *                        overrides).  Defaults to the built-in registry so the
   *                        engine is region-aware out of the box, but any caller
   *                        can supply bespoke tuning without touching the engine.
   */
  /**
   * Lazily-resolved signal reader.  `undefined` = not yet resolved (build the
   * production default on first use); `null` = explicitly disabled (skip the join).
   */
  private signalReader: EarningsSignalReader | null | undefined;

  constructor(
    private readonly repository = new EarningsIntelligenceRepository(),
    private readonly resolveConfig: EarningsRegionConfigResolver = getEarningsRegionConfig,
    signalReader?: EarningsSignalReader | null,
  ) {
    this.signalReader = signalReader;
  }

  /**
   * Resolve the signal reader on first use.  Defaults to the real
   * SignalGenerationEngineService (constructed lazily so its heavy dependency
   * graph is not built at module import time).  A construction failure degrades
   * gracefully to "no signal join" rather than breaking the earnings read.
   */
  private getSignalReader(): EarningsSignalReader | null {
    if (this.signalReader === undefined) {
      try {
        this.signalReader = new SignalGenerationEngineService();
      } catch {
        this.signalReader = null;
      }
    }
    return this.signalReader;
  }

  private regionConfig(region: string): EarningsRegionConfig {
    return this.resolveConfig(region);
  }

  /**
   * Returns a Map<symbol, proximity> from the latest persisted earnings snapshot.
   * Only includes rows that have a `daysToResult` value (UPCOMING_RESULTS with a
   * confirmed forward window).
   *
   * Used by today-trade-review to attach earnings-proximity caveats to candidates
   * without triggering any live computation.  Safe to call on every GET.
   */
  async latestProximityBySymbol(region: string, assetType: string): Promise<Map<string, {
    symbol: string;
    daysToResult: number | null;
    resultDateSource: string;
    resultDateLabel: string | null;
    resultDate: string | null;
  }>> {
    const normalized = this.normalizeScope({ region, assetType, limit: 5000 });
    const latest = await this.repository.latestSnapshot({ ...normalized, limit: 5000 });
    const result = new Map<string, { symbol: string; daysToResult: number | null; resultDateSource: string; resultDateLabel: string | null; resultDate: string | null }>();
    for (const row of latest.rows) {
      if (row.daysToResult !== null) {
        result.set(row.symbol.toUpperCase(), {
          symbol: row.symbol,
          daysToResult: row.daysToResult,
          resultDateSource: row.resultDateSource,
          resultDateLabel: row.resultDateLabel ?? null,
          resultDate: row.resultDate,
        });
      }
    }
    return result;
  }

  async latest(query: EarningsIntelligenceQuery, now = new Date()): Promise<EarningsIntelligenceResponse> {
    const normalized = this.normalizeScope(query);
    const scopeWarnings = this.scopeWarnings(normalized.region);
    const latest = await this.repository.latestSnapshot({ ...normalized, category: query.category, limit: query.limit });
    if (!latest.snapshotDate) {
      return {
        scope: { region: normalized.region, assetType: normalized.assetType },
        snapshotDate: latest.snapshotDate,
        dataThroughDate: latest.dataThroughDate,
        generatedAt: now.toISOString(),
        freshness: 'NO_SNAPSHOT',
        categories: emptyCategoryBuckets(),
        items: [],
        warnings: [
          ...scopeWarnings,
          'Earnings Intelligence snapshot is not ready yet. Run the backend refresh pipeline to materialize it.',
        ],
        provenance: this.provenanceSummary([]),
      };
    }

    const grouped = this.groupByCategory(latest.rows, normalized.limit);
    let categories = grouped;
    let items: EarningsSnapshotDto[];
    if (query.category) {
      // When the caller scopes to a single category, only that bucket is
      // meaningful (the repository already filtered rows to it).  Present a map
      // with just that bucket populated rather than a misleadingly-sparse map of
      // every category cross-filtered by the requested one.
      items = grouped[query.category];
      categories = { ...emptyCategoryBuckets(), [query.category]: items };
    } else {
      items = latest.rows.slice(0, normalized.limit);
    }

    // Read-time signal join.  Bounded to ONLY the rows actually serialized to the
    // client (items + the capped category buckets) — never the full up-to-5000-row
    // fetch — so the per-instrument signal lookups stay proportional to the page,
    // not the universe (connection-pool safety).  Mutates the shared row objects in
    // place, so signals appear in both `items` and the buckets.  Joins an
    // already-persisted table (preserves the persisted-read rule) and degrades
    // gracefully — missing signals never block the read.
    const signalWarnings = await this.attachSignals(this.collectDisplayRows(items, categories));

    return {
      scope: { region: normalized.region, assetType: normalized.assetType },
      snapshotDate: latest.snapshotDate,
      dataThroughDate: latest.dataThroughDate,
      generatedAt: now.toISOString(),
      freshness: this.responseFreshness(latest.rows),
      categories,
      items,
      warnings: [...scopeWarnings, ...this.responseWarnings(latest.rows, latest.truncated), ...signalWarnings],
      provenance: this.provenanceSummary(latest.rows),
    };
  }

  /**
   * Attach the latest TRUSTED trading signal to each row, joined read-time from
   * the persisted signal snapshot.  Mutates rows in place.  On success, rows
   * without a trusted signal get `signal: null`; on a join failure the field is
   * left undefined and a single warning is returned (whole-response provenance).
   */
  /**
   * Unique set (by object reference) of the rows actually returned to the client:
   * the `items` list plus every category bucket.  Used to bound the signal join to
   * the page rather than the full fetched row set.
   */
  private collectDisplayRows(
    items: EarningsSnapshotDto[],
    categories: Record<string, EarningsSnapshotDto[]>,
  ): EarningsSnapshotDto[] {
    const seen = new Set<EarningsSnapshotDto>(items);
    for (const bucket of Object.values(categories)) {
      for (const row of bucket) seen.add(row);
    }
    return [...seen];
  }

  private async attachSignals(rows: EarningsSnapshotDto[]): Promise<string[]> {
    if (rows.length === 0) return [];
    const reader = this.getSignalReader();
    if (!reader) {
      for (const row of rows) row.signal = null;
      return ['Signal enrichment is unavailable; signals are not shown for this snapshot.'];
    }
    const ids = Array.from(new Set(rows.map((row) => row.stockId).filter((id): id is string => !!id)));
    if (ids.length === 0) {
      for (const row of rows) row.signal = null;
      return [];
    }
    try {
      const signals = await reader.latestPersistedForInstruments(ids);
      const byInstrument = new Map<string, SignalResultDto>();
      for (const signal of signals) byInstrument.set(signal.instrument_id, signal);
      for (const row of rows) {
        const match = byInstrument.get(row.stockId);
        row.signal = match ? this.toSignalSummary(match) : null;
      }
      return [];
    } catch {
      // Leave `signal` undefined (distinct from null = "no trusted signal") so
      // the UI can tell "join failed" from "no signal exists".
      return ['Signal enrichment failed for this snapshot; results are shown without signals.'];
    }
  }

  private toSignalSummary(signal: SignalResultDto): EarningsSignalSummary {
    return {
      direction: signal.direction,
      // Prefer the calibrated score (the trusted-read score) when present.
      score: signal.calibratedScore ?? signal.score,
      confidence: signal.confidence,
      lifecycleState: signal.lifecycleState ?? null,
      triggerPrice: signal.triggerPrice ?? null,
      generatedDate: signal.generatedDate ?? signal.generated_at ?? null,
    };
  }

  async refreshSnapshots(request: EarningsIntelligenceRefreshRequest = {}): Promise<EarningsIntelligenceRefreshResult> {
    const region = normalizeRegionCode(request.region ?? DEFAULT_EARNINGS_REGION);
    const assetType = this.normalizeText(request.assetType, this.regionConfig(region).defaultAssetType).toUpperCase();
    const snapshotDate = startOfUtcDay(request.snapshotDate || new Date());
    const requestedDataThroughDate = request.dataThroughDate ? startOfUtcDay(request.dataThroughDate) : null;
    const batchSize = this.normalizeBatchSize(request.batchSize);
    const offset = Math.max(0, Math.floor(Number(request.offset) || 0));
    const instrumentIds = this.normalizeIds(request.instrumentIds);
    const hasExplicitInstrumentIds = (instrumentIds?.length || 0) > 0;
    const warnings: string[] = [];
    const errors: string[] = [];

    const totalCount = await this.repository.countRefreshUniverse({ region, assetType, instrumentIds });
    if (totalCount === 0) {
      return {
        status: 'SKIPPED',
        snapshotDate: snapshotDate.toISOString(),
        dataThroughDate: requestedDataThroughDate?.toISOString() ?? null,
        region,
        assetType,
        totalCount: 0,
        processedCount: 0,
        succeededCount: 0,
        failedCount: 0,
        skippedCount: 0,
        unchangedCount: 0,
        nextOffset: null,
        hasMore: false,
        warnings: ['No active instruments with persisted earnings inputs were available for this scope.'],
        errors: [],
        categories: emptyCategoryCounts(),
      };
    }

    const inputs = await this.repository.loadCalculationInputs({
      region,
      assetType,
      batchSize,
      offset,
      instrumentIds,
      snapshotDate,
    });

    const rows: EarningsSnapshotUpsertInput[] = [];
    let skippedCount = 0;
    let failedCount = 0;
    let dataThroughDate = requestedDataThroughDate;
    for (const input of inputs) {
      try {
        const snapshot = this.calculateSnapshot({
          ...input,
          snapshotDate,
          dataThroughDate: requestedDataThroughDate,
        });
        if (snapshot.dataThroughDate && (!dataThroughDate || snapshot.dataThroughDate > dataThroughDate)) {
          dataThroughDate = snapshot.dataThroughDate;
        }
        if (snapshot.freshness === 'MISSING') {
          skippedCount += 1;
          continue;
        }
        rows.push(snapshot);
      } catch (error) {
        failedCount += 1;
        errors.push(`${input.symbol}: ${error instanceof Error ? error.message : 'earnings snapshot calculation failed'}`);
      }
    }

    const saved = rows.length > 0 ? await this.repository.upsertSnapshots(rows) : [];
    const processedCount = inputs.length;
    const succeededCount = saved.length;
    const nextOffset = hasExplicitInstrumentIds ? null : offset + processedCount;
    const hasMore = nextOffset !== null && nextOffset < totalCount;
    if (skippedCount > 0) warnings.push(`${skippedCount} instrument(s) skipped because persisted earnings fundamentals are missing.`);

    return {
      status: this.refreshStatus(totalCount, processedCount, succeededCount, failedCount, skippedCount),
      snapshotDate: snapshotDate.toISOString(),
      dataThroughDate: dataThroughDate?.toISOString() ?? null,
      region,
      assetType,
      totalCount,
      processedCount,
      succeededCount,
      failedCount,
      skippedCount,
      // Every processed row is re-materialised on each run; no change-detection is
      // performed, so unchanged is always 0.  Field retained for the pipeline's
      // aggregate contract.
      unchangedCount: 0,
      nextOffset: hasMore ? nextOffset : null,
      hasMore,
      warnings,
      errors,
      categories: this.countCategories(saved),
    };
  }

  calculateSnapshot(input: EarningsSnapshotCalculationInput): EarningsSnapshotUpsertInput {
    const config = this.regionConfig(input.region);
    const fundamentals = this.sortFundamentals(input.fundamentals);
    const quarterly = fundamentals.filter((record) => isQuarterlyPeriod(record.periodType));
    const annual = fundamentals.filter((record) => isAnnualPeriod(record.periodType));
    const ttm = fundamentals.filter((record) => isTtmPeriod(record.periodType));
    const latest = quarterly[0] || annual[0] || ttm[0] || fundamentals[0] || null;
    const latestClass: EarningsPeriodClass = latest ? classifyPeriod(latest.periodType) : 'UNKNOWN';
    // Scoring must compare like-against-like: restrict the consistency/acceleration
    // series to records of the same period class as the latest, so a quarterly
    // figure is never pitted against an annual figure (~4x larger).
    const primarySeries = latest
      ? fundamentals.filter((record) => classifyPeriod(record.periodType) === latestClass)
      : [];
    const comparison = latest ? this.findComparisonRecord(latest, fundamentals) : null;
    const periodEndDate = latest ? safeUtcDay(latest.periodEndDate) : null;
    const validatedAt = latest ? safeUtcDay(latest.validatedAt ?? null) : null;
    const expectedResultDate = latest ? this.expectedResultDate(latest, latestClass, config) : null;
    const dateResolution = this.resolveResultDate(latest, expectedResultDate, input.snapshotDate);
    const resultDate = dateResolution.resultDate;
    const resultDateSource = dateResolution.resultDateSource;
    const daysToResult = dateResolution.daysToResult;
    const revenueGrowth = this.growth(latest?.revenue ?? null, comparison?.revenue ?? null);
    const profitGrowth = this.growth(latest?.netIncome ?? null, comparison?.netIncome ?? null);
    const epsGrowth = this.growth(latest?.eps ?? null, comparison?.eps ?? null);
    const marginTrend = this.marginTrend(latest, comparison);
    const consistencyScore = this.calculateConsistencyScore(primarySeries);
    const accelerationScore = this.calculateAccelerationScore(primarySeries);
    const deliveryInterest = this.deliveryInterest(input.deliverySnapshots, config);
    const reactionDate = resultDateSource === 'OFFICIAL_CALENDAR' ? resultDate : null;
    const priceReaction = reactionDate ? this.priceReaction(input.prices, reactionDate, input.region, config) : null;
    // Derived recent-result path (US / forward-date providers): engages ONLY when
    // the official path did NOT already yield a recent past result (the IN path).
    // See earnings-intelligence.derived-result.ts for the full rationale.
    const officialRecentResult = resultDateSource === 'OFFICIAL_CALENDAR' && resultDate !== null
      && resultDate <= input.snapshotDate && this.daysBetween(resultDate, input.snapshotDate) <= config.recentResultWindowDays;
    const derived = deriveRecentResult({
      latest, snapshotDate: input.snapshotDate, config, officialRecentResult,
      computePriceReaction: (date) => this.priceReaction(input.prices, date, input.region, config),
    });
    const preResultPriceMove = this.priceMove(input.prices, config.preResultPriceMoveLookbackBars);
    const freshness = this.freshness(input.snapshotDate, latest, config);
    // Single source of truth for the post-result classification.  A row can trip
    // BOTH the winner and disappointment guardrails (e.g. strong growth but a
    // negative price reaction); resolve it to exactly ONE bucket via net evidence
    // so no row appears in both tabs, and flag the genuinely-mixed case.
    const recentResult = officialRecentResult || derived.applies;
    const reactionForGates = officialRecentResult ? priceReaction : derived.priceReaction;
    const resultClass = this.classifyResult({
      recentResult, revenueGrowth, profitGrowth, epsGrowth, marginTrend,
      consistencyScore, accelerationScore, priceReaction: reactionForGates,
    });
    const reasonTags = this.reasonTags({
      latest, revenueGrowth, profitGrowth, epsGrowth, marginTrend, consistencyScore, accelerationScore,
      deliveryInterest, priceReaction, preResultPriceMove, derivedRecentResult: derived.applies,
      upcoming: (resultDateSource === 'OFFICIAL_CALENDAR' || resultDateSource === 'ESTIMATED_FROM_CADENCE') && daysToResult !== null && daysToResult >= 0,
      mixedResult: resultClass.mixed, resultDateSource, config,
    });
    const riskTags = this.riskTags({
      latest, quarterlyCount: quarterly.length, annualCount: annual.length, ttmCount: ttm.length, freshness,
      revenueGrowth, profitGrowth, epsGrowth, marginTrend, consistencyScore, priceReaction, prices: input.prices,
      estimatedResultDate: resultDateSource === 'DATE_TBA' || resultDateSource === 'ESTIMATED_FROM_PERIOD_CADENCE' || resultDateSource === 'ESTIMATED_FROM_CADENCE',
      authoritativeResultDate: resultDateSource === 'OFFICIAL_CALENDAR',
    });
    const warnings = rowWarningsForSource(resultDateSource);
    const categories = this.categories({
      snapshotDate: input.snapshotDate, resultDate, resultDateSource, daysToResult,
      consistencyScore, accelerationScore, deliveryInterest, priceReaction,
      preResultPriceMove, freshness, config,
      winner: resultClass.winner, disappointment: resultClass.disappointment,
    });
    // Numeric technicals bundle (Phase 3) from the already-loaded price/delivery
    // history — no extra reads.  Each field degrades to null on a short warm-up.
    const technicals = computeEarningsTechnicals(input.prices, input.deliverySnapshots);
    const dataThroughDate = maxDate([input.dataThroughDate, latest?.validatedAt ?? null, latest?.lastUpdatedTimestamp ?? null, latest?.periodEndDate ?? null, input.prices[0]?.timestamp ?? null, input.deliverySnapshots[0]?.tradingDate ?? null]);

    const resultDateLabel: EarningsSnapshotUpsertInput['resultDateLabel'] = resultDateLabelFor(resultDateSource);

    return {
      snapshotDate: input.snapshotDate,
      dataThroughDate,
      stockId: input.stockId,
      symbol: input.symbol,
      scopeRegion: input.region,
      scopeAssetType: input.assetType,
      resultDate,
      resultDateLabel,
      resultDateSource,
      periodEndDate,
      validatedAt,
      daysToResult,
      revenueGrowth,
      profitGrowth,
      epsGrowth,
      marginTrend,
      consistencyScore,
      accelerationScore,
      reasonTags,
      riskTags,
      warnings,
      freshness,
      categories,
      ...technicals,
    };
  }

  calculateConsistencyScore(records: EarningsFundamentalInput[]): number {
    const sorted = this.sortFundamentals(records).slice(0, 6).reverse();
    let checks = 0;
    let passed = 0;
    for (let index = 1; index < sorted.length; index += 1) {
      const previous = sorted[index - 1];
      const current = sorted[index];
      for (const metric of ['revenue', 'netIncome', 'eps'] as const) {
        if (current[metric] === null || previous[metric] === null || previous[metric] === 0) continue;
        checks += 1;
        if ((current[metric] as number) >= (previous[metric] as number)) passed += 1;
      }
      const previousMargin = this.margin(previous);
      const currentMargin = this.margin(current);
      if (previousMargin !== null && currentMargin !== null) {
        checks += 1;
        if (currentMargin >= previousMargin) passed += 1;
      }
    }
    return checks === 0 ? 0 : round2((passed / checks) * 100);
  }

  calculateAccelerationScore(records: EarningsFundamentalInput[]): number {
    const sorted = this.sortFundamentals(records).slice(0, 6).reverse();
    let checks = 0;
    let passed = 0;
    for (const metric of ['revenue', 'netIncome', 'eps'] as const) {
      const growthRates: number[] = [];
      for (let index = 1; index < sorted.length; index += 1) {
        const growth = this.growth(sorted[index][metric] as number | null, sorted[index - 1][metric] as number | null);
        if (growth !== null) growthRates.push(growth);
      }
      if (growthRates.length >= 2) {
        checks += 1;
        if (growthRates[growthRates.length - 1] > growthRates[growthRates.length - 2]) passed += 1;
      }
    }
    const marginDeltas: number[] = [];
    for (let index = 1; index < sorted.length; index += 1) {
      const delta = this.marginTrend(sorted[index], sorted[index - 1]);
      if (delta !== null) marginDeltas.push(delta);
    }
    if (marginDeltas.length >= 2) {
      checks += 1;
      if (marginDeltas[marginDeltas.length - 1] > marginDeltas[marginDeltas.length - 2]) passed += 1;
    }
    return checks === 0 ? 0 : round2((passed / checks) * 100);
  }

  private categories(input: {
    snapshotDate: Date; resultDate: Date | null; resultDateSource: EarningsResultDateSource; daysToResult: number | null;
    consistencyScore: number; accelerationScore: number; deliveryInterest: boolean; priceReaction: number | null;
    preResultPriceMove: number | null; freshness: EarningsFreshness; config: EarningsRegionConfig;
    // Pre-resolved, mutually-exclusive post-result classification (see classifyResult).
    winner: boolean; disappointment: boolean;
  }): EarningsIntelligenceCategory[] {
    const categories: EarningsIntelligenceCategory[] = [];
    const hasAuthoritativeResultDate = input.resultDateSource === 'OFFICIAL_CALENDAR';
    // A forward result date — official OR the Phase 3 honest cadence estimate — can
    // populate UPCOMING_RESULTS / PRE_RESULT_INTEREST so those tabs are not empty
    // year-round.  RESULT_REACTION_HISTORY stays gated on the official date only.
    const hasForwardResultDate = input.resultDateSource === 'OFFICIAL_CALENDAR'
      || input.resultDateSource === 'ESTIMATED_FROM_CADENCE';
    const upcoming = input.daysToResult !== null
      && input.daysToResult >= 0
      && input.daysToResult <= input.config.upcomingWindowDays
      && hasForwardResultDate;
    if (upcoming) categories.push('UPCOMING_RESULTS');
    if (upcoming && (input.deliveryInterest || (input.preResultPriceMove !== null && input.preResultPriceMove >= input.config.preResultPriceMoveThresholdPercent))) {
      categories.push('PRE_RESULT_INTEREST');
    }
    // Winner and disappointment are mutually exclusive (resolved upstream) so a
    // row never contradicts itself across the two tabs.
    if (input.winner) categories.push('RESULT_WINNERS');
    if (input.disappointment) categories.push('RESULT_DISAPPOINTMENTS');
    if (input.priceReaction !== null && hasAuthoritativeResultDate) categories.push('RESULT_REACTION_HISTORY');
    if (input.freshness !== 'MISSING' && (input.consistencyScore >= 70 || input.accelerationScore >= 70 || categories.includes('PRE_RESULT_INTEREST') || categories.includes('RESULT_WINNERS'))) {
      categories.push('EARNINGS_WATCHLIST');
    }
    if (input.freshness !== 'MISSING' && categories.length === 0) categories.push('EARNINGS_WATCHLIST');
    return [...new Set(categories)];
  }

  /**
   * Resolve the post-result classification to a single bucket.  Both the winner
   * and disappointment guardrails can fire for the same row (strong growth that
   * still sold off, or two strong metrics alongside one sharp decline).  When
   * they conflict, the dominant side wins by net evidence (signed growth metrics
   * + margin direction + price-reaction direction) and `mixed` is set so the row
   * can be tagged MIXED_RESULT.  Returns {false,false,false} when no recent
   * result is in scope.
   */
  private classifyResult(input: {
    recentResult: boolean;
    revenueGrowth: number | null; profitGrowth: number | null; epsGrowth: number | null;
    marginTrend: number | null; consistencyScore: number; accelerationScore: number; priceReaction: number | null;
  }): { winner: boolean; disappointment: boolean; mixed: boolean } {
    if (!input.recentResult) return { winner: false, disappointment: false, mixed: false };
    const winner = this.isWinner(input);
    const disappointment = this.isDisappointment(input);
    if (winner && disappointment) {
      const net = this.netResultScore(input);
      return net >= 0
        ? { winner: true, disappointment: false, mixed: true }
        : { winner: false, disappointment: true, mixed: true };
    }
    return { winner, disappointment, mixed: false };
  }

  /**
   * Net *magnitude-aware* evidence for a mixed result.  Sign alone is misleading:
   * a row needs >= 2 positive growth metrics to be a winner at all, so a sign-only
   * sum could never go negative — a -30% EPS collapse beside two small positives
   * would wrongly read as a winner.  Each growth metric and the price reaction is
   * therefore clamped to a sane band (so one extreme outlier can't dominate, but a
   * large miss still outweighs small gains) and summed; margin trend adds a small
   * tilt.  >= 0 leans winner, < 0 leans disappointment.
   */
  private netResultScore(input: {
    revenueGrowth: number | null; profitGrowth: number | null; epsGrowth: number | null;
    marginTrend: number | null; priceReaction: number | null;
  }): number {
    const clamp = (value: number, bound: number) => Math.max(-bound, Math.min(bound, value));
    let net = 0;
    for (const value of [input.revenueGrowth, input.profitGrowth, input.epsGrowth]) {
      if (value !== null) net += clamp(value, 50);
    }
    if (input.priceReaction !== null) net += clamp(input.priceReaction, 15);
    if (input.marginTrend !== null) net += clamp(input.marginTrend, 10);
    return net;
  }

  private isWinner(input: {
    revenueGrowth: number | null;
    profitGrowth: number | null;
    epsGrowth: number | null;
    marginTrend: number | null;
    consistencyScore: number;
    accelerationScore: number;
    priceReaction: number | null;
  }): boolean {
    const positiveGrowthCount = [input.revenueGrowth, input.profitGrowth, input.epsGrowth].filter((value) => value !== null && value > 0).length;
    return positiveGrowthCount >= 2
      && (input.marginTrend === null || input.marginTrend >= 0)
      && (input.consistencyScore >= 60 || input.accelerationScore >= 60 || (input.priceReaction !== null && input.priceReaction >= 2));
  }

  private isDisappointment(input: {
    revenueGrowth: number | null;
    profitGrowth: number | null;
    epsGrowth: number | null;
    marginTrend: number | null;
    priceReaction: number | null;
  }): boolean {
    return [input.revenueGrowth, input.profitGrowth, input.epsGrowth].some((value) => value !== null && value <= -5)
      || (input.marginTrend !== null && input.marginTrend <= -2)
      || (input.priceReaction !== null && input.priceReaction <= -3);
  }

  private reasonTags(input: {
    latest: EarningsFundamentalInput | null;
    revenueGrowth: number | null; profitGrowth: number | null; epsGrowth: number | null; marginTrend: number | null;
    consistencyScore: number; accelerationScore: number; deliveryInterest: boolean; priceReaction: number | null;
    preResultPriceMove: number | null; upcoming: boolean;
    /** Recent result classified via the estimated period-cadence date (US path). */
    derivedRecentResult: boolean;
    /** Set when the result tripped BOTH winner and disappointment guardrails. */
    mixedResult: boolean;
    resultDateSource: EarningsResultDateSource;
    config: EarningsRegionConfig;
  }): string[] {
    const tags: string[] = [];
    if (!input.latest) return tags;
    const periodClass = classifyPeriod(input.latest.periodType);
    if (periodClass === 'QUARTERLY') tags.push('LATEST_QUARTERLY_RESULT');
    if (periodClass === 'ANNUAL') tags.push('LATEST_ANNUAL_RESULT');
    if (periodClass === 'TTM') tags.push('LATEST_TTM_RESULT');
    if (input.latest.source === 'MANUAL_VERIFIED') tags.push('MANUAL_VERIFIED_RESULT');
    if (input.revenueGrowth !== null && input.revenueGrowth > 0) tags.push('REVENUE_GROWTH_POSITIVE');
    if (input.profitGrowth !== null && input.profitGrowth > 0) tags.push('PROFIT_GROWTH_POSITIVE');
    if (input.epsGrowth !== null && input.epsGrowth > 0) tags.push('EPS_GROWTH_POSITIVE');
    if (input.marginTrend !== null && input.marginTrend >= 0) tags.push('MARGIN_STABLE_OR_EXPANDING');
    if (input.consistencyScore >= 70) tags.push('CONSISTENT_EARNINGS_PROGRESS');
    if (input.accelerationScore >= 70) tags.push('EARNINGS_ACCELERATION');
    if (input.deliveryInterest) tags.push('PRE_RESULT_DELIVERY_INTEREST');
    if (input.preResultPriceMove !== null && input.preResultPriceMove >= input.config.preResultPriceMoveThresholdPercent) tags.push('PRE_RESULT_PRICE_INTEREST');
    if (input.priceReaction !== null && input.priceReaction >= 2) tags.push('POSITIVE_RESULT_REACTION');
    if (input.mixedResult) tags.push('MIXED_RESULT'); // tripped both winner and disappointment guardrails
    if (input.upcoming) tags.push('RESULT_WINDOW_ESTIMATED_FROM_PERSISTED_PERIODS');
    if (input.derivedRecentResult) tags.push('RECENT_RESULT_ESTIMATED_FROM_PERIOD_CADENCE'); // timed from period end + lag, not official
    if (input.resultDateSource === 'OFFICIAL_CALENDAR') tags.push('OFFICIAL_RESULT_DATE');
    if (input.resultDateSource === 'PERIOD_END_DATE_FALLBACK') tags.push('RESULT_DATE_FROM_PERIOD_END_FALLBACK'); else if (input.resultDateSource === 'VALIDATED_AT_FALLBACK') tags.push('RESULT_DATE_FROM_VALIDATION_TIMESTAMP_FALLBACK');
    return [...new Set(tags)];
  }

  private riskTags(input: {
    latest: EarningsFundamentalInput | null;
    quarterlyCount: number;
    annualCount: number;
    ttmCount: number;
    freshness: EarningsFreshness;
    revenueGrowth: number | null;
    profitGrowth: number | null;
    epsGrowth: number | null;
    marginTrend: number | null;
    consistencyScore: number;
    priceReaction: number | null;
    prices: EarningsPricePointInput[];
    estimatedResultDate: boolean;
    authoritativeResultDate: boolean;
  }): string[] {
    const tags: string[] = [];
    if (!input.latest) tags.push('MISSING_EARNINGS_FUNDAMENTALS');
    if (input.estimatedResultDate) tags.push('ESTIMATED_RESULT_DATE');
    // A TTM series (US trailing-twelve-month) is genuine earnings data: it should
    // not be reported as both "missing quarterly" and "missing annual".  Only flag
    // the gap when there is no usable series of any kind for that cadence.
    if (input.quarterlyCount === 0 && input.ttmCount === 0) tags.push('MISSING_QUARTERLY_RESULTS');
    if (input.annualCount === 0 && input.ttmCount === 0) tags.push('MISSING_ANNUAL_RESULTS');
    if (input.freshness === 'STALE') tags.push('STALE_EARNINGS_DATA');
    if (input.freshness === 'PARTIAL') tags.push('PARTIAL_EARNINGS_FRESHNESS');
    if ([input.revenueGrowth, input.profitGrowth, input.epsGrowth].some((value) => value !== null && value < 0)) tags.push('NEGATIVE_GROWTH_PRESENT');
    if (input.marginTrend !== null && input.marginTrend < 0) tags.push('MARGIN_COMPRESSION');
    if (input.consistencyScore > 0 && input.consistencyScore < 50) tags.push('LOW_EARNINGS_CONSISTENCY');
    if (input.prices.length === 0) tags.push('MISSING_PRICE_REACTION_DATA');
    else if (!input.authoritativeResultDate) tags.push('PRICE_REACTION_REQUIRES_OFFICIAL_RESULT_DATE');
    else if (input.priceReaction === null) tags.push('INSUFFICIENT_RESULT_REACTION_WINDOW');
    return [...new Set(tags)];
  }

  private deliveryInterest(deliverySnapshots: EarningsSnapshotCalculationInput['deliverySnapshots'], config: EarningsRegionConfig): boolean {
    const recent = [...deliverySnapshots]
      .filter((snapshot) => snapshot.deliveryPercent !== null)
      .sort((left, right) => right.tradingDate.getTime() - left.tradingDate.getTime())
      .slice(0, 10);
    if (recent.length === 0) return false;
    const latest = recent[0].deliveryPercent ?? 0;
    const average = recent.reduce((sum, snapshot) => sum + Number(snapshot.deliveryPercent || 0), 0) / recent.length;
    return latest >= config.deliveryInterestAbsolutePercent || latest >= average + config.deliveryInterestRelativePercent;
  }

  /**
   * Calculate the price reaction following an earnings result.
   *
   * The "after" bar is the first available bar at or after
   * `resultDate + config.priceReactionSessions` trading sessions.  Using trading
   * sessions instead of raw calendar days means holiday / long-weekend clusters
   * do not shift the comparison bar into a different trading week.
   *
   * Holiday-calendar injection is not available at this synchronous call site;
   * `addTradingSessions` is called weekend-only (no holiday set), which is safe:
   * in the worst case the target date is one calendar day early and the
   * `sorted.find` scan then naturally picks the next available bar.
   */
  private priceReaction(prices: EarningsPricePointInput[], resultDate: Date, region: string, config: EarningsRegionConfig): number | null {
    const sorted = this.sortPricesAscending(prices);
    if (sorted.length < 2) return null;
    const before = [...sorted].reverse().find((price) => price.timestamp <= resultDate);
    if (!before || before.close <= 0) return null;

    const sessions = config.priceReactionSessions;
    const resultDateStr = resultDate.toISOString().slice(0, 10);
    const { date: targetDateStr } = addTradingSessions(region, resultDateStr, sessions);
    const targetMs = targetDateStr
      ? Date.parse(`${targetDateStr}T00:00:00.000Z`)
      // Weekend-only fallback (~7 calendar days per 5 sessions) when the region's
      // trading calendar is unavailable.
      : resultDate.getTime() + sessions * 7 * 24 * 60 * 60 * 1000 / 5;

    const after = sorted.find((price) => price.timestamp.getTime() >= targetMs);
    if (!after) return null;
    return round2(((after.close - before.close) / before.close) * 100);
  }

  private priceMove(prices: EarningsPricePointInput[], lookbackBars: number): number | null {
    const sorted = [...prices].sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime());
    if (sorted.length <= lookbackBars) return null;
    const latest = sorted[0];
    const previous = sorted[lookbackBars];
    if (previous.close <= 0) return null;
    return round2(((latest.close - previous.close) / previous.close) * 100);
  }

  private freshness(snapshotDate: Date, latest: EarningsFundamentalInput | null, config: EarningsRegionConfig): EarningsFreshness {
    if (!latest) return 'MISSING';
    const latestDate = safeUtcDay(latest.periodEndDate);
    const ageDays = latestDate ? daysBetween(latestDate, snapshotDate) : Number.POSITIVE_INFINITY;
    if (ageDays <= config.freshnessFreshMaxDays) return 'FRESH';
    if (ageDays <= config.freshnessPartialMaxDays) return 'PARTIAL';
    return 'STALE';
  }

  private findComparisonRecord(latest: EarningsFundamentalInput, records: EarningsFundamentalInput[]): EarningsFundamentalInput | null {
    const latestPeriodEnd = safeUtcDay(latest.periodEndDate);
    if (!latestPeriodEnd) return null;
    const sameType = records
      .filter((record) => {
        const recordPeriodEnd = safeUtcDay(record.periodEndDate);
        return Boolean(recordPeriodEnd && record.id !== latest.id && record.periodType === latest.periodType && recordPeriodEnd < latestPeriodEnd);
      })
      .sort((left, right) => this.dateTime(right.periodEndDate) - this.dateTime(left.periodEndDate));
    const samePeriodLastYear = sameType.find((record) => {
      const recordPeriodEnd = safeUtcDay(record.periodEndDate);
      if (!recordPeriodEnd) return false;
      const monthMatches = recordPeriodEnd.getUTCMonth() === latestPeriodEnd.getUTCMonth();
      const diffDays = this.daysBetween(recordPeriodEnd, latestPeriodEnd);
      return monthMatches && diffDays >= 300 && diffDays <= 430;
    });
    return samePeriodLastYear || sameType[0] || null;
  }

  private expectedResultDate(latest: EarningsFundamentalInput, periodClass: EarningsPeriodClass, config: EarningsRegionConfig): Date | null {
    const periodEnd = safeUtcDay(latest.periodEndDate);
    if (!periodEnd) return null;
    // Quarterly and TTM cadences both refresh each quarter; annual uses the
    // longer year cadence.  All offsets come from the region config.
    if (periodClass === 'QUARTERLY' || periodClass === 'TTM') {
      const nextPeriodEnd = addMonths(periodEnd, config.quarterlyCadenceMonths);
      return addDays(nextPeriodEnd, config.quarterlyCadenceLagDays);
    }
    return addDays(addMonths(periodEnd, config.annualCadenceMonths), config.annualCadenceLagDays);
  }

  private resolveResultDate(
    latest: EarningsFundamentalInput | null,
    expectedResultDate: Date | null,
    snapshotDate: Date
  ): {
    resultDate: Date | null;
    resultDateSource: EarningsResultDateSource;
    daysToResult: number | null;
  } {
    if (!latest) {
      return { resultDate: null, resultDateSource: 'UNKNOWN', daysToResult: null };
    }

    const officialResultDate = safeUtcDay(latest.officialResultDate ?? null);
    if (officialResultDate) {
      const daysToResult = this.daysBetween(snapshotDate, officialResultDate);
      return { resultDate: officialResultDate, resultDateSource: 'OFFICIAL_CALENDAR', daysToResult: daysToResult >= 0 ? daysToResult : null };
    }

    // Phase 3: emit an honest forward estimate projected from the persisted period
    // cadence (periodEnd + cadence + lag), surfaced with an "Estimated" badge.  Only
    // when the projection is still in the future; a past projection means the result
    // is overdue with no official date, which stays DATE_TBA (no fabricated date).
    if (expectedResultDate) {
      const daysToResult = this.daysBetween(snapshotDate, expectedResultDate);
      return daysToResult >= 0
        ? { resultDate: expectedResultDate, resultDateSource: 'ESTIMATED_FROM_CADENCE', daysToResult }
        : { resultDate: null, resultDateSource: 'DATE_TBA', daysToResult: null };
    }

    const periodEndDate = safeUtcDay(latest.periodEndDate);
    if (periodEndDate) {
      return { resultDate: periodEndDate, resultDateSource: 'PERIOD_END_DATE_FALLBACK', daysToResult: null };
    }

    const validatedAt = safeUtcDay(latest.validatedAt ?? null);
    if (validatedAt) {
      return { resultDate: validatedAt, resultDateSource: 'VALIDATED_AT_FALLBACK', daysToResult: null };
    }

    return { resultDate: null, resultDateSource: 'UNKNOWN', daysToResult: null };
  }

  private sortFundamentals(records: EarningsFundamentalInput[]): EarningsFundamentalInput[] {
    return [...records].sort((left, right) => this.dateTime(right.periodEndDate) - this.dateTime(left.periodEndDate));
  }

  private sortPricesAscending(prices: EarningsPricePointInput[]): EarningsPricePointInput[] {
    return [...prices].sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime());
  }

  private growth(current: number | null, previous: number | null): number | null {
    if (current === null || previous === null || previous === 0) return null;
    return round2(((current - previous) / Math.abs(previous)) * 100);
  }

  private marginTrend(current: EarningsFundamentalInput | null | undefined, previous: EarningsFundamentalInput | null | undefined): number | null {
    const currentMargin = current ? this.margin(current) : null;
    const previousMargin = previous ? this.margin(previous) : null;
    if (currentMargin === null || previousMargin === null) return null;
    return round2(currentMargin - previousMargin);
  }

  private margin(record: EarningsFundamentalInput): number | null {
    if (record.revenue === null || record.netIncome === null || record.revenue === 0) return null;
    return (record.netIncome / Math.abs(record.revenue)) * 100;
  }

  private groupByCategory(rows: EarningsSnapshotDto[], limit: number): Record<EarningsIntelligenceCategory, EarningsSnapshotDto[]> {
    const grouped = emptyCategoryBuckets();
    for (const category of EARNINGS_INTELLIGENCE_CATEGORIES) {
      const categoryRows = rows.filter((row) => row.categories.includes(category));
      if (category === 'UPCOMING_RESULTS') {
        // Order by date-provenance tier, then soonest first within a tier:
        //   (2) official dates first (most reliable), soonest first;
        //   (1) Phase 3 ESTIMATED_FROM_CADENCE dates next, soonest first;
        //   (0) DATE_TBA / legacy estimated (no forward date) at the end;
        // consistencyScore desc breaks ties within each tier.
        grouped[category] = categoryRows
          .sort((left, right) => {
            const leftTier = this.upcomingDateTier(left);
            const rightTier = this.upcomingDateTier(right);
            if (leftTier !== rightTier) return rightTier - leftTier; // higher tier first
            if (leftTier > 0) {
              const daysDiff = (left.daysToResult as number) - (right.daysToResult as number);
              if (daysDiff !== 0) return daysDiff; // soonest first
            }
            return right.consistencyScore - left.consistencyScore; // tiebreak
          })
          .slice(0, limit);
      } else {
        grouped[category] = categoryRows.slice(0, limit);
      }
    }
    return grouped;
  }

  /**
   * Date-provenance tier used to order UPCOMING_RESULTS: official forward dates
   * (2) rank above Phase 3 cadence estimates (1), which rank above rows with no
   * forward date (0).  Only rows with a non-null daysToResult can be "dated".
   */
  private upcomingDateTier(row: EarningsSnapshotDto): number {
    if (row.daysToResult === null) return 0;
    if (row.resultDateSource === 'OFFICIAL_CALENDAR') return 2;
    if (row.resultDateSource === 'ESTIMATED_FROM_CADENCE') return 1;
    return 0;
  }

  private countCategories(rows: EarningsSnapshotDto[]): Record<EarningsIntelligenceCategory, number> {
    const counts = emptyCategoryCounts();
    for (const row of rows) {
      for (const category of row.categories) counts[category] += 1;
    }
    return counts;
  }

  private responseWarnings(rows: EarningsSnapshotDto[], truncated: boolean): string[] {
    const warnings: string[] = [];
    const summary = this.provenanceSummary(rows);
    if (truncated) warnings.push('Snapshot read was truncated at the backend safety limit.');
    if (summary.rowCount > 0 && summary.officialCalendarRows === 0) {
      warnings.push('OFFICIAL_CALENDAR_NOT_AVAILABLE');
    }
    if (summary.tbaDatesRows > 0) {
      warnings.push(`${summary.tbaDatesRows} instrument(s) do not yet have an official result date announcement (Date TBA).`);
    }
    if (summary.resultDateSourceCounts.PERIOD_END_DATE_FALLBACK > 0) {
      warnings.push('Some result dates use the fiscal period end as a fallback and are not earnings announcement dates.');
    }
    if (summary.resultDateSourceCounts.VALIDATED_AT_FALLBACK > 0) {
      warnings.push('Some result dates use validation timestamps as a fallback and are not earnings announcement dates.');
    }
    if (summary.warningCounts.RESULT_REACTION_REQUIRES_OFFICIAL_RESULT_DATE > 0) {
      warnings.push('Result reaction history requires official earnings dates and is limited for fallback-date rows.');
    }
    return [...new Set(warnings)];
  }

  private provenanceSummary(rows: EarningsSnapshotDto[]): EarningsProvenanceSummary {
    const resultDateSourceCounts: Record<string, number> = {};
    const warningCounts: Record<string, number> = {};
    for (const row of rows) {
      resultDateSourceCounts[row.resultDateSource || 'UNKNOWN'] = (resultDateSourceCounts[row.resultDateSource || 'UNKNOWN'] || 0) + 1;
      for (const warning of row.warnings || []) {
        warningCounts[warning] = (warningCounts[warning] || 0) + 1;
      }
    }
    return {
      rowCount: rows.length,
      resultDateSourceCounts,
      warningCounts,
      officialCalendarRows: resultDateSourceCounts.OFFICIAL_CALENDAR || 0,
      // tbaDatesRows counts both new DATE_TBA rows and legacy
      // ESTIMATED_FROM_PERIOD_CADENCE rows not yet re-materialised.
      tbaDatesRows: (resultDateSourceCounts.DATE_TBA || 0) + (resultDateSourceCounts.ESTIMATED_FROM_PERIOD_CADENCE || 0),
      estimatedRows: resultDateSourceCounts.ESTIMATED_FROM_PERIOD_CADENCE || 0,
      fallbackRows: (resultDateSourceCounts.PERIOD_END_DATE_FALLBACK || 0) + (resultDateSourceCounts.VALIDATED_AT_FALLBACK || 0),
      unknownRows: resultDateSourceCounts.UNKNOWN || 0,
    };
  }

  private responseFreshness(rows: EarningsSnapshotDto[]): EarningsFreshness {
    if (rows.some((row) => row.freshness === 'FRESH')) return 'FRESH';
    if (rows.some((row) => row.freshness === 'PARTIAL')) return 'PARTIAL';
    if (rows.some((row) => row.freshness === 'STALE')) return 'STALE';
    return 'MISSING';
  }

  private refreshStatus(totalCount: number, processedCount: number, succeededCount: number, failedCount: number, skippedCount: number): EarningsIntelligenceRefreshResult['status'] {
    if (totalCount === 0 || processedCount === 0) return 'SKIPPED';
    if (failedCount > 0 && succeededCount === 0) return 'FAILED';
    if (failedCount > 0 || skippedCount > 0 || processedCount < totalCount) return 'PARTIAL';
    return 'COMPLETED';
  }

  /** Warnings for a region with no dedicated earnings config (graceful default). */
  private scopeWarnings(region: string): string[] {
    if (isSupportedEarningsRegion(region)) return [];
    return [
      `Region "${region}" has no dedicated Earnings Intelligence configuration; default (${DEFAULT_EARNINGS_REGION}) tuning is applied. Supported regions: ${supportedEarningsRegions().join(', ')}.`,
    ];
  }

  private normalizeScope(query: EarningsIntelligenceQuery): EarningsIntelligenceQuery {
    const region = normalizeRegionCode(query.region ?? DEFAULT_EARNINGS_REGION);
    const assetType = this.normalizeText(query.assetType, this.regionConfig(region).defaultAssetType).toUpperCase();
    return {
      region,
      assetType,
      limit: this.normalizeLimit(query.limit),
      ...(query.category ? { category: query.category } : {}),
    };
  }

  private normalizeBatchSize(value: unknown): number {
    const parsed = Number(value);
    if (!Number.isInteger(parsed)) return 25;
    return Math.max(1, Math.min(parsed, 100));
  }

  private normalizeLimit(value: number): number {
    return Math.max(1, Math.min(Math.floor(Number(value) || 25), 100));
  }

  private normalizeText(value: unknown, fallback: string): string {
    const text = String(value ?? fallback).trim();
    return text.length > 0 ? text : fallback;
  }

  private normalizeIds(values: string[] | undefined): string[] | undefined {
    const ids = [...new Set((values || []).map((value) => String(value || '').trim()).filter(Boolean))];
    return ids.length > 0 ? ids : undefined;
  }

  // Thin instance wrappers so existing call sites read naturally; the
  // implementations live in the shared date-utils module.
  private dateTime(date: Date | null | undefined): number {
    return dateTime(date);
  }

  private daysBetween(left: Date, right: Date): number {
    return daysBetween(left, right);
  }
}

export { CALCULATION_VERSION, CALCULATION_VERSION as EARNINGS_INTELLIGENCE_CALCULATION_VERSION };
