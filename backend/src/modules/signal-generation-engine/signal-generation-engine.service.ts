import { MarketDataFoundationService } from '../market-data-foundation';
import { StockResearchWorkbenchService } from '../stock-research-workbench';
import { DataQualityEngineService } from '../data-quality-engine';
import { SignalGenerationEngineRepository } from './signal-generation-engine.repository';
import type {
  SignalConfidence,
  SignalDirection,
  SignalHistoryQuery,
  SignalItem,
  SignalPricePoint,
  SignalQuery,
  SignalResultDto,
  SignalRunRequest,
  SignalRunResponse,
} from './signal-generation-engine.types';

const TECHNICAL_WEIGHT = 0.4;
const MOMENTUM_WEIGHT = 0.35;
const FUNDAMENTAL_WEIGHT = 0.25;

export class SignalGenerationEngineService {
  constructor(
    private readonly repository = new SignalGenerationEngineRepository(),
    private readonly marketDataService = new MarketDataFoundationService(),
    private readonly researchService = new StockResearchWorkbenchService(),
    private readonly dataQualityService = new DataQualityEngineService()
  ) {}

  async topSignals(query: SignalQuery) {
    const { signals, total } = await this.repository.latestSignals(query);
    return {
      signals: await this.enrichSignals(signals),
      total,
      limit: query.limit,
      offset: query.offset || 0,
    };
  }

  async screener(query: SignalQuery) {
    const { signals, total } = await this.repository.latestSignals(query);
    return {
      signals: await this.enrichSignals(signals),
      total,
      limit: query.limit,
      offset: query.offset || 0,
      filters: query,
      source: 'signal-generation-engine',
      generated_at: new Date().toISOString(),
    };
  }

  async latestForInstrument(instrumentId: string): Promise<SignalResultDto | null> {
    const latest = await this.repository.latestForInstrument(instrumentId);
    if (latest) return this.enrichSignal(latest);
    const generated = await this.generateForInstrument(instrumentId);
    return generated ? this.enrichSignal(generated) : null;
  }

  async run(request: SignalRunRequest): Promise<SignalRunResponse> {
    const generatedAt = new Date().toISOString();
    const errors: string[] = [];
    const warnings: string[] = [];
    const results: SignalResultDto[] = [];
    const resolvedInstrumentIds = await this.resolveRunUniverse(request);
    let instrumentIds = resolvedInstrumentIds;
    let dataQuality: SignalRunResponse['dataQuality'] = {
      filterApplied: Boolean(request.useDataQualityFilter),
      beforeFilter: resolvedInstrumentIds.length,
      afterFilter: resolvedInstrumentIds.length,
      excludedByDataQuality: 0,
      missingQualityEvaluationCount: 0,
    };

    if (request.useDataQualityFilter) {
      const filtered = await this.dataQualityService.filterEligibleInstruments(resolvedInstrumentIds, {
        minSignalReadinessScore: request.minSignalReadinessScore ?? 70,
        allowedReadinessStatuses: request.allowedReadinessStatuses,
        includeLimited: request.includeLimited,
        skipUnusable: request.skipUnusable ?? true,
        missingQualityBehavior: request.missingQualityBehavior ?? 'WARN_AND_PROCESS',
      }).catch((error: any) => {
        warnings.push(`Data quality filter unavailable: ${error?.message || 'unknown error'}`);
        return null;
      });
      if (filtered) {
        instrumentIds = filtered.eligibleInstrumentIds;
        warnings.push(...filtered.warnings);
        dataQuality = {
          filterApplied: true,
          beforeFilter: resolvedInstrumentIds.length,
          afterFilter: instrumentIds.length,
          excludedByDataQuality: filtered.excludedInstrumentIds.length,
          missingQualityEvaluationCount: filtered.missingQualityEvaluationCount,
        };
      }
    }

    for (const instrumentId of instrumentIds) {
      try {
        const result = await this.generateForInstrument(instrumentId);
        if (result) results.push(result);
      } catch (error: any) {
        errors.push(`${instrumentId}: ${error.message || 'signal generation failed'}`);
      }
    }

    return {
      generated: results.length,
      skipped: Math.max(0, resolvedInstrumentIds.length - results.length - errors.length),
      errors,
      warnings,
      dataQuality,
      results,
      generated_at: generatedAt,
    };
  }

