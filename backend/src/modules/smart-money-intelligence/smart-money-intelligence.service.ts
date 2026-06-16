import { MarketDataFoundationService } from '../market-data-foundation';
import { DataQualityEngineService, type DataQualityEvaluationDto, type InstrumentEligibilityRow } from '../data-quality-engine';
import { SmartMoneyIntelligenceProvider } from './smart-money-intelligence.provider';
import { SmartMoneyIntelligenceRepository } from './smart-money-intelligence.repository';
import {
  RANGE_LIMITS,
  SMART_MONEY_DEFAULT_ASSET_TYPE,
  SMART_MONEY_DEFAULT_REGION,
  SMART_MONEY_MAX_PAGE_SIZE,
  SMART_MONEY_REFRESH_CONCURRENCY,
  SMART_MONEY_REFRESH_RANGES,
  missingOwnership,
} from './smart-money-intelligence.constants';
import {
  DEFAULT_SMART_MONEY_CONFIG,
  resolveSmartMoneyConfig,
  type SmartMoneyScoringConfig,
} from './smart-money-intelligence.config';
import {
  aggregateSectorSummaries,
  averageVolume, dailyChangePercentBetweenSessions,
  calculateScore,
  classifyStockStatus,
  detectRangeSignals,
  detectSignals,
  hasUsableVolumeHistory,
} from './smart-money-intelligence.scoring';
import {
  evaluateDataQuality,
  evaluateDataQualityFromEligibility,
  type SmartMoneyDataQualityGate,
} from './smart-money-intelligence.data-quality';
import {
  buildEvidenceEnvelope,
  computeFreshnessStatus,
  freshnessReasonCode,
  toIsoDate,
  validDate,
} from './smart-money-intelligence.evidence';
import type {
  InsiderOwnershipSummary,
  SectorSmartMoneySummary,
  SmartMoneyHealth,
  SmartMoneyListQuery,
  SmartMoneyPriceBar,
  SmartMoneyRange,
  SmartMoneySignal,
  SmartMoneyStockSummary,
  SmartMoneyRunResponse,
  SmartMoneyRunQuery,
  SmartMoneyEvidence,
  SmartMoneyEvidenceReasonCode,
} from './smart-money-intelligence.types';

interface InstrumentLike {
  id: string;
  symbol: string;
  company_name?: string | null;
  sector?: string | null;
}

