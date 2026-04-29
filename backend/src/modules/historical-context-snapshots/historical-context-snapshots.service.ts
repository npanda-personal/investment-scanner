import { MarketContextIntelligenceService } from '../market-context-intelligence';
import { MarketDataFoundationService } from '../market-data-foundation';
import { SmartMoneyIntelligenceService } from '../smart-money-intelligence';
import { HistoricalContextSnapshotsRepository } from './historical-context-snapshots.repository';
import type { SnapshotCount, SnapshotGenerateSummary, SnapshotLookupResult, SnapshotQuery } from './historical-context-snapshots.types';
import { normalizeSnapshotDate } from './historical-context-snapshots.validation';

export class HistoricalContextSnapshotsService {
  constructor(
    private readonly repository = new HistoricalContextSnapshotsRepository(),
    private readonly marketContextService = new MarketContextIntelligenceService(),
    private readonly smartMoneyService = new SmartMoneyIntelligenceService(),
    private readonly marketDataService = new MarketDataFoundationService()
  ) {}

  async generate(snapshotDate = normalizeSnapshotDate(), limit = 50): Promise<SnapshotGenerateSummary> {
    const warnings: string[] = [];
    const market = this.repository.emptyCount();
    const sectors = this.repository.emptyCount();
    const countries = this.repository.emptyCount();
    const smartMoney = this.repository.emptyCount();
    const dataQuality = this.repository.emptyCount();

    const summary = await this.safe(() => this.marketContextService.summary(), 'market context summary failed', warnings);
    if (summary) {
      this.bump(market, await this.repository.upsertMarket({
        snapshotDate,
        regime: summary.regime.regime,
        regimeScore: summary.regime.score,
        breadthPercentAboveSma50: summary.breadth.percentAboveSma50,
        breadthPercentAboveSma200: summary.breadth.percentAboveSma200,
        advanceDeclineRatio: summary.breadth.advanceDeclineRatio,
        newHighCount: summary.breadth.newHigh52WeekCount,
        newLowCount: summary.breadth.newLow52WeekCount,
        macroStatus: summary.macro.macroStatus,
        explanation: [...summary.explanation].join(' '),
        source: 'market-context-intelligence',
        dataStatus: summary.dataStatus,
      }));
      for (const item of [...summary.topSectors, ...summary.weakSectors]) {
        this.bump(sectors, await this.repository.upsertSector({
          snapshotDate,
          sector: item.sector,
          oneMonthReturn: item.return1M,
          threeMonthReturn: item.return3M,
          sixMonthReturn: item.return6M,
          relativeStrengthScore: item.relativeStrengthScore,
          instrumentCount: item.instrumentCount,
          bullishSignalCount: item.bullishSignalCount,
          bearishSignalCount: item.bearishSignalCount,
          leadershipStatus: item.leadershipStatus,
          source: 'market-context-intelligence',
          dataStatus: summary.dataStatus,
        }));
      }
      for (const item of summary.countryStrength) {
        this.bump(countries, await this.repository.upsertCountry({
          snapshotDate,
          country: item.country,
          oneMonthReturn: item.return1M,
          threeMonthReturn: item.return3M,
          sixMonthReturn: item.return6M,
          relativeStrengthScore: item.relativeStrengthScore,
          bullishSignalCount: item.bullishSignalCount,
          bearishSignalCount: null,
          source: 'market-context-intelligence',
          dataStatus: summary.dataStatus,
        }));
      }
    } else {
      market.skipped += 1;
    }

    const instruments = await this.safe(() => this.marketDataService.listInstruments({ page: 1, pageSize: limit }), 'instrument list failed', warnings);
    for (const instrument of instruments?.instruments || []) {
      const [smart, prices, latest, fundamentals] = await Promise.all([
        this.safe(() => this.smartMoneyService.stock(instrument.id), `${instrument.symbol} smart-money failed`, warnings),
        this.safe(() => this.marketDataService.listPricesByInstrumentId(instrument.id, 500), `${instrument.symbol} prices failed`, warnings),
        this.safe(() => this.marketDataService.latestPriceByInstrumentId(instrument.id), `${instrument.symbol} latest price failed`, warnings),
        this.safe(() => this.marketDataService.fundamentalsByInstrumentId(instrument.id), `${instrument.symbol} fundamentals failed`, warnings),
      ]);
      if (smart) {
        this.bump(smartMoney, await this.repository.upsertSmartMoney({
          snapshotDate,
          instrumentId: instrument.id,
          symbol: instrument.symbol,
          sector: instrument.sector ?? smart.sector ?? null,
          smartMoneyScore: smart.smartMoneyScore,
          status: smart.status,
          confidence: smart.confidence,
          accumulationSignalCount: smart.signals.filter((signal: any) => signal.direction === 'ACCUMULATION').length,
          distributionSignalCount: smart.signals.filter((signal: any) => signal.direction === 'DISTRIBUTION').length,
          unusualVolumeDetected: smart.signals.some((signal: any) => signal.type === 'UNUSUAL_VOLUME'),
          explanation: smart.explanation,
          source: smart.source,
          dataStatus: smart.dataStatus,
        }));
      } else {
        smartMoney.skipped += 1;
      }
      const priceHistoryDays = prices?.prices?.length || 0;
      const readiness = this.readinessScore({
        priceHistoryDays,
        hasLatestPrice: Boolean(latest?.latest),
        hasFundamentals: Boolean(fundamentals?.records?.length),
        hasSector: Boolean(instrument.sector),
        hasIndustry: Boolean(instrument.industry),
      });
      this.bump(dataQuality, await this.repository.upsertDataQuality({
        snapshotDate,
        instrumentId: instrument.id,
        symbol: instrument.symbol,
        priceHistoryDays,
        hasLatestPrice: Boolean(latest?.latest),
        hasFundamentals: Boolean(fundamentals?.records?.length),
        hasSector: Boolean(instrument.sector),
        hasIndustry: Boolean(instrument.industry),
        dataStatus: readiness >= 80 ? 'COMPLETE' : readiness >= 40 ? 'PARTIAL' : 'MISSING',
        signalReadinessScore: readiness,
      }));
    }

    return { snapshotDate: snapshotDate.toISOString(), market, sectors, countries, smartMoney, dataQuality, warnings };
  }

