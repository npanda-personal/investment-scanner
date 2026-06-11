import { EarningsIntelligenceRepository } from './earnings-intelligence.repository';
import { EARNINGS_INTELLIGENCE_CATEGORIES } from './earnings-intelligence.validation';
import { addTradingSessions } from '../market-data-foundation';
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
  EarningsSnapshotCalculationInput,
  EarningsSnapshotDto,
  EarningsSnapshotUpsertInput,
} from './earnings-intelligence.types';

const CALCULATION_VERSION = 'earnings-intelligence-v1';
/**
 * How many calendar days ahead of the snapshot date to look for upcoming results.
 *
 * NSE Q4FY results typically fall 45–75 days after the period end (March 31),
 * i.e. mid-May through mid-July.  90 days covers the full Q4 result window
 * and also the first weeks of the Q1FY window when the calendar is clear.
 * 45 days was too tight: Q4FY26 results (estimated ~Aug 14) were 70+ days
 * from the June 2026 snapshot dates, leaving UPCOMING_RESULTS permanently empty.
 */
const UPCOMING_WINDOW_DAYS = 90;
const RECENT_RESULT_WINDOW_DAYS = 60;

/**
 * Number of trading sessions after the result date used as the "after" bar
 * for the price-reaction calculation.
 *
 * 5 trading sessions (≈ 1 calendar week of actual market days) is chosen
 * because:
 *  - It matches the original intent of "5 days after results" but in trading
 *    days so that Diwali / Holi / long-weekend clusters do not shift the bar
 *    into a different week of trading.
 *  - Post-result price discovery in Indian markets typically stabilises
 *    within 3–5 trading sessions.
 */
const PRICE_REACTION_TRADING_SESSIONS = 5;

export class EarningsIntelligenceService {
  constructor(private readonly repository = new EarningsIntelligenceRepository()) {}

