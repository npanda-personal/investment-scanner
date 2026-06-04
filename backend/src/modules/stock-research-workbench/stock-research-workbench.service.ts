import { MarketDataFoundationService } from '../market-data-foundation';
import type { ResearchPerformanceMetrics, ResearchPricePoint, ResearchRange, SignalEvidenceSection } from './stock-research-workbench.types';

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

export class StockResearchWorkbenchService {
  constructor(
    private readonly marketDataService = new MarketDataFoundationService(),
    private readonly calibrationReader?: WorkbenchCalibrationReader | null,
    private readonly outcomeAggregateReader?: WorkbenchOutcomeAggregateReader | null,
    private readonly signalReader?: WorkbenchSignalReader | null,
  ) {}

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
    const [instrument, latest, prices, fundamentals, corporateActions] = await Promise.all([
      this.marketDataService.getInstrument(instrumentId),
      this.marketDataService.latestPriceByInstrumentId(instrumentId),
      this.marketDataService.listPricesByInstrumentId(instrumentId, 5000),
      this.marketDataService.fundamentalsByInstrumentId(instrumentId),
      this.marketDataService.corporateActionsByInstrumentId(instrumentId),
    ]);

    if (!instrument) return null;

    const pricePoints = this.toPricePoints(prices?.prices || []);
    const selectedPrices = this.filterByRange(pricePoints, range);
    const latestFundamental = fundamentals?.records?.[0] || null;
    const peers = await this.peerComparison(instrument, instrumentId, range);
    const valuation = this.valuationSnapshot(latestFundamental, peers, instrument.market_cap);
    const performance = this.performanceMetrics(pricePoints, selectedPrices);
    // Fetch Nifty 50 for relative-strength; uses same time window as the selected range.
    const nifty50PricePoints = await this.fetchNifty50PricePoints(selectedPrices);
    const relativeStrength = this.relativeStrengthSnapshot(selectedPrices, peers, nifty50PricePoints);
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
      },
      performance,
      fundamentals: latestFundamental,
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
      note = 'No track record yet — outcomes will populate as signals mature over time.';
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

  private async peerComparison(instrument: any, instrumentId: string, range: ResearchRange) {
    const universe = await this.marketDataService.listInstruments({ page: 1, pageSize: 10000 });
    const candidates = universe.instruments
      .filter((peer: any) => peer.id !== instrumentId)
      .filter((peer: any) => {
        if (instrument.industry && peer.industry === instrument.industry) return true;
        return Boolean(instrument.sector && peer.sector === instrument.sector);
      })
      .sort((a: any, b: any) => (b.market_cap || 0) - (a.market_cap || 0))
      .slice(0, 10);

    return Promise.all(candidates.map(async (peer: any) => {
      const [latest, fundamentals, prices] = await Promise.all([
        this.marketDataService.latestPriceByInstrumentId(peer.id),
        this.marketDataService.fundamentalsByInstrumentId(peer.id),
        this.marketDataService.listPricesByInstrumentId(peer.id, 5000),
      ]);
      const points = this.toPricePoints(prices?.prices || []);
      const selectedPeerPrices = this.filterByRange(points, range);
      const latestFundamental = fundamentals?.records?.[0] || null;
      return {
        instrument_id: peer.id,
        symbol: peer.symbol,
        company_name: peer.company_name,
        exchange: peer.exchange,
        market_cap: peer.market_cap,
        latest_price: latest?.latest?.close ?? null,
        return_selected: this.periodReturn(selectedPeerPrices),
        return_1m: this.returnAtOffset(points, 21),
        return_1y: this.returnAtOffset(points, 252),
        pe_ratio: latestFundamental?.pe_ratio ?? null,
        dividend_yield: latestFundamental?.dividend_yield ?? null,
        data_status: peer.data_status,
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
   * Fetches the Nifty 50 (^NSEI) EOD price series covering the same date
   * window as `selectedPrices` (oldest to newest).  Returns an empty array
   * when the series is unavailable or the range cannot be determined.
   */
  private async fetchNifty50PricePoints(selectedPrices: ResearchPricePoint[]): Promise<ResearchPricePoint[]> {
    if (selectedPrices.length === 0) return [];
    // selectedPrices is sorted newest-first (see toPricePoints); dates[0] is
    // the most recent and dates[last] is the oldest.
    const newestDate = new Date(selectedPrices[0].date);
    const oldestDate = new Date(selectedPrices[selectedPrices.length - 1].date);
    // Add a small buffer so we always capture the boundary bars.
    oldestDate.setDate(oldestDate.getDate() - 5);
    newestDate.setDate(newestDate.getDate() + 5);
    try {
      const raw = await this.marketDataService.listPrices('^NSEI', 5000, oldestDate, newestDate);
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
    nifty50Prices: ResearchPricePoint[] = [],
  ) {
    const stockReturn = this.periodReturn(selectedPrices);
    const peerReturns = peers.map((peer) => peer.return_selected).filter((value) => typeof value === 'number') as number[];
    const peerAverage = this.average(peerReturns);

    // Use the Nifty 50 index when the series spans the selected range
    // (at least 2 bars present after filtering to the same window).
    const indexReturn = nifty50Prices.length >= 2 ? this.periodReturn(nifty50Prices) : null;
    const useIndex = indexReturn !== null;

    return {
      benchmark_symbol: useIndex ? '^NSEI' : null,
      benchmark_return: useIndex ? indexReturn : null,
      peer_average_return: peerAverage,
      stock_return: stockReturn,
      relative_to_benchmark: useIndex && stockReturn !== null ? stockReturn - indexReturn! : null,
      relative_to_peer_average: stockReturn !== null && peerAverage !== null ? stockReturn - peerAverage : null,
      fallback_used: useIndex ? 'nse_nifty_50' : 'peer_average',
      data_status: stockReturn !== null ? (useIndex ? 'COMPLETE' : 'PARTIAL') : 'MISSING',
    };
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
