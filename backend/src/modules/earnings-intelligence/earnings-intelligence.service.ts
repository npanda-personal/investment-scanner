import { EarningsIntelligenceRepository } from './earnings-intelligence.repository';
import { SignalGenerationEngineService } from '../signal-generation-engine';
import type { SignalResultDto } from '../signal-generation-engine';
import { CALCULATION_VERSION } from './earnings-intelligence.constants';
import { emptyCategoryBuckets, emptyCategoryCounts } from './earnings-intelligence.categories';
import {
  classifyPeriod,
  isAnnualPeriod,
  isQuarterlyPeriod,
  isTtmPeriod,
  type EarningsPeriodClass,
} from './earnings-intelligence.period';
import { daysBetween, maxDate, safeUtcDay, startOfUtcDay } from './earnings-intelligence.date-utils';
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
import {
  averageOfRecentQoQ,
  calculateAccelerationScore,
  calculateConsistencyScore,
  epsGrowthTrendScore,
  expectedResultDate,
  findPriorQuarter,
  findYearAgoRecord,
  growth,
  marginTrend,
  qoqGrowthSeries,
  resolveResultDate,
  sortFundamentals,
} from './earnings-intelligence.growth-series';
import {
  categories,
  classifyResult,
  countCategories,
  groupByCategory,
  reasonTags,
  riskTags,
} from './earnings-intelligence.classification';
import {
  deliveryInterest,
  freshness,
  priceMove,
  priceReaction,
} from './earnings-intelligence.price-glue';
import {
  collectDisplayRows,
  normalizeBatchSize,
  normalizeIds,
  normalizeScope,
  normalizeText,
  provenanceSummary,
  refreshStatus,
  responseFreshness,
  responseWarnings,
  toSignalSummary,
} from './earnings-intelligence.response';
import type {
  EarningsIntelligenceQuery,
  EarningsIntelligenceRefreshRequest,
  EarningsIntelligenceRefreshResult,
  EarningsIntelligenceResponse,
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
    const normalized = normalizeScope({ region, assetType, limit: 5000 }, (r) => this.regionConfig(r));
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
    const normalized = normalizeScope(query, (r) => this.regionConfig(r));
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
        provenance: provenanceSummary([]),
      };
    }

    const grouped = groupByCategory(latest.rows, normalized.limit);
    let categoryBuckets = grouped;
    let items: EarningsSnapshotDto[];
    if (query.category) {
      // When the caller scopes to a single category, only that bucket is
      // meaningful (the repository already filtered rows to it).  Present a map
      // with just that bucket populated rather than a misleadingly-sparse map of
      // every category cross-filtered by the requested one.
      items = grouped[query.category];
      categoryBuckets = { ...emptyCategoryBuckets(), [query.category]: items };
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
    const signalWarnings = await this.attachSignals(collectDisplayRows(items, categoryBuckets));

    return {
      scope: { region: normalized.region, assetType: normalized.assetType },
      snapshotDate: latest.snapshotDate,
      dataThroughDate: latest.dataThroughDate,
      generatedAt: now.toISOString(),
      freshness: responseFreshness(latest.rows),
      categories: categoryBuckets,
      items,
      warnings: [...scopeWarnings, ...responseWarnings(latest.rows, latest.truncated), ...signalWarnings],
      provenance: provenanceSummary(latest.rows),
    };
  }

  /**
   * Attach the latest TRUSTED trading signal to each row, joined read-time from
   * the persisted signal snapshot.  Mutates rows in place.  On success, rows
   * without a trusted signal get `signal: null`; on a join failure the field is
   * left undefined and a single warning is returned (whole-response provenance).
   */
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
        row.signal = match ? toSignalSummary(match) : null;
      }
      return [];
    } catch {
      // Leave `signal` undefined (distinct from null = "no trusted signal") so
      // the UI can tell "join failed" from "no signal exists".
      return ['Signal enrichment failed for this snapshot; results are shown without signals.'];
    }
  }

  async refreshSnapshots(request: EarningsIntelligenceRefreshRequest = {}): Promise<EarningsIntelligenceRefreshResult> {
    const region = normalizeRegionCode(request.region ?? DEFAULT_EARNINGS_REGION);
    const assetType = normalizeText(request.assetType, this.regionConfig(region).defaultAssetType).toUpperCase();
    const snapshotDate = startOfUtcDay(request.snapshotDate || new Date());
    const requestedDataThroughDate = request.dataThroughDate ? startOfUtcDay(request.dataThroughDate) : null;
    const batchSize = normalizeBatchSize(request.batchSize);
    const offset = Math.max(0, Math.floor(Number(request.offset) || 0));
    const instrumentIds = normalizeIds(request.instrumentIds);
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
      status: refreshStatus(totalCount, processedCount, succeededCount, failedCount, skippedCount),
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
      categories: countCategories(saved),
    };
  }

  calculateSnapshot(input: EarningsSnapshotCalculationInput): EarningsSnapshotUpsertInput {
    const config = this.regionConfig(input.region);
    const fundamentals = sortFundamentals(input.fundamentals);
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
    // Phase 2 — two distinct comparables instead of one ambiguous record:
    //   priorQuarter — most-recent prior comparable (dense) → QoQ + the legacy alias.
    //   yearAgo      — same quarter one year ago, or null → YoY (no silent fallback).
    const priorQuarter = latest ? findPriorQuarter(latest, fundamentals) : null;
    const yearAgo = latest ? findYearAgoRecord(latest, fundamentals) : null;
    const periodEndDate = latest ? safeUtcDay(latest.periodEndDate) : null;
    const validatedAt = latest ? safeUtcDay(latest.validatedAt ?? null) : null;
    const projectedResultDate = latest ? expectedResultDate(latest, latestClass, config) : null;
    const dateResolution = resolveResultDate(latest, projectedResultDate, input.snapshotDate, config);
    const resultDate = dateResolution.resultDate;
    const resultDateSource = dateResolution.resultDateSource;
    const daysToResult = dateResolution.daysToResult;
    // QoQ (vs prior quarter) drives the legacy alias and all downstream scoring —
    // it is the dense, current basis.  YoY is computed independently and stays null
    // when no true year-ago comparable exists.
    const revenueGrowthQoQ = growth(latest?.revenue ?? null, priorQuarter?.revenue ?? null);
    const profitGrowthQoQ = growth(latest?.netIncome ?? null, priorQuarter?.netIncome ?? null);
    const epsGrowthQoQ = growth(latest?.eps ?? null, priorQuarter?.eps ?? null);
    const revenueGrowthYoY = growth(latest?.revenue ?? null, yearAgo?.revenue ?? null);
    const profitGrowthYoY = growth(latest?.netIncome ?? null, yearAgo?.netIncome ?? null);
    const epsGrowthYoY = growth(latest?.eps ?? null, yearAgo?.eps ?? null);
    const revenueGrowth = revenueGrowthQoQ;
    const profitGrowth = profitGrowthQoQ;
    const epsGrowth = epsGrowthQoQ;
    const growthComparisonBasis = priorQuarter ? 'QOQ' : null;
    const mt = marginTrend(latest, priorQuarter);
    const consistencyScore = calculateConsistencyScore(primarySeries);
    const accelerationScore = calculateAccelerationScore(primarySeries);
    // Tab-redesign sort metrics: consecutive QoQ deltas across the same-class series
    // (newest-first), summarised over a trailing window.  Profit avg drives the
    // Result Winners/Disappointments sort; the EPS trend drives the Growth tab.
    const avgProfitGrowthQoQ4q = averageOfRecentQoQ(qoqGrowthSeries(primarySeries, 'netIncome'), 4, 2);
    const epsGrowthTrend = epsGrowthTrendScore(qoqGrowthSeries(primarySeries, 'eps'));
    const di = deliveryInterest(input.deliverySnapshots, config);
    const reactionDate = resultDateSource === 'OFFICIAL_CALENDAR' ? resultDate : null;
    const pr = reactionDate ? priceReaction(input.prices, reactionDate, input.region, config) : null;
    // Derived recent-result path (US / forward-date providers): engages ONLY when
    // the official path did NOT already yield a recent past result (the IN path).
    // See earnings-intelligence.derived-result.ts for the full rationale.
    const officialRecentResult = resultDateSource === 'OFFICIAL_CALENDAR' && resultDate !== null
      && resultDate <= input.snapshotDate && daysBetween(resultDate, input.snapshotDate) <= config.recentResultWindowDays;
    const derived = deriveRecentResult({
      latest, snapshotDate: input.snapshotDate, config, officialRecentResult,
      computePriceReaction: (date) => priceReaction(input.prices, date, input.region, config),
    });
    const preResultPriceMove = priceMove(input.prices, config.preResultPriceMoveLookbackBars);
    const fr = freshness(input.snapshotDate, latest, config);
    // Single source of truth for the post-result classification.  A row can trip
    // BOTH the winner and disappointment guardrails (e.g. strong growth but a
    // negative price reaction); resolve it to exactly ONE bucket via net evidence
    // so no row appears in both tabs, and flag the genuinely-mixed case.
    const recentResult = officialRecentResult || derived.applies;
    const reactionForGates = officialRecentResult ? pr : derived.priceReaction;
    const resultClass = classifyResult({
      recentResult, revenueGrowth, profitGrowth, epsGrowth, marginTrend: mt,
      consistencyScore, accelerationScore, priceReaction: reactionForGates,
    });
    const rt = reasonTags({
      latest, revenueGrowth, profitGrowth, epsGrowth, marginTrend: mt, consistencyScore, accelerationScore,
      deliveryInterest: di, priceReaction: pr, preResultPriceMove, derivedRecentResult: derived.applies,
      upcoming: (resultDateSource === 'OFFICIAL_CALENDAR' || resultDateSource === 'ESTIMATED_FROM_CADENCE') && daysToResult !== null && daysToResult >= 0,
      mixedResult: resultClass.mixed, resultDateSource: resultDateSource as any, config,
    });
    const rk = riskTags({
      latest, quarterlyCount: quarterly.length, annualCount: annual.length, ttmCount: ttm.length, freshness: fr,
      revenueGrowth, profitGrowth, epsGrowth, marginTrend: mt, consistencyScore, priceReaction: pr, prices: input.prices,
      estimatedResultDate: resultDateSource === 'DATE_TBA' || resultDateSource === 'ESTIMATED_FROM_PERIOD_CADENCE' || resultDateSource === 'ESTIMATED_FROM_CADENCE',
      authoritativeResultDate: resultDateSource === 'OFFICIAL_CALENDAR',
    });
    const warnings = rowWarningsForSource(resultDateSource as any);
    const cats = categories({
      snapshotDate: input.snapshotDate, resultDate, resultDateSource: resultDateSource as any, daysToResult,
      consistencyScore, accelerationScore, deliveryInterest: di, priceReaction: pr,
      preResultPriceMove, freshness: fr, config,
      winner: resultClass.winner, disappointment: resultClass.disappointment,
      growthEligible: epsGrowthTrend !== null,
    });
    // Numeric technicals bundle (Phase 3) from the already-loaded price/delivery
    // history — no extra reads.  Each field degrades to null on a short warm-up.
    const technicals = computeEarningsTechnicals(input.prices, input.deliverySnapshots);
    const dataThroughDate = maxDate([input.dataThroughDate, latest?.validatedAt ?? null, latest?.lastUpdatedTimestamp ?? null, latest?.periodEndDate ?? null, input.prices[0]?.timestamp ?? null, input.deliverySnapshots[0]?.tradingDate ?? null]);

    const resultDateLabel: EarningsSnapshotUpsertInput['resultDateLabel'] = resultDateLabelFor(resultDateSource as any);

    return {
      snapshotDate: input.snapshotDate,
      dataThroughDate,
      stockId: input.stockId,
      symbol: input.symbol,
      scopeRegion: input.region,
      scopeAssetType: input.assetType,
      resultDate,
      resultDateLabel,
      resultDateSource: resultDateSource as any,
      periodEndDate,
      validatedAt,
      daysToResult,
      revenueGrowth,
      profitGrowth,
      epsGrowth,
      revenueGrowthQoQ,
      profitGrowthQoQ,
      epsGrowthQoQ,
      revenueGrowthYoY,
      profitGrowthYoY,
      epsGrowthYoY,
      growthComparisonBasis,
      marginTrend: mt,
      consistencyScore,
      accelerationScore,
      avgProfitGrowthQoQ4q,
      epsGrowthTrendScore: epsGrowthTrend,
      reasonTags: rt,
      riskTags: rk,
      warnings,
      freshness: fr,
      categories: cats,
      // name is joined read-time in the repository; the write path has no value.
      name: null,
      ...technicals,
    };
  }

  /** Warnings for a region with no dedicated earnings config (graceful default). */
  private scopeWarnings(region: string): string[] {
    if (isSupportedEarningsRegion(region)) return [];
    return [
      `Region "${region}" has no dedicated Earnings Intelligence configuration; default (${DEFAULT_EARNINGS_REGION}) tuning is applied. Supported regions: ${supportedEarningsRegions().join(', ')}.`,
    ];
  }
}

export { CALCULATION_VERSION, CALCULATION_VERSION as EARNINGS_INTELLIGENCE_CALCULATION_VERSION };
