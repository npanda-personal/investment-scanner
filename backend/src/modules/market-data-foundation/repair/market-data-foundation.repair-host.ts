// Repair/remediation collaboration contract (Phase 5c).
//
// Phase 5c extracts the repair/remediation engine out of MarketDataFoundationService into
// dedicated classes under repair/:
//   - RepairService                     (market-data-foundation.repair.service.ts)
//   - RepairRunEngine                   (market-data-foundation.repair.run-engine.ts)
//   - RepairPriceBackfillService        (market-data-foundation.repair.price-backfill.ts)
//   - RepairPriceBackfillRunEngine      (market-data-foundation.repair.price-backfill-run.ts)
//   - RepairCatalogIdentityService      (market-data-foundation.repair.catalog-identity.ts)
//   - RepairBusinessMetadataService     (market-data-foundation.repair.business-metadata.ts)
//   - RepairFundamentalsImportService   (market-data-foundation.repair.fundamentals-import.ts)
//   - RepairPriceIdentityService        (market-data-foundation.repair.price-identity.ts)
//
// Each class takes the service as its `host` and reaches the collaborators it still needs
// (repositories, the serving/quality helpers that STAY on the service, and the cross-engine
// repair methods owned by sibling repair classes — which the service re-exposes via thin
// byte-identical delegators) through the MarketDataRepairHost interface here. PURE util/mapper
// free functions are imported DIRECTLY by the repair classes (not routed through the host).
//
// CRITICAL: every host member is typed with its CONCRETE signature via
// Parameters<MarketDataFoundationService['X']> / ReturnType<MarketDataFoundationService['X']>
// referencing the kept service delegator — NEVER bare `any` — so routing a collaborator through
// the host never collapses a union/named return type and never degrades a consumer module's view
// of these controller-surface return types.

import type { MarketDataFoundationService } from '../market-data-foundation.service';
import type { MarketDataFoundationRepository } from '../market-data-foundation.repository';
import type { MarketDataPipelineRecorder } from './market-data-foundation.repair.types';

type S = MarketDataFoundationService;

// Structural port for the legacy market-data provider DI slot (Yahoo/Angel — disabled at runtime).
// Repair bodies only touch fetchCompanyMasterData; the field is typed loosely on the service, so
// the host exposes the minimal shape the moved bodies use.
export interface MarketDataRepairProviderPort {
  fetchCompanyMasterData(symbol: string): Promise<any>;
}

export interface MarketDataRepairHost {
  // ── Injected collaborators (fields that stay on the service) ────────────────────────────────
  readonly repository: MarketDataFoundationRepository;
  readonly marketDataProvider: MarketDataRepairProviderPort;
  readonly pipelineRecorder?: MarketDataPipelineRecorder;

  // ── Serving / quality / ingestion helpers that STAY on the service ──────────────────────────
  catalogRowsForSource(...args: Parameters<S['catalogRowsForSource']>): ReturnType<S['catalogRowsForSource']>;
  clampCatalogSyncNumber(...args: Parameters<S['clampCatalogSyncNumber']>): ReturnType<S['clampCatalogSyncNumber']>;
  cleanupCatalogTempFile(...args: Parameters<S['cleanupCatalogTempFile']>): ReturnType<S['cleanupCatalogTempFile']>;
  downloadConfiguredCatalogCsv(...args: Parameters<S['downloadConfiguredCatalogCsv']>): ReturnType<S['downloadConfiguredCatalogCsv']>;
  expectedProviderSuffixForStock(...args: Parameters<S['expectedProviderSuffixForStock']>): ReturnType<S['expectedProviderSuffixForStock']>;
  ingestSymbol(...args: Parameters<S['ingestSymbol']>): ReturnType<S['ingestSymbol']>;
  invalidateUniverseComputationSnapshot(...args: Parameters<S['invalidateUniverseComputationSnapshot']>): ReturnType<S['invalidateUniverseComputationSnapshot']>;
  isCatalogSyncTerminal(...args: Parameters<S['isCatalogSyncTerminal']>): ReturnType<S['isCatalogSyncTerminal']>;
  priceBarsForSymbol(...args: Parameters<S['priceBarsForSymbol']>): ReturnType<S['priceBarsForSymbol']>;
  priceStatsForStock(...args: Parameters<S['priceStatsForStock']>): ReturnType<S['priceStatsForStock']>;
  providerValidationWindow(...args: Parameters<S['providerValidationWindow']>): ReturnType<S['providerValidationWindow']>;
  repairPlan(...args: Parameters<S['repairPlan']>): ReturnType<S['repairPlan']>;
  requiredHistoryDiagnostics(...args: Parameters<S['requiredHistoryDiagnostics']>): ReturnType<S['requiredHistoryDiagnostics']>;
  throttleIngestion(...args: Parameters<S['throttleIngestion']>): ReturnType<S['throttleIngestion']>;
  tryOfficialNseEodBulkLatestCandle(...args: Parameters<S['tryOfficialNseEodBulkLatestCandle']>): ReturnType<S['tryOfficialNseEodBulkLatestCandle']>;
  tryUniverseComputationSnapshot(...args: Parameters<S['tryUniverseComputationSnapshot']>): ReturnType<S['tryUniverseComputationSnapshot']>;
  universeHealth(...args: Parameters<S['universeHealth']>): ReturnType<S['universeHealth']>;
  universeReadinessAndStatsForStocks(...args: Parameters<S['universeReadinessAndStatsForStocks']>): ReturnType<S['universeReadinessAndStatsForStocks']>;
  validateCsvColumns(...args: Parameters<S['validateCsvColumns']>): ReturnType<S['validateCsvColumns']>;
  validateProviders(...args: Parameters<S['validateProviders']>): ReturnType<S['validateProviders']>;

