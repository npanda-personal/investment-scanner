import { MarketDataFoundationService } from '../market-data-foundation';
import { WorkbenchSnapshotRepository } from './workbench-snapshot.repository';
import type { ResearchPerformanceMetrics, ResearchPricePoint, ResearchRange, SignalEvidenceSection } from './stock-research-workbench.types';
import { resolveMarketProfile } from '../../shared/utils/market-profile';

const TRADING_DAYS_PER_YEAR = 252;

/**
 * Minimal structural interface for the calibration persisted-read.
 * Defined locally to avoid a circular import (calibration imports workbench
 * transitively via signal-generation-engine).
 */
export interface WorkbenchCalibrationReader {
  latestForInstrument(
    instrumentId: string,
    calibrationModelVersion?: string,
  ): Promise<{
    calibratedScore: number;
    calibratedDirection: string;
    calibrationEvidence?: { horizon: string } | null;
    overallEvaluatedSamples?: number;
  } | null>;
}

/**
 * Minimal structural interface for per-instrument outcome aggregate from the
 * signal-quality-lab repository.  Defined locally to avoid circular imports.
 */
export interface WorkbenchOutcomeAggregateReader {
  instrumentOutcomeAggregate(
    instrumentId: string,
    horizon: string,
  ): Promise<{
    matureCount: number;
    directionalSampleSize: number;
    winRate: number | null;
    avgForwardReturn: number | null;
  } | null>;
}

/**
 * Minimal structural interface for reading the latest signal result's
 * reliabilityTier without pulling in the full signal-generation-engine.
 */
export interface WorkbenchSignalReader {
  latestForInstrument(instrumentId: string): Promise<{ reliabilityTier?: string | null } | null>;
}

const DEFAULT_CALIBRATION_HORIZON = '20D';

/** Sentinel payload returned when no snapshot has been computed yet for the instrument. */
export const WORKBENCH_NOT_YET_COMPUTED = {
  _status: 'NOT_YET_COMPUTED' as const,
  message: 'Workbench snapshot not yet computed. Run the WORKBENCH_REFRESH pipeline stage to populate.',
};

export type WorkbenchNotYetComputed = typeof WORKBENCH_NOT_YET_COMPUTED;

export class StockResearchWorkbenchService {
  private readonly snapshotRepository: WorkbenchSnapshotRepository;

  constructor(
    private readonly marketDataService = new MarketDataFoundationService(),
    private readonly calibrationReader?: WorkbenchCalibrationReader | null,
    private readonly outcomeAggregateReader?: WorkbenchOutcomeAggregateReader | null,
    private readonly signalReader?: WorkbenchSignalReader | null,
    snapshotRepository?: WorkbenchSnapshotRepository,
  ) {
    this.snapshotRepository = snapshotRepository ?? new WorkbenchSnapshotRepository();
  }

  /**
   * PERSISTED-READ entry point for GET /workbench.
   *
   * Reads workbench_snapshots for the instrument. Returns the persisted payload
   * (preserving the DTO shape the FE expects) or a NOT_YET_COMPUTED sentinel when
   * the pipeline has not run yet for this instrument.
   *
   * NEVER recomputes live on a GET.
   */
  async getWorkbench(instrumentId: string): Promise<Record<string, unknown> | WorkbenchNotYetComputed | null> {
    const snapshot = await this.snapshotRepository.findByInstrumentId(instrumentId);
    if (!snapshot) {
      return WORKBENCH_NOT_YET_COMPUTED;
    }
    // Return the stored payload directly — shape is the same as workbench() output.
    const payload = snapshot.payloadJson as Record<string, unknown>;
    // Attach snapshot metadata so callers can inspect freshness.
    return {
      ...payload,
      _snapshot: {
        computedAt: snapshot.computedAt.toISOString(),
        dataThroughDate: snapshot.dataThroughDate?.toISOString() ?? null,
        instrumentId: snapshot.instrumentId,
      },
    };
  }

  /**
   * PERSISTED-READ entry point for GET /peers.
   *
   * Reads workbench_snapshots and returns just the peers array.
   * Returns NOT_YET_COMPUTED sentinel if no snapshot exists.
   */
  async getPersistedPeers(instrumentId: string): Promise<Array<Record<string, unknown>> | WorkbenchNotYetComputed | null> {
    const snapshot = await this.snapshotRepository.findByInstrumentId(instrumentId);
    if (!snapshot) {
      return WORKBENCH_NOT_YET_COMPUTED;
    }
    const payload = snapshot.payloadJson as Record<string, unknown>;
    return (payload.peers as Array<Record<string, unknown>>) ?? [];
  }

