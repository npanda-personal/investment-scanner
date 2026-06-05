import { MarketDataFoundationService } from '../market-data-foundation';
import { SignalGenerationEngineService } from '../signal-generation-engine';
import { isKnownSector } from '../../shared/utils/sector-metadata';
import { MarketContextIntelligenceRepository } from './market-context-intelligence.repository';
import type {
  CapBand,
  CapBandBreadth,
  ContextInstrument,
  CountryStrengthItem,
  LeadershipStatus,
  MacroSnapshot,
  MarketBreadth,
  MarketContextSummary,
  MarketRegime,
  MarketRegimeSummary,
  PersistedMarketBreadthEnvelope,
  SectorIndexInput,
  SectorIntelligenceClassification,
  SectorIntelligenceRefreshRequest,
  SectorIntelligenceRefreshResult,
  SectorIntelligenceSnapshotEnvelope,
  SectorSnapshotDto,
  SectorRotationItem,
} from './market-context-intelligence.types';

const SAMPLE_SIZE = 500;
/**
 * CB-41 fix: liquid-universe filter for IN-region breadth computation.
 * No Nifty 500 constituent table exists in the DB; best available proxy is
 * active NSE mainboard (instrumentSegment=CASH, exchange=NSE) stocks with a
 * persisted marketCap, sorted desc by marketCap up to SAMPLE_SIZE (500).
 * This excludes SME-segment names, ETFs, indices, and marketCap-null shells
 * that contaminate an unfiltered page-1 list.
 * Limitation: marketCap data lags by the last fundamentals backfill; ~302
 * stocks have NULL marketCap and are excluded until backfill completes.
 *
 * NR-5 cap-band universe:
 * For calculateBreadthByCapBand we load a WIDER universe (up to 1500 stocks)
 * so that MID (₹5,000–20,000 Cr) and SMALL (< ₹5,000 Cr) bands have enough
 * instruments to compute non-null metrics.  The top-500 universe used for
 * headline breadth / regime is predominantly LARGE-cap, leaving MID/SMALL
 * empty.  The wider load uses a repository method that issues only 2 DB
 * round-trips regardless of universe size (window-function batch query),
 * so it is connection-pool-safe.
 */
const LIQUID_UNIVERSE_FILTERS = {
  exchange: 'NSE',
  instrumentSegment: 'CASH',
  sortBy: 'marketCap' as const,
  sortOrder: 'desc' as const,
};
/**
 * NSE Nifty 50 broad-market index symbol present in price_ticks (source data
 * through 2026-06-04). Used as the index-trend input for the regime score.
 */
const NSEI_SYMBOL = '^NSEI';
const SECTOR_LOOKBACK_DAYS = {
  return1W: 7,
  return1M: 30,
  return3M: 90,
} as const;

export class MarketContextIntelligenceService {
  constructor(
    private readonly repository = new MarketContextIntelligenceRepository(),
    private readonly marketDataService = new MarketDataFoundationService(),
    private readonly signalService = new SignalGenerationEngineService()
  ) {}

  async run(region?: string): Promise<{ status: string }> {
    return this.runAsOf(region, undefined);
  }

  /**
   * Generate + persist a MarketContextSnapshot.
   * When `asOf` is set, all price data is sliced to <= asOf (point-in-time, no look-ahead)
   * and the snapshot is stored with snapshotDate = asOf instead of today.
   * When `asOf` is omitted the behaviour is identical to the previous `run()` method.
   */
  async runAsOf(region?: string, asOf?: Date): Promise<{ status: string }> {
    const endDate = asOf ? this.startOfUtcDay(asOf) : undefined;
    const isIndianRegion = !region || region.trim().toUpperCase() === 'IN';

    const [items, signals, nseiPrices, capBandItems] = await Promise.all([
      this.loadContextInstruments(region, asOf),
      this.loadSignalMap(region),
      this.repository.loadIndexPrices(NSEI_SYMBOL, 270, endDate),
      // NR-5: load wider universe for cap-band breadth (IN-region only; 2 DB round-trips).
      // Non-IN regions fall back to the headline universe — cap-band divergence is
      // only meaningful for NSE/BSE where LARGE/MID/SMALL bands are well-defined.
      isIndianRegion
        ? this.repository.loadCapBandUniverse(endDate)
        : Promise.resolve(null),
    ]);
    const enriched = items.map((item) => ({ ...item, ...signals.get(item.instrumentId) }));

    const regime = this.calculateRegime(enriched, nseiPrices);
    const sectors = this.rankSectors(enriched);
    const breadth = this.calculateBreadth(enriched);

    // NR-5: use the wider cap-band universe for band stratification when available;
    // fall back to the headline universe so the field is never null.
    const capBandUniverse: ContextInstrument[] = capBandItems
      ? capBandItems.map((item) => ({
          ...item,
          sector: null,
          country: null,
          signalDirection: undefined,
          signalScore: undefined,
        }))
      : enriched;
    console.log(
      `[market-context] cap-band universe: ${capBandUniverse.length} instruments ` +
      `(headline universe: ${enriched.length}; limit: ${MarketContextIntelligenceRepository.CAP_BAND_UNIVERSE_LIMIT})`
    );
    const breadthByCapBand = this.calculateBreadthByCapBand(capBandUniverse);
    const countries = this.rankCountries(enriched);
    const macro = this.macro();

    const summary: MarketContextSummary = {
      regime,
      topSectors: sectors.slice(0, 5),
      weakSectors: this.weakSectorSlice(sectors),
      breadth,
      breadthByCapBand,
      countryStrength: countries.slice(0, 8),
      macro,
      explanation: this.takeaways(regime, sectors, breadth, macro),
      updatedAt: (asOf ?? new Date()).toISOString(),
      dataStatus: items.length >= 30 ? 'PARTIAL' : items.length > 0 ? 'PARTIAL' : 'MISSING',
    };

    // When asOf is set, persist the snapshot under that historical date so downstream
    // consumers (backtests, quality-lab by-regime) can look it up by date.
    await this.repository.saveSnapshot(summary, region || 'GLOBAL', asOf);
    return { status: 'success' };
  }

