import { MarketDataFoundationService } from '../market-data-foundation';
import { SmartMoneyIntelligenceProvider } from './smart-money-intelligence.provider';
import { SmartMoneyIntelligenceRepository } from './smart-money-intelligence.repository';
import type {
  InsiderOwnershipSummary,
  SectorSmartMoneySummary,
  SmartMoneyHealth,
  SmartMoneyListQuery,
  SmartMoneyPriceBar,
  SmartMoneyRange,
  SmartMoneySignal,
  SmartMoneyStockSummary,
  SectorSmartMoneyStatus,
  SmartMoneyDataStatus,
} from './smart-money-intelligence.types';

interface InstrumentLike {
  id: string;
  symbol: string;
  company_name?: string | null;
  sector?: string | null;
}

const RANGE_LIMITS: Record<SmartMoneyRange, number> = { '1M': 35, '3M': 90, '6M': 180 };

export class SmartMoneyIntelligenceService {
  constructor(
    private readonly repository = new SmartMoneyIntelligenceRepository(),
    private readonly marketDataService = new MarketDataFoundationService(),
    private readonly provider = new SmartMoneyIntelligenceProvider()
  ) {}

  async health(): Promise<SmartMoneyHealth> {
    return {
      status: 'ok',
      module: 'smart-money-intelligence',
      source: 'market-data-foundation',
      dataStatus: 'PARTIAL',
      updatedAt: new Date().toISOString(),
      notes: [
        'Price and volume signals are calculated from local persisted market data.',
        'Insider and institutional ownership are explicit MISSING placeholders until a free provider is configured.',
        'Data is persisted as daily snapshots to avoid N+1 calculation bottlenecks.'
      ],
    };
  }

  async run(batchSize: number = 20): Promise<{ generated: number, skipped: number, errors: string[] }> {
    // Process all active instruments to generate daily snapshots
    const response = await this.marketDataService.listInstruments({ page: 1, pageSize: 5000 });
    const instruments = response.instruments || [];
    
    let generated = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Parallel batch processing
    for (let i = 0; i < instruments.length; i += batchSize) {
      const chunk = instruments.slice(i, i + batchSize);
      
      await Promise.all(chunk.map(async (instrument: any) => {
        try {
          // Process 3M range by default for the snapshot
          const range: SmartMoneyRange = '3M';
          const bars = await this.loadBars(instrument.id, range).catch(() => []);
          const ownership = this.missingOwnership(); // Placeholder until provider is configured
          
          const summary = this.calculateStockSummary(instrument, bars, ownership, range);
          
          if (summary.status !== 'INSUFFICIENT_DATA') {
            await this.repository.saveSnapshot(summary);
            generated++;
          } else {
            skipped++;
          }
        } catch (err: any) {
          errors.push(`Failed for ${instrument.id}: ${err.message}`);
        }
      }));
    }

    return { generated, skipped, errors };
  }

  async stock(instrumentId: string, range: SmartMoneyRange = '3M'): Promise<SmartMoneyStockSummary | null> {
    if (!instrumentId) throw new Error('instrumentId is required');
    
    // First try to return the persisted snapshot
    const persisted = await this.repository.latestStockSnapshot(instrumentId, range);
    if (persisted) return persisted;

    // Fallback to on-the-fly calculation if missing
    const instrument = await this.marketDataService.getInstrument(instrumentId) as InstrumentLike | null;
    if (!instrument) return null;
    const bars = await this.loadBars(instrumentId, range);
    const ownership = await this.provider.fetchInsiderOwnership(instrument.symbol).catch(() => this.missingOwnership());
    const summary = this.calculateStockSummary(instrument, bars, ownership, range);
    
    if (summary.status !== 'INSUFFICIENT_DATA') {
        await this.repository.saveSnapshot(summary);
    }
    
    return summary;
  }

  async top(query: SmartMoneyListQuery) {
    const { results } = await this.repository.latestSnapshots(query, false);
    return results;
  }

  async distribution(query: SmartMoneyListQuery) {
    const { results } = await this.repository.latestSnapshots(query, true);
    return results;
  }

  async sectors(range: SmartMoneyRange = '3M'): Promise<SectorSmartMoneySummary[]> {
    return this.repository.latestSectorSnapshots(range);
  }