  /**
   * Lazily resolve calibration reader from SignalCalibrationEngineRepository.
   * Uses require() to avoid static circular import.
   */
  private resolveCalibrationReader(): WorkbenchCalibrationReader | null {
    if (this.calibrationReader === null) return null;
    if (this.calibrationReader !== undefined) return this.calibrationReader;
    try {
      const { SignalCalibrationEngineRepository } = require('../signal-calibration-engine/signal-calibration-engine.repository') as typeof import('../signal-calibration-engine/signal-calibration-engine.repository');
      return new SignalCalibrationEngineRepository();
    } catch { return null; }
  }

  /**
   * Lazily resolve outcome aggregate reader from SignalQualityLabRepository.
   */
  private resolveOutcomeAggregateReader(): WorkbenchOutcomeAggregateReader | null {
    if (this.outcomeAggregateReader === null) return null;
    if (this.outcomeAggregateReader !== undefined) return this.outcomeAggregateReader;
    try {
      const { SignalQualityLabRepository } = require('../signal-quality-lab/signal-quality-lab.repository') as typeof import('../signal-quality-lab/signal-quality-lab.repository');
      return new SignalQualityLabRepository();
    } catch { return null; }
  }

  /**
   * Lazily resolve signal reader from SignalGenerationEngineRepository.
   */
  private resolveSignalReader(): WorkbenchSignalReader | null {
    if (this.signalReader === null) return null;
    if (this.signalReader !== undefined) return this.signalReader;
    try {
      const { SignalGenerationEngineRepository } = require('../signal-generation-engine/signal-generation-engine.repository') as typeof import('../signal-generation-engine/signal-generation-engine.repository');
      return new SignalGenerationEngineRepository();
    } catch { return null; }
  }

  async workbench(instrumentId: string, range: ResearchRange = '1Y') {
    // Equity-plane only: the research workbench (and peer comparison) is fundamentals-
    // driven and gated off for crypto in the frontend; price reads stay equity-scoped.
    const [instrument, latest, prices, fundamentals, corporateActions] = await Promise.all([
      this.marketDataService.getInstrument(instrumentId),
      this.marketDataService.latestPriceByInstrumentId(instrumentId),
      this.marketDataService.listPricesByInstrumentId(instrumentId, 5000),
      this.marketDataService.fundamentalsByInstrumentId(instrumentId),
      this.marketDataService.corporateActionsByInstrumentId(instrumentId),
    ]);

    if (!instrument) return null;

    // Resolve benchmark per instrument region (^NSEI for IN, ^GSPC for US, etc.).
    // V1Instrument carries `region` (preferred) or `country` as a fallback.
    const instrumentRegion = instrument.region ?? instrument.country ?? 'IN';
    const benchmarkProfile = resolveMarketProfile({ region: instrumentRegion }).benchmark;

    const pricePoints = this.toPricePoints(prices?.prices || []);
    const selectedPrices = this.filterByRange(pricePoints, range);
    const latestFundamental = fundamentals?.records?.[0] || null;
    const latestClose = latest?.latest?.close ?? pricePoints[0]?.adjusted_close ?? null;
    const enrichedFundamentals = this.deriveFundamentals(
      latestFundamental,
      fundamentals?.records || [],
      latestClose,
      corporateActions?.actions || [],
    );
    const peers = await this.peerComparison(instrument, instrumentId, range, instrumentRegion);
    const valuation = this.valuationSnapshot(enrichedFundamentals, peers, instrument.market_cap);
    const performance = this.performanceMetrics(pricePoints, selectedPrices);
    // Fetch region benchmark for relative-strength; uses same time window as the selected range.
    const benchmarkPricePoints = await this.fetchBenchmarkPricePoints(benchmarkProfile.symbol, selectedPrices);
    const relativeStrength = this.relativeStrengthSnapshot(selectedPrices, peers, benchmarkPricePoints, benchmarkProfile);
    const dailyChange = this.returnBetween(pricePoints[1]?.adjusted_close, pricePoints[0]?.adjusted_close);
    const dailyChangeValue = pricePoints.length > 1 ? pricePoints[0].adjusted_close - pricePoints[1].adjusted_close : null;

    // Signal evidence: persisted-read only (no live recompute on GET).
    const signalEvidence = await this.signalEvidenceFor(instrumentId);

    return {
      overview: {
        instrument_id: instrument.id,
        company_name: instrument.company_name,
        symbol: instrument.symbol,
        exchange: instrument.exchange,
        country: instrument.country,
        sector: instrument.sector,
        industry: instrument.industry,
        currency: instrument.currency,
        market_cap: instrument.market_cap,
        latest_price: latest?.latest?.close ?? null,
        daily_change: dailyChangeValue,
        daily_change_percent: dailyChange,
        last_updated_timestamp: latest?.last_updated_timestamp || instrument.last_updated_timestamp,
        source: latest?.source || instrument.source,
        data_status: latest?.data_status || instrument.data_status,
      },
      chart: {
        range,
        prices: selectedPrices,
        adjusted_close_fallback: (prices?.prices || []).some((price: any) => price.adjusted_close === price.close),
        source: prices?.source || 'database',
        last_updated_timestamp: prices?.last_updated_timestamp ?? null,
        data_status: prices?.data_status || 'MISSING',
        // Warn when the selected range yields insufficient bars for meaningful metrics.
        // Typically caused by a price-history gap spanning the requested period.
        insufficient_range_bars: selectedPrices.length < 2,
      },
      performance,
      fundamentals: enrichedFundamentals,
      valuation,
      peers,
      relative_strength: relativeStrength,
      corporate_actions: corporateActions?.actions || [],
      trust: {
        source: latest?.source || prices?.source || instrument.source,
        last_updated_timestamp: latest?.last_updated_timestamp || prices?.last_updated_timestamp || instrument.last_updated_timestamp,
        data_status: latest?.data_status || prices?.data_status || instrument.data_status,
      },
      signalEvidence,
    };
  }