  async health() {
    const { signals: latest } = await this.repository.latestSignals({ limit: 1 });
    return {
      status: 'ok',
      module: 'signal-generation-engine',
      latest_generated_at: latest[0]?.generated_at ?? null,
      source: 'signal-generation-engine',
      data_status: latest.length > 0 ? 'COMPLETE' : 'MISSING',
      timestamp: new Date().toISOString(),
    };
  }

  async signalHistory(query: SignalHistoryQuery) {
    return this.repository.signalHistory(query);
  }

  async signalHistoryCount(query: Omit<SignalHistoryQuery, 'limit'>) {
    return this.repository.signalHistoryCount(query);
  }

  async latestSignalUniverse(query: SignalQuery) {
    return this.repository.latestSignalUniverse(query);
  }

  async latestSignalUniverseCount(query: Omit<SignalQuery, 'limit'>) {
    return this.repository.latestSignalUniverseCount(query);
  }

  async generateForInstrument(instrumentId: string): Promise<SignalResultDto | null> {
    const [instrument, pricesResponse, fundamentalsResponse, research] = await Promise.all([
      this.marketDataService.getInstrument(instrumentId),
      this.marketDataService.listPricesByInstrumentId(instrumentId, 5000),
      this.marketDataService.fundamentalsByInstrumentId(instrumentId),
      this.researchService.workbench(instrumentId, '3M'),
    ]);

    if (!instrument) return null;

    const prices = this.toPricePoints(pricesResponse?.prices || []);
    const latestFundamental = fundamentalsResponse?.records?.[0] || null;
    const peerAveragePe = typeof research?.valuation?.peer_average_pe === 'number' ? research.valuation.peer_average_pe : null;
    const peerAverageYield = typeof research?.valuation?.peer_average_dividend_yield === 'number'
      ? research.valuation.peer_average_dividend_yield
      : null;
    const relativeToPeers = typeof research?.relative_strength?.relative_to_peer_average === 'number'
      ? research.relative_strength.relative_to_peer_average
      : null;

    const technical = this.evaluateTechnical(prices);
    const momentum = this.evaluateMomentum(prices, relativeToPeers);
    const fundamentals = this.evaluateFundamentals(latestFundamental, peerAveragePe, peerAverageYield);
    const score = this.compositeScore(technical.score, momentum.score, fundamentals.score);
    const direction = this.directionForScore(score);
    const confidence = this.confidenceFor(prices, latestFundamental, technical.signals.length + momentum.signals.length + fundamentals.signals.length);
    const triggeredSignals = [...technical.signals, ...momentum.signals, ...fundamentals.signals];
    const negativeSignals = [...technical.negativeSignals, ...momentum.negativeSignals, ...fundamentals.negativeSignals];
    const result: SignalResultDto = {
      instrument_id: instrument.id,
      symbol: instrument.symbol,
      company_name: instrument.company_name ?? null,
      sector: instrument.sector ?? null,
      country: instrument.country ?? null,
      currentPrice: null,
      previousClose: null,
      dailyChange: null,
      dailyChangePercent: null,
      currency: instrument.currency ?? null,
      priceTimestamp: null,
      score,
      direction,
      confidence,
      triggered_signals: triggeredSignals,
      negative_signals: negativeSignals,
      explanation: this.explain(direction, triggeredSignals, negativeSignals),
      generated_at: new Date().toISOString(),
      modelVersion: 'signal-engine-v1',
      source: 'signal-generation-engine',
      data_status: prices.length >= 50 ? (prices.length >= 200 ? 'COMPLETE' : 'PARTIAL') : 'MISSING',
    };

    return this.repository.createSignalResult(result);
  }

  async enrichSignals(signals: SignalResultDto[]): Promise<SignalResultDto[]> {
    return Promise.all(signals.map((signal) => this.enrichSignal(signal)));
  }