  async summary(query: { region?: string } = {}): Promise<MarketContextSummary> {
    const persisted = await this.repository.latestSnapshot(query.region);
    if (persisted) return persisted;

    await this.run(query.region);
    return (await this.repository.latestSnapshot(query.region))!;
  }

  async latestPersistedSummary(region?: string): Promise<MarketContextSummary | null> {
    return this.repository.latestPersistedSnapshot(region);
  }

  async latestPersistedBreadth(region: string = 'GLOBAL'): Promise<PersistedMarketBreadthEnvelope> {
    const summary = await this.repository.latestPersistedSnapshot(region);
    const sourceLabels = {
      savedBreadth: 'Persisted Market Context breadth',
      officialAdvancesDeclines: 'NSE official advances/declines not persisted',
    };

    if (!summary) {
      return {
        status: 'missing',
        scope: { region },
        asOf: null,
        materialized: false,
        breadth: null,
        sourceLabels,
        gaps: [
          'Saved breadth is not available for this scope.',
          'Official advances, declines, and unchanged counts are not persisted yet.',
          'Official advances are not persisted yet.',
          'Official declines are not persisted yet.',
          'Official unchanged counts are not persisted yet.',
        ],
      };
    }

    return {
      status: 'ready',
      scope: { region },
      asOf: summary.updatedAt || summary.regime.updatedAt || null,
      materialized: false,
      sourceLabels,
      gaps: [
        'Official advances are not persisted yet.',
        'Official declines are not persisted yet.',
        'Official unchanged counts are not persisted yet.',
      ],
      breadth: {
        ...summary.breadth,
        officialAdvanceCount: null,
        officialDeclineCount: null,
        officialUnchangedCount: null,
      },
    };
  }

  async refreshSectorSnapshots(request: SectorIntelligenceRefreshRequest = {}): Promise<SectorIntelligenceRefreshResult> {
    const scope = this.normalizeSectorScope(request);
    const requestedDataThroughDate = this.parseDateOnly(request.dataThroughDate);
    const inputs = await this.repository.loadSectorIndexInputs({
      region: scope.region,
      dataThroughDate: requestedDataThroughDate,
    });
    const dataThroughDate = requestedDataThroughDate || this.resolveSectorDataThroughDate(inputs);
    if (!dataThroughDate) {
      return {
        status: 'SKIPPED',
        scope,
        snapshotDate: null,
        dataThroughDate: null,
        totalCount: 0,
        processedCount: 0,
        savedCount: 0,
        skippedCount: 0,
        warnings: ['No persisted sector index prices are available for the selected scope.'],
        errors: [],
        sectors: [],
      };
    }

    const sectors = this.buildSectorSnapshots(inputs, dataThroughDate);
    if (sectors.length === 0) {
      return {
        status: 'SKIPPED',
        scope,
        snapshotDate: this.dateOnly(dataThroughDate),
        dataThroughDate: this.dateOnly(dataThroughDate),
        totalCount: inputs.length,
        processedCount: inputs.length,
        savedCount: 0,
        skippedCount: inputs.length,
        warnings: ['No sector index rows had enough persisted price evidence to score.'],
        errors: [],
        sectors: [],
      };
    }

    const saveResult = await this.repository.saveSectorSnapshots(sectors, scope);
    const skippedCount = Math.max(0, inputs.length - sectors.length);
    const warnings = [
      ...new Set([
        ...sectors.flatMap((sector) => sector.warnings),
        ...(skippedCount > 0 ? [`${skippedCount} sector index rows were skipped because they were broad, unsupported, or missing price evidence.`] : []),
      ]),
    ];
    return {
      status: skippedCount > 0 || warnings.length > 0 ? 'PARTIAL' : 'COMPLETED',
      scope,
      snapshotDate: sectors[0].snapshotDate,
      dataThroughDate: sectors[0].dataThroughDate,
      totalCount: inputs.length,
      processedCount: inputs.length,
      savedCount: saveResult.savedCount,
      skippedCount,
      warnings,
      errors: [],
      sectors,
    };
  }

