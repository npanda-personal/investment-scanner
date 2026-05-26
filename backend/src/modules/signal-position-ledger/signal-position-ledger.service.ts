import { SignalGenerationEngineService } from '../signal-generation-engine';
import type { SignalResultDto } from '../signal-generation-engine';
import type {
  SignalPositionDataQualitySnapshot,
  SignalPositionLedgerActiveCandidate,
  SignalPositionLedgerActiveListResponse,
  SignalPositionLedgerActiveQuery,
  SignalPositionLedgerActiveRow,
  SignalPositionLatestPriceSnapshot,
  SignalPositionTriggerContractReadModel,
} from './signal-position-ledger.types';
import { SignalPositionLedgerRepository } from './signal-position-ledger.repository';

const SOURCE_PAGE_LIMIT = 100;
const PRICE_STALE_DAYS = 5;

export class SignalPositionLedgerService {
  constructor(
    private readonly repository = new SignalPositionLedgerRepository(),
    private readonly signalService = new SignalGenerationEngineService(),
  ) {}

  async listActiveRows(query: SignalPositionLedgerActiveQuery): Promise<SignalPositionLedgerActiveListResponse> {
    const warnings: string[] = [];
    const candidates = await this.collectActiveCandidates(query, warnings);
    const totalCount = candidates.length;
    const selected = candidates.slice(query.offset, query.offset + query.limit);
    const items = await Promise.all(selected.map((candidate) => this.toActiveRow(candidate, query)));

    const nextOffset = query.offset + items.length;
    return {
      items,
      totalCount,
      limit: query.limit,
      offset: query.offset,
      nextOffset: nextOffset < totalCount ? nextOffset : null,
      hasMore: nextOffset < totalCount,
      scope: {
        region: query.region,
        assetType: query.assetType,
      },
      warnings,
    };
  }

  async health() {
    return {
      status: 'ok',
      module: 'signal-position-ledger',
      timestamp: new Date().toISOString(),
    };
  }

  private async collectActiveCandidates(query: SignalPositionLedgerActiveQuery, warnings: string[]): Promise<SignalPositionLedgerActiveCandidate[]> {
    const candidates: SignalPositionLedgerActiveCandidate[] = [];
    let sourceOffset = 0;
    let hasMore = true;
    let totalSignals = 0;

    while (hasMore) {
      const page = await this.repository.listLatestSignals({
        region: query.region,
        assetType: query.assetType,
        limit: SOURCE_PAGE_LIMIT,
        offset: sourceOffset,
      });
      totalSignals = page.totalCount;
      const trusted = page.items.filter((signal) => this.isTrustedReadSignal(signal));
      const enriched = trusted.length > 0
        ? await this.signalService.enrichSignals(trusted, { includeStrategyMatches: true })
        : [];

      for (const signal of enriched) {
        const trigger = signal.triggerContract;
        if (!trigger) continue;
        if (!this.isEligibleActiveTrigger(trigger)) continue;
        candidates.push({ signal, triggerContract: trigger });
      }

      hasMore = page.hasMore;
      sourceOffset = page.nextOffset ?? (sourceOffset + page.items.length);
      if (page.items.length === 0) break;
    }

    if (totalSignals > 0 && candidates.length === 0) {
      warnings.push('No active rows satisfied source-proven entry trigger evidence in the selected scope.');
    }

    return candidates;
  }