  async enrichSignal(signal: SignalResultDto): Promise<SignalResultDto> {
    try {
      const [instrument, latest, prices] = await Promise.all([
        this.marketDataService.getInstrument(signal.instrument_id).catch(() => null),
        this.marketDataService.latestPriceByInstrumentId(signal.instrument_id).catch(() => null),
        this.marketDataService.listPricesByInstrumentId(signal.instrument_id, 2).catch(() => null),
      ]);
      const latestPrice = latest?.latest?.adjusted_close ?? latest?.latest?.close ?? null;
      const previousPrice = prices?.prices?.[1]?.adjusted_close ?? prices?.prices?.[1]?.close ?? null;
      const currentPrice = typeof latestPrice === 'number' && Number.isFinite(latestPrice) ? latestPrice : null;
      const previousClose = typeof previousPrice === 'number' && Number.isFinite(previousPrice) ? previousPrice : null;
      const dailyChange = currentPrice !== null && previousClose !== null ? currentPrice - previousClose : null;
      return {
        ...signal,
        currentPrice,
        previousClose,
        dailyChange,
        dailyChangePercent: dailyChange !== null && previousClose !== null && previousClose > 0 ? dailyChange / previousClose : null,
        currency: instrument?.currency ?? signal.currency ?? null,
        priceTimestamp: latest?.latest?.date ? new Date(latest.latest.date).toISOString() : null,
      };
    } catch {
      return {
        ...signal,
        currentPrice: null,
        previousClose: null,
        dailyChange: null,
        dailyChangePercent: null,
        currency: signal.currency ?? null,
        priceTimestamp: null,
      };
    }
  }

  evaluateTechnical(prices: SignalPricePoint[]) {
    const signals: SignalItem[] = [];
    const negativeSignals: SignalItem[] = [];
    const latest = prices[0];
    const previous = prices[1];
    const sma50 = this.sma(prices, 50);
    const sma200 = this.sma(prices, 200);
    const high52 = this.periodHigh(prices, 252);
    const low52 = this.periodLow(prices, 252);
    const rsiNow = this.rsi(prices, 14);
    const rsiPrev = this.rsi(prices.slice(1), 14);

    if (latest && sma50 !== null) {
      (latest.adjusted_close >= sma50 ? signals : negativeSignals).push(this.signal(
        latest.adjusted_close >= sma50 ? 'PRICE_ABOVE_SMA50' : 'PRICE_BELOW_SMA50',
        latest.adjusted_close >= sma50 ? 'price is above SMA50' : 'price is below SMA50',
        'TECHNICAL'
      ));
    }
    if (sma50 !== null && sma200 !== null) {
      (sma50 >= sma200 ? signals : negativeSignals).push(this.signal(
        sma50 >= sma200 ? 'SMA50_ABOVE_SMA200' : 'SMA50_BELOW_SMA200',
        sma50 >= sma200 ? 'SMA50 is above SMA200' : 'SMA50 is below SMA200',
        'TECHNICAL'
      ));
    }
    if (latest && high52 !== null && latest.adjusted_close >= high52 * 0.97) {
      signals.push(this.signal('NEAR_52_WEEK_HIGH', 'price is near a 52-week high', 'TECHNICAL'));
    }
    if (latest && low52 !== null && latest.adjusted_close <= low52 * 1.03) {
      negativeSignals.push(this.signal('NEAR_52_WEEK_LOW', 'price is near a 52-week low', 'TECHNICAL'));
    }
    if (rsiNow !== null && rsiPrev !== null && rsiPrev < 35 && rsiNow > rsiPrev) {
      signals.push(this.signal('RSI_RECOVERING', 'RSI is recovering from oversold levels', 'TECHNICAL'));
    }
    if (rsiNow !== null && rsiPrev !== null && rsiPrev > 70 && rsiNow < rsiPrev) {
      negativeSignals.push(this.signal('RSI_OVERBOUGHT_REVERSAL', 'RSI is reversing from overbought levels', 'TECHNICAL'));
    }
    const averageVolume = this.average(prices.slice(1, 21).map((price) => price.volume).filter((value): value is number => typeof value === 'number'));
    if (latest?.volume && averageVolume && latest.volume >= averageVolume * 1.5) {
      (previous && latest.adjusted_close < previous.adjusted_close ? negativeSignals : signals).push(this.signal(
        previous && latest.adjusted_close < previous.adjusted_close ? 'DOWN_VOLUME_SELLOFF' : 'VOLUME_BREAKOUT',
        previous && latest.adjusted_close < previous.adjusted_close ? 'heavy down-volume selloff' : 'volume breakout confirms the move',
        'TECHNICAL'
      ));
    }

    return { score: this.categoryScore(signals.length, negativeSignals.length), signals, negativeSignals };
  }

