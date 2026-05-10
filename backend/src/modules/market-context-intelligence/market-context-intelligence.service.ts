import { MarketDataFoundationService } from '../market-data-foundation';
import { SignalGenerationEngineService } from '../signal-generation-engine';
import { MarketContextIntelligenceRepository } from './market-context-intelligence.repository';
import type {
  ContextInstrument,
  CountryStrengthItem,
  LeadershipStatus,
  MacroSnapshot,
  MarketBreadth,
  MarketContextSummary,
  MarketRegime,
  MarketRegimeSummary,
  SectorRotationItem,
} from './market-context-intelligence.types';

const SAMPLE_SIZE = 500;

export class MarketContextIntelligenceService {
  constructor(
    private readonly repository = new MarketContextIntelligenceRepository(),
    private readonly marketDataService = new MarketDataFoundationService(),
    private readonly signalService = new SignalGenerationEngineService()
  ) {}

  async run(region?: string): Promise<{ status: string }> {
    const [items, signals] = await Promise.all([this.loadContextInstruments(region), this.loadSignalMap(region)]);
    const enriched = items.map((item) => ({ ...item, ...signals.get(item.instrumentId) }));
    
    const regime = this.calculateRegime(enriched);
    const sectors = this.rankSectors(enriched);
    const breadth = this.calculateBreadth(enriched);
    const countries = this.rankCountries(enriched);
    const macro = this.macro();
    
    const summary: MarketContextSummary = {
      regime,
      topSectors: sectors.slice(0, 5),
      weakSectors: sectors.slice(-5).reverse(),
      breadth,
      countryStrength: countries.slice(0, 8),
      macro,
      explanation: this.takeaways(regime, sectors, breadth, macro),
      updatedAt: new Date().toISOString(),
      dataStatus: items.length >= 30 ? 'PARTIAL' : items.length > 0 ? 'PARTIAL' : 'MISSING',
    };

    await this.repository.saveSnapshot(summary, region || 'GLOBAL');
    return { status: 'success' };
  }

  async summary(query: { region?: string } = {}): Promise<MarketContextSummary> {
    const persisted = await this.repository.latestSnapshot(query.region);
    if (persisted) return persisted;

    await this.run(query.region);
    return (await this.repository.latestSnapshot(query.region))!;
  }

  async latestPersistedSummary(region?: string): Promise<MarketContextSummary | null> {
    return this.repository.latestSnapshot(region);
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

  calculateRegime(items: ContextInstrument[]): MarketRegimeSummary {
    const breadth = this.calculateBreadth(items);
    const sectorItems = this.rankSectors(items);
    const broadReturn = this.average(items.map((item) => this.returnAt(item.prices, 63)).filter(this.isNumber));
    const leadershipScore = sectorItems[0]?.relativeStrengthScore ?? 50;
    const above50 = breadth.percentAboveSma50 ?? 0;
    const above200 = breadth.percentAboveSma200 ?? 0;
    const returnScore = broadReturn === null ? 50 : Math.max(0, Math.min(100, 50 + broadReturn * 200));
    const score = Math.round(returnScore * 0.35 + above50 * 100 * 0.25 + above200 * 100 * 0.25 + leadershipScore * 0.15);
    const regime = this.regimeFromScore(score);
    return {
      regime,
      score,
      explanation: `${regime.replace('_', '-').toLowerCase()} because broad return is ${this.formatPercent(broadReturn)} and ${this.formatPercent(above50)} of sampled instruments are above SMA50.`,
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
    return this.groupRank(items, (item) => item.sector || 'Unknown').map((group) => ({
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
    const above50 = valid.filter((item) => this.sma(item.prices, 50) !== null && item.latest! > this.sma(item.prices, 50)!).length;
    const above200 = valid.filter((item) => this.sma(item.prices, 200) !== null && item.latest! > this.sma(item.prices, 200)!).length;
    const advancers = valid.filter((item) => item.previous !== null && item.latest! > item.previous!).length;
    const decliners = valid.filter((item) => item.previous !== null && item.latest! < item.previous!).length;
    const high52 = valid.filter((item) => item.latest! >= Math.max(...item.prices.slice(0, 252)) * 0.99).length;
    const low52 = valid.filter((item) => item.latest! <= Math.min(...item.prices.slice(0, 252)) * 1.01).length;
    return {
      percentAboveSma50: valid.length > 0 ? above50 / valid.length : null,
      percentAboveSma200: valid.length > 0 ? above200 / valid.length : null,
      advanceDeclineRatio: decliners > 0 ? advancers / decliners : advancers > 0 ? advancers : null,
      newHigh52WeekCount: high52,
      newLow52WeekCount: low52,
      bullishSignalCount: items.filter((item) => item.signalDirection === 'BULLISH').length,
      bearishSignalCount: items.filter((item) => item.signalDirection === 'BEARISH').length,
      instrumentCount: valid.length,
      dataStatus: valid.length > 0 ? 'PARTIAL' : 'MISSING',
    };
  }

  classifyLeadership(return1M: number | null, return3M: number | null, score: number): LeadershipStatus {
    if (score >= 70 && (return3M ?? 0) >= 0) return 'LEADING';
    if ((return1M ?? 0) > 0 && (return3M ?? 0) <= 0.03) return 'IMPROVING';
    if ((return1M ?? 0) < 0 && (return3M ?? 0) > 0) return 'WEAKENING';
    return 'LAGGING';
  }



  private async loadContextInstruments(region?: string): Promise<ContextInstrument[]> {
    const response = await this.marketDataService.listInstruments({ page: 1, pageSize: SAMPLE_SIZE, region });
    const instruments = response.instruments || [];
    const rows = await Promise.all(instruments.map(async (instrument: any) => {
      const pricesResponse = await this.marketDataService.listPricesByInstrumentId(instrument.id, 260).catch(() => null);
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

  private takeaways(regime: MarketRegimeSummary, sectors: SectorRotationItem[], breadth: MarketBreadth, macro: MacroSnapshot): string[] {
    const top = sectors[0];
    const weak = sectors[sectors.length - 1];
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
}
