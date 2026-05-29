import { MarketContextIntelligenceService } from '../market-context-intelligence';
import { MarketDataFoundationService } from '../market-data-foundation';
import { SmartMoneyIntelligenceService } from '../smart-money-intelligence';
import { HistoricalContextSnapshotsRepository } from './historical-context-snapshots.repository';
import type { SnapshotCount, SnapshotGenerateSummary, SnapshotLookupResult, SnapshotQuery } from './historical-context-snapshots.types';
import { normalizeSnapshotDate } from './historical-context-snapshots.validation';
import { isKnownSector, unknownSectorExplanation } from '../../shared/utils/sector-metadata';

export class HistoricalContextSnapshotsService {
  constructor(
    private readonly repository = new HistoricalContextSnapshotsRepository(),
    private readonly marketContextService = new MarketContextIntelligenceService(),
    private readonly smartMoneyService = new SmartMoneyIntelligenceService(),
    private readonly marketDataService = new MarketDataFoundationService()
  ) {}

  async generate(snapshotDate = normalizeSnapshotDate(), limit = 50, scope: { region?: string; assetType?: string; instrumentIds?: string[] } = {}): Promise<SnapshotGenerateSummary> {
    const region = (scope.region || 'IN').toUpperCase();
    const assetType = (scope.assetType || 'STOCK').toUpperCase();
    const explicitInstrumentIds = [...new Set((scope.instrumentIds || []).map((id) => String(id || '').trim()).filter(Boolean))];
    const warnings: string[] = [];
    const market = this.repository.emptyCount();
    const sectors = this.repository.emptyCount();
    const countries = this.repository.emptyCount();
    const smartMoney = this.repository.emptyCount();
    const dataQuality = this.repository.emptyCount();

    const marketContextAny = this.marketContextService as any;
    const summary = await this.safe<any>(
      () => explicitInstrumentIds.length > 0 && typeof marketContextAny.latestPersistedSummary === 'function'
        ? marketContextAny.latestPersistedSummary(region)
        : this.marketContextService.summary({ region }),
      'market context summary failed',
      warnings
    );
    if (summary) {
      this.bump(market, await this.repository.upsertMarket({
        snapshotDate,
        region,
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
        if (!isKnownSector(item.sector)) {
          sectors.skipped += 1;
          warnings.push(unknownSectorExplanation(item.sector));
          continue;
        }
        this.bump(sectors, await this.repository.upsertSector({
          snapshotDate,
          region,
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
          region,
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

    const instruments = explicitInstrumentIds.length > 0
      ? await this.safe<any[]>(() => this.marketDataService.getInstrumentsByIds(explicitInstrumentIds.slice(0, Math.max(1, limit))), 'instrument list failed', warnings)
      : (await this.safe(() => this.marketDataService.listInstruments({ page: 1, pageSize: limit, region, assetType }), 'instrument list failed', warnings))?.instruments || [];
    const smartMoneyAny = this.smartMoneyService as any;
    for (const instrument of instruments || []) {
      const [smart, prices, latest, fundamentals] = await Promise.all([
        this.safe<any>(
          () => typeof smartMoneyAny.latestPersistedStock === 'function'
            ? smartMoneyAny.latestPersistedStock(instrument.id, '3M')
            : Promise.resolve(null),
          `${instrument.symbol} smart-money failed`,
          warnings
        ),
        this.safe(() => this.marketDataService.listPricesByInstrumentId(instrument.id, 500, undefined, undefined, { region, assetType }), `${instrument.symbol} prices failed`, warnings),
        this.safe(() => this.marketDataService.latestPriceByInstrumentId(instrument.id, { region, assetType }), `${instrument.symbol} latest price failed`, warnings),
        this.safe(() => this.marketDataService.fundamentalsByInstrumentId(instrument.id, { region, assetType }), `${instrument.symbol} fundamentals failed`, warnings),
      ]);
      if (smart && this.isDownstreamSafeSmartMoney(smart)) {
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
        if (smart) warnings.push(`${instrument.symbol} smart-money snapshot skipped: on-demand evidence is not downstream safe.`);
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

    return { snapshotDate: snapshotDate.toISOString(), region, assetType, market, sectors, countries, smartMoney, dataQuality, warnings };
  }

  summary(query: Pick<SnapshotQuery, 'region' | 'assetType'> = {}) {
    return this.coverage(query);
  }

  market(query: SnapshotQuery) { return this.repository.market(query); }
  sectors(query: SnapshotQuery) { return this.repository.sectors(query); }
  countries(query: SnapshotQuery) { return this.repository.countries(query); }
  smartMoney(query: SnapshotQuery) { return this.repository.smartMoney(query); }

  async coverage(query: Pick<SnapshotQuery, 'region' | 'assetType'> = {}) {
    const coverage = await this.repository.coverage(query);
    return {
      ...coverage,
      latestSnapshotDate: coverage.latestSnapshotDate ? coverage.latestSnapshotDate.toISOString() : null,
      warnings: coverage.marketSnapshots === 0 ? ['No market context snapshots have been generated yet.'] : [],
    };
  }

  async lookup(date: Date, lookbackDays: number, filters: { instrumentId?: string; sector?: string; country?: string; region?: string; assetType?: string }): Promise<SnapshotLookupResult> {
    const sectorMetadataGap = filters.sector && !isKnownSector(filters.sector)
      ? unknownSectorExplanation(filters.sector)
      : null;
    const lookupFilters = sectorMetadataGap ? { ...filters, sector: undefined } : filters;
    const result = await this.repository.lookup(date, lookbackDays, lookupFilters);
    const gaps = [
      !result.market ? 'market context snapshot missing' : null,
      sectorMetadataGap,
      filters.sector && !sectorMetadataGap && !result.sector ? 'sector context snapshot missing' : null,
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

  async regimeForDate(date: Date, scope: { region?: string; assetType?: string } = {}): Promise<string | null> {
    const lookup = await this.lookup(normalizeSnapshotDate(date), 7, scope);
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

  private isDownstreamSafeSmartMoney(smart: any): boolean {
    const provenance = smart?.evidence?.provenance;
    if (!provenance) return true;
    return provenance.source !== 'ON_DEMAND_DERIVED' && provenance.downstreamSafe !== false;
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