  evaluateMomentum(prices: SignalPricePoint[], relativeToPeers: number | null) {
    const signals: SignalItem[] = [];
    const negativeSignals: SignalItem[] = [];
    const oneMonth = this.returnAtOffset(prices, 21);
    const threeMonth = this.returnAtOffset(prices, 63);
    const sixMonth = this.returnAtOffset(prices, 126);

    this.pushReturnSignal(oneMonth, 'ONE_MONTH_MOMENTUM', '1M momentum is positive', '1M momentum is negative', signals, negativeSignals);
    this.pushReturnSignal(threeMonth, 'THREE_MONTH_MOMENTUM', '3M momentum is positive', '3M momentum is negative', signals, negativeSignals);
    if (oneMonth !== null && threeMonth !== null && sixMonth !== null && oneMonth > threeMonth / 3 && threeMonth > sixMonth / 2) {
      signals.push(this.signal('SIX_MONTH_ACCELERATION', '6M trend is accelerating', 'MOMENTUM'));
    }
    if (relativeToPeers !== null) {
      (relativeToPeers >= 0 ? signals : negativeSignals).push(this.signal(
        relativeToPeers >= 0 ? 'OUTPERFORMING_PEERS' : 'UNDERPERFORMING_PEERS',
        relativeToPeers >= 0 ? 'stock is outperforming peer average' : 'stock is underperforming peer average',
        'MOMENTUM'
      ));
    }

    return { score: this.categoryScore(signals.length, negativeSignals.length), signals, negativeSignals };
  }

  evaluateFundamentals(fundamental: any, peerAveragePe: number | null, peerAverageYield: number | null) {
    const signals: SignalItem[] = [];
    const negativeSignals: SignalItem[] = [];
    const eps = this.optionalNumber(fundamental?.eps);
    const netIncome = this.optionalNumber(fundamental?.net_income);
    const peRatio = this.optionalNumber(fundamental?.pe_ratio);
    const dividendYield = this.optionalNumber(fundamental?.dividend_yield);
    const marketCap = this.optionalNumber(fundamental?.market_cap);

    if (eps !== null) (eps > 0 ? signals : negativeSignals).push(this.signal(eps > 0 ? 'POSITIVE_EPS' : 'NEGATIVE_EPS', eps > 0 ? 'EPS is positive' : 'EPS is negative', 'FUNDAMENTAL'));
    if (netIncome !== null) (netIncome > 0 ? signals : negativeSignals).push(this.signal(netIncome > 0 ? 'POSITIVE_NET_INCOME' : 'NEGATIVE_NET_INCOME', netIncome > 0 ? 'net income is positive' : 'net income is negative', 'FUNDAMENTAL'));
    if (peRatio !== null && peerAveragePe !== null && peRatio > 0) {
      (peRatio <= peerAveragePe ? signals : negativeSignals).push(this.signal(peRatio <= peerAveragePe ? 'PE_BELOW_PEERS' : 'PE_ABOVE_PEERS', peRatio <= peerAveragePe ? 'P/E is below peer average' : 'P/E is above peer average', 'FUNDAMENTAL'));
    }
    if (dividendYield !== null && peerAverageYield !== null) {
      (dividendYield >= peerAverageYield ? signals : negativeSignals).push(this.signal(dividendYield >= peerAverageYield ? 'YIELD_ABOVE_PEERS' : 'YIELD_BELOW_PEERS', dividendYield >= peerAverageYield ? 'dividend yield is above peer average' : 'dividend yield is below peer average', 'FUNDAMENTAL'));
    }
    if (marketCap !== null || fundamental) signals.push(this.signal('FUNDAMENTALS_AVAILABLE', 'market cap or fundamentals are available', 'FUNDAMENTAL'));

    return { score: this.categoryScore(signals.length, negativeSignals.length), signals, negativeSignals };
  }

  sma(prices: SignalPricePoint[], period: number): number | null {
    if (prices.length < period) return null;
    return this.average(prices.slice(0, period).map((price) => price.adjusted_close));
  }