  /**
   * Build the signalEvidence section for the workbench.
   *
   * Sources (all persisted-read; no live recompute):
   *  1. SignalCalibrationEngineRepository.latestForInstrument → calibratedScore + horizon
   *  2. SignalQualityLabRepository.instrumentOutcomeAggregate → winRate + avgForwardReturn
   *  3. SignalGenerationEngineRepository.latestForInstrument → reliabilityTier
   *
   * Graceful when any source is absent:
   *  - No calibration row → calibrationStatus = 'CALIBRATION_PENDING', calibratedScore null
   *  - No mature outcomes → status = 'NO_TRACK_RECORD', winRate / avgForwardReturn null
   *  - No signal row → reliabilityTier null
   */
  async signalEvidenceFor(instrumentId: string): Promise<SignalEvidenceSection> {
    const calibReader = this.resolveCalibrationReader();
    const outcomeReader = this.resolveOutcomeAggregateReader();
    const sigReader = this.resolveSignalReader();

    const [calibRow, sigRow] = await Promise.all([
      calibReader ? calibReader.latestForInstrument(instrumentId).catch(() => null) : Promise.resolve(null),
      sigReader ? (sigReader as any).latestForInstrument(instrumentId).catch(() => null) : Promise.resolve(null),
    ]);

    const horizon: string = calibRow?.calibrationEvidence?.horizon ?? DEFAULT_CALIBRATION_HORIZON;
    const outcomeAggregate = outcomeReader
      ? await outcomeReader.instrumentOutcomeAggregate(instrumentId, horizon).catch(() => null)
      : null;

    const reliabilityTier = (sigRow as any)?.reliabilityTier ?? null;
    const outcomeDepth = outcomeAggregate?.matureCount ?? null;
    const winRate = outcomeAggregate?.winRate ?? null;
    const avgForwardReturn = outcomeAggregate?.avgForwardReturn ?? null;
    const calibratedScore = typeof calibRow?.calibratedScore === 'number' ? calibRow.calibratedScore : null;
    const calibratedDirection = typeof calibRow?.calibratedDirection === 'string' ? calibRow.calibratedDirection : null;

    // Determine status
    const hasOutcomes = (outcomeDepth ?? 0) > 0;
    const hasCalibration = calibRow !== null && calibRow !== undefined;

    let status: SignalEvidenceSection['status'];
    let note: string;

    if (!hasOutcomes) {
      status = 'NO_TRACK_RECORD';
      const calibNote = calibratedScore !== null
        ? ` Calibrated score: ${calibratedScore} (${calibratedDirection ?? 'unknown direction'}).`
        : '';
      note = `No outcome track record yet — outcomes will populate as signals mature over time.${calibNote}`;
    } else if (!hasCalibration) {
      status = 'CALIBRATION_PENDING';
      note = `Track record available (${outcomeDepth} mature outcomes at ${horizon}) — calibration pending for this instrument.`;
    } else {
      status = 'AVAILABLE';
      const winRateStr = winRate !== null ? `${(winRate * 100).toFixed(1)}% win rate` : 'win rate pending';
      note = `${outcomeDepth} mature outcomes at ${horizon} horizon — ${winRateStr}.`;
    }

    return {
      status,
      reliabilityTier: reliabilityTier as 'FULL' | 'PARTIAL' | null,
      outcomeDepth,
      trackRecordHorizon: hasOutcomes ? horizon : null,
      winRate,
      avgForwardReturn,
      calibratedScore,
      calibratedDirection,
      note,
    };
  }