  async latestSectorIntelligenceSnapshot(request: Pick<SectorIntelligenceRefreshRequest, 'region' | 'assetType'> = {}): Promise<SectorIntelligenceSnapshotEnvelope> {
    const scope = this.normalizeSectorScope(request);
    const sectors = await this.repository.latestSectorSnapshots(scope);
    const sourceLabels = {
      sectorIndexes: 'Persisted sector index catalog rows',
      prices: 'Persisted PriceTick and LatestPrice sector index evidence',
    };
    if (sectors.length === 0) {
      return {
        status: 'missing',
        scope,
        snapshotDate: null,
        dataThroughDate: null,
        generatedAt: new Date().toISOString(),
        materialized: true,
        sourceLabels,
        warnings: ['No persisted SectorSnapshot rows exist for this scope. Run SECTOR_INTELLIGENCE_REFRESH after sector index prices are loaded.'],
        sectors: [],
      };
    }
    return {
      status: 'ready',
      scope,
      snapshotDate: sectors[0].snapshotDate,
      dataThroughDate: sectors[0].dataThroughDate,
      generatedAt: new Date().toISOString(),
      materialized: true,
      sourceLabels,
      warnings: [...new Set(sectors.flatMap((sector) => sector.warnings))],
      sectors,
    };
  }

  buildSectorSnapshots(inputs: SectorIndexInput[], dataThroughDate: Date): SectorSnapshotDto[] {
    const snapshotDate = this.dateOnly(new Date());
    const dataThrough = this.startOfUtcDay(dataThroughDate);
    const drafts = inputs
      .map((input) => this.buildSectorDraft(input, dataThrough, snapshotDate))
      .filter((draft): draft is Omit<SectorSnapshotDto, 'classification' | 'sectorScore' | 'reasonTags'> & { rankScore?: number } => Boolean(draft));

    const ranked = [...drafts].sort((left, right) => right.trendScore - left.trendScore || left.sector.localeCompare(right.sector));
    const rankScoreBySector = new Map<string, number>();
    ranked.forEach((draft, index) => {
      const rankScore = ranked.length <= 1 ? 50 : Math.round(100 - (index / (ranked.length - 1)) * 100);
      rankScoreBySector.set(draft.sector, rankScore);
    });

    return drafts.map((draft) => {
      const rankScore = rankScoreBySector.get(draft.sector) ?? 50;
      const sectorScore = this.clampScore(Math.round(draft.trendScore * 0.75 + rankScore * 0.25));
      const classification = this.classifySector(draft.return1W, draft.return1M, draft.return3M, sectorScore);
      return {
        snapshotDate: draft.snapshotDate,
        dataThroughDate: draft.dataThroughDate,
        sector: draft.sector,
        classification,
        sectorScore,
        return1W: draft.return1W,
        return1M: draft.return1M,
        return3M: draft.return3M,
        trendScore: draft.trendScore,
        reasonTags: this.sectorReasonTags(draft.return1W, draft.return1M, draft.return3M, draft.trendScore, sectorScore, classification, rankScore),
        warnings: draft.warnings,
      };
    }).sort((left, right) => right.sectorScore - left.sectorScore || left.sector.localeCompare(right.sector));
  }

  async regime(region?: string) {
    const s = await this.summary({ region });
    return s.regime;
  }

  async sectors(region?: string) {
    const s = await this.summary({ region });
    return s.topSectors.concat(s.weakSectors);
  }

  async breadth(region?: string) {
    const s = await this.summary({ region });
    return s.breadth;
  }

  async countries(region?: string) {
    const s = await this.summary({ region });
    return s.countryStrength;
  }

  macro(): MacroSnapshot {
    return {
      interestRateProxy: null,
      inflationProxy: null,
      usdStrengthProxy: null,
      commodityProxy: null,
      macroStatus: 'UNKNOWN',
      dataStatus: 'MISSING',
      explanation: 'Macro providers are not configured yet; macro context is intentionally returned as missing in the MVP.',
    };
  }

