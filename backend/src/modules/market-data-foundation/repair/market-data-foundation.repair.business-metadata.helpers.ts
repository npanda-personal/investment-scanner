// Business-metadata repair pure helpers (Phase 5c). Stateless field/summary helpers extracted from
// RepairBusinessMetadataService so the business-metadata file stays under the 500-line source cap.
// Bodies are byte-identical to the pre-extraction inline implementation.

import type {
  CreateStockRequest,
  MarketDataProviderBusinessRepairStatus,
  MarketDataRepairPlan,
  MarketDataRepairStateStatus,
  MarketDataRepairSummary,
} from '../market-data-foundation.types';
import {
  hasValidMarketCap as hasValidMarketCapUtil,
  hasValidMetadataValue as hasValidMetadataValueUtil,
} from '../util/market-data-foundation.util.instrument-metadata';
import { normalizeProviderStatus } from '../ingestion/market-data-foundation.universe';

export function emptyRepairSummary(
  scope: { region: string; assetType: string },
  batch: { batchSize: number; offset: number },
  totalCount: number,
  stableMutatingQueue = false
): MarketDataRepairSummary {
  const nextOffset = batch.offset + batch.batchSize;
  const hasMore = stableMutatingQueue ? totalCount > batch.batchSize : nextOffset < totalCount;
  return {
    scope,
    processedCount: 0,
    totalCount,
    batchSize: batch.batchSize,
    offset: batch.offset,
    nextOffset: hasMore ? (stableMutatingQueue ? 0 : nextOffset) : null,
    hasMore,
    updated: 0,
    skipped: 0,
    failed: 0,
    warnings: [],
    durationMs: 0,
  };
}

export function finishRepairSummary(summary: MarketDataRepairSummary, started: number) {
  summary.durationMs = Date.now() - started;
  summary.warnings = summary.warnings.slice(0, 25);
}

export function needsMetadataEnrichment(stock: any): boolean {
  return !hasValidMetadataValueUtil(stock.sector)
    || !hasValidMetadataValueUtil(stock.industry)
    || !hasValidMarketCapUtil(stock.marketCap)
    || !stock.isin
    || !stock.ipoDate;
}

export function needsBusinessMetadataRepair(stock: any): boolean {
  return !hasValidMetadataValueUtil(stock.sector)
    || !hasValidMetadataValueUtil(stock.industry)
    || !hasValidMarketCapUtil(stock.marketCap);
}

export function missingBusinessMetadataFields(stock: any): string[] {
  const missing: string[] = [];
  if (!hasValidMetadataValueUtil(stock.sector)) missing.push('sector');
  if (!hasValidMetadataValueUtil(stock.industry)) missing.push('industry');
  if (!hasValidMarketCapUtil(stock.marketCap)) missing.push('marketCap');
  return missing;
}

export function businessMetadataBlockerDiagnostics(stocks: any[]): NonNullable<MarketDataRepairPlan['businessMetadataBlockerDiagnostics']> {
  const byMissingFieldSet = new Map<string, number>();
  let unresolvedTotal = 0;
  let missingSector = 0;
  let missingIndustry = 0;
  let missingMarketCap = 0;

  for (const stock of stocks) {
    if (stock.isActive === false || stock.isDelisted === true) continue;
    if (normalizeProviderStatus(stock.providerSupportStatus) !== 'SUPPORTED') continue;
    const missing = missingBusinessMetadataFields(stock);
    if (missing.length === 0) continue;
    unresolvedTotal += 1;
    if (missing.includes('sector')) missingSector += 1;
    if (missing.includes('industry')) missingIndustry += 1;
    if (missing.includes('marketCap')) missingMarketCap += 1;
    const key = missing.join('+');
    byMissingFieldSet.set(key, (byMissingFieldSet.get(key) || 0) + 1);
  }

  return {
    requiredFields: ['sector', 'industry', 'marketCap'],
    unresolvedTotal,
    missingSector,
    missingIndustry,
    missingMarketCap,
    byMissingFieldSet: Object.fromEntries(
      [...byMissingFieldSet.entries()].sort(([a], [b]) => a.localeCompare(b))
    ),
  };
}