  rsi(prices: SignalPricePoint[], period: number): number | null {
    if (prices.length <= period) return null;
    const chronological = [...prices].slice(0, period + 1).reverse();
    let gains = 0;
    let losses = 0;
    for (let index = 1; index < chronological.length; index += 1) {
      const change = chronological[index].adjusted_close - chronological[index - 1].adjusted_close;
      if (change >= 0) gains += change;
      else losses += Math.abs(change);
    }
    if (gains === 0 && losses === 0) return 50;
    if (losses === 0) return 100;
    const relativeStrength = (gains / period) / (losses / period);
    return 100 - (100 / (1 + relativeStrength));
  }

  periodHigh(prices: SignalPricePoint[], period: number): number | null {
    const values = prices.slice(0, period).map((price) => price.adjusted_close);
    return values.length > 0 ? Math.max(...values) : null;
  }

  periodLow(prices: SignalPricePoint[], period: number): number | null {
    const values = prices.slice(0, period).map((price) => price.adjusted_close);
    return values.length > 0 ? Math.min(...values) : null;
  }

  compositeScore(technical: number, momentum: number, fundamentals: number): number {
    return Math.round((technical * TECHNICAL_WEIGHT + momentum * MOMENTUM_WEIGHT + fundamentals * FUNDAMENTAL_WEIGHT) * 100);
  }

  directionForScore(score: number): SignalDirection {
    if (score >= 70) return 'BULLISH';
    if (score >= 40) return 'NEUTRAL';
    return 'BEARISH';
  }

  explain(direction: SignalDirection, triggeredSignals: SignalItem[], negativeSignals: SignalItem[]): string {
    const primary = direction === 'BEARISH' ? negativeSignals : triggeredSignals;
    const fallback = direction === 'BEARISH' ? triggeredSignals : negativeSignals;
    const reasons = (primary.length > 0 ? primary : fallback).slice(0, 4).map((signal) => signal.label);
    if (reasons.length === 0) return `${direction} because there is not enough market data for a strong signal.`;
    return `${direction.charAt(0)}${direction.slice(1).toLowerCase()} because ${this.joinReasons(reasons)}.`;
  }

  private async resolveRunUniverse(request: SignalRunRequest): Promise<string[]> {
    if (request.instrumentId) return [request.instrumentId];
    if (request.symbol) {
      const instruments = await this.marketDataService.listInstruments({ search: request.symbol, pageSize: 25 });
      const match = instruments.instruments.find((instrument: any) => instrument.symbol === request.symbol);
      return match ? [match.id] : [];
    }
    const instruments = await this.marketDataService.listInstruments({ page: 1, pageSize: request.limit ?? 50 });
    return instruments.instruments
      .filter((instrument: any) => !request.sector || instrument.sector === request.sector)
      .filter((instrument: any) => !request.country || instrument.country === request.country)
      .map((instrument: any) => instrument.id);
  }

  private categoryScore(positive: number, negative: number): number {
    const total = positive + negative;
    if (total === 0) return 0.5;
    return positive / total;
  }

  private confidenceFor(prices: SignalPricePoint[], fundamental: any, signalCount: number): SignalConfidence {
    if (prices.length >= 200 && fundamental && signalCount >= 6) return 'HIGH';
    if (prices.length >= 50 && signalCount >= 3) return 'MEDIUM';
    return 'LOW';
  }

  private pushReturnSignal(value: number | null, code: string, positiveLabel: string, negativeLabel: string, signals: SignalItem[], negativeSignals: SignalItem[]) {
    if (value === null) return;
    (value >= 0 ? signals : negativeSignals).push(this.signal(value >= 0 ? code : `${code}_NEGATIVE`, value >= 0 ? positiveLabel : negativeLabel, 'MOMENTUM'));
  }

  private returnAtOffset(prices: SignalPricePoint[], offset: number): number | null {
    if (prices.length <= offset) return null;
    const oldValue = prices[offset].adjusted_close;
    if (oldValue <= 0) return null;
    return (prices[0].adjusted_close - oldValue) / oldValue;
  }

  private toPricePoints(prices: any[]): SignalPricePoint[] {
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

  private optionalNumber(value: unknown): number | null {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  private signal(code: string, label: string, category: SignalItem['category']): SignalItem {
    return { code, label, category };
  }

  private joinReasons(reasons: string[]): string {
    if (reasons.length === 1) return reasons[0];
    return `${reasons.slice(0, -1).join(', ')}, and ${reasons[reasons.length - 1]}`;
  }

  private average(values: number[]): number | null {
    if (values.length === 0) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }
}