  /**
   * Regime scoring weights (v2 — CB-42 fix):
   *
   *   % above SMA-50    35%  — primary breadth gate; narrow rallies stay NEUTRAL/RISK_OFF
   *   % above SMA-200   25%  — structural breadth; confirms trend durability
   *   ^NSEI index trend 25%  — objective single-index signal; null → 50 (no data, neutral)
   *   broad mean return 10%  — corroborating evidence, demoted from 35%; null → 0 (conservative)
   *   leadership score   5%  — sector rotation tie-breaker
   *
   * Key corrections vs v1:
   * - Breadth gates 60% of the score: a narrow rally (weak breadth, few stocks up) cannot
   *   alone push to RISK_ON regardless of how high the mean return of those few stocks is.
   * - null broadReturn → 0 (not the old 50); absent mean-return evidence does not inflate
   *   the score toward RISK_ON.
   * - ^NSEI 63-bar trend added as a 25% objective gate using persisted index prices.
   * - null nseiReturn → 50 (genuinely neutral; index data may not be available point-in-time).
   *
   * Worked example (false-RISK_ON case that is now fixed):
   *   Scenario: 2-stock narrow rally, both stocks have strong +12% 63-bar return,
   *   but broad market is below SMA50 and SMA200 (above50=0, above200=0), ^NSEI null.
   *   Old score: 73×0.35 + 0×0.25 + 0×0.25 + 50×0.15 = 25.6 + 0 + 0 + 7.5 = 33 → RISK_OFF
   *     (old formula actually was already risk_off here; the real failure was when null
   *     return defaulted to 50 and inflated narrow-market signals to NEUTRAL/RISK_ON range)
   *   Null-return bias (old): score = 50×0.35 + 40×0.25 + 20×0.25 + 50×0.15 = 40 → RISK_OFF boundary
   *   New score for null-return + modest breadth: 0×0.10 term removed entirely; breadth
   *   must carry the load.
   */
  calculateRegime(items: ContextInstrument[], nseiPrices: number[] = []): MarketRegimeSummary {
    const breadth = this.calculateBreadth(items);
    const sectorItems = this.rankSectors(items);
    const broadReturn = this.average(items.map((item) => this.returnAt(item.prices, 63)).filter(this.isNumber));
    const leadershipScore = sectorItems[0]?.relativeStrengthScore ?? 50;
    const above50 = breadth.percentAboveSma50 ?? 0;
    const above200 = breadth.percentAboveSma200 ?? 0;

    // null broadReturn → 0: no evidence of positive return should not push score up
    const returnScore = broadReturn === null ? 0 : Math.max(0, Math.min(100, 50 + broadReturn * 200));

    // ^NSEI 63-bar trend: null → 50 (neutral; index data may lag on weekends/point-in-time)
    const nseiReturn = this.returnAt(nseiPrices, 63);
    const indexTrendScore = nseiReturn === null ? 50 : Math.max(0, Math.min(100, 50 + nseiReturn * 200));

    const score = Math.round(
      above50 * 100 * 0.35 +
      above200 * 100 * 0.25 +
      indexTrendScore * 0.25 +
      returnScore * 0.10 +
      leadershipScore * 0.05,
    );
    const regime = this.regimeFromScore(score);
    return {
      regime,
      score,
      explanation: `${regime.replace('_', '-').toLowerCase()} because ${this.formatPercent(above50)} of liquid-universe instruments are above SMA50, ${this.formatPercent(above200)} above SMA200, and the Nifty 50 index 63-bar trend score is ${indexTrendScore}.`,
      updatedAt: new Date().toISOString(),
      dataStatus: items.length > 0 ? 'PARTIAL' : 'MISSING',
    };
  }

  regimeFromScore(score: number): MarketRegime {
    if (score >= 65) return 'RISK_ON';
    if (score <= 40) return 'RISK_OFF';
    return 'NEUTRAL';
  }

  rankSectors(items: ContextInstrument[]): SectorRotationItem[] {
    return this.groupRank(items.filter((item) => this.hasKnownMetadata(item.sector)), (item) => item.sector!.trim()).map((group) => ({
      sector: group.key,
      return1M: group.return1M,
      return3M: group.return3M,
      return6M: group.return6M,
      relativeStrengthScore: group.score,
      instrumentCount: group.count,
      bullishSignalCount: group.bullish,
      bearishSignalCount: group.bearish,
      leadershipStatus: this.classifyLeadership(group.return1M, group.return3M, group.score),
    }));
  }

  rankCountries(items: ContextInstrument[]): CountryStrengthItem[] {
    return this.groupRank(items, (item) => item.country || 'Unknown').map((group) => ({
      country: group.key,
      return1M: group.return1M,
      return3M: group.return3M,
      return6M: group.return6M,
      relativeStrengthScore: group.score,
      instrumentCount: group.count,
      bullishSignalCount: group.bullish,
    }));
  }