  calculateStockSummary(
    instrument: InstrumentLike,
    bars: SmartMoneyPriceBar[],
    insiderOwnership: InsiderOwnershipSummary = this.missingOwnership(),
    range: SmartMoneyRange = '3M'
  ): SmartMoneyStockSummary {
    const updatedAt = new Date().toISOString();
    if (bars.length < 21 || bars.every((bar) => !Number.isFinite(bar.volume))) {
      return {
        instrumentId: instrument.id,
        symbol: instrument.symbol,
        companyName: instrument.company_name ?? null,
        sector: instrument.sector ?? null,
        smartMoneyScore: 0,
        status: 'INSUFFICIENT_DATA',
        confidence: 'LOW',
        explanation: 'Insufficient price/volume history to infer accumulation or distribution.',
        updatedAt,
        dataStatus: 'MISSING',
        source: 'market-data-foundation',
        range,
        latestClose: bars.at(-1)?.close ?? null,
        latestVolume: bars.at(-1)?.volume ?? null,
        averageVolume20: null,
        dailyChangePercent: null,
        signals: [],
        insiderOwnership,
        researchUrl: `/research/stocks/${instrument.id}`,
      };
    }

    const latest = bars[bars.length - 1];
    const previous = bars[bars.length - 2];
    const avgVolume20 = this.averageVolume(bars.slice(-21, -1));
    const dailyChangePercent = previous?.close > 0 ? (latest.close - previous.close) / previous.close : null;
    const signals = this.detectSignals(bars, avgVolume20);
    const accumulationStrength = signals.filter((signal) => signal.direction === 'ACCUMULATION').reduce((sum, signal) => sum + signal.strength, 0);
    const distributionStrength = signals.filter((signal) => signal.direction === 'DISTRIBUTION').reduce((sum, signal) => sum + signal.strength, 0);
    const score = this.calculateScore(accumulationStrength, distributionStrength);
    const status = score >= 70 ? 'ACCUMULATION' : score <= 35 ? 'DISTRIBUTION' : 'NEUTRAL';
    const confidence = insiderOwnership.ownershipDataStatus === 'MISSING'
      ? (signals.length >= 3 ? 'MEDIUM' : 'LOW')
      : (signals.length >= 3 ? 'HIGH' : 'MEDIUM');
    const explanation = this.explain(status, signals, insiderOwnership.ownershipDataStatus);

    return {
      instrumentId: instrument.id,
      symbol: instrument.symbol,
      companyName: instrument.company_name ?? null,
      sector: instrument.sector ?? null,
      smartMoneyScore: score,
      status,
      confidence,
      explanation,
      updatedAt,
      dataStatus: insiderOwnership.ownershipDataStatus === 'MISSING' ? 'PARTIAL' : 'COMPLETE',
      source: 'market-data-foundation',
      range,
      latestClose: latest.close,
      latestVolume: latest.volume,
      averageVolume20: avgVolume20,
      dailyChangePercent,
      signals,
      insiderOwnership,
      researchUrl: `/research/stocks/${instrument.id}`,
    };
  }

  detectSignals(bars: SmartMoneyPriceBar[], averageVolume20: number | null): SmartMoneySignal[] {
    const signals: SmartMoneySignal[] = [];
    const latest = bars[bars.length - 1];
    const previous = bars[bars.length - 2];
    if (!latest || !previous || !averageVolume20 || !latest.volume) return signals;
    const volumeRatio = latest.volume / averageVolume20;
    const highVolume = volumeRatio >= 1.2;
    const unusualVolume = volumeRatio >= 1.5;
    const priceChange = previous.close > 0 ? (latest.close - previous.close) / previous.close : 0;
    const closePosition = latest.high !== null && latest.low !== null && latest.high > latest.low
      ? (latest.close - latest.low) / (latest.high - latest.low)
      : null;

    if (unusualVolume) {
      signals.push({
        type: 'UNUSUAL_VOLUME',
        label: 'Unusual volume',
        direction: priceChange >= 0 ? 'ACCUMULATION' : 'DISTRIBUTION',
        strength: 15,
        details: `Latest volume is ${volumeRatio.toFixed(1)}x the 20-day average.`,
      });
    }
    if (highVolume && priceChange > 0) signals.push({ type: 'PRICE_UP_HIGH_VOLUME', label: 'Price up on high volume', direction: 'ACCUMULATION', strength: 20, details: 'Price rose on above-average volume.' });
    if (highVolume && priceChange < 0) signals.push({ type: 'PRICE_DOWN_HIGH_VOLUME', label: 'Price down on high volume', direction: 'DISTRIBUTION', strength: 20, details: 'Price fell on above-average volume.' });
    if (highVolume && closePosition !== null && closePosition >= 0.75) signals.push({ type: 'CLOSE_NEAR_HIGH', label: 'Close near high on volume', direction: 'ACCUMULATION', strength: 15, details: 'Close finished near the session high while volume was elevated.' });
    if (highVolume && closePosition !== null && closePosition <= 0.25) signals.push({ type: 'CLOSE_NEAR_LOW', label: 'Close near low on volume', direction: 'DISTRIBUTION', strength: 15, details: 'Close finished near the session low while volume was elevated.' });

    const recent = bars.slice(-6);
    const accumulationDays = recent.slice(1).filter((bar, index) => {
      const prior = recent[index];
      return bar.close > prior.close && Boolean(bar.volume && averageVolume20 && bar.volume >= averageVolume20 * 1.1);
    }).length;
    const distributionDays = recent.slice(1).filter((bar, index) => {
      const prior = recent[index];
      return bar.close < prior.close && Boolean(bar.volume && averageVolume20 && bar.volume >= averageVolume20 * 1.1);
    }).length;
    if (accumulationDays >= 3) signals.push({ type: 'MULTI_DAY_ACCUMULATION', label: 'Multi-day accumulation', direction: 'ACCUMULATION', strength: 25, details: `${accumulationDays} recent up days had above-average volume.` });
    if (distributionDays >= 3) signals.push({ type: 'MULTI_DAY_DISTRIBUTION', label: 'Multi-day distribution', direction: 'DISTRIBUTION', strength: 25, details: `${distributionDays} recent down days had above-average volume.` });

    return signals;
  }