  // ── Cross-engine repair methods (owned by sibling repair classes, re-exposed by the service
  //    via thin delegators so other repair classes reach them through the host). ───────────────
  backfillPrices(...args: Parameters<S['backfillPrices']>): ReturnType<S['backfillPrices']>;
  countPriceBackfillRunCandidates(...args: Parameters<S['countPriceBackfillRunCandidates']>): ReturnType<S['countPriceBackfillRunCandidates']>;
  createRepairRunActionResult(...args: Parameters<S['createRepairRunActionResult']>): ReturnType<S['createRepairRunActionResult']>;
  defaultCatalogIdentitySource(...args: Parameters<S['defaultCatalogIdentitySource']>): ReturnType<S['defaultCatalogIdentitySource']>;
  emptyRepairSummary(...args: Parameters<S['emptyRepairSummary']>): ReturnType<S['emptyRepairSummary']>;
  executeRepairRunAction(...args: Parameters<S['executeRepairRunAction']>): ReturnType<S['executeRepairRunAction']>;
  expectedNextRepairRunAction(...args: Parameters<S['expectedNextRepairRunAction']>): ReturnType<S['expectedNextRepairRunAction']>;
  findStockForCatalogIdentityRow(...args: Parameters<S['findStockForCatalogIdentityRow']>): ReturnType<S['findStockForCatalogIdentityRow']>;
  finishRepairSummary(...args: Parameters<S['finishRepairSummary']>): ReturnType<S['finishRepairSummary']>;
  hardBlockersFromHealth(...args: Parameters<S['hardBlockersFromHealth']>): ReturnType<S['hardBlockersFromHealth']>;
  importManualMetadata(...args: Parameters<S['importManualMetadata']>): ReturnType<S['importManualMetadata']>;
  isAngelOneTokenNotFoundError(...args: Parameters<S['isAngelOneTokenNotFoundError']>): ReturnType<S['isAngelOneTokenNotFoundError']>;
  isYahooRateLimitError(...args: Parameters<S['isYahooRateLimitError']>): ReturnType<S['isYahooRateLimitError']>;
  jsonSnapshot<T>(value: T): T;
  loadCatalogIdentityRows(...args: Parameters<S['loadCatalogIdentityRows']>): ReturnType<S['loadCatalogIdentityRows']>;
  missingBusinessMetadataFields(...args: Parameters<S['missingBusinessMetadataFields']>): ReturnType<S['missingBusinessMetadataFields']>;
  mutatingRepairBatch(...args: Parameters<S['mutatingRepairBatch']>): ReturnType<S['mutatingRepairBatch']>;
  needsBusinessMetadataRepair(...args: Parameters<S['needsBusinessMetadataRepair']>): ReturnType<S['needsBusinessMetadataRepair']>;
  normalizeRepairRunActions(...args: Parameters<S['normalizeRepairRunActions']>): ReturnType<S['normalizeRepairRunActions']>;
  onlyManualMetadataRemains(...args: Parameters<S['onlyManualMetadataRemains']>): ReturnType<S['onlyManualMetadataRemains']>;
  priceBackfillConcurrency(...args: Parameters<S['priceBackfillConcurrency']>): ReturnType<S['priceBackfillConcurrency']>;
  priceBackfillProviderThrottleMs(...args: Parameters<S['priceBackfillProviderThrottleMs']>): ReturnType<S['priceBackfillProviderThrottleMs']>;
  providerBusinessMetadataRepairConcurrency(...args: Parameters<S['providerBusinessMetadataRepairConcurrency']>): ReturnType<S['providerBusinessMetadataRepairConcurrency']>;
  providerDisabledRepairSummary(...args: Parameters<S['providerDisabledRepairSummary']>): ReturnType<S['providerDisabledRepairSummary']>;
  recordPriceBackfillRepairAttempt(...args: Parameters<S['recordPriceBackfillRepairAttempt']>): ReturnType<S['recordPriceBackfillRepairAttempt']>;
  repairCatalogIdentityFromRows(...args: Parameters<S['repairCatalogIdentityFromRows']>): ReturnType<S['repairCatalogIdentityFromRows']>;
  repairRunActionCount(...args: Parameters<S['repairRunActionCount']>): ReturnType<S['repairRunActionCount']>;
  repairRunActionLabel(...args: Parameters<S['repairRunActionLabel']>): ReturnType<S['repairRunActionLabel']>;
  repairRunSourceFingerprintMetadata(...args: Parameters<S['repairRunSourceFingerprintMetadata']>): ReturnType<S['repairRunSourceFingerprintMetadata']>;
  repairRunSourceFingerprints(...args: Parameters<S['repairRunSourceFingerprints']>): ReturnType<S['repairRunSourceFingerprints']>;
  repairRunStartOffsets(...args: Parameters<S['repairRunStartOffsets']>): ReturnType<S['repairRunStartOffsets']>;
  repairRunTotals(...args: Parameters<S['repairRunTotals']>): ReturnType<S['repairRunTotals']>;
  repairRunWarnings(...args: Parameters<S['repairRunWarnings']>): ReturnType<S['repairRunWarnings']>;
  repairScope(...args: Parameters<S['repairScope']>): ReturnType<S['repairScope']>;
  repairSourceIdentity(...args: Parameters<S['repairSourceIdentity']>): ReturnType<S['repairSourceIdentity']>;
  stableSourceRepairBatch(...args: Parameters<S['stableSourceRepairBatch']>): ReturnType<S['stableSourceRepairBatch']>;
  stocksByIdentityKey(...args: Parameters<S['stocksByIdentityKey']>): ReturnType<S['stocksByIdentityKey']>;
}
