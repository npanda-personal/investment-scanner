// Auto-extracted repair sibling (Phase 5c). Bodies are byte-identical to the pre-extraction inline
// implementation in market-data-foundation.service.ts, except that stays-on-service / cross-engine
// collaborators are reached through the host (this.X -> this.host.X) and pure util/mapper helpers
// are imported directly. The service constructs this once and keeps byte-identical public delegators
// for the controller-facing repair surface.

import type { MarketDataRepairHost } from './market-data-foundation.repair-host';
import type {
  MarketDataProviderBusinessRepairStatus,
  MarketDataRepairPlan,
  MarketDataRepairRequest,
  MarketDataRepairStateStatus,
  MarketDataRepairSummary,
} from '../market-data-foundation.types';
import {
  NSE_BSE_ONLY_PROVIDER_DISABLED_CODE,
} from './market-data-foundation.repair.types';
import {
  eachWithConcurrency as eachWithConcurrencyUtil,
} from '../util/market-data-foundation.util.concurrency';
import {
  emptyRepairSummary as emptyRepairSummaryFn,
  finishRepairSummary as finishRepairSummaryFn,
  needsMetadataEnrichment as needsMetadataEnrichmentFn,
  needsBusinessMetadataRepair as needsBusinessMetadataRepairFn,
  missingBusinessMetadataFields as missingBusinessMetadataFieldsFn,
  businessMetadataBlockerDiagnostics as businessMetadataBlockerDiagnosticsFn,
  providerBusinessMetadataHasUsefulFields as providerBusinessMetadataHasUsefulFieldsFn,
  providerBusinessMetadataUpdate as providerBusinessMetadataUpdateFn,
  providerBusinessStateAfterRepair as providerBusinessStateAfterRepairFn,
  providerBusinessCurrentStateForAttempt as providerBusinessCurrentStateForAttemptFn,
  repairedMetadataFields as repairedMetadataFieldsFn,
} from './market-data-foundation.repair.business-metadata.helpers';

export class RepairBusinessMetadataService {
  constructor(private readonly host: MarketDataRepairHost) {}

  // Public KEEP host helpers (re-exposed for the service facade delegators + cross-engine host
  // routing); thin wrappers over the pure free-function helpers.
  public emptyRepairSummary(
    scope: { region: string; assetType: string },
    batch: { batchSize: number; offset: number },
    totalCount: number,
    stableMutatingQueue = false
  ): MarketDataRepairSummary {
    return emptyRepairSummaryFn(scope, batch, totalCount, stableMutatingQueue);
  }

  public finishRepairSummary(summary: MarketDataRepairSummary, started: number) {
    return finishRepairSummaryFn(summary, started);
  }

  public needsMetadataEnrichment(stock: any): boolean {
    return needsMetadataEnrichmentFn(stock);
  }

  public needsBusinessMetadataRepair(stock: any): boolean {
    return needsBusinessMetadataRepairFn(stock);
  }

  public missingBusinessMetadataFields(stock: any): string[] {
    return missingBusinessMetadataFieldsFn(stock);
  }

  public businessMetadataBlockerDiagnostics(stocks: any[]): NonNullable<MarketDataRepairPlan['businessMetadataBlockerDiagnostics']> {
    return businessMetadataBlockerDiagnosticsFn(stocks);
  }