  summary() {
    return this.coverage();
  }

  market(query: SnapshotQuery) { return this.repository.market(query); }
  sectors(query: SnapshotQuery) { return this.repository.sectors(query); }
  countries(query: SnapshotQuery) { return this.repository.countries(query); }
  smartMoney(query: SnapshotQuery) { return this.repository.smartMoney(query); }

  async coverage() {
    const coverage = await this.repository.coverage();
    return {
      ...coverage,
      latestSnapshotDate: coverage.latestSnapshotDate ? coverage.latestSnapshotDate.toISOString() : null,
      warnings: coverage.marketSnapshots === 0 ? ['No market context snapshots have been generated yet.'] : [],
    };
  }

  async lookup(date: Date, lookbackDays: number, filters: { instrumentId?: string; sector?: string; country?: string }): Promise<SnapshotLookupResult> {
    const result = await this.repository.lookup(date, lookbackDays, filters);
    const gaps = [
      !result.market ? 'market context snapshot missing' : null,
      filters.sector && !result.sector ? 'sector context snapshot missing' : null,
      filters.country && !result.country ? 'country context snapshot missing' : null,
      filters.instrumentId && !result.smartMoney ? 'smart-money context snapshot missing' : null,
      filters.instrumentId && !result.dataQuality ? 'data-quality snapshot missing' : null,
    ].filter(Boolean) as string[];
    return {
      ...result,
      dataStatus: gaps.length === 0 ? 'COMPLETE' : result.market ? 'PARTIAL' : 'MISSING',
      gaps,
    };
  }

  async regimeForDate(date: Date): Promise<string | null> {
    const lookup = await this.lookup(normalizeSnapshotDate(date), 7, {});
    return lookup.market?.regime ?? null;
  }

  private readinessScore(input: { priceHistoryDays: number; hasLatestPrice: boolean; hasFundamentals: boolean; hasSector: boolean; hasIndustry: boolean }) {
    return Math.round(
      Math.min(input.priceHistoryDays, 252) / 252 * 45 +
      (input.hasLatestPrice ? 20 : 0) +
      (input.hasFundamentals ? 15 : 0) +
      (input.hasSector ? 10 : 0) +
      (input.hasIndustry ? 10 : 0)
    );
  }

  private bump(count: SnapshotCount, status: 'inserted' | 'updated') {
    count[status] += 1;
  }

  private async safe<T>(fn: () => Promise<T>, label: string, warnings: string[]): Promise<T | null> {
    try {
      return await fn();
    } catch (error: any) {
      warnings.push(`${label}: ${error?.message || 'failed'}`);
      return null;
    }
  }
}