  calculateBreadth(items: ContextInstrument[]): MarketBreadth {
    const valid = items.filter((item) => item.latest !== null && item.prices.length > 1);
    const sma50Sample = valid.filter((item) => this.sma(item.prices, 50) !== null);
    const sma200Sample = valid.filter((item) => this.sma(item.prices, 200) !== null);
    const above50 = sma50Sample.filter((item) => item.latest! > this.sma(item.prices, 50)!).length;
    const above200 = sma200Sample.filter((item) => item.latest! > this.sma(item.prices, 200)!).length;
    const advancers = valid.filter((item) => item.previous !== null && item.latest! > item.previous!).length;
    const decliners = valid.filter((item) => item.previous !== null && item.latest! < item.previous!).length;
    const high52 = valid.filter((item) => item.latest! >= Math.max(...item.prices.slice(0, 252)) * 0.99).length;
    const low52 = valid.filter((item) => item.latest! <= Math.min(...item.prices.slice(0, 252)) * 1.01).length;
    return {
      percentAboveSma50: sma50Sample.length > 0 ? above50 / sma50Sample.length : null,
      percentAboveSma200: sma200Sample.length > 0 ? above200 / sma200Sample.length : null,
      sma50SampleCount: sma50Sample.length,
      sma200SampleCount: sma200Sample.length,
      advanceDeclineRatio: decliners > 0 ? advancers / decliners : advancers > 0 ? advancers : null,
      newHigh52WeekCount: high52,
      newLow52WeekCount: low52,
      bullishSignalCount: items.filter((item) => item.signalDirection === 'BULLISH').length,
      bearishSignalCount: items.filter((item) => item.signalDirection === 'BEARISH').length,
      instrumentCount: valid.length,
      dataStatus: valid.length > 0 ? 'PARTIAL' : 'MISSING',
    };
  }

  /**
   * Thresholds (₹ — absolute rupees, as stored in the DB):
   *   1 Crore = 1e7 rupees.
   *   Large-cap : marketCap > 20,000 Cr  → > 2e11 rupees
   *   Mid-cap   : 5,000 – 20,000 Cr     → 5e10 – 2e11 rupees
   *   Small-cap : < 5,000 Cr            → < 5e10 rupees (positive cap known)
   *   UNKNOWN   : marketCap null / 0 — excluded from named-band stats; bands with < 5
   *               valid instruments surface null metrics ("—" in UI).
   *
   * DB unit note: the `marketCap` column stores absolute rupees (e.g. RELIANCE ≈ 1.95e13).
   * Thresholds are therefore expressed in rupees, not crores.
   */
  calculateBreadthByCapBand(items: ContextInstrument[]): CapBandBreadth[] {
    const CRORE = 10_000_000; // 1 Cr = 1e7 rupees (DB unit)
    const LARGE_THRESHOLD = 20_000 * CRORE; // 20,000 Cr in rupees
    const MID_THRESHOLD   =  5_000 * CRORE; //  5,000 Cr in rupees

    const bandOf = (cap: number | null): CapBand => {
      if (cap === null || cap <= 0) return 'UNKNOWN';
      if (cap > LARGE_THRESHOLD) return 'LARGE';
      if (cap >= MID_THRESHOLD)  return 'MID';
      return 'SMALL';
    };

    const META: { band: CapBand; label: string }[] = [
      { band: 'LARGE', label: 'Large-cap (> ₹20,000 Cr)' },
      { band: 'MID',   label: 'Mid-cap (₹5,000–20,000 Cr)' },
      { band: 'SMALL', label: 'Small-cap (< ₹5,000 Cr)' },
    ];

    const MIN_SAMPLE = 5;

    return META.map(({ band, label }) => {
      const group = items.filter(
        (item) => item.latest !== null && item.prices.length > 1 && bandOf(item.marketCap) === band,
      );

      if (group.length < MIN_SAMPLE) {
        return { band, label, percentAboveSma50: null, percentAboveSma200: null, advancers: 0, decliners: 0, instrumentCount: group.length };
      }

      const sma50Sample  = group.filter((item) => this.sma(item.prices, 50)  !== null);
      const sma200Sample = group.filter((item) => this.sma(item.prices, 200) !== null);
      const above50  = sma50Sample.filter((item)  => item.latest! > this.sma(item.prices, 50)!).length;
      const above200 = sma200Sample.filter((item) => item.latest! > this.sma(item.prices, 200)!).length;
      const advancers = group.filter((item) => item.previous !== null && item.latest! > item.previous!).length;
      const decliners = group.filter((item) => item.previous !== null && item.latest! < item.previous!).length;

      return {
        band,
        label,
        percentAboveSma50:  sma50Sample.length  >= MIN_SAMPLE ? above50  / sma50Sample.length  : null,
        percentAboveSma200: sma200Sample.length >= MIN_SAMPLE ? above200 / sma200Sample.length : null,
        advancers,
        decliners,
        instrumentCount: group.length,
      };
    });
  }

