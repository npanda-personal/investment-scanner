// Universe-readiness collaboration contract (Phase 5b).
//
// Phase 5b extracts the SHARED universe-computation substrate plus the universe-health /
// review-readiness / instrument-catalogue serving methods out of MarketDataFoundationService
// into dedicated sibling classes:
//   - UniverseReadinessService    (market-data-foundation.universe-readiness.ts)
//   - UniverseReviewService       (market-data-foundation.universe-readiness.review.ts)
//   - UniverseInstrumentsService  (market-data-foundation.universe-readiness.instruments.ts)
//
// Each class takes the service as its `host` and reaches the shared collaborators it still
// needs (repositories, the repair/serving helpers that STAY on the service, and the substrate
// methods owned by UniverseReadinessService — which the service re-exposes via byte-identical
// delegators) through the MarketDataUniverseReadinessHost interface here. The service keeps a
// thin byte-identical delegator for each public method these classes own, so the concrete
// inferred return types external modules rely on are preserved exactly.
//
// CRITICAL: every host member is typed with its CONCRETE return type (a named type, or
// ReturnType<MarketDataFoundationService['X']> / Parameters<...> referencing the kept service
// delegator) — NEVER bare `any` — so routing a collaborator through the host never collapses a
// union return to `any` and never degrades a consumer module's view of these return types.

import type { MarketDataFoundationService } from '../market-data-foundation.service';
import type { MarketDataFoundationRepository } from '../market-data-foundation.repository';
import type { MarketDataFoundationCryptoRepository } from '../ingestion/crypto/market-data-foundation.crypto-repository';
import type {
  InstrumentUniverseReadiness,
  MarketDataRepairPlan,
  MarketDataRepairRunAction,
  MarketDataRepairRunRecord,
  MarketDataUniverseHealth,
  MarketDataUniverseSignoff,
  PaginationOptions,
  ReviewReadinessBlocker,
  ReviewReadinessNextAction,
  ReviewReadinessSummary,
  StockColumnMissingDataDiagnostic,
  StockMissingDataSample,
  TrustedReviewUniverseHealth,
  V1CreateInstrumentRequest,
  V1Instrument,
} from '../market-data-foundation.types';
import type {
  UniverseComputationSnapshot,
  StockMissingDataColumnConfig,
  TrustedBaselineSnapshot,
  TrustedReviewUniverseOptions,
} from './market-data-foundation.universe-readiness.types';

export interface MarketDataUniverseReadinessHost {
  // ── Prisma access ──────────────────────────────────────────────────────────────────────────
  readonly repository: MarketDataFoundationRepository;
  readonly cryptoRepository: MarketDataFoundationCryptoRepository;

  // ── Catalog list (CatalogReads serving delegator) used by listInstruments ───────────────────
  list(options: PaginationOptions): ReturnType<MarketDataFoundationService['list']>;

  // ── Crypto seams (Phase 5a crypto-reads owners; kept on the service) ────────────────────────
  cryptoUniverseHealth(): Promise<MarketDataUniverseHealth>;

  // ── V1 instrument shaper (deps-injecting delegator on the service) ──────────────────────────
  toV1Instrument(stock: any, overrides?: Partial<V1CreateInstrumentRequest>): V1Instrument;