  async overview(instrumentId: string) {
    const result = await this.workbench(instrumentId, '1Y');
    return result?.overview ?? null;
  }

  async performance(instrumentId: string, range: ResearchRange) {
    const result = await this.workbench(instrumentId, range);
    return result?.performance ?? null;
  }

  async peers(instrumentId: string) {
    const result = await this.workbench(instrumentId, '1Y');
    return result?.peers ?? null;
  }

  async relativeStrength(instrumentId: string, range: ResearchRange) {
    const result = await this.workbench(instrumentId, range);
    return result?.relative_strength ?? null;
  }

  performanceMetrics(allPrices: ResearchPricePoint[], selectedPrices: ResearchPricePoint[]): ResearchPerformanceMetrics {
    return {
      selected_range_return: this.periodReturn(selectedPrices),
      return_1d: this.returnAtOffset(allPrices, 1),
      return_1w: this.returnAtOffset(allPrices, 5),
      return_1m: this.returnAtOffset(allPrices, 21),
      return_ytd: this.returnSinceDate(allPrices, new Date(new Date().getFullYear(), 0, 1)),
      return_1y: this.returnAtOffset(allPrices, 252),
      cagr_3y: this.cagr(allPrices, 252 * 3),
      max_drawdown: this.maxDrawdown(selectedPrices),
      volatility: this.volatility(selectedPrices),
    };
  }

  maxDrawdown(prices: ResearchPricePoint[]): number | null {
    if (prices.length < 2) return null;
    const chronological = [...prices].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let peak = chronological[0].adjusted_close;
    let maxDrawdown = 0;
    for (const price of chronological) {
      peak = Math.max(peak, price.adjusted_close);
      if (peak > 0) {
        maxDrawdown = Math.min(maxDrawdown, (price.adjusted_close - peak) / peak);
      }
    }
    return maxDrawdown;
  }

  cagr(prices: ResearchPricePoint[], offset: number): number | null {
    if (prices.length <= offset) return null;
    const latest = prices[0].adjusted_close;
    const old = prices[offset].adjusted_close;
    if (old <= 0) return null;
    const years = offset / TRADING_DAYS_PER_YEAR;
    return Math.pow(latest / old, 1 / years) - 1;
  }