  classifyLeadership(return1M: number | null, return3M: number | null, score: number): LeadershipStatus {
    if (score >= 70 && (return3M ?? 0) >= 0) return 'LEADING';
    if ((return1M ?? 0) > 0 && (return3M ?? 0) <= 0.03) return 'IMPROVING';
    if ((return1M ?? 0) < 0 && (return3M ?? 0) > 0) return 'WEAKENING';
    return 'LAGGING';
  }



  private async loadContextInstruments(region?: string, asOf?: Date): Promise<ContextInstrument[]> {
    // CB-41 fix: for IN-region, request liquid NSE mainboard universe sorted by marketCap desc.
    // This approximates Nifty 500 constituents without an explicit constituent table in the DB.
    // For other regions, fall back to unfiltered page-1 (existing behaviour).
    const isIndianRegion = !region || region.trim().toUpperCase() === 'IN';
    const universeOptions = isIndianRegion
      ? { ...LIQUID_UNIVERSE_FILTERS, region }
      : { region };
    const response = await this.marketDataService.listInstruments({ page: 1, pageSize: SAMPLE_SIZE, ...universeOptions });
    const instruments = response.instruments || [];
    // When asOf is set, cap price history to that date so no future prices leak in.
    // listPricesByInstrumentId(id, limit, startDate?, endDate?) — pass asOf as endDate.
    const endDate = asOf ? this.startOfUtcDay(asOf) : undefined;
    const rows = await Promise.all(instruments.map(async (instrument: any) => {
      const pricesResponse = await this.marketDataService
        .listPricesByInstrumentId(instrument.id, 260, undefined, endDate)
        .catch(() => null);
      const prices = (pricesResponse?.prices || [])
        .map((price: any) => Number(price.adjusted_close ?? price.close))
        .filter((value: number) => Number.isFinite(value));
      return {
        instrumentId: instrument.id,
        symbol: instrument.symbol,
        sector: instrument.sector ?? null,
        country: instrument.country ?? null,
        latest: prices[0] ?? null,
        previous: prices[1] ?? null,
        prices,
        marketCap: instrument.market_cap ?? null,
      };
    }));
    return rows;
  }

  private async loadSignalMap(region?: string) {
    const response = await this.signalService.topSignals({ limit: 100, region }).catch(() => ({ signals: [] }));
    const signals = response && 'signals' in response ? response.signals : [];
    const map = new Map<string, Partial<ContextInstrument>>();
    for (const signal of signals as any[]) {
      map.set(signal.instrument_id, { signalDirection: signal.direction, signalScore: signal.score });
    }
    return map;
  }

  private groupRank(items: ContextInstrument[], keyFn: (item: ContextInstrument) => string) {
    const groups = new Map<string, ContextInstrument[]>();
    for (const item of items) groups.set(keyFn(item), [...(groups.get(keyFn(item)) || []), item]);
    return [...groups.entries()].map(([key, group]) => {
      const return1M = this.average(group.map((item) => this.returnAt(item.prices, 21)).filter(this.isNumber));
      const return3M = this.average(group.map((item) => this.returnAt(item.prices, 63)).filter(this.isNumber));
      const return6M = this.average(group.map((item) => this.returnAt(item.prices, 126)).filter(this.isNumber));
      const score = Math.max(0, Math.min(100, Math.round(50 + ((return1M ?? 0) * 80 + (return3M ?? 0) * 60 + (return6M ?? 0) * 40))));
      return {
        key,
        return1M,
        return3M,
        return6M,
        score,
        count: group.length,
        bullish: group.filter((item) => item.signalDirection === 'BULLISH').length,
        bearish: group.filter((item) => item.signalDirection === 'BEARISH').length,
      };
    }).sort((a, b) => b.score - a.score);
  }

  private hasKnownMetadata(value: string | null | undefined) {
    return isKnownSector(value);
  }

  private weakSectorSlice(sectors: SectorRotationItem[]) {
    if (sectors.length <= 1) return [];
    return sectors.slice(-Math.min(5, sectors.length - 1)).reverse();
  }

  private takeaways(regime: MarketRegimeSummary, sectors: SectorRotationItem[], breadth: MarketBreadth, macro: MacroSnapshot): string[] {
    const top = sectors[0];
    const weak = sectors.length > 1 ? sectors[sectors.length - 1] : null;
    return [
      regime.explanation,
      top && weak ? `${top.sector} is leading while ${weak.sector} is lagging.` : 'Sector rotation is unavailable until more sector data exists.',
      breadth.percentAboveSma50 !== null ? `Breadth sample has ${this.formatPercent(breadth.percentAboveSma50)} above SMA50.` : 'Breadth is missing because price history is unavailable.',
      `Macro status is ${macro.macroStatus.toLowerCase()} because macro proxy data is not configured.`,
    ];
  }