  private async toActiveRow(candidate: SignalPositionLedgerActiveCandidate, scope: Pick<SignalPositionLedgerActiveQuery, 'region' | 'assetType'>): Promise<SignalPositionLedgerActiveRow> {
    const { signal, triggerContract } = candidate;
    const [latestPrice, quality, exitDecision] = await Promise.all([
      this.repository.latestPriceByInstrumentId(signal.instrument_id, scope),
      this.repository.latestDataQualityByInstrumentId(signal.instrument_id),
      this.repository.latestExitDecisionByInstrumentId(signal.instrument_id),
    ]);

    const returnProjection = this.currentReturnProjection(triggerContract.trigger_price as number, latestPrice, quality);
    const healthState = this.healthStateForDecision(exitDecision?.decision);

    return {
      signalId: triggerContract.signal_id || signal.id || null,
      instrumentId: signal.instrument_id,
      symbol: signal.symbol,
      companyName: signal.company_name || null,
      region: triggerContract.region || null,
      assetType: triggerContract.asset_class || null,
      triggerType: triggerContract.trigger_type as SignalPositionLedgerActiveRow['triggerType'],
      entryTriggerTimestamp: triggerContract.trigger_timestamp as string,
      entryTriggerPrice: Number(triggerContract.trigger_price),
      entryReasonSummary: triggerContract.reason_summary,
      strategyId: triggerContract.strategy_id || null,
      strategyVersion: triggerContract.strategy_version || null,
      entryRuleId: triggerContract.entry_rule_id || null,
      latestTrustedPriceDate: latestPrice?.date || null,
      latestTrustedPrice: latestPrice?.adjustedClose ?? latestPrice?.close ?? null,
      currentReturnPercent: returnProjection.currentReturnPercent,
      currentReturnStatus: returnProjection.currentReturnStatus,
      currentDataQualityStatus: quality?.signalReadinessStatus ?? null,
      healthState,
      lifecycleEvidenceStatus: healthState ? 'EXIT_COMPATIBILITY_ONLY' : 'UNAVAILABLE',
      trustEvidenceStatus: returnProjection.trustEvidenceStatus,
    };
  }

  private isTrustedReadSignal(signal: SignalResultDto): boolean {
    const quality = signal.dataQualityEligibility;
    return signal.auditStatus === 'CURRENT'
      && quality?.filterApplied === true
      && quality.eligible === true
      && quality.signalReadinessStatus === 'READY';
  }

  private isEligibleActiveTrigger(trigger: SignalPositionTriggerContractReadModel): boolean {
    if (trigger.trigger_type !== 'bullish_entry_trigger' && trigger.trigger_type !== 'bearish_trigger') return false;
    if (trigger.trigger_price_evidence?.status !== 'SOURCE_PROVEN') return false;
    if (typeof trigger.trigger_price !== 'number' || !Number.isFinite(trigger.trigger_price)) return false;
    if (!trigger.trigger_timestamp) return false;
    return true;
  }

  private currentReturnProjection(
    entryPrice: number,
    latestPrice: SignalPositionLatestPriceSnapshot | null,
    quality: SignalPositionDataQualitySnapshot | null,
  ) {
    if (!latestPrice || !Number.isFinite(latestPrice.adjustedClose || latestPrice.close) || entryPrice <= 0) {
      return {
        currentReturnPercent: null,
        currentReturnStatus: 'UNAVAILABLE' as const,
        trustEvidenceStatus: 'SOURCE_PROVEN_PRICE_UNAVAILABLE' as const,
      };
    }

    if (!quality) {
      return {
        currentReturnPercent: null,
        currentReturnStatus: 'UNAVAILABLE' as const,
        trustEvidenceStatus: 'SOURCE_PROVEN_DQ_UNAVAILABLE' as const,
      };
    }

    if (quality.signalReadinessStatus !== 'READY' || quality.coverageStatus === 'UNUSABLE') {
      return {
        currentReturnPercent: null,
        currentReturnStatus: 'UNAVAILABLE' as const,
        trustEvidenceStatus: 'SOURCE_PROVEN_DQ_LIMITED' as const,
      };
    }

    const priceDate = new Date(latestPrice.date);
    const staleCutoff = new Date();
    staleCutoff.setUTCDate(staleCutoff.getUTCDate() - PRICE_STALE_DAYS);
    const staleByDate = !Number.isFinite(priceDate.getTime()) || priceDate < staleCutoff;
    const staleByStatus = latestPrice.dataStatus !== 'COMPLETE';
    if (staleByDate || staleByStatus) {
      return {
        currentReturnPercent: null,
        currentReturnStatus: 'STALE' as const,
        trustEvidenceStatus: 'SOURCE_PROVEN_PRICE_STALE' as const,
      };
    }

    const currentPrice = latestPrice.adjustedClose || latestPrice.close;
    const currentReturnPercent = Number((((currentPrice - entryPrice) / entryPrice) * 100).toFixed(4));
    return {
      currentReturnPercent,
      currentReturnStatus: 'CURRENT' as const,
      trustEvidenceStatus: 'SOURCE_PROVEN' as const,
    };
  }

  private healthStateForDecision(decision?: string | null): SignalPositionLedgerActiveRow['healthState'] {
    if (decision === 'EXIT_CANDIDATE') return 'EXIT_TRIGGERED';
    if (decision === 'REDUCE_RISK') return 'RISK_WARNING';
    return null;
  }
}