  private async peerComparison(instrument: any, instrumentId: string, range: ResearchRange, region?: string | null) {
    // Fetch peers directly by sector/industry without loading the full universe or
    // running the expensive universeReadinessAndStatsForStocks + trustedBaselineByStockId
    // enrichment that caused ~10 s latency and HTTP 500 on the research workbench endpoint.
    //
    // Strategy: prefer industry match first; if that returns fewer than 3 results
    // (sparse industry), fall back to sector match.  Hard limit of 20 rows from DB.
    // region filter: scope peers to the same region as the instrument so a US stock
    // does not receive Indian peers (TCS/HCLTECH) and vice-versa.
    const PEER_LIMIT = 20;
    const PEER_RETURN_CAP = 10;
    const normalizedRegion = region ? String(region).trim().toUpperCase() : undefined;

    const buildFilter = (sector?: string | null, industry?: string | null) => ({
      page: 1 as const,
      pageSize: PEER_LIMIT,
      sortBy: 'marketCap' as const,
      sortOrder: 'desc' as const,
      ...(normalizedRegion ? { region: normalizedRegion } : {}),
      ...(industry ? { industry } : sector ? { sector } : {}),
    });

    let rawResult = instrument.industry
      ? await this.marketDataService.list(buildFilter(instrument.sector, instrument.industry))
      : null;

    // Fall back to sector-only when industry yields too few peers
    if (!rawResult || rawResult.stocks.filter((s: any) => s.id !== instrumentId).length < 3) {
      if (instrument.sector) {
        rawResult = await this.marketDataService.list(buildFilter(instrument.sector, null));
      }
    }

    const candidates = (rawResult?.stocks ?? [])
      .filter((peer: any) => peer.id !== instrumentId)
      .sort((a: any, b: any) => (b.marketCap || b.market_cap || 0) - (a.marketCap || a.market_cap || 0))
      .slice(0, PEER_RETURN_CAP);

    return Promise.all(candidates.map(async (peer: any) => {
      const [latest, fundamentals, prices] = await Promise.all([
        this.marketDataService.latestPriceByInstrumentId(peer.id),
        this.marketDataService.fundamentalsByInstrumentId(peer.id),
        this.marketDataService.listPricesByInstrumentId(peer.id, 5000),
      ]);
      const points = this.toPricePoints(prices?.prices || []);
      const selectedPeerPrices = this.filterByRange(points, range);
      const latestFundamental = fundamentals?.records?.[0] || null;
      // Raw Prisma Stock rows use camelCase; fall back gracefully for both
      // the enriched V1Instrument shape (company_name/market_cap/data_status)
      // and the raw DB shape (name/marketCap/dataStatus).
      return {
        instrument_id: peer.id,
        symbol: peer.symbol,
        company_name: peer.company_name ?? peer.name ?? null,
        exchange: peer.exchange ?? null,
        market_cap: peer.market_cap ?? (peer.marketCap !== undefined ? Number(peer.marketCap) : null),
        latest_price: latest?.latest?.close ?? null,
        return_selected: this.periodReturn(selectedPeerPrices),
        return_1m: this.returnAtOffset(points, 21),
        return_1y: this.returnAtOffset(points, 252),
        pe_ratio: latestFundamental?.pe_ratio ?? null,
        dividend_yield: latestFundamental?.dividend_yield ?? null,
        data_status: peer.data_status ?? peer.dataStatus ?? null,
      };
    }));
  }

  private valuationSnapshot(fundamental: any, peers: Array<Record<string, any>>, marketCap: number | null) {
    const peerPeValues = peers.map((peer) => peer.pe_ratio).filter((value) => typeof value === 'number');
    const peerYieldValues = peers.map((peer) => peer.dividend_yield).filter((value) => typeof value === 'number');
    const marketCaps = [marketCap, ...peers.map((peer) => peer.market_cap)].filter((value): value is number => typeof value === 'number');
    const sortedMarketCaps = [...marketCaps].sort((a, b) => b - a);
    return {
      pe_ratio: fundamental?.pe_ratio ?? null,
      peer_average_pe: this.average(peerPeValues),
      dividend_yield: fundamental?.dividend_yield ?? null,
      peer_average_dividend_yield: this.average(peerYieldValues),
      market_cap_rank: typeof marketCap === 'number' ? sortedMarketCaps.indexOf(marketCap) + 1 : null,
      peer_count: peers.length,
    };
  }

  /**
   * Fetches the region benchmark EOD price series covering the same date
   * window as `selectedPrices` (oldest to newest).  symbol is resolved from
   * resolveMarketProfile({ region }).benchmark.symbol by the caller.
   * Returns an empty array when the series is unavailable or the range cannot be determined.
   */
  private async fetchBenchmarkPricePoints(symbol: string, selectedPrices: ResearchPricePoint[]): Promise<ResearchPricePoint[]> {
    if (selectedPrices.length === 0) return [];
    // selectedPrices is sorted newest-first (see toPricePoints); dates[0] is
    // the most recent and dates[last] is the oldest.
    const newestDate = new Date(selectedPrices[0].date);
    const oldestDate = new Date(selectedPrices[selectedPrices.length - 1].date);
    // Add a small buffer so we always capture the boundary bars.
    oldestDate.setDate(oldestDate.getDate() - 5);
    newestDate.setDate(newestDate.getDate() + 5);
    try {
      const raw = await this.marketDataService.listPrices(symbol, 5000, oldestDate, newestDate);
      return this.toPricePoints((raw || []).map((price: any) => ({
        date: price.timestamp ?? price.date,
        close: Number(price.close),
        adjusted_close: price.adjustedClose !== null && price.adjustedClose !== undefined
          ? Number(price.adjustedClose)
          : Number(price.close),
        volume: price.volume !== null && price.volume !== undefined ? Number(price.volume) : null,
      })));
    } catch {
      return [];
    }
  }