  public async repairProviderBusinessMetadata(request: MarketDataRepairRequest = {}): Promise<MarketDataRepairSummary> {
    const started = Date.now();
    const scope = this.host.repairScope(request);
    const batch = this.host.mutatingRepairBatch(request);
    const workerConcurrency = this.host.providerBusinessMetadataRepairConcurrency(request);
    const repositoryAny = this.host.repository as any;
    const { stocks, total } = await repositoryAny.listStocksForBusinessMetadataRepair({
      ...scope,
      ...batch,
      includeManualRequired: Boolean(request.force),
      includeRetryable: Boolean(request.force),
    });
    const summary = emptyRepairSummaryFn(scope, batch, total, true);
    summary.workerConcurrency = workerConcurrency;
    summary.fieldsFilled = {};
    summary.fieldProvenance = [];
    if (!request.force && typeof repositoryAny.countBusinessMetadataRepairStates === 'function') {
      const [manualRequired, retryCooldown, retryBlocked] = await Promise.all([
        repositoryAny.countBusinessMetadataRepairStates({ ...scope, statuses: ['MANUAL_REQUIRED'] }),
        repositoryAny.countBusinessMetadataRepairStates({ ...scope, statuses: ['RETRY_COOLDOWN'] }),
        repositoryAny.countBusinessMetadataRepairStates({ ...scope, statuses: ['FAILED_RETRYABLE'], retryTiming: 'blocked' }),
      ]);
      summary.skippedRecentAttempt = manualRequired + retryCooldown + retryBlocked;
    } else {
      summary.skippedRecentAttempt = 0;
    }
    summary.remainingManualRequired = summary.skippedRecentAttempt;

    await eachWithConcurrencyUtil(stocks as any[], workerConcurrency, async (stock: any) => {
      summary.processedCount += 1;
      const providerSymbol = stock.providerSymbol || stock.symbol;
      const fieldsFilledSummary = summary.fieldsFilled as Record<string, number>;
      const fieldProvenance = summary.fieldProvenance as NonNullable<MarketDataRepairSummary['fieldProvenance']>;
      try {
        const missingBefore = missingBusinessMetadataFieldsFn(stock);
        const providerData = await this.host.marketDataProvider.fetchCompanyMasterData(providerSymbol);
        if (!providerBusinessMetadataHasUsefulFieldsFn(providerData)) {
          summary.providerNotFound = (summary.providerNotFound || 0) + 1;
          summary.noOp = (summary.noOp || 0) + 1;
          summary.skipped += 1;
          summary.manualRequired = (summary.manualRequired || 0) + 1;
          summary.warnings.push(`${stock.symbol}: provider returned no usable business metadata; manual metadata is required for ${missingBefore.join(', ')}.`);
          await this.recordProviderBusinessRepairAttempt(stock, scope, 'NO_PROVIDER_DATA', {}, 'Provider returned no usable sector, industry, or market cap.', 'Provider business metadata was unavailable.');
          return;
        }

        const update = providerBusinessMetadataUpdateFn(stock, providerData);
        const filledFields = repairedMetadataFieldsFn(stock, update, missingBefore)
          .filter((field) => ['sector', 'industry', 'marketCap'].includes(field));
        if (filledFields.length === 0) {
          summary.noOp = (summary.noOp || 0) + 1;
          summary.skipped += 1;
          summary.manualRequired = (summary.manualRequired || 0) + 1;
          summary.warnings.push(`${stock.symbol}: provider metadata did not fill any missing business fields; manual metadata is required for ${missingBefore.join(', ')}.`);
          await this.recordProviderBusinessRepairAttempt(stock, scope, 'NO_FIELDS_FILLED', {}, 'Provider data did not improve missing business metadata.', 'Provider business metadata did not fill required fields.');
          return;
        }

        await this.host.repository.updateCompanyMasterData(stock.id, update);
        const stockAfterRepair = { ...stock, ...update };
        const repairState = providerBusinessStateAfterRepairFn(stockAfterRepair, filledFields);
        summary.updated += 1;
        summary.providerBusinessMetadataRepaired = (summary.providerBusinessMetadataRepaired || 0) + 1;
        summary.metadataEnriched = (summary.metadataEnriched || 0) + 1;
        if (repairState.attemptStatus === 'PARTIAL_SUCCESS') {
          summary.partialSuccess = (summary.partialSuccess || 0) + 1;
          summary.manualRequired = (summary.manualRequired || 0) + 1;
          summary.warnings.push(`${stock.symbol}: partial metadata repair filled ${filledFields.join(', ')} but still requires ${repairState.remainingFields.join(', ')}.`);
        }
        const fieldsFilled: Record<string, number> = {};
        for (const field of filledFields) {
          fieldsFilledSummary[field] = (fieldsFilledSummary[field] || 0) + 1;
          fieldsFilled[field] = 1;
        }
        fieldProvenance.push({
          instrumentId: stock.id,
          symbol: stock.symbol,
          sectorSource: filledFields.includes('sector') ? 'yahoo' : stock.sector ? 'existing_db' : null,
          industrySource: filledFields.includes('industry') ? 'yahoo' : stock.industry ? 'existing_db' : null,
          marketCapSource: filledFields.includes('marketCap') ? 'yahoo' : stock.marketCap ? 'existing_db' : null,
          metadataUpdatedAt: new Date().toISOString(),
        });
        await this.recordProviderBusinessRepairAttempt(
          stock,
          scope,
          repairState.attemptStatus,
          fieldsFilled,
          undefined,
          repairState.manualRequiredReason,
          repairState.stateStatus
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'provider business metadata repair failed';
        summary.failed += 1;
        summary.warnings.push(`${stock.symbol}: ${message}`);
        await this.recordProviderBusinessRepairAttempt(stock, scope, 'FAILED', {}, message);
      }
    });

    if (typeof repositoryAny.countStocksForBusinessMetadataRepair === 'function') {
      summary.remainingAutoRepairable = await repositoryAny.countStocksForBusinessMetadataRepair({
        ...scope,
        includeManualRequired: Boolean(request.force),
        includeRetryable: Boolean(request.force),
      });
    } else {
      summary.remainingAutoRepairable = Math.max(total - summary.processedCount, 0);
    }
    if (typeof repositoryAny.countBusinessMetadataRepairStates === 'function') {
      summary.remainingManualRequired = await repositoryAny.countBusinessMetadataRepairStates({
        ...scope,
        statuses: ['MANUAL_REQUIRED'],
      });
    } else {
      summary.remainingManualRequired = (summary.skippedRecentAttempt || 0) + (summary.manualRequired || 0);
    }

    if (summary.processedCount > 0) {
      this.host.invalidateUniverseComputationSnapshot(scope);
    }
    finishRepairSummaryFn(summary, started);
    return summary;
  }


  public providerDisabledRepairSummary(request: MarketDataRepairRequest, message: string): MarketDataRepairSummary {
    const started = Date.now();
    const scope = this.host.repairScope(request);
    const batch = this.host.mutatingRepairBatch(request);
    const summary = emptyRepairSummaryFn(scope, batch, 0, true);
    (summary as any).warningCount = 1;
    summary.warnings.push(`${NSE_BSE_ONLY_PROVIDER_DISABLED_CODE}: ${message}`);
    finishRepairSummaryFn(summary, started);
    return summary;
  }


  private async recordProviderBusinessRepairAttempt(
    stock: any,
    scope: { region: string; assetType: string },
    status: MarketDataProviderBusinessRepairStatus,
    fieldsFilled: Record<string, number>,
    error?: string,
    manualRequiredReason?: string,
    stateStatusOverride?: MarketDataRepairStateStatus
  ) {
    const repositoryAny = this.host.repository as any;
    if (typeof repositoryAny.recordRepairAttempt !== 'function') return;
    const attempt = await repositoryAny.recordRepairAttempt({
      stockId: stock.id,
      region: scope.region,
      assetType: scope.assetType,
      repairType: 'PROVIDER_BUSINESS_METADATA',
      status,
      provider: 'yahoo',
      fieldsFilledJson: fieldsFilled,
      error,
      manualRequiredReason,
    });
    if (typeof repositoryAny.upsertRepairState !== 'function') return;
    const stateStatus = stateStatusOverride ?? providerBusinessCurrentStateForAttemptFn(status);
    await repositoryAny.upsertRepairState({
      stockId: stock.id,
      region: scope.region,
      assetType: scope.assetType,
      repairType: 'PROVIDER_BUSINESS_METADATA',
      status: stateStatus,
      provider: 'yahoo',
      lastAttemptId: attempt?.id ?? null,
      fieldsFilledJson: fieldsFilled,
      error,
      manualRequiredReason,
      nextRetryAt: stateStatus === 'FAILED_RETRYABLE' ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null,
      resolvedAt: stateStatus === 'RESOLVED' ? new Date() : null,
    });
  }


  public async recordPriceBackfillRepairAttempt(
    stock: any,
    scope: { region: string; assetType: string },
    status: string,
    fieldsFilled: Record<string, number>,
    error?: string | null,
    manualRequiredReason?: string | null,
    stateStatus: MarketDataRepairStateStatus = 'FAILED_RETRYABLE'
  ) {
    const repositoryAny = this.host.repository as any;
    if (typeof repositoryAny.recordRepairAttempt !== 'function') return;
    const attempt = await repositoryAny.recordRepairAttempt({
      stockId: stock.id,
      region: scope.region,
      assetType: scope.assetType,
      repairType: 'PRICE_BACKFILL',
      status,
      provider: 'yahoo',
      fieldsFilledJson: fieldsFilled,
      error,
      manualRequiredReason,
    });
    if (typeof repositoryAny.upsertRepairState !== 'function') return;
    await repositoryAny.upsertRepairState({
      stockId: stock.id,
      region: scope.region,
      assetType: scope.assetType,
      repairType: 'PRICE_BACKFILL',
      status: stateStatus,
      provider: 'yahoo',
      lastAttemptId: attempt?.id ?? null,
      fieldsFilledJson: fieldsFilled,
      error,
      manualRequiredReason,
      nextRetryAt: stateStatus === 'FAILED_RETRYABLE' ? new Date(Date.now() + 12 * 60 * 60 * 1000) : null,
      resolvedAt: stateStatus === 'RESOLVED' ? new Date() : null,
    });
  }
}