export function providerBusinessMetadataHasUsefulFields(providerData: any): boolean {
  if (!providerData || providerData.dataStatus === 'MISSING') return false;
  return hasValidMetadataValueUtil(providerData.sector)
    || hasValidMetadataValueUtil(providerData.industry)
    || hasValidMarketCapUtil(providerData.marketCap);
}

export function providerBusinessMetadataUpdate(stock: any, providerData: any): Partial<CreateStockRequest> {
  const update: Partial<CreateStockRequest> = {
    source: stock.source || 'database',
  };
  if (!hasValidMetadataValueUtil(stock.sector) && hasValidMetadataValueUtil(providerData.sector)) {
    update.sector = String(providerData.sector).trim();
    update.source = 'yahoo';
  }
  if (!hasValidMetadataValueUtil(stock.industry) && hasValidMetadataValueUtil(providerData.industry)) {
    update.industry = String(providerData.industry).trim();
    update.source = 'yahoo';
  }
  if (!hasValidMarketCapUtil(stock.marketCap) && hasValidMarketCapUtil(providerData.marketCap)) {
    update.marketCap = Number(providerData.marketCap);
    update.source = 'yahoo';
  }
  return update;
}

export function providerBusinessStateAfterRepair(
  stockAfterRepair: any,
  fieldsFilled: string[]
): {
  stateStatus: MarketDataRepairStateStatus;
  attemptStatus: MarketDataProviderBusinessRepairStatus;
  remainingFields: string[];
  manualRequiredReason?: string;
} {
  const remainingFields = missingBusinessMetadataFields(stockAfterRepair);
  if (remainingFields.length === 0) {
    return {
      stateStatus: 'RESOLVED',
      attemptStatus: 'SUCCESS',
      remainingFields,
    };
  }
  const manualRequiredReason = `Missing business metadata after repair: ${remainingFields.join(', ')}`;
  return {
    stateStatus: 'MANUAL_REQUIRED',
    attemptStatus: fieldsFilled.length > 0 ? 'PARTIAL_SUCCESS' : 'NO_FIELDS_FILLED',
    remainingFields,
    manualRequiredReason,
  };
}

export function providerBusinessCurrentStateForAttempt(status: MarketDataProviderBusinessRepairStatus): MarketDataRepairStateStatus {
  if (status === 'SUCCESS') return 'RESOLVED';
  if (status === 'FAILED') return 'FAILED_RETRYABLE';
  if (status === 'SKIPPED_RECENT_ATTEMPT') return 'RETRY_COOLDOWN';
  return 'MANUAL_REQUIRED';
}

export function missingRepairFields(stock: any): string[] {
  const missing: string[] = [];
  if (!hasValidMetadataValueUtil(stock.sector)) missing.push('sector');
  if (!hasValidMetadataValueUtil(stock.industry)) missing.push('industry');
  if (!hasValidMarketCapUtil(stock.marketCap)) missing.push('marketCap');
  if (!stock.isin) missing.push('isin');
  if (!stock.ipoDate) missing.push('ipoDate');
  return missing;
}

export function providerMetadataHasUsefulFields(providerData: any): boolean {
  if (!providerData) return false;
  if (providerData.dataStatus === 'MISSING') return false;
  return ['companyName', 'exchange', 'sector', 'industry', 'marketCap']
    .some((field) => providerData[field] !== null && providerData[field] !== undefined && providerData[field] !== '');
}

export function repairedMetadataFields(stock: any, update: Partial<CreateStockRequest>, missingBefore: string[]): string[] {
  return missingBefore.filter((field) => {
    const before = stock[field];
    const after = (update as any)[field];
    if (after === null || after === undefined || after === '') return false;
    if (field === 'marketCap') return !hasValidMarketCapUtil(before) && hasValidMarketCapUtil(after);
    return !before;
  });
}