  /**
   * Returns a Map<symbol, proximity> from the latest persisted earnings snapshot.
   * Only includes rows that have a `daysToResult` value (i.e., UPCOMING_RESULTS
   * or ESTIMATED_FROM_PERIOD_CADENCE with a forward window).
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
    const latest = await this.repository.latestSnapshot({ ...normalized, category: query.category, limit: query.limit });
    if (!latest.snapshotDate) {
      return {
        scope: {
          region: normalized.region,
          assetType: normalized.assetType,
        },
        snapshotDate: latest.snapshotDate,
        dataThroughDate: latest.dataThroughDate,
        generatedAt: now.toISOString(),
        freshness: 'NO_SNAPSHOT',
        categories: this.emptyCategoryBuckets(),
        items: [],
        warnings: ['Earnings Intelligence snapshot is not ready yet. Run the backend refresh pipeline to materialize it.'],
        provenance: this.provenanceSummary([]),
      };
    }

    const grouped = this.groupByCategory(latest.rows, normalized.limit);
    const items = query.category ? grouped[query.category] : latest.rows.slice(0, normalized.limit);
    return {
      scope: {
        region: normalized.region,
        assetType: normalized.assetType,
      },
      snapshotDate: latest.snapshotDate,
      dataThroughDate: latest.dataThroughDate,
      generatedAt: now.toISOString(),
      freshness: this.responseFreshness(latest.rows),
      categories: grouped,
      items,
      warnings: this.responseWarnings(latest.rows, latest.truncated),
      provenance: this.provenanceSummary(latest.rows),
    };
  }

  async refreshSnapshots(request: EarningsIntelligenceRefreshRequest = {}): Promise<EarningsIntelligenceRefreshResult> {
    const region = this.normalizeText(request.region, 'IN').toUpperCase();
    const assetType = this.normalizeText(request.assetType, 'STOCK').toUpperCase();
    const snapshotDate = this.startOfUtcDay(request.snapshotDate || new Date());
    const requestedDataThroughDate = request.dataThroughDate ? this.startOfUtcDay(request.dataThroughDate) : null;
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
        categories: this.emptyCategoryCounts(),
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
      unchangedCount: 0,
      nextOffset: hasMore ? nextOffset : null,
      hasMore,
      warnings,
      errors,
      categories: this.countCategories(saved),
    };
  }

  calculateSnapshot(input: EarningsSnapshotCalculationInput): EarningsSnapshotUpsertInput {
    const fundamentals = this.sortFundamentals(input.fundamentals);
    const quarterly = fundamentals.filter((record) => this.isQuarterly(record.periodType));
    const annual = fundamentals.filter((record) => this.isAnnual(record.periodType));
    const latest = quarterly[0] || annual[0] || fundamentals[0] || null;
    const comparison = latest ? this.findComparisonRecord(latest, fundamentals) : null;
    const periodEndDate = latest ? this.safeUtcDay(latest.periodEndDate) : null;
    const validatedAt = latest ? this.safeUtcDay(latest.validatedAt ?? null) : null;
    const expectedResultDate = latest ? this.expectedResultDate(latest, quarterly.length > 0) : null;
    const dateResolution = this.resolveResultDate(latest, expectedResultDate, input.snapshotDate);
    const resultDate = dateResolution.resultDate;
    const resultDateSource = dateResolution.resultDateSource;
    const daysToResult = dateResolution.daysToResult;
    const revenueGrowth = this.growth(latest?.revenue ?? null, comparison?.revenue ?? null);
    const profitGrowth = this.growth(latest?.netIncome ?? null, comparison?.netIncome ?? null);
    const epsGrowth = this.growth(latest?.eps ?? null, comparison?.eps ?? null);
    const marginTrend = this.marginTrend(latest, comparison);
    const consistencyScore = this.calculateConsistencyScore(fundamentals);
    const accelerationScore = this.calculateAccelerationScore(fundamentals);
    const deliveryInterest = this.deliveryInterest(input.deliverySnapshots);
    const reactionDate = resultDateSource === 'OFFICIAL_CALENDAR' ? resultDate : null;
    const priceReaction = reactionDate ? this.priceReaction(input.prices, reactionDate, input.region) : null;
    const preResultPriceMove = this.priceMove(input.prices, 10);
    const freshness = this.freshness(input.snapshotDate, latest);
    const reasonTags = this.reasonTags({
      latest,
      revenueGrowth,
      profitGrowth,
      epsGrowth,
      marginTrend,
      consistencyScore,
      accelerationScore,
      deliveryInterest,
      priceReaction,
      preResultPriceMove,
      upcoming: resultDateSource === 'OFFICIAL_CALENDAR' && daysToResult !== null && daysToResult >= 0,
      resultDateSource,
    });
    const riskTags = this.riskTags({
      latest,
      quarterlyCount: quarterly.length,
      annualCount: annual.length,
      freshness,
      revenueGrowth,
      profitGrowth,
      epsGrowth,
      marginTrend,
      consistencyScore,
      priceReaction,
      prices: input.prices,
      estimatedResultDate: resultDateSource === 'DATE_TBA' || resultDateSource === 'ESTIMATED_FROM_PERIOD_CADENCE',
      authoritativeResultDate: resultDateSource === 'OFFICIAL_CALENDAR',
    });
    const warnings = this.rowWarnings(resultDateSource);
    const categories = this.categories({
      snapshotDate: input.snapshotDate,
      resultDate,
      resultDateSource,
      daysToResult,
      revenueGrowth,
      profitGrowth,
      epsGrowth,
      marginTrend,
      consistencyScore,
      accelerationScore,
      deliveryInterest,
      priceReaction,
      preResultPriceMove,
      freshness,
    });
    const dataThroughDate = this.maxDate([
      input.dataThroughDate,
      latest?.validatedAt ?? null,
      latest?.lastUpdatedTimestamp ?? null,
      latest?.periodEndDate ?? null,
      input.prices[0]?.timestamp ?? null,
      input.deliverySnapshots[0]?.tradingDate ?? null,
    ]);

    const resultDateLabel: EarningsSnapshotUpsertInput['resultDateLabel'] =
      resultDateSource === 'OFFICIAL_CALENDAR' ? 'Official'
      : resultDateSource === 'DATE_TBA' ? 'TBA'
      : null;

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
    return checks === 0 ? 0 : this.round((passed / checks) * 100);
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
    return checks === 0 ? 0 : this.round((passed / checks) * 100);
  }

  private categories(input: {
    snapshotDate: Date;
    resultDate: Date | null;
    resultDateSource: EarningsResultDateSource;
    daysToResult: number | null;
    revenueGrowth: number | null;
    profitGrowth: number | null;
    epsGrowth: number | null;
    marginTrend: number | null;
    consistencyScore: number;
    accelerationScore: number;
    deliveryInterest: boolean;
    priceReaction: number | null;
    preResultPriceMove: number | null;
    freshness: EarningsFreshness;
  }): EarningsIntelligenceCategory[] {
    const categories: EarningsIntelligenceCategory[] = [];
    const hasAuthoritativeResultDate = input.resultDateSource === 'OFFICIAL_CALENDAR';
    // Only official result dates qualify for the recent-result window and
    // UPCOMING_RESULTS.  DATE_TBA / ESTIMATED_FROM_PERIOD_CADENCE rows must NOT
    // appear in UPCOMING_RESULTS as if they had a known date.
    const hasUsableResultDate = hasAuthoritativeResultDate;
    const recentResult = Boolean(hasUsableResultDate && input.resultDate && this.daysBetween(input.resultDate, input.snapshotDate) <= RECENT_RESULT_WINDOW_DAYS && input.resultDate <= input.snapshotDate);
    // UPCOMING_RESULTS: only rows with a confirmed OFFICIAL_CALENDAR date and
    // a non-null daysToResult within the window.
    const upcoming = input.daysToResult !== null
      && input.daysToResult >= 0
      && input.daysToResult <= UPCOMING_WINDOW_DAYS
      && input.resultDateSource === 'OFFICIAL_CALENDAR';
    if (upcoming) categories.push('UPCOMING_RESULTS');
    if (upcoming && (input.deliveryInterest || (input.preResultPriceMove !== null && input.preResultPriceMove >= 3))) {
      categories.push('PRE_RESULT_INTEREST');
    }
    if (recentResult && this.isWinner(input)) categories.push('RESULT_WINNERS');
    if (recentResult && this.isDisappointment(input)) categories.push('RESULT_DISAPPOINTMENTS');
    if (input.priceReaction !== null && hasAuthoritativeResultDate) categories.push('RESULT_REACTION_HISTORY');
    if (input.freshness !== 'MISSING' && (input.consistencyScore >= 70 || input.accelerationScore >= 70 || categories.includes('PRE_RESULT_INTEREST') || categories.includes('RESULT_WINNERS'))) {
      categories.push('EARNINGS_WATCHLIST');
    }
    if (input.freshness !== 'MISSING' && categories.length === 0) categories.push('EARNINGS_WATCHLIST');
    return [...new Set(categories)];
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
    revenueGrowth: number | null;
    profitGrowth: number | null;
    epsGrowth: number | null;
    marginTrend: number | null;
    consistencyScore: number;
    accelerationScore: number;
    deliveryInterest: boolean;
    priceReaction: number | null;
    preResultPriceMove: number | null;
    upcoming: boolean;
    resultDateSource: EarningsResultDateSource;
  }): string[] {
    const tags: string[] = [];
    if (!input.latest) return tags;
    if (this.isQuarterly(input.latest.periodType)) tags.push('LATEST_QUARTERLY_RESULT');
    if (this.isAnnual(input.latest.periodType)) tags.push('LATEST_ANNUAL_RESULT');
    if (input.latest.source === 'MANUAL_VERIFIED') tags.push('MANUAL_VERIFIED_RESULT');
    if (input.revenueGrowth !== null && input.revenueGrowth > 0) tags.push('REVENUE_GROWTH_POSITIVE');
    if (input.profitGrowth !== null && input.profitGrowth > 0) tags.push('PROFIT_GROWTH_POSITIVE');
    if (input.epsGrowth !== null && input.epsGrowth > 0) tags.push('EPS_GROWTH_POSITIVE');
    if (input.marginTrend !== null && input.marginTrend >= 0) tags.push('MARGIN_STABLE_OR_EXPANDING');
    if (input.consistencyScore >= 70) tags.push('CONSISTENT_EARNINGS_PROGRESS');
    if (input.accelerationScore >= 70) tags.push('EARNINGS_ACCELERATION');
    if (input.deliveryInterest) tags.push('PRE_RESULT_DELIVERY_INTEREST');
    if (input.preResultPriceMove !== null && input.preResultPriceMove >= 3) tags.push('PRE_RESULT_PRICE_INTEREST');
    if (input.priceReaction !== null && input.priceReaction >= 2) tags.push('POSITIVE_RESULT_REACTION');
    if (input.upcoming) tags.push('RESULT_WINDOW_ESTIMATED_FROM_PERSISTED_PERIODS');
    if (input.resultDateSource === 'OFFICIAL_CALENDAR') tags.push('OFFICIAL_RESULT_DATE');
    if (input.resultDateSource === 'PERIOD_END_DATE_FALLBACK') tags.push('RESULT_DATE_FROM_PERIOD_END_FALLBACK');
    if (input.resultDateSource === 'VALIDATED_AT_FALLBACK') tags.push('RESULT_DATE_FROM_VALIDATION_TIMESTAMP_FALLBACK');
    return [...new Set(tags)];
  }

  private riskTags(input: {
    latest: EarningsFundamentalInput | null;
    quarterlyCount: number;
    annualCount: number;
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
    if (input.quarterlyCount === 0) tags.push('MISSING_QUARTERLY_RESULTS');
    if (input.annualCount === 0) tags.push('MISSING_ANNUAL_RESULTS');
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

  private rowWarnings(resultDateSource: EarningsResultDateSource): string[] {
    const warnings: string[] = [];
    // DATE_TBA: result date has not been announced on the official NSE calendar.
    // Use a single calm warning code — no per-row OFFICIAL_CALENDAR_NOT_AVAILABLE spam.
    if (resultDateSource === 'DATE_TBA') warnings.push('RESULT_DATE_NOT_ANNOUNCED');
    // Legacy ESTIMATED_FROM_PERIOD_CADENCE rows in persisted snapshots: treat the same
    // as DATE_TBA at materialisation time (these will disappear after a re-materialisation).
    if (resultDateSource === 'ESTIMATED_FROM_PERIOD_CADENCE') warnings.push('RESULT_DATE_NOT_ANNOUNCED');
    if (resultDateSource === 'PERIOD_END_DATE_FALLBACK') warnings.push('RESULT_DATE_USES_PERIOD_END_DATE_FALLBACK');
    if (resultDateSource === 'VALIDATED_AT_FALLBACK') warnings.push('RESULT_DATE_USES_VALIDATED_AT_FALLBACK');
    if (resultDateSource === 'UNKNOWN') warnings.push('RESULT_DATE_SOURCE_UNKNOWN');
    if (resultDateSource !== 'OFFICIAL_CALENDAR') warnings.push('RESULT_REACTION_REQUIRES_OFFICIAL_RESULT_DATE');
    return [...new Set(warnings)];
  }

  private deliveryInterest(deliverySnapshots: EarningsSnapshotCalculationInput['deliverySnapshots']): boolean {
    const recent = [...deliverySnapshots]
      .filter((snapshot) => snapshot.deliveryPercent !== null)
      .sort((left, right) => right.tradingDate.getTime() - left.tradingDate.getTime())
      .slice(0, 10);
    if (recent.length === 0) return false;
    const latest = recent[0].deliveryPercent ?? 0;
    const average = recent.reduce((sum, snapshot) => sum + Number(snapshot.deliveryPercent || 0), 0) / recent.length;
    return latest >= 55 || latest >= average + 10;
  }

  /**
   * Calculate the price reaction following an earnings result.
   *
   * The "after" bar is the first available bar that is at or after
   * `resultDate + PRICE_REACTION_TRADING_SESSIONS` trading sessions.
   * Using trading sessions instead of raw calendar days means that
   * Diwali / Holi / long-weekend clusters do not shift the comparison
   * bar into a different trading week.
   *
   * Holiday calendar injection is not available at this synchronous
   * call site.  `addTradingSessions` is called without a holiday set
   * (weekend-only degrade) which is safe: in the worst case (a holiday
   * cluster) the target date is 1 calendar day too early, and the
   * `sorted.find` scan then picks the next available bar naturally.
   */
  private priceReaction(prices: EarningsPricePointInput[], resultDate: Date, region = 'IN'): number | null {
    const sorted = this.sortPricesAscending(prices);
    if (sorted.length < 2) return null;
    const before = [...sorted].reverse().find((price) => price.timestamp <= resultDate);
    if (!before || before.close <= 0) return null;

    // Compute target date: resultDate + PRICE_REACTION_TRADING_SESSIONS trading sessions
    const resultDateStr = resultDate.toISOString().slice(0, 10);
    const { date: targetDateStr } = addTradingSessions(region, resultDateStr, PRICE_REACTION_TRADING_SESSIONS);
    const targetMs = targetDateStr
      ? Date.parse(`${targetDateStr}T00:00:00.000Z`)
      : resultDate.getTime() + PRICE_REACTION_TRADING_SESSIONS * 7 * 24 * 60 * 60 * 1000 / 5; // fallback: ~5 calendar days

    const after = sorted.find((price) => price.timestamp.getTime() >= targetMs);
    if (!after) return null;
    return this.round(((after.close - before.close) / before.close) * 100);
  }