  // ── Substrate methods owned by UniverseReadinessService, re-exposed by the service so the
  //    review/instruments sub-services can reach them through the host. ───────────────────────
  universeReadinessAndStatsForStocks(
    stocks: any[],
    options?: Pick<PaginationOptions, 'region' | 'assetType'> & { now?: Date },
  ): Promise<{ readinessBySymbol: Map<string, InstrumentUniverseReadiness>; statsBySymbol: Map<string, any> }>;
  trustedBaselineByStockId(
    stocks: any[],
    readinessBySymbol: Map<string, InstrumentUniverseReadiness>,
    statsBySymbol: Map<string, any>,
    options?: Pick<PaginationOptions, 'region' | 'assetType'>,
  ): Promise<Map<string, TrustedBaselineSnapshot>>;
  providerValidationWindow(
    scope: { region: string; assetType: string },
    now?: Date,
  ): ReturnType<MarketDataFoundationService['providerValidationWindow']>;
  tryUniverseComputationSnapshot(
    scope: { region: string; assetType: string },
    now?: Date,
  ): Promise<UniverseComputationSnapshot | null>;
  // Counts / coverage / signoff / trust / blocker primitives.
  emptyUniverseCounts(): MarketDataUniverseHealth['counts'];
  percent(value: number, denominator: number): number;
  latestDateFromReadiness(readinessBySymbol: Map<string, InstrumentUniverseReadiness>): string | null;
  topUniverseBlockers(blockerCounts: Map<string, number>): MarketDataUniverseHealth['topBlockers'];
  universeTrustStatus(
    counts: MarketDataUniverseHealth['counts'],
    coverage: MarketDataUniverseHealth['coverage'],
  ): MarketDataUniverseHealth['trustStatus'];
  universeTrustReasons(
    counts: MarketDataUniverseHealth['counts'],
    coverage: MarketDataUniverseHealth['coverage'],
  ): string[];
  universeSignoffFromHealth(health: Omit<MarketDataUniverseHealth, 'universeSignoff'>): MarketDataUniverseSignoff;
  universeSignoffFromRepairPlan(
    plan: Parameters<MarketDataFoundationService['universeSignoffFromRepairPlan']>[0],
    evidence: Parameters<MarketDataFoundationService['universeSignoffFromRepairPlan']>[1],
  ): MarketDataUniverseSignoff;
  numericOrNull(value: unknown): number | null;
  reviewDataThroughDatePolicy(
    scope: { region: string; assetType: string },
    stocks: any[],
    statsBySymbol: Map<string, any>,
    latestCompletedDataThroughDate: string | null,
  ): ReturnType<MarketDataFoundationService['reviewDataThroughDatePolicy']>;
  trustedReviewSupportEvidence(
    stock: any,
    stats: any,
    providerStatus: string,
  ): ReturnType<MarketDataFoundationService['trustedReviewSupportEvidence']>;

  // ── Repair/serving helpers that STAY on the service (host members for the moved bodies) ─────
  requiredHistoryDiagnostics(
    stock: any,
    validationWindow: ReturnType<MarketDataFoundationService['providerValidationWindow']>,
    storedStats?: any,
  ): ReturnType<MarketDataFoundationService['requiredHistoryDiagnostics']>;
  priceStatsForStock(priceStatsBySymbol: Map<string, any>, stock: any): any | null;
  priceBarsForSymbol(priceStatsBySymbol: Map<string, any>, symbol: unknown): number;
  needsCatalogIdentityRepair(stock: any): boolean;
  needsBusinessMetadataRepair(stock: any): boolean;
  needsMetadataEnrichment(stock: any): boolean;
  isBlank(value: unknown): boolean;
  hasValidMetadataValue(value: unknown): value is string;
  hasValidMarketCap(value: unknown): boolean;
  defaultCountryForInstrument(symbol?: string | null, exchange?: string | null, region?: string | null): string | null;
  defaultCurrencyForInstrument(symbol?: string | null, exchange?: string | null, region?: string | null): string;
  endOfTradingDateUtc(tradingDate: string | null): Date;
  repairRunActionLabel(action: MarketDataRepairRunAction): string;
  normalizeInstrumentAssetType(value?: string | null, symbol?: string | null, name?: string | null): string;
  expectedProviderSuffixForStock(stock: any): '.NS' | '.BO' | null;
  baseSymbolFromProviderSymbol(symbol: string): string;
  trimmedUpper(value: unknown): string;
  readPositiveNumber(value: string | undefined, fallback: number): number;
  latestRepairRun(
    options?: Pick<PaginationOptions, 'region' | 'assetType'>,
  ): Promise<MarketDataRepairRunRecord | null>;