  private relativeStrengthSnapshot(
    selectedPrices: ResearchPricePoint[],
    peers: Array<Record<string, any>>,
    benchmarkPrices: ResearchPricePoint[] = [],
    benchmarkProfile?: { symbol: string; label: string },
  ) {
    const stockReturn = this.periodReturn(selectedPrices);
    const peerReturns = peers.map((peer) => peer.return_selected).filter((value) => typeof value === 'number') as number[];
    const peerAverage = this.average(peerReturns);

    // Use the region benchmark index when the series spans the selected range
    // (at least 2 bars present after filtering to the same window).
    const indexReturn = benchmarkPrices.length >= 2 ? this.periodReturn(benchmarkPrices) : null;
    const useIndex = indexReturn !== null;
    const benchmarkSymbol = benchmarkProfile?.symbol ?? null;

    return {
      benchmark_symbol: useIndex ? benchmarkSymbol : null,
      benchmark_return: useIndex ? indexReturn : null,
      peer_average_return: peerAverage,
      stock_return: stockReturn,
      relative_to_benchmark: useIndex && stockReturn !== null ? stockReturn - indexReturn! : null,
      relative_to_peer_average: stockReturn !== null && peerAverage !== null ? stockReturn - peerAverage : null,
      fallback_used: useIndex ? (benchmarkSymbol ?? 'benchmark_index') : 'peer_average',
      data_status: stockReturn !== null ? (useIndex ? 'COMPLETE' : 'PARTIAL') : 'MISSING',
    };
  }

  /**
   * Augment a fundamentals record with derived metrics when persisted values are absent.
   *
   * Derived fields (only filled when persisted value is null):
   *  - pe_ratio:        latestClose / TTM EPS  (sum of last 4 quarterly EPS, or latest annual EPS)
   *  - market_cap:      shares_outstanding × latestClose
   *  - dividend_yield:  TTM dividends per share / latestClose  (dividend CAs in the last 12 months)
   *
   * Each derived field is accompanied by `_<field>_derived: true` flag.
   * Returns null when latestFundamental is null (nothing to augment).
   * Never fabricates — sets derived value to null when inputs are missing.
   */
  deriveFundamentals(
    latestFundamental: any,
    allRecords: any[],
    latestClose: number | null,
    corporateActions: any[],
  ): any {
    if (!latestFundamental) return null;

    const result = { ...latestFundamental };
    const close = typeof latestClose === 'number' && Number.isFinite(latestClose) && latestClose > 0
      ? latestClose
      : null;

    // ── Trailing PE ───────────────────────────────────────────────────────────
    if (result.pe_ratio === null || result.pe_ratio === undefined) {
      let ttmEps: number | null = null;
      const quarterly = allRecords.filter(
        (r: any) => (r.period_type ?? '').toUpperCase() === 'QUARTERLY' && typeof r.eps === 'number' && Number.isFinite(r.eps),
      );
      if (quarterly.length >= 4) {
        // Sum last 4 quarterly EPS (already ordered newest-first)
        ttmEps = quarterly.slice(0, 4).reduce((sum: number, r: any) => sum + (r.eps as number), 0);
      } else if (
        typeof latestFundamental.eps === 'number' &&
        Number.isFinite(latestFundamental.eps) &&
        (latestFundamental.period_type ?? '').toUpperCase() === 'ANNUAL'
      ) {
        ttmEps = latestFundamental.eps as number;
      } else if (typeof latestFundamental.eps === 'number' && Number.isFinite(latestFundamental.eps)) {
        // Single record with EPS but unknown periodType — use as best proxy
        ttmEps = latestFundamental.eps as number;
      }
      if (close !== null && ttmEps !== null && ttmEps !== 0) {
        result.pe_ratio = close / ttmEps;
        result._pe_ratio_derived = true;
      } else {
        result._pe_ratio_derived = false;
      }
    } else {
      result._pe_ratio_derived = false;
    }

    // ── Market Cap ───────────────────────────────────────────────────────────
    if (result.market_cap === null || result.market_cap === undefined) {
      const shares =
        typeof latestFundamental.shares_outstanding === 'number' &&
        Number.isFinite(latestFundamental.shares_outstanding) &&
        latestFundamental.shares_outstanding > 0
          ? (latestFundamental.shares_outstanding as number)
          : null;
      if (close !== null && shares !== null) {
        result.market_cap = shares * close;
        result._market_cap_derived = true;
      } else {
        result._market_cap_derived = false;
      }
    } else {
      result._market_cap_derived = false;
    }

    // ── Dividend Yield ────────────────────────────────────────────────────────
    if (result.dividend_yield === null || result.dividend_yield === undefined) {
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
      const ttmDividends = (corporateActions as any[]).filter((action: any) => {
        if ((action.action_type ?? '').toLowerCase() !== 'dividend') return false;
        if (!action.effective_date) return false;
        const d = new Date(action.effective_date);
        return !Number.isNaN(d.getTime()) && d >= twelveMonthsAgo;
      }).reduce((sum: number, action: any) => {
        const amt = typeof action.amount === 'number' ? action.amount : Number(action.amount);
        return sum + (Number.isFinite(amt) ? amt : 0);
      }, 0);
      if (close !== null && ttmDividends > 0) {
        result.dividend_yield = ttmDividends / close;
        result._dividend_yield_derived = true;
      } else {
        result._dividend_yield_derived = false;
      }
    } else {
      result._dividend_yield_derived = false;
    }

    return result;
  }