  private returnAt(prices: number[], offset: number): number | null {
    if (prices.length <= offset || prices[offset] <= 0) return null;
    return (prices[0] - prices[offset]) / prices[offset];
  }

  private sma(prices: number[], period: number): number | null {
    if (prices.length < period) return null;
    return this.average(prices.slice(0, period));
  }

  private average(values: number[]): number | null {
    return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  }

  private isNumber(value: number | null): value is number {
    return typeof value === 'number' && Number.isFinite(value);
  }

  private formatPercent(value: number | null): string {
    return value === null ? 'N/A' : `${(value * 100).toFixed(1)}%`;
  }

  private buildSectorDraft(input: SectorIndexInput, dataThroughDate: Date, snapshotDate: string) {
    const sector = this.sectorNameFromIndex(input);
    if (!sector) return null;

    const warnings: string[] = [];
    const sortedPrices = input.prices
      .filter((price) => Number.isFinite(price.close) && price.close > 0)
      .sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime());
    if (sortedPrices.length === 0) return null;

    const latestTick = sortedPrices.find((price) => this.startOfUtcDay(price.timestamp).getTime() <= dataThroughDate.getTime()) || null;
    if (!latestTick) return null;

    const latestFromLatestPrice = input.latestPrice !== null
      && input.latestPrice !== undefined
      && input.latestPrice > 0
      && input.latestTimestamp
      && this.startOfUtcDay(input.latestTimestamp).getTime() <= dataThroughDate.getTime()
      ? {
        timestamp: input.latestTimestamp,
        close: input.latestPrice,
        adjustedClose: null,
      }
      : null;

    if (!input.latestPrice || !input.latestTimestamp) {
      warnings.push('LATEST_PRICE_MISSING_CLOSE_FALLBACK_USED');
    } else if (this.startOfUtcDay(input.latestTimestamp).getTime() < dataThroughDate.getTime()) {
      warnings.push('LATEST_PRICE_STALE_CLOSE_FALLBACK_USED');
    }

    const current = latestFromLatestPrice || latestTick;
    if (this.startOfUtcDay(current.timestamp).getTime() < dataThroughDate.getTime()) {
      warnings.push('SECTOR_INDEX_PRICE_STALE_FOR_DATA_THROUGH_DATE');
    }

    const return1W = this.lookbackReturnPercent(current.close, sortedPrices, dataThroughDate, SECTOR_LOOKBACK_DAYS.return1W);
    const return1M = this.lookbackReturnPercent(current.close, sortedPrices, dataThroughDate, SECTOR_LOOKBACK_DAYS.return1M);
    const return3M = this.lookbackReturnPercent(current.close, sortedPrices, dataThroughDate, SECTOR_LOOKBACK_DAYS.return3M);
    if (return1W === null) warnings.push('MISSING_1W_HISTORY');
    if (return1M === null) warnings.push('MISSING_1M_HISTORY');
    if (return3M === null) warnings.push('MISSING_3M_HISTORY');