  calculateScore(accumulationStrength: number, distributionStrength: number): number {
    return Math.max(0, Math.min(100, Math.round(50 + accumulationStrength * 0.7 - distributionStrength * 0.7)));
  }

  aggregateSectors(summaries: SmartMoneyStockSummary[]): SectorSmartMoneySummary[] {
    const groups = new Map<string, SmartMoneyStockSummary[]>();
    summaries.forEach((summary) => {
      const sector = summary.sector || 'Unknown';
      groups.set(sector, [...(groups.get(sector) || []), summary]);
    });
    return [...groups.entries()].map(([sector, items]) => {
      const average = Math.round(items.reduce((sum, item) => sum + item.smartMoneyScore, 0) / Math.max(1, items.length));
      const sectorStatus: SectorSmartMoneyStatus = average >= 65 ? 'ACCUMULATING' : average <= 40 ? 'DISTRIBUTING' : 'NEUTRAL';
      const dataStatus: SmartMoneyDataStatus = items.some((item) => item.dataStatus === 'PARTIAL') ? 'PARTIAL' : 'COMPLETE';
      return {
        sector,
        averageSmartMoneyScore: average,
        accumulationCount: items.filter((item) => item.status === 'ACCUMULATION').length,
        distributionCount: items.filter((item) => item.status === 'DISTRIBUTION').length,
        unusualVolumeCount: items.filter((item) => item.signals.some((signal) => signal.type === 'UNUSUAL_VOLUME')).length,
        instrumentCount: items.length,
        sectorStatus,
        dataStatus,
        updatedAt: new Date().toISOString(),
      };
    }).sort((a, b) => b.averageSmartMoneyScore - a.averageSmartMoneyScore);
  }



  private async loadBars(instrumentId: string, range: SmartMoneyRange): Promise<SmartMoneyPriceBar[]> {
    const result = await this.marketDataService.listPricesByInstrumentId(instrumentId, RANGE_LIMITS[range]);
    return (result?.prices || [])
      .map((price: any) => ({
        date: new Date(price.date).toISOString().slice(0, 10),
        open: this.toNumberOrNull(price.open),
        high: this.toNumberOrNull(price.high),
        low: this.toNumberOrNull(price.low),
        close: Number(price.adjusted_close ?? price.close),
        volume: this.toNumberOrNull(price.volume),
      }))
      .filter((bar: SmartMoneyPriceBar) => Number.isFinite(bar.close))
      .sort((a: SmartMoneyPriceBar, b: SmartMoneyPriceBar) => a.date.localeCompare(b.date));
  }

  private averageVolume(bars: SmartMoneyPriceBar[]): number | null {
    const volumes = bars.map((bar) => bar.volume).filter((volume): volume is number => Number.isFinite(volume));
    return volumes.length > 0 ? volumes.reduce((sum, volume) => sum + volume, 0) / volumes.length : null;
  }

  private toNumberOrNull(value: unknown): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private explain(status: string, signals: SmartMoneySignal[], ownershipStatus: string): string {
    const topSignals = signals.slice(0, 3).map((signal) => signal.label.toLowerCase());
    const base = topSignals.length > 0 ? topSignals.join(', ') : 'no strong price-volume signal';
    const ownershipNote = ownershipStatus === 'MISSING' ? ' Insider and institutional ownership data is unavailable in the free MVP provider.' : '';
    if (status === 'ACCUMULATION') return `Accumulation leaning because ${base}.${ownershipNote}`;
    if (status === 'DISTRIBUTION') return `Distribution warning because ${base}.${ownershipNote}`;
    return `Neutral because ${base}.${ownershipNote}`;
  }

  private missingOwnership(): InsiderOwnershipSummary {
    return {
      insiderBuyCount: null,
      insiderSellCount: null,
      netInsiderActivity: null,
      institutionalOwnershipPercent: null,
      ownershipDataStatus: 'MISSING',
      source: 'not-configured',
      explanation: 'Free insider and institutional ownership provider is not configured for the MVP.',
    };
  }
}
