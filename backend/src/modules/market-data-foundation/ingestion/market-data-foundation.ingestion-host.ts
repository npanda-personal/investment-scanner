// Ingestion-orchestration collaboration contract (ingestion-extraction phase).
//
// This phase extracts the INGESTION ORCHESTRATION + CATALOG management out of
// MarketDataFoundationService into dedicated classes under ingestion/:
//   - CatalogIngestionService     (market-data-foundation.ingestion.catalog.ts)
//   - ... (further ingestion clusters added in the same pattern)
//
// Each ingestion class takes the service as its `host` and reaches the collaborators that STAY
// on the service (the per-concern repository, the isolated crypto repository, the india ingestion
// sub-services, the snapshot/signal-coherence seams, and a few cross-cluster service helpers that
// remain thin delegators) through the MarketDataIngestionHost interface here. PURE util/mapper free
// functions are imported DIRECTLY by the ingestion classes (not routed through the host). The
// service keeps thin byte-identical delegators for the public ingestion surface that forward into
// the owning ingestion class instance; behaviour is byte-identical to the pre-extraction inline
// implementation.
//
// CRITICAL: every host member is typed with its CONCRETE signature via
// Parameters<MarketDataFoundationService['X']> / ReturnType<MarketDataFoundationService['X']>
// referencing the kept service member — NEVER bare `any` — so routing a collaborator through the
// host never collapses a union/named return type and never degrades a consumer module's view of
// these controller-surface return types (syncScheduledRegion / refreshMarketScanSnapshots /
// listDailyRefreshEligibleInstrumentIds / latestStoredCandleInfo / syncData / syncV1 / syncAll /
// create / createInstrument / update / delete / toggleActive / importCatalog /
// backfillCatalogMetadata / listCatalogSources are all consumed by the controller/scheduler/pipeline
// as the concrete service type).

import type { MarketDataFoundationService } from '../market-data-foundation.service';
import type { MarketDataFoundationRepository } from '../market-data-foundation.repository';

type S = MarketDataFoundationService;

// Structural port for the legacy market-data provider DI slot (Yahoo/Angel — disabled at runtime).
// The symbol-ingestion bodies only touch inferRegion; the field is typed loosely on the service, so
// the host exposes the minimal shape the moved bodies use.
export interface MarketDataIngestionProviderPort {
  inferRegion(symbol: string): { region: string; exchange?: string | null };
  // Reached by V1IngestionService.syncV1 (provider search + company-master enrichment); the legacy
  // provider is disabled at runtime, so these reject — V1 catches and degrades gracefully.
  search(query: string): Promise<any[]>;
  fetchCompanyMasterData(symbol: string): Promise<any>;
}

export interface MarketDataIngestionHost {
  // ── Injected collaborators that stay on the service ─────────────────────────────────────────
  readonly repository: MarketDataFoundationRepository;
  readonly marketDataProvider: MarketDataIngestionProviderPort;
  readonly manualSyncCooldownMinutes: number;

  // ── Cross-cluster service helpers (STAY on the service as thin delegators; reached here so the
  //    moved ingestion bodies call them exactly as they did via `this.X`). ──────────────────────
  // toV1Instrument is NOT a pure util delegator (it wires service methods as instrument-mapper deps)
  // so it is routed through the host; pure util delegators (inferRegionFromInstrument /
  // normalizeAssetType / catalog-row parsers) are imported directly by the ingestion classes.
  toV1Instrument(...args: Parameters<S['toV1Instrument']>): ReturnType<S['toV1Instrument']>;

  // Serving read reached by SyncGateService.shouldRunScheduledSync (stays on the service —
  // delegates to PriceReadsService; part of the MarketDataReadApi surface).
  latestStoredCandleInfo(...args: Parameters<S['latestStoredCandleInfo']>): ReturnType<S['latestStoredCandleInfo']>;

  // ── Sync-gate seams reached by SymbolIngestionService (owned by SyncGateService, re-exposed by
  //    the service delegators so the spy seams on evaluateSyncFreshnessGate keep resolving). ─────
  evaluateSyncFreshnessGate(...args: Parameters<S['evaluateSyncFreshnessGate']>): ReturnType<S['evaluateSyncFreshnessGate']>;
  buildSkippedSyncSummary(...args: Parameters<S['buildSkippedSyncSummary']>): ReturnType<S['buildSkippedSyncSummary']>;