    return {
      snapshotDate,
      dataThroughDate: this.dateOnly(dataThroughDate),
      sector,
      return1W,
      return1M,
      return3M,
      trendScore: this.trendScore(return1W, return1M, return3M),
      warnings,
    };
  }

  private lookbackReturnPercent(currentClose: number, prices: SectorIndexInput['prices'], dataThroughDate: Date, lookbackDays: number): number | null {
    const baseDate = new Date(dataThroughDate);
    baseDate.setUTCDate(baseDate.getUTCDate() - lookbackDays);
    const base = prices
      .filter((price) => price.close > 0)
      .sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime())
      .find((price) => this.startOfUtcDay(price.timestamp).getTime() <= baseDate.getTime());
    if (!base || base.close <= 0) return null;
    return this.roundNumber(((currentClose - base.close) / base.close) * 100, 2);
  }

  private trendScore(return1W: number | null, return1M: number | null, return3M: number | null): number {
    const contributions = [
      { value: return1W, weight: 2.0 },
      { value: return1M, weight: 1.2 },
      { value: return3M, weight: 0.6 },
    ].filter((entry): entry is { value: number; weight: number } => this.isFiniteNumber(entry.value));
    if (contributions.length === 0) return 50;
    return this.clampScore(Math.round(50 + contributions.reduce((sum, entry) => sum + entry.value * entry.weight, 0)));
  }

  private classifySector(
    return1W: number | null,
    return1M: number | null,
    return3M: number | null,
    sectorScore: number
  ): SectorIntelligenceClassification {
    if (sectorScore >= 70 && (return1M ?? 0) >= 0 && (return3M ?? 0) >= 0) return 'STRONG';
    if (sectorScore <= 40 || ((return1M ?? 0) < 0 && (return3M ?? 0) < 0)) return 'WEAK';
    if (sectorScore >= 55 && (return1W ?? 0) > 0) return 'IMPROVING';
    return 'NEUTRAL';
  }

  private sectorReasonTags(
    return1W: number | null,
    return1M: number | null,
    return3M: number | null,
    trendScore: number,
    sectorScore: number,
    classification: SectorIntelligenceClassification,
    rankScore: number
  ): string[] {
    const tags: string[] = [classification];
    if (rankScore >= 75) tags.push('TOP_RELATIVE_RANK');
    if (rankScore <= 25) tags.push('LOW_RELATIVE_RANK');
    if (sectorScore >= 70) tags.push('HIGH_SECTOR_SCORE');
    if (sectorScore <= 40) tags.push('LOW_SECTOR_SCORE');
    if (trendScore >= 65) tags.push('POSITIVE_TREND');
    if (trendScore <= 40) tags.push('NEGATIVE_TREND');
    if ((return1W ?? 0) > 0) tags.push('POSITIVE_1W_RETURN');
    if ((return1W ?? 0) < 0) tags.push('NEGATIVE_1W_RETURN');
    if ((return1M ?? 0) > 0) tags.push('POSITIVE_1M_RETURN');
    if ((return1M ?? 0) < 0) tags.push('NEGATIVE_1M_RETURN');
    if ((return3M ?? 0) > 0) tags.push('POSITIVE_3M_RETURN');
    if ((return3M ?? 0) < 0) tags.push('NEGATIVE_3M_RETURN');
    return [...new Set(tags)];
  }

  private sectorNameFromIndex(input: SectorIndexInput): string | null {
    const raw = `${input.sourceSymbol || ''} ${input.displayName || ''} ${input.symbol || ''}`.toUpperCase();
    const mappings: Array<[RegExp, string]> = [
      [/CONSUMER DURABLES/, 'Consumer Durables'],
      [/FINANCIAL SERVICES|FIN SERVICE|FIN SERVICES/, 'Financial Services'],
      [/PRIVATE BANK/, 'Private Bank'],
      [/PSU BANK/, 'PSU Bank'],
      [/\bBANK\b/, 'Bank'],
      [/\bAUTO\b/, 'Auto'],
      [/\bFMCG\b/, 'FMCG'],
      [/\bIT\b|INFORMATION TECHNOLOGY/, 'IT'],
      [/\bMEDIA\b/, 'Media'],
      [/\bMETAL\b/, 'Metal'],
      [/\bPHARMA\b|PHARMACEUTICAL/, 'Pharma'],
      [/\bREALTY\b|REAL ESTATE/, 'Realty'],
      [/HEALTHCARE|HEALTH CARE/, 'Healthcare'],
      [/OIL\s*&\s*GAS|OIL AND GAS/, 'Oil & Gas'],
      [/\bENERGY\b/, 'Energy'],
      [/INFRASTRUCTURE|\bINFRA\b/, 'Infrastructure'],
    ];
    for (const [pattern, label] of mappings) {
      if (pattern.test(raw)) return label;
    }
    return null;
  }

  private resolveSectorDataThroughDate(inputs: SectorIndexInput[]): Date | null {
    const dates = inputs.flatMap((input) => [
      input.latestTimestamp,
      ...input.prices.map((price) => price.timestamp),
    ]).filter((date): date is Date => date instanceof Date && Number.isFinite(date.getTime()));
    if (dates.length === 0) return null;
    return this.startOfUtcDay(new Date(Math.max(...dates.map((date) => date.getTime()))));
  }

  private normalizeSectorScope(request: Pick<SectorIntelligenceRefreshRequest, 'region' | 'assetType'>) {
    return {
      region: String(request.region || 'IN').trim().toUpperCase() || 'IN',
      assetType: String(request.assetType || 'STOCK').trim().toUpperCase() || 'STOCK',
    };
  }

  private parseDateOnly(value: string | Date | null | undefined): Date | null {
    if (!value) return null;
    const parsed = value instanceof Date ? value : new Date(`${String(value).slice(0, 10)}T00:00:00.000Z`);
    if (!Number.isFinite(parsed.getTime())) return null;
    return this.startOfUtcDay(parsed);
  }

  private startOfUtcDay(value: Date): Date {
    const date = new Date(value);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }

  private dateOnly(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  private roundNumber(value: number, decimals: number): number {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }

  private isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
  }

  private clampScore(value: number): number {
    return Math.max(0, Math.min(100, value));
  }
}