  private toPricePoints(prices: any[]): ResearchPricePoint[] {
    return prices
      .map((price) => ({
        date: typeof price.date === 'string' ? price.date : new Date(price.date).toISOString(),
        close: Number(price.close),
        adjusted_close: Number(price.adjusted_close ?? price.close),
        volume: price.volume !== null && price.volume !== undefined ? Number(price.volume) : null,
      }))
      .filter((price) => Number.isFinite(price.adjusted_close))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  private filterByRange(prices: ResearchPricePoint[], range: ResearchRange): ResearchPricePoint[] {
    if (range === 'MAX' || prices.length === 0) return prices;
    const cutoff = new Date(prices[0].date);
    if (range === '1W') cutoff.setDate(cutoff.getDate() - 7);
    if (range === '1M') cutoff.setMonth(cutoff.getMonth() - 1);
    if (range === '3M') cutoff.setMonth(cutoff.getMonth() - 3);
    if (range === '6M') cutoff.setMonth(cutoff.getMonth() - 6);
    if (range === 'YTD') cutoff.setMonth(0, 1);
    if (range === '1Y') cutoff.setFullYear(cutoff.getFullYear() - 1);
    if (range === '3Y') cutoff.setFullYear(cutoff.getFullYear() - 3);
    if (range === '5Y') cutoff.setFullYear(cutoff.getFullYear() - 5);
    return prices.filter((price) => new Date(price.date) >= cutoff);
  }

  private returnAtOffset(prices: ResearchPricePoint[], offset: number): number | null {
    if (prices.length <= offset) return null;
    return this.returnBetween(prices[offset].adjusted_close, prices[0].adjusted_close);
  }

  private returnSinceDate(prices: ResearchPricePoint[], date: Date): number | null {
    const old = [...prices].reverse().find((price) => new Date(price.date) >= date);
    if (!old || prices.length === 0) return null;
    return this.returnBetween(old.adjusted_close, prices[0].adjusted_close);
  }

  private periodReturn(prices: ResearchPricePoint[]): number | null {
    if (prices.length < 2) return null;
    return this.returnBetween(prices[prices.length - 1].adjusted_close, prices[0].adjusted_close);
  }

  private returnBetween(oldValue?: number | null, newValue?: number | null): number | null {
    if (!oldValue || oldValue <= 0 || newValue === undefined || newValue === null) return null;
    return (newValue - oldValue) / oldValue;
  }

  private volatility(prices: ResearchPricePoint[]): number | null {
    if (prices.length < 3) return null;
    const chronological = [...prices].reverse();
    const returns = chronological.slice(1).map((price, index) =>
      this.returnBetween(chronological[index].adjusted_close, price.adjusted_close)
    ).filter((value): value is number => typeof value === 'number');
    if (returns.length < 2) return null;
    const avg = this.average(returns);
    if (avg === null) return null;
    const variance = returns.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) / (returns.length - 1);
    return Math.sqrt(variance) * Math.sqrt(TRADING_DAYS_PER_YEAR);
  }

  private average(values: number[]): number | null {
    if (values.length === 0) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }
}
