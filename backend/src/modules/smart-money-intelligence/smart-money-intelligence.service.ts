import { MarketDataFoundationService } from '../market-data-foundation';
import { DataQualityEngineService, type DataQualityEvaluationDto } from '../data-quality-engine';
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

const RANGE_LIMITS: Record<SmartMoneyRange, number> = { '1M': 35, '3M': 90, '6M': 180 };
const SMART_MONEY_REFRESH_RANGES: SmartMoneyRange[] = ['1M', '3M', '6M'];
const SMART_MONEY_DEFAULT_REGION = 'IN';
const SMART_MONEY_DEFAULT_ASSET_TYPE = 'STOCK';
const MIN_PRIOR_VOLUME_OBSERVATIONS = 18;

interface SmartMoneyDataQualityGate {
  status: 'READY' | 'LIMITED' | 'BLOCKED' | 'UNAVAILABLE';
  dataStatus: SmartMoneyDataStatus;
  reason: string;
  warnings: string[];
}

export class SmartMoneyIntelligenceService {
  constructor(
    private readonly repository = new SmartMoneyIntelligenceRepository(),
    private readonly marketDataService = new MarketDataFoundationService(),
    private readonly provider = new SmartMoneyIntelligenceProvider(),
    private readonly dataQualityService: Pick<DataQualityEngineService, 'diagnostics'> | null = new DataQualityEngineService()
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
    const offset = Math.max(0, Math.floor(Number(query.offset) || 0));
    const pageSize = Math.min(100, Math.max(1, Math.floor(Number(batchSize) || 100)));
    const page = Math.floor(offset / pageSize) + 1;
    const region = query.region || SMART_MONEY_DEFAULT_REGION;
    const assetType = query.assetType || SMART_MONEY_DEFAULT_ASSET_TYPE;
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
    const byRange: SmartMoneyRunResponse['byRange'] = {
      '1M': { generated: 0, skipped: 0, unchanged: 0 },
      '3M': { generated: 0, skipped: 0, unchanged: 0 },
      '6M': { generated: 0, skipped: 0, unchanged: 0 },
    };
    const requestedCount = explicitIds.length ? explicitBatchIds.length : instruments.length;
    const missingInstrumentSkipped = explicitIds.length ? Math.max(0, requestedCount - instruments.length) : 0;
    if (missingInstrumentSkipped > 0) {
      skipped += missingInstrumentSkipped;
      for (const range of SMART_MONEY_REFRESH_RANGES) byRange[range].skipped += missingInstrumentSkipped;
    }

    await Promise.all(instruments.map(async (instrument: any) => {
      try {
        const [fullRangeBars, dataQuality] = await Promise.all([
          this.loadBars(instrument.id, '6M').catch(() => []),
          this.loadDataQuality(instrument.id),
        ]);
        const dataQualityGate = this.evaluateDataQuality(dataQuality);
        if (dataQualityGate.status === 'BLOCKED') {
          const warning = `${instrument.symbol || instrument.id} smart-money snapshot skipped: ${dataQualityGate.reason}`;
          warnings.push(warning);
          skipped += SMART_MONEY_REFRESH_RANGES.length;
          for (const range of SMART_MONEY_REFRESH_RANGES) byRange[range].skipped += 1;
          return;
        }
        const ownership = this.missingOwnership(); // Placeholder until provider is configured

        for (const range of SMART_MONEY_REFRESH_RANGES) {
          const bars = fullRangeBars.slice(-RANGE_LIMITS[range]);
          const summary = this.applyDataQualityGate(
            this.calculateStockSummary(instrument, bars, ownership, range),
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
    }));

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
    const [bars, dataQuality] = await Promise.all([
      this.loadBars(instrumentId, range),
      this.loadDataQuality(instrumentId),
    ]);
    const dataQualityGate = this.evaluateDataQuality(dataQuality);
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
    return (this.repository as any).latestStockSnapshots(instrumentIds, range);
  }

  async top(query: SmartMoneyListQuery) {
    return this.repository.latestSnapshots(query, false);
  }

  async distribution(query: SmartMoneyListQuery) {
    return this.repository.latestSnapshots(query, true);
  }

  async sectors(range: SmartMoneyRange = '3M', query: { region?: string; assetType?: string } = {}): Promise<SectorSmartMoneySummary[]> {
    return this.repository.latestSectorSnapshots(range, query);
  }

  calculateStockSummary(
    instrument: InstrumentLike,
    bars: SmartMoneyPriceBar[],
    insiderOwnership: InsiderOwnershipSummary = this.missingOwnership(),
    range: SmartMoneyRange = '3M'
  ): SmartMoneyStockSummary {
    const updatedAt = new Date().toISOString();
    const dataThroughDate = this.latestBarDate(bars);
    if (bars.length < 21 || !this.hasUsableVolumeHistory(bars)) {
      const insufficientReason = bars.length < 21
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
    const avgVolume20 = this.averageVolume(bars.slice(-21, -1));
    const dailyChangePercent = previous?.close > 0 ? (latest.close - previous.close) / previous.close : null;
    const signals = [
      ...this.detectSignals(bars, avgVolume20),
      ...this.detectRangeSignals(bars, range),
    ];
    const accumulationStrength = signals.filter((signal) => signal.direction === 'ACCUMULATION').reduce((sum, signal) => sum + signal.strength, 0);
    const distributionStrength = signals.filter((signal) => signal.direction === 'DISTRIBUTION').reduce((sum, signal) => sum + signal.strength, 0);
    const score = this.calculateScore(accumulationStrength, distributionStrength);
    const status = score >= 70 ? 'ACCUMULATION' : score <= 35 ? 'DISTRIBUTION' : 'NEUTRAL';
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

  detectRangeSignals(bars: SmartMoneyPriceBar[], range: SmartMoneyRange): SmartMoneySignal[] {
    const signals: SmartMoneySignal[] = [];
    if (bars.length < 30) return signals;
    const usableVolumeCount = bars.filter((bar) => Number.isFinite(bar.volume)).length;
    if (usableVolumeCount < Math.min(20, Math.floor(bars.length * 0.75))) return signals;

    const first = bars[0];
    const latest = bars[bars.length - 1];
    if (!first?.close || !latest?.close || first.close <= 0) return signals;

    const rangeReturn = (latest.close - first.close) / first.close;
    const rangeVolume = this.averageVolume(bars);
    let upVolume = 0;
    let downVolume = 0;
    let upDays = 0;
    let downDays = 0;
    let highVolumeUpDays = 0;
    let highVolumeDownDays = 0;

    for (let index = 1; index < bars.length; index += 1) {
      const current = bars[index];
      const previous = bars[index - 1];
      const volume = Number.isFinite(current.volume) ? current.volume as number : null;
      const change = current.close - previous.close;
      if (change > 0) {
        upDays += 1;
        if (volume !== null) upVolume += volume;
        if (rangeVolume && volume !== null && volume >= rangeVolume * 1.1) highVolumeUpDays += 1;
      } else if (change < 0) {
        downDays += 1;
        if (volume !== null) downVolume += volume;
        if (rangeVolume && volume !== null && volume >= rangeVolume * 1.1) highVolumeDownDays += 1;
      }
    }

    const directionalVolume = upVolume + downVolume;
    const upVolumeShare = directionalVolume > 0 ? upVolume / directionalVolume : 0.5;
    const downVolumeShare = directionalVolume > 0 ? downVolume / directionalVolume : 0.5;
    const dayCount = Math.max(1, upDays + downDays);
    const upDayShare = upDays / dayCount;
    const downDayShare = downDays / dayCount;

    if (upVolumeShare >= 0.58 && upDayShare >= 0.52 && rangeReturn >= 0.02) {
      const strength = Math.min(30, Math.round(12 + (upVolumeShare - 0.58) * 60 + Math.min(0.2, rangeReturn) * 60));
      signals.push({
        type: `RANGE_ACCUMULATION_${range}`,
        label: `${range} accumulation pressure`,
        direction: 'ACCUMULATION',
        strength,
        details: `${range} window has ${(upVolumeShare * 100).toFixed(0)}% of directional volume on up days and ${(rangeReturn * 100).toFixed(1)}% price change.`,
      });
    }

    if (downVolumeShare >= 0.58 && downDayShare >= 0.52 && rangeReturn <= -0.02) {
      const strength = Math.min(30, Math.round(12 + (downVolumeShare - 0.58) * 60 + Math.min(0.2, Math.abs(rangeReturn)) * 60));
      signals.push({
        type: `RANGE_DISTRIBUTION_${range}`,
        label: `${range} distribution pressure`,
        direction: 'DISTRIBUTION',
        strength,
        details: `${range} window has ${(downVolumeShare * 100).toFixed(0)}% of directional volume on down days and ${(rangeReturn * 100).toFixed(1)}% price change.`,
      });
    }

    if (highVolumeUpDays >= highVolumeDownDays + 3 && rangeReturn > 0) {
      signals.push({
        type: `RANGE_HIGH_VOLUME_UP_DAYS_${range}`,
        label: `${range} high-volume up-day skew`,
        direction: 'ACCUMULATION',
        strength: Math.min(15, 8 + Math.min(7, highVolumeUpDays - highVolumeDownDays)),
        details: `${range} window has ${highVolumeUpDays} high-volume up days versus ${highVolumeDownDays} high-volume down days.`,
      });
    }

    if (highVolumeDownDays >= highVolumeUpDays + 3 && rangeReturn < 0) {
      signals.push({
        type: `RANGE_HIGH_VOLUME_DOWN_DAYS_${range}`,
        label: `${range} high-volume down-day skew`,
        direction: 'DISTRIBUTION',
        strength: Math.min(15, 8 + Math.min(7, highVolumeDownDays - highVolumeUpDays)),
        details: `${range} window has ${highVolumeDownDays} high-volume down days versus ${highVolumeUpDays} high-volume up days.`,
      });
    }

    return signals;
  }

  calculateScore(accumulationStrength: number, distributionStrength: number): number {
    return Math.max(0, Math.min(100, Math.round(50 + accumulationStrength * 0.5 - distributionStrength * 0.5)));
  }

  aggregateSectors(summaries: SmartMoneyStockSummary[]): SectorSmartMoneySummary[] {
    const groups = new Map<string, SmartMoneyStockSummary[]>();
    summaries.filter((summary) => summary.status !== 'INSUFFICIENT_DATA').forEach((summary) => {
      const sector = summary.sector || 'Unknown';
      groups.set(sector, [...(groups.get(sector) || []), summary]);
    });
    return [...groups.entries()].map(([sector, items]) => {
      const average = Math.round(items.reduce((sum, item) => sum + item.smartMoneyScore, 0) / Math.max(1, items.length));
      const sectorStatus: SectorSmartMoneyStatus = average >= 65 ? 'ACCUMULATING' : average <= 40 ? 'DISTRIBUTING' : 'NEUTRAL';
      const dataStatus: SmartMoneyDataStatus = items.some((item) => item.dataStatus === 'PARTIAL') ? 'PARTIAL' : 'COMPLETE';
      const updatedAt = items.map((item) => item.updatedAt).sort().at(-1) || new Date(0).toISOString();
      return {
        sector,
        averageSmartMoneyScore: average,
        accumulationCount: items.filter((item) => item.status === 'ACCUMULATION').length,
        distributionCount: items.filter((item) => item.status === 'DISTRIBUTION').length,
        unusualVolumeCount: items.filter((item) => item.signals.some((signal) => signal.type === 'UNUSUAL_VOLUME')).length,
        instrumentCount: items.length,
        sectorStatus,
        dataStatus,
        updatedAt,
      };
    }).sort((a, b) => b.averageSmartMoneyScore - a.averageSmartMoneyScore);
  }

  private async loadDataQuality(instrumentId: string): Promise<DataQualityEvaluationDto | null> {
    if (!this.dataQualityService) return null;
    return this.dataQualityService.diagnostics(instrumentId).catch(() => null);
  }

  private async loadOwnership(symbol: string): Promise<InsiderOwnershipSummary> {
    if (typeof this.provider?.fetchInsiderOwnership !== 'function') return this.missingOwnership();
    return this.provider.fetchInsiderOwnership(symbol).catch(() => this.missingOwnership());
  }

  private evaluateDataQuality(dataQuality: DataQualityEvaluationDto | null): SmartMoneyDataQualityGate {
    if (!dataQuality) {
      return {
        status: 'UNAVAILABLE',
        dataStatus: 'PARTIAL',
        reason: 'Data quality evaluation is unavailable; smart-money evidence is limited.',
        warnings: ['Data quality evaluation is unavailable.'],
      };
    }

    const warnings = [
      ...(dataQuality.dataGaps || []),
      ...(dataQuality.warnings || []),
      ...(dataQuality.readinessBlockers || []),
    ];
    const blocked = dataQuality.coverageStatus === 'UNUSABLE'
      || dataQuality.signalReadinessStatus === 'NOT_READY'
      || dataQuality.useCaseTiers?.signal?.status === 'BLOCKED';
    if (blocked) {
      return {
        status: 'BLOCKED',
        dataStatus: 'ERROR',
        reason: `Data quality blocks smart-money scoring: ${warnings[0] || dataQuality.signalReadinessStatus || dataQuality.coverageStatus}.`,
        warnings,
      };
    }

    const limited = dataQuality.coverageStatus !== 'GOOD'
      || dataQuality.signalReadinessStatus !== 'READY'
      || dataQuality.liquidityStatus === 'ILLIQUID'
      || dataQuality.liquidityStatus === 'THIN'
      || dataQuality.useCaseTiers?.signal?.status === 'LIMITED';
    if (limited) {
      return {
        status: 'LIMITED',
        dataStatus: 'PARTIAL',
        reason: `Data quality limits smart-money evidence: ${warnings[0] || dataQuality.signalReadinessStatus || dataQuality.coverageStatus}.`,
        warnings,
      };
    }

    return {
      status: 'READY',
      dataStatus: 'COMPLETE',
      reason: 'Data quality is ready for smart-money scoring.',
      warnings: [],
    };
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
      insiderOwnership: this.missingOwnership(),
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
      ? this.toIsoDate(summary.snapshotDate || summary.dataThroughDate)
      : null;
    const dataThroughDate = source === 'PERSISTED_SNAPSHOT'
      ? snapshotDate
      : this.toIsoDate(summary.dataThroughDate || summary.snapshotDate);
    const updatedAt = this.validDate(summary.updatedAt);
    const boundary = this.validDate(snapshotDate);
    const freshnessStatus: SmartMoneyEvidence['freshnessStatus'] = !boundary || !updatedAt
      ? 'UNKNOWN'
      : updatedAt.getTime() + 1 < boundary.getTime()
        ? 'STALE'
        : 'CURRENT';
    const ownershipMissing = summary.insiderOwnership.ownershipDataStatus === 'MISSING';
    const unavailable = summary.status === 'INSUFFICIENT_DATA' || summary.dataStatus === 'ERROR';
    const limited = ownershipMissing || !downstreamSafe || freshnessStatus !== 'CURRENT' || summary.dataStatus !== 'COMPLETE';
    const evidenceStatus: SmartMoneyEvidence['evidenceStatus'] = unavailable ? 'UNAVAILABLE' : limited ? 'LIMITED' : 'USABLE';
    const freshnessReason = freshnessStatus === 'STALE'
      ? 'SNAPSHOT_STALE'
      : freshnessStatus === 'CURRENT'
        ? 'SNAPSHOT_CURRENT'
        : null;
    const reasonCodes: SmartMoneyEvidenceReasonCode[] = [
      source === 'PERSISTED_SNAPSHOT' ? 'PERSISTED_SNAPSHOT_USED' : 'ON_DEMAND_FALLBACK_USED',
      ...(freshnessReason ? [freshnessReason as SmartMoneyEvidenceReasonCode] : []),
      source === 'PERSISTED_SNAPSHOT' ? 'DATA_THROUGH_FROM_SNAPSHOT_DATE' : (dataThroughDate ? 'DATA_THROUGH_FROM_LAST_PRICE_BAR' : 'INSUFFICIENT_PRICE_HISTORY'),
      downstreamSafe ? 'DOWNSTREAM_PERSISTED_ONLY' : 'ON_DEMAND_FALLBACK_USED',
      ...(ownershipMissing ? ['OWNERSHIP_PLACEHOLDER' as SmartMoneyEvidenceReasonCode] : []),
      ...(summary.explanation.toLowerCase().includes('volume history') ? ['INSUFFICIENT_VOLUME_HISTORY' as SmartMoneyEvidenceReasonCode] : []),
      ...extraReasonCodes,
    ];
    const uniqueReasonCodes = [...new Set(reasonCodes)];
    const provenanceSummary = source === 'PERSISTED_SNAPSHOT'
      ? 'Persisted smart-money snapshot was used.'
      : 'On-demand derived smart-money context was calculated for detail inspection and is not downstream-safe.';
    const ownershipSummary = ownershipMissing
      ? 'Insider and institutional ownership evidence is unavailable; treat this as partial price-volume evidence.'
      : 'Ownership evidence is present.';
    const evidence: SmartMoneyEvidence = {
      evidenceStatus,
      freshnessStatus,
      provenance: {
        source,
        persistedSnapshotAvailableAtRequestStart: source === 'PERSISTED_SNAPSHOT',
        downstreamSafe,
        reasonSummary: provenanceSummary,
      },
      coverage: {
        requestedRange: summary.range,
        snapshotDate,
        dataThroughDate,
        dataThroughBasis: source === 'PERSISTED_SNAPSHOT'
          ? 'SNAPSHOT_DATE'
          : dataThroughDate ? 'LAST_PRICE_BAR_DATE' : 'UNAVAILABLE',
        rangeLabel: `${summary.range} price-volume window`,
      },
      ownershipTrust: {
        status: ownershipMissing ? 'PARTIAL_OWNERSHIP_GAP' : 'COMPLETE',
        ownershipDataStatus: summary.insiderOwnership.ownershipDataStatus,
        reasonSummary: ownershipSummary,
      },
      reasonCodes: uniqueReasonCodes,
      reasonSummary: `${provenanceSummary} ${ownershipSummary}`,
    };
    return { ...summary, snapshotDate, dataThroughDate, evidence };
  }

  private hasUsableVolumeHistory(bars: SmartMoneyPriceBar[]): boolean {
    const priorWindow = bars.slice(-21, -1);
    const priorVolumeCount = priorWindow.filter((bar) => Number.isFinite(bar.volume) && Number(bar.volume) > 0).length;
    const latestVolumeUsable = Number.isFinite(bars.at(-1)?.volume) && Number(bars.at(-1)?.volume) > 0;
    return latestVolumeUsable && priorVolumeCount >= MIN_PRIOR_VOLUME_OBSERVATIONS;
  }

  private latestBarDate(bars: SmartMoneyPriceBar[]): string | null {
    return this.toIsoDate(bars.at(-1)?.date);
  }

  private toIsoDate(value: unknown): string | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(String(value));
    return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : null;
  }

  private validDate(value: unknown): Date | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(String(value));
    return Number.isFinite(date.getTime()) ? date : null;
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
        dataStatus: price.data_status || price.dataStatus || null,
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