  // ── Provider-disabled historical fetch seam (stays on the service; jest.spyOn(service,
  //    'fetchHistorical') tests + the NSE/BSE-only disabled-provider invariant rely on it). ──────
  fetchHistorical(...args: Parameters<S['fetchHistorical']>): ReturnType<S['fetchHistorical']>;

  // ── Single-symbol historical store seam (owned by SymbolIngestionService, re-exposed by the
  //    service delegator so storeHistoricalBulk's manual fallback loop hits the
  //    jest.spyOn(service,'storeHistorical') seam the region-sync tests rely on). ────────────────
  storeHistorical(...args: Parameters<S['storeHistorical']>): ReturnType<S['storeHistorical']>;

  // ── Per-symbol ingestion entry point (owned by SymbolIngestionService, re-exposed by the
  //    service delegator so syncData/ingestSymbols and the jest.spyOn(service,'ingestSymbol')
  //    seam route through the same instance). ────────────────────────────────────────────────────
  ingestSymbol(...args: Parameters<S['ingestSymbol']>): ReturnType<S['ingestSymbol']>;

  // ── Official NSE EOD bulk seams reached by CatalogSyncEngine (India delegators that STAY on the
  //    service — they forward to IndiaOfficialEodService). ──────────────────────────────────────
  officialNseEodBulkEnabled(...args: Parameters<S['officialNseEodBulkEnabled']>): ReturnType<S['officialNseEodBulkEnabled']>;
  tryOfficialNseEodBulkLatestCandle(...args: Parameters<S['tryOfficialNseEodBulkLatestCandle']>): ReturnType<S['tryOfficialNseEodBulkLatestCandle']>;

  // ── V1-ingestion seams reached by V1IngestionService (collaborators that STAY on the service:
  //    the throttle gate is a jest-spy test seam; create forwards to CatalogIngestionService; the
  //    fetch* helpers are the provider-disabled stubs the V1 tests exercise directly). ───────────
  throttleIngestion(...args: Parameters<S['throttleIngestion']>): ReturnType<S['throttleIngestion']>;
  create(...args: Parameters<S['create']>): ReturnType<S['create']>;
  fetchCoreFundamentals(...args: Parameters<S['fetchCoreFundamentals']>): ReturnType<S['fetchCoreFundamentals']>;
  fetchCorporateActions(...args: Parameters<S['fetchCorporateActions']>): ReturnType<S['fetchCorporateActions']>;

  // ── Region-sync orchestrator seams reached by RegionSyncOrchestrator.syncScheduledRegion. The
  //    sync-gate summary/fingerprint/task helpers + the stale-task counters delegate to
  //    SyncGateService / CatalogSyncEngine; the India daily importers + updateStockLoadTimestamps
  //    forward to the India ingestion sub-services (importNse* are jest-spy test seams). ──────────
  buildSkippedRegionSummary(...args: Parameters<S['buildSkippedRegionSummary']>): ReturnType<S['buildSkippedRegionSummary']>;
  scheduledRegionSourceFingerprint(...args: Parameters<S['scheduledRegionSourceFingerprint']>): ReturnType<S['scheduledRegionSourceFingerprint']>;
  instrumentIdsForImportedSymbols(...args: Parameters<S['instrumentIdsForImportedSymbols']>): ReturnType<S['instrumentIdsForImportedSymbols']>;
  importedSymbolsForInstrumentIds(...args: Parameters<S['importedSymbolsForInstrumentIds']>): ReturnType<S['importedSymbolsForInstrumentIds']>;
  updateStockLoadTimestampsForSymbols(...args: Parameters<S['updateStockLoadTimestampsForSymbols']>): ReturnType<S['updateStockLoadTimestampsForSymbols']>;
  countStaleCatalogSyncTasks(...args: Parameters<S['countStaleCatalogSyncTasks']>): ReturnType<S['countStaleCatalogSyncTasks']>;
  listStaleCatalogSyncTasks(...args: Parameters<S['listStaleCatalogSyncTasks']>): ReturnType<S['listStaleCatalogSyncTasks']>;
  importNseCmUdiffDaily(...args: Parameters<S['importNseCmUdiffDaily']>): ReturnType<S['importNseCmUdiffDaily']>;
  importNseIndexOfficialDaily(...args: Parameters<S['importNseIndexOfficialDaily']>): ReturnType<S['importNseIndexOfficialDaily']>;
}