  private priceMove(prices: EarningsPricePointInput[], lookbackBars: number): number | null {
    const sorted = [...prices].sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime());
    if (sorted.length <= lookbackBars) return null;
    const latest = sorted[0];
    const previous = sorted[lookbackBars];
    if (previous.close <= 0) return null;
    return this.round(((latest.close - previous.close) / previous.close) * 100);
  }

  private freshness(snapshotDate: Date, latest: EarningsFundamentalInput | null): EarningsFreshness {
    if (!latest) return 'MISSING';
    const latestDate = this.safeUtcDay(latest.periodEndDate);
    const ageDays = latestDate ? this.daysBetween(latestDate, snapshotDate) : Number.POSITIVE_INFINITY;
    if (ageDays <= 120) return 'FRESH';
    if (ageDays <= 240) return 'PARTIAL';
    return 'STALE';
  }

  private findComparisonRecord(latest: EarningsFundamentalInput, records: EarningsFundamentalInput[]): EarningsFundamentalInput | null {
    const latestPeriodEnd = this.safeUtcDay(latest.periodEndDate);
    if (!latestPeriodEnd) return null;
    const sameType = records
      .filter((record) => {
        const recordPeriodEnd = this.safeUtcDay(record.periodEndDate);
        return Boolean(recordPeriodEnd && record.id !== latest.id && record.periodType === latest.periodType && recordPeriodEnd < latestPeriodEnd);
      })
      .sort((left, right) => this.dateTime(right.periodEndDate) - this.dateTime(left.periodEndDate));
    const samePeriodLastYear = sameType.find((record) => {
      const recordPeriodEnd = this.safeUtcDay(record.periodEndDate);
      if (!recordPeriodEnd) return false;
      const monthMatches = recordPeriodEnd.getUTCMonth() === latestPeriodEnd.getUTCMonth();
      const diffDays = this.daysBetween(recordPeriodEnd, latestPeriodEnd);
      return monthMatches && diffDays >= 300 && diffDays <= 430;
    });
    return samePeriodLastYear || sameType[0] || null;
  }

  private expectedResultDate(latest: EarningsFundamentalInput, quarterlyCadence: boolean): Date | null {
    const periodEnd = this.safeUtcDay(latest.periodEndDate);
    if (!periodEnd) return null;
    if (quarterlyCadence) {
      const nextPeriodEnd = this.addMonths(periodEnd, 3);
      return this.addDays(nextPeriodEnd, 45);
    }
    return this.addDays(this.addMonths(periodEnd, 12), 60);
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

    const officialResultDate = this.safeUtcDay(latest.officialResultDate ?? null);
    if (officialResultDate) {
      const daysToResult = this.daysBetween(snapshotDate, officialResultDate);
      return {
        resultDate: officialResultDate,
        resultDateSource: 'OFFICIAL_CALENDAR',
        daysToResult: daysToResult >= 0 ? daysToResult : null,
      };
    }

    // Do NOT emit a row-level resultDate from period cadence.
    // Return DATE_TBA so the UI shows "Date TBA" rather than a fabricated date
    // that gives all stocks with the same periodEnd the same fake date.
    // The expectedResultDate is computed internally (above) but not surfaced
    // in the DTO as a precise forward-looking date.
    if (expectedResultDate) {
      return {
        resultDate: null,
        resultDateSource: 'DATE_TBA',
        daysToResult: null,
      };
    }

    const periodEndDate = this.safeUtcDay(latest.periodEndDate);
    if (periodEndDate) {
      return {
        resultDate: periodEndDate,
        resultDateSource: 'PERIOD_END_DATE_FALLBACK',
        daysToResult: null,
      };
    }

    const validatedAt = this.safeUtcDay(latest.validatedAt ?? null);
    if (validatedAt) {
      return {
        resultDate: validatedAt,
        resultDateSource: 'VALIDATED_AT_FALLBACK',
        daysToResult: null,
      };
    }

    return { resultDate: null, resultDateSource: 'UNKNOWN', daysToResult: null };
  }

  private sortFundamentals(records: EarningsFundamentalInput[]): EarningsFundamentalInput[] {
    return [...records].sort((left, right) => this.dateTime(right.periodEndDate) - this.dateTime(left.periodEndDate));
  }

  private sortPricesAscending(prices: EarningsPricePointInput[]): EarningsPricePointInput[] {
    return [...prices].sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime());
  }

  private isQuarterly(periodType: string): boolean {
    const normalized = periodType.toUpperCase();
    return normalized.includes('QUARTER') || /^Q[1-4]$/.test(normalized) || normalized === 'QUARTERLY';
  }

  private isAnnual(periodType: string): boolean {
    const normalized = periodType.toUpperCase();
    return normalized.includes('ANNUAL') || normalized.includes('FY') || normalized.includes('YEAR');
  }

  private growth(current: number | null, previous: number | null): number | null {
    if (current === null || previous === null || previous === 0) return null;
    return this.round(((current - previous) / Math.abs(previous)) * 100);
  }

  private marginTrend(current: EarningsFundamentalInput | null | undefined, previous: EarningsFundamentalInput | null | undefined): number | null {
    const currentMargin = current ? this.margin(current) : null;
    const previousMargin = previous ? this.margin(previous) : null;
    if (currentMargin === null || previousMargin === null) return null;
    return this.round(currentMargin - previousMargin);
  }

  private margin(record: EarningsFundamentalInput): number | null {
    if (record.revenue === null || record.netIncome === null || record.revenue === 0) return null;
    return (record.netIncome / Math.abs(record.revenue)) * 100;
  }

  private groupByCategory(rows: EarningsSnapshotDto[], limit: number): Record<EarningsIntelligenceCategory, EarningsSnapshotDto[]> {
    const grouped = this.emptyCategoryBuckets();
    for (const category of EARNINGS_INTELLIGENCE_CATEGORIES) {
      const categoryRows = rows.filter((row) => row.categories.includes(category));
      if (category === 'UPCOMING_RESULTS') {
        // Order: (1) official dates first (has daysToResult), soonest first;
        // (2) DATE_TBA / legacy estimated rows at the end;
        // (3) consistencyScore desc as tiebreak within each group.
        grouped[category] = categoryRows
          .sort((left, right) => {
            const leftHasDate = left.resultDateSource === 'OFFICIAL_CALENDAR' && left.daysToResult !== null ? 1 : 0;
            const rightHasDate = right.resultDateSource === 'OFFICIAL_CALENDAR' && right.daysToResult !== null ? 1 : 0;
            if (leftHasDate !== rightHasDate) return rightHasDate - leftHasDate; // official first
            if (leftHasDate && rightHasDate) {
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

  private countCategories(rows: EarningsSnapshotDto[]): Record<EarningsIntelligenceCategory, number> {
    const counts = this.emptyCategoryCounts();
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
      // tbaDatesRows counts both new DATE_TBA rows and legacy ESTIMATED_FROM_PERIOD_CADENCE
      // rows in persisted snapshots that have not been re-materialised yet.
      tbaDatesRows: (resultDateSourceCounts.DATE_TBA || 0) + (resultDateSourceCounts.ESTIMATED_FROM_PERIOD_CADENCE || 0),
      estimatedRows: resultDateSourceCounts.ESTIMATED_FROM_PERIOD_CADENCE || 0,
      fallbackRows: (resultDateSourceCounts.PERIOD_END_DATE_FALLBACK || 0) + (resultDateSourceCounts.VALIDATED_AT_FALLBACK || 0),
      unknownRows: resultDateSourceCounts.UNKNOWN || 0,
    };
  }

  private emptyCategoryBuckets(): Record<EarningsIntelligenceCategory, EarningsSnapshotDto[]> {
    return {
      UPCOMING_RESULTS: [],
      PRE_RESULT_INTEREST: [],
      RESULT_WINNERS: [],
      RESULT_DISAPPOINTMENTS: [],
      RESULT_REACTION_HISTORY: [],
      EARNINGS_WATCHLIST: [],
    };
  }

  private emptyCategoryCounts(): Record<EarningsIntelligenceCategory, number> {
    return {
      UPCOMING_RESULTS: 0,
      PRE_RESULT_INTEREST: 0,
      RESULT_WINNERS: 0,
      RESULT_DISAPPOINTMENTS: 0,
      RESULT_REACTION_HISTORY: 0,
      EARNINGS_WATCHLIST: 0,
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

  private normalizeScope(query: EarningsIntelligenceQuery): EarningsIntelligenceQuery {
    return {
      region: this.normalizeText(query.region, 'IN').toUpperCase(),
      assetType: this.normalizeText(query.assetType, 'STOCK').toUpperCase(),
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

  private maxDate(values: Array<Date | null | undefined>): Date | null {
    return values.filter((value): value is Date => Boolean(value && !Number.isNaN(value.getTime())))
      .sort((left, right) => right.getTime() - left.getTime())[0] || null;
  }

  private safeUtcDay(date: Date | null | undefined): Date | null {
    if (!date || Number.isNaN(date.getTime())) return null;
    return this.startOfUtcDay(date);
  }

  private dateTime(date: Date | null | undefined): number {
    return this.safeUtcDay(date)?.getTime() ?? Number.NEGATIVE_INFINITY;
  }

  private addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  }

  private addMonths(date: Date, months: number): Date {
    const targetMonth = date.getUTCMonth() + months;
    const targetYear = date.getUTCFullYear() + Math.floor(targetMonth / 12);
    const normalizedMonth = ((targetMonth % 12) + 12) % 12;
    const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
    return new Date(Date.UTC(targetYear, normalizedMonth, Math.min(date.getUTCDate(), lastDay)));
  }

  private startOfUtcDay(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }

  private daysBetween(left: Date, right: Date): number {
    const leftDay = this.startOfUtcDay(left).getTime();
    const rightDay = this.startOfUtcDay(right).getTime();
    return Math.round((rightDay - leftDay) / (24 * 60 * 60 * 1000));
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

export { CALCULATION_VERSION as EARNINGS_INTELLIGENCE_CALCULATION_VERSION };