export class SmartMoneyIntelligenceService {
  constructor(
    private readonly repository = new SmartMoneyIntelligenceRepository(),
    private readonly marketDataService = new MarketDataFoundationService(),
    private readonly provider = new SmartMoneyIntelligenceProvider(),
    private readonly dataQualityService: Pick<DataQualityEngineService, 'diagnostics' | 'getEligibility'> | null = new DataQualityEngineService(),
    /** Default scoring config for bare/on-the-fly calls; run() resolves per request. */
    private readonly defaultConfig: SmartMoneyScoringConfig = DEFAULT_SMART_MONEY_CONFIG,
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
        'Data Quality Engine diagnostics gate refresh scoring; blocked instruments are skipped and limited diagnostics degrade evidence.',
        'Insider and institutional ownership are explicit MISSING placeholders until a free provider is configured.',
        'Persisted snapshots use source data-through dates and no-op updates when the calculated evidence is unchanged.'
      ],
    };
  }

  async run(batchSize: number = 100, query: SmartMoneyRunQuery = {}): Promise<SmartMoneyRunResponse> {
    const startedAt = Date.now();
    const region = query.region || SMART_MONEY_DEFAULT_REGION;
    const assetType = query.assetType || SMART_MONEY_DEFAULT_ASSET_TYPE;
    const config = resolveSmartMoneyConfig(region, assetType);

    const pageSize = Math.min(SMART_MONEY_MAX_PAGE_SIZE, Math.max(1, Math.floor(Number(batchSize) || 100)));
    // Page-based pagination requires a page-aligned cursor: snap the requested offset
    // down to its page boundary so the window served and the nextOffset advertised stay
    // consistent (callers always advance by `nextOffset`, which is page-aligned).
    const requestedOffset = Math.max(0, Math.floor(Number(query.offset) || 0));
    const page = Math.floor(requestedOffset / pageSize) + 1;
    const offset = (page - 1) * pageSize;

    const explicitIds = [...new Set((query.instrumentIds || []).map((id) => String(id || '').trim()).filter(Boolean))];
    const explicitBatchIds = explicitIds.slice(offset, offset + pageSize);
    const response = explicitIds.length
      ? null
      : await this.marketDataService.listInstruments({ page, pageSize, region, assetType });
    const instruments = explicitIds.length
      ? await this.marketDataService.getInstrumentsByIds(explicitBatchIds)
      : response?.instruments || [];
    const totalCount = explicitIds.length
      ? explicitIds.length
      : Number(response?.pagination?.total ?? instruments.length);

    let generated = 0;
    let skipped = 0;
    let unchanged = 0;
    const errors: string[] = [];
    const warnings: string[] = [];
    const byRange = Object.fromEntries(
      SMART_MONEY_REFRESH_RANGES.map((r) => [r, { generated: 0, skipped: 0, unchanged: 0 }]),
    ) as SmartMoneyRunResponse['byRange'];
    const requestedCount = explicitIds.length ? explicitBatchIds.length : instruments.length;
    const missingInstrumentSkipped = explicitIds.length ? Math.max(0, requestedCount - instruments.length) : 0;
    if (missingInstrumentSkipped > 0) {
      skipped += missingInstrumentSkipped;
      for (const range of SMART_MONEY_REFRESH_RANGES) byRange[range].skipped += missingInstrumentSkipped;
    }

    await this.eachWithConcurrency(instruments, SMART_MONEY_REFRESH_CONCURRENCY, async (instrument: any) => {
      try {
        const [fullRangeBars, dataQuality, eligibilityRow] = await Promise.all([
          this.loadBars(instrument.id, '6M').catch(() => []),
          this.loadDataQuality(instrument.id),
          this.loadEligibility(instrument.id),
        ]);
        const dataQualityGate = evaluateDataQualityFromEligibility(eligibilityRow) ?? evaluateDataQuality(dataQuality);
        if (dataQualityGate.status === 'BLOCKED') {
          const warning = `${instrument.symbol || instrument.id} smart-money snapshot skipped: ${dataQualityGate.reason}`;
          warnings.push(warning);
          skipped += SMART_MONEY_REFRESH_RANGES.length;
          for (const range of SMART_MONEY_REFRESH_RANGES) byRange[range].skipped += 1;
          return;
        }
        const ownership = missingOwnership(); // Placeholder until provider is configured

        for (const range of SMART_MONEY_REFRESH_RANGES) {
          const bars = fullRangeBars.slice(-RANGE_LIMITS[range]);
          const summary = this.applyDataQualityGate(
            this.calculateStockSummary(instrument, bars, ownership, range, config),
            dataQualityGate
          );

          if (summary.status !== 'INSUFFICIENT_DATA') {
            const action = await this.repository.saveSnapshot(summary);
            if (action === 'unchanged') {
              unchanged++;
              byRange[range].unchanged = (byRange[range].unchanged ?? 0) + 1;
            } else {
              generated++;
              byRange[range].generated++;
            }
          } else {
            skipped++;
            byRange[range].skipped++;
          }
        }
      } catch (err: any) {
        errors.push(`Failed for ${instrument.id}: ${err.message}`);
      }
    });

    const processedCount = requestedCount;
    const nextOffset = offset + requestedCount < totalCount ? offset + requestedCount : null;

    return {
      generated,
      skipped,
      unchanged,
      errors,
      byRange,
      processedCount,
      totalCount,
      batchSize: pageSize,
      offset,
      nextOffset,
      hasMore: nextOffset !== null,
      generatedCount: generated,
      skippedCount: skipped,
      unchangedCount: unchanged,
      failedCount: errors.length,
      warnings: [...warnings, ...errors],
      durationMs: Date.now() - startedAt,
      scope: { region, assetType },
    };
  }

  async stock(instrumentId: string, range: SmartMoneyRange = '3M'): Promise<SmartMoneyStockSummary | null> {
    if (!instrumentId) throw new Error('instrumentId is required');

    // First try to return the persisted snapshot
    const persisted = await this.repository.latestStockSnapshot(instrumentId, range);
    if (persisted) return persisted;

    // Fallback to on-the-fly calculation if missing
    const instrument = await this.marketDataService.getInstrument(instrumentId) as InstrumentLike | null;
    if (!instrument) return null;
    const [bars, dataQuality, eligibilityRow] = await Promise.all([
      this.loadBars(instrumentId, range),
      this.loadDataQuality(instrumentId),
      this.loadEligibility(instrumentId),
    ]);
    const dataQualityGate = evaluateDataQualityFromEligibility(eligibilityRow) ?? evaluateDataQuality(dataQuality);
    if (dataQualityGate.status === 'BLOCKED') {
      return this.unavailableSummary(instrument, range, dataQualityGate.reason, dataQualityGate);
    }
    const ownership = await this.loadOwnership(instrument.symbol);
    return this.applyDataQualityGate(this.calculateStockSummary(instrument, bars, ownership, range), dataQualityGate);
  }

  async latestPersistedStock(instrumentId: string, range: SmartMoneyRange = '3M'): Promise<SmartMoneyStockSummary | null> {
    if (!instrumentId) throw new Error('instrumentId is required');
    return this.repository.latestStockSnapshot(instrumentId, range);
  }

  async latestPersistedStocks(instrumentIds: string[], range: SmartMoneyRange = '3M'): Promise<SmartMoneyStockSummary[]> {
    return this.repository.latestStockSnapshots(instrumentIds, range);
  }

  async top(query: SmartMoneyListQuery) {
    return this.repository.latestSnapshots(this.withDefaultScope(query), false);
  }

  async distribution(query: SmartMoneyListQuery) {
    return this.repository.latestSnapshots(this.withDefaultScope(query), true);
  }

  async sectors(range: SmartMoneyRange = '3M', query: { region?: string; assetType?: string } = {}): Promise<SectorSmartMoneySummary[]> {
    return this.repository.latestSectorSnapshots(range, this.withDefaultScope(query));
  }

  /**
   * Reads default to the India-equity scope when no region is given — matching run()
   * — so an unscoped read never silently mixes regions. Callers wanting every region
   * can pass region=GLOBAL (normalised to "no region filter").
   */
  private withDefaultScope<T extends { region?: string; assetType?: string }>(query: T): T {
    return {
      ...query,
      region: query.region || SMART_MONEY_DEFAULT_REGION,
      assetType: query.assetType || SMART_MONEY_DEFAULT_ASSET_TYPE,
    };
  }

  calculateStockSummary(
    instrument: InstrumentLike,
    bars: SmartMoneyPriceBar[],
    insiderOwnership: InsiderOwnershipSummary = missingOwnership(),
    range: SmartMoneyRange = '3M',
    config: SmartMoneyScoringConfig = this.defaultConfig
  ): SmartMoneyStockSummary {
    const updatedAt = new Date().toISOString();
    const dataThroughDate = this.latestBarDate(bars);
    if (bars.length < config.minBars || !hasUsableVolumeHistory(bars, config)) {
      const insufficientReason = bars.length < config.minBars
        ? 'Insufficient price/volume history to infer accumulation or distribution.'
        : 'Insufficient usable volume history to infer accumulation or distribution.';
      const summary: SmartMoneyStockSummary = {
        instrumentId: instrument.id,
        symbol: instrument.symbol,
        companyName: instrument.company_name ?? null,
        sector: instrument.sector ?? null,
        smartMoneyScore: 0,
        status: 'INSUFFICIENT_DATA',
        confidence: 'LOW',
        explanation: insufficientReason,
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
        snapshotDate: dataThroughDate,
        dataThroughDate,
      };
      return this.withEvidence(summary, 'ON_DEMAND_DERIVED', false);
    }

    const latest = bars[bars.length - 1];
    const previous = bars[bars.length - 2];
    const avgVolume20 = averageVolume(bars.slice(-21, -1));
    const dailyChangePercent = dailyChangePercentBetweenSessions(previous, latest);
    const signals = [
      ...detectSignals(bars, avgVolume20, config),
      ...detectRangeSignals(bars, range, config),
    ];
    const accumulationStrength = signals.filter((signal) => signal.direction === 'ACCUMULATION').reduce((sum, signal) => sum + signal.strength, 0);
    const distributionStrength = signals.filter((signal) => signal.direction === 'DISTRIBUTION').reduce((sum, signal) => sum + signal.strength, 0);
    const score = calculateScore(accumulationStrength, distributionStrength);
    const status = classifyStockStatus(score, config);
    const confidence = insiderOwnership.ownershipDataStatus === 'MISSING'
      ? (signals.length >= 3 ? 'MEDIUM' : 'LOW')
      : (signals.length >= 3 ? 'HIGH' : 'MEDIUM');
    const explanation = this.explain(status, signals, insiderOwnership.ownershipDataStatus);

    const summary: SmartMoneyStockSummary = {
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
      snapshotDate: dataThroughDate,
      dataThroughDate,
    };
    return this.withEvidence(summary, 'ON_DEMAND_DERIVED', false);
  }

  /** Thin delegators — kept on the service for the public/tested API surface. */
  detectSignals(bars: SmartMoneyPriceBar[], averageVolume20: number | null, config: SmartMoneyScoringConfig = this.defaultConfig): SmartMoneySignal[] {
    return detectSignals(bars, averageVolume20, config);
  }

  detectRangeSignals(bars: SmartMoneyPriceBar[], range: SmartMoneyRange, config: SmartMoneyScoringConfig = this.defaultConfig): SmartMoneySignal[] {
    return detectRangeSignals(bars, range, config);
  }

  calculateScore(accumulationStrength: number, distributionStrength: number): number {
    return calculateScore(accumulationStrength, distributionStrength);
  }

  aggregateSectors(summaries: SmartMoneyStockSummary[], config: SmartMoneyScoringConfig = this.defaultConfig): SectorSmartMoneySummary[] {
    return aggregateSectorSummaries(summaries, config);
  }

  private async loadDataQuality(instrumentId: string): Promise<DataQualityEvaluationDto | null> {
    if (!this.dataQualityService) return null;
    return this.dataQualityService.diagnostics(instrumentId).catch(() => null);
  }

  private async loadEligibility(instrumentId: string): Promise<InstrumentEligibilityRow | null> {
    if (!this.dataQualityService || typeof this.dataQualityService.getEligibility !== 'function') return null;
    const rows = await this.dataQualityService.getEligibility([instrumentId]).catch(() => [] as InstrumentEligibilityRow[]);
    return rows[0] ?? null;
  }

  private async loadOwnership(symbol: string): Promise<InsiderOwnershipSummary> {
    if (typeof this.provider?.fetchInsiderOwnership !== 'function') return missingOwnership();
    return this.provider.fetchInsiderOwnership(symbol).catch(() => missingOwnership());
  }

  private applyDataQualityGate(summary: SmartMoneyStockSummary, gate: SmartMoneyDataQualityGate): SmartMoneyStockSummary {
    const next: SmartMoneyStockSummary = {
      ...summary,
      dataQualityStatus: gate.status,
      dataQualityWarnings: gate.warnings,
      dataStatus: summary.dataStatus === 'ERROR' || gate.dataStatus === 'ERROR'
        ? 'ERROR'
        : summary.dataStatus === 'MISSING'
          ? 'MISSING'
          : summary.dataStatus === 'PARTIAL' || gate.status !== 'READY'
            ? 'PARTIAL'
            : 'COMPLETE',
    };

    if (gate.status !== 'READY') {
      next.explanation = `${summary.explanation} ${gate.reason}`;
    }

    const reasonCode: SmartMoneyEvidenceReasonCode = gate.status === 'READY'
      ? 'DATA_QUALITY_READY'
      : gate.status === 'BLOCKED'
        ? 'DATA_QUALITY_BLOCKED'
        : gate.status === 'LIMITED'
          ? 'DATA_QUALITY_LIMITED'
          : 'DATA_QUALITY_UNAVAILABLE';
    return this.withEvidence(next, next.evidence?.provenance.source || 'ON_DEMAND_DERIVED', next.evidence?.provenance.downstreamSafe || false, [reasonCode]);
  }

  private unavailableSummary(
    instrument: InstrumentLike,
    range: SmartMoneyRange,
    reason: string,
    gate: SmartMoneyDataQualityGate
  ): SmartMoneyStockSummary {
    const now = new Date().toISOString();
    return this.withEvidence({
      instrumentId: instrument.id,
      symbol: instrument.symbol,
      companyName: instrument.company_name ?? null,
      sector: instrument.sector ?? null,
      smartMoneyScore: 0,
      status: 'INSUFFICIENT_DATA',
      confidence: 'LOW',
      explanation: reason,
      updatedAt: now,
      dataStatus: gate.dataStatus,
      source: 'market-data-foundation',
      range,
      latestClose: null,
      latestVolume: null,
      averageVolume20: null,
      dailyChangePercent: null,
      signals: [],
      insiderOwnership: missingOwnership(),
      researchUrl: `/research/stocks/${instrument.id}`,
      snapshotDate: null,
      dataThroughDate: null,
      dataQualityStatus: gate.status,
      dataQualityWarnings: gate.warnings,
    }, 'ON_DEMAND_DERIVED', false, ['DATA_QUALITY_BLOCKED']);
  }

  private withEvidence(
    summary: SmartMoneyStockSummary,
    source: SmartMoneyEvidence['provenance']['source'],
    downstreamSafe: boolean,
    extraReasonCodes: SmartMoneyEvidenceReasonCode[] = []
  ): SmartMoneyStockSummary {
    const snapshotDate = source === 'PERSISTED_SNAPSHOT'
      ? toIsoDate(summary.snapshotDate || summary.dataThroughDate)
      : null;
    const dataThroughDate = source === 'PERSISTED_SNAPSHOT'
      ? snapshotDate
      : toIsoDate(summary.dataThroughDate || summary.snapshotDate);
    const freshnessStatus = computeFreshnessStatus(validDate(summary.updatedAt), validDate(snapshotDate));
    const ownershipMissing = summary.insiderOwnership.ownershipDataStatus === 'MISSING';
    const unavailable = summary.status === 'INSUFFICIENT_DATA' || summary.dataStatus === 'ERROR';
    const limited = ownershipMissing || !downstreamSafe || freshnessStatus !== 'CURRENT' || summary.dataStatus !== 'COMPLETE';
    const evidenceStatus: SmartMoneyEvidence['evidenceStatus'] = unavailable ? 'UNAVAILABLE' : limited ? 'LIMITED' : 'USABLE';
    const freshnessReason = freshnessReasonCode(freshnessStatus);
    const reasonCodes: SmartMoneyEvidenceReasonCode[] = [
      source === 'PERSISTED_SNAPSHOT' ? 'PERSISTED_SNAPSHOT_USED' : 'ON_DEMAND_FALLBACK_USED',
      ...(freshnessReason ? [freshnessReason] : []),
      source === 'PERSISTED_SNAPSHOT' ? 'DATA_THROUGH_FROM_SNAPSHOT_DATE' : (dataThroughDate ? 'DATA_THROUGH_FROM_LAST_PRICE_BAR' : 'INSUFFICIENT_PRICE_HISTORY'),
      downstreamSafe ? 'DOWNSTREAM_PERSISTED_ONLY' : 'ON_DEMAND_FALLBACK_USED',
      ...(ownershipMissing ? ['OWNERSHIP_PLACEHOLDER' as SmartMoneyEvidenceReasonCode] : []),
      ...(summary.explanation.toLowerCase().includes('volume history') ? ['INSUFFICIENT_VOLUME_HISTORY' as SmartMoneyEvidenceReasonCode] : []),
      ...extraReasonCodes,
    ];
    const evidence = buildEvidenceEnvelope({
      source,
      downstreamSafe,
      persistedAvailableAtRequestStart: source === 'PERSISTED_SNAPSHOT',
      requestedRange: summary.range,
      snapshotDate,
      dataThroughDate,
      dataThroughBasis: source === 'PERSISTED_SNAPSHOT'
        ? 'SNAPSHOT_DATE'
        : dataThroughDate ? 'LAST_PRICE_BAR_DATE' : 'UNAVAILABLE',
      freshnessStatus,
      ownershipDataStatus: summary.insiderOwnership.ownershipDataStatus,
      evidenceStatus,
      reasonCodes,
    });
    return { ...summary, snapshotDate, dataThroughDate, evidence };
  }

  private latestBarDate(bars: SmartMoneyPriceBar[]): string | null {
    return toIsoDate(bars.at(-1)?.date);
  }

  private async loadBars(instrumentId: string, range: SmartMoneyRange): Promise<SmartMoneyPriceBar[]> {
    // Equity-plane only: smart-money/institutional-flow is not applicable to crypto
    // (capability hasInstitutionalFlow=false) and is gated off in the frontend.
    const result = await this.marketDataService.listPricesByInstrumentId(instrumentId, RANGE_LIMITS[range]);
    return (result?.prices || [])
      .map((price: any) => ({
        date: new Date(price.date).toISOString().slice(0, 10),
        open: this.toNumberOrNull(price.open),
        high: this.toNumberOrNull(price.high),
        low: this.toNumberOrNull(price.low),
        close: Number(price.adjusted_close ?? price.close),
        volume: this.toNumberOrNull(price.volume),
        dataStatus: price.data_status || price.dataStatus || null,
      }))
      .filter((bar: SmartMoneyPriceBar) => Number.isFinite(bar.close))
      .sort((a: SmartMoneyPriceBar, b: SmartMoneyPriceBar) => a.date.localeCompare(b.date));
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

  /** Run `worker` over `items` with at most `concurrency` items in-flight at once. */
  private async eachWithConcurrency<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>): Promise<void> {
    let index = 0;
    const workerCount = Math.max(1, Math.min(concurrency, items.length));
    await Promise.all(Array.from({ length: workerCount }, async () => {
      while (index < items.length) {
        const current = items[index];
        index += 1;
        await worker(current);
      }
    }));
  }
}