  // ── Repair snapshot-state helpers (STAY on the service) used by the substrate snapshot build
  //    and by universeHealth/repairPlan. ────────────────────────────────────────────────────
  repairStatesByStockId(
    scope: { region: string; assetType: string },
    stocks: any[],
  ): Promise<Map<string, any[]> | undefined>;
  blockedPriceBackfillStockIds(
    scope: { region: string; assetType: string },
    includeRetryableBlocked?: boolean,
  ): Promise<Set<string>>;
  blockedPriceBackfillStockIdsFromStates(
    repairStatesByStockId: Map<string, any[]> | undefined,
    now?: Date,
  ): Set<string> | null;
  priceBackfillBlockReason(
    repairStatesByStockId: Map<string, any[]> | undefined,
    stockId: string,
    blockedWithoutState: boolean,
  ): 'manual' | 'retry' | null;
  repairPlanCountsFromSnapshot(
    snapshot: UniverseComputationSnapshot,
  ): ReturnType<MarketDataFoundationService['repairPlanCountsFromSnapshot']>;
  assignProviderValidationQueueCounts(
    counts: MarketDataUniverseHealth['counts'],
    scope: { region: string; assetType: string },
    snapshot?: UniverseComputationSnapshot | null,
  ): Promise<void>;
  businessMetadataBlockerDiagnostics(
    stocks: any[],
  ): NonNullable<MarketDataRepairPlan['businessMetadataBlockerDiagnostics']>;

  // ── Cross-cluster extracted methods (owned by sibling universe-readiness classes, re-exposed
  //    by the service so other sibling classes reach them through the host). ──────────────────
  // Health/repair-plan (UniverseHealthService) — called by review/workbench classes.
  universeHealth(
    options?: Pick<PaginationOptions, 'region' | 'assetType'>,
    snapshot?: UniverseComputationSnapshot,
  ): Promise<MarketDataUniverseHealth>;
  repairPlan(
    options?: Pick<PaginationOptions, 'region' | 'assetType'>,
    snapshot?: UniverseComputationSnapshot,
  ): Promise<MarketDataRepairPlan>;
  // Review-readiness public read (UniverseReviewService) — called by the workbench class.
  reviewReadinessSummary(options?: TrustedReviewUniverseOptions): Promise<ReviewReadinessSummary>;
  trustedReviewUniverseHealth(options?: TrustedReviewUniverseOptions): Promise<TrustedReviewUniverseHealth>;
  // Review-policy primitives (UniverseReviewPolicyService) — called by health/review classes.
  trustedReviewDatePolicy(
    region: string,
    now: Date,
  ): ReturnType<MarketDataFoundationService['trustedReviewDatePolicy']>;
  emptyTrustedReviewExcludedCounts(): ReturnType<MarketDataFoundationService['emptyTrustedReviewExcludedCounts']>;
  emptyTrustedReviewContextGapCounts(): ReturnType<MarketDataFoundationService['emptyTrustedReviewContextGapCounts']>;
  trustedReviewContextGaps(stock: any): string[];
  reviewReadinessBlockers(
    scope: { region: string; assetType: string },
    health: MarketDataUniverseHealth,
    reviewUniverse: TrustedReviewUniverseHealth,
    repairPlan: MarketDataRepairPlan,
  ): ReviewReadinessBlocker[];
  reviewReadinessNextAction(blockers: ReviewReadinessBlocker[]): ReviewReadinessNextAction | null;
  reviewReadinessUserDecision(
    mode: Parameters<MarketDataFoundationService['reviewReadinessUserDecision']>[0],
    trustStatus: Parameters<MarketDataFoundationService['reviewReadinessUserDecision']>[1],
    blockers: ReviewReadinessBlocker[],
    nextAction: ReviewReadinessNextAction | null,
  ): ReviewReadinessSummary['userDecision'];
  // Diagnostics-column primitives (StockMissingDataColumnService) — called by the instruments class.
  isDerivativeLikeInstrument(stock: any): boolean;
  stockMissingDataColumnConfigs(scope: { region: string; assetType: string }): StockMissingDataColumnConfig[];
  stockColumnMissingDataDiagnostic(
    config: StockMissingDataColumnConfig,
    stocks: any[],
    priceStatsBySymbol: Map<string, any>,
    sampleLimit: number,
  ): StockColumnMissingDataDiagnostic;
  stockMissingDataSample(
    stock: any,
    details: Parameters<MarketDataFoundationService['stockMissingDataSample']>[1],
  ): StockMissingDataSample;
}
