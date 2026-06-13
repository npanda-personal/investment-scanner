import { Prisma, PrismaClient } from '@prisma/client';
import defaultPrisma from '../../db/prisma';
import type {
  CorporateAction,
  CreateStockRequest,
  CoreFundamentals,
  FxRateInput,
  HistoricalPrice,
  PaginationOptions,
  SyncSummary,
  UpdateStockRequest,
  MarketDataSyncStateDto,
  MarketDataSyncScopeType,
  MarketDataSyncStateStatus,
  MarketDataRepairType,
  MarketDataRepairRunStatus,
  MarketDataRepairStateStatus,
  MarketMoverRow,
  ProviderValidationQueue,
  DailyRefreshEligibilityResult,
  ScheduledRegionSyncSummary,
  TrustedReviewUniversePriceRow,
} from './market-data-foundation.types';
import { type UniversePriceStats } from './ingestion/market-data-foundation.universe';
import { SourceImportsRepository, type SourceFileImportInput } from './persistence/market-data-foundation.repository.source-imports';
import { CatalogRepository } from './persistence/market-data-foundation.repository.catalog';
import { CatalogQueriesRepository } from './persistence/market-data-foundation.repository.catalog-queries';
import {
  PriceRepository,
  type HistoricalBulkStoreSummary,
  type HistoricalStoreOptions,
  type InferPriceRegion,
  type PriceRegionInfo,
} from './persistence/market-data-foundation.repository.price';
import { PriceReadsRepository, type DeliverySnapshotInput } from './persistence/market-data-foundation.repository.price-reads';
import { PriceReadinessRepository } from './persistence/market-data-foundation.repository.price-readiness';
import { CorporateActionsRepository } from './persistence/market-data-foundation.repository.corporate-actions';
import { FundamentalsRepository, type ManualVerifiedFundamentalInput } from './persistence/market-data-foundation.repository.fundamentals';
import { FxRepository } from './persistence/market-data-foundation.repository.fx';
import { ScanQueryRepository } from './persistence/market-data-foundation.repository.scans';
import { ScreenerRepository } from './persistence/market-data-foundation.repository.scans-screener';
import { MarketMoverRepository } from './persistence/market-data-foundation.repository.scans-movers';
import { RepairStateRepository } from './persistence/market-data-foundation.repository.repair-state';
import { RepairQueriesRepository } from './persistence/market-data-foundation.repository.repair-queries';
import { ProviderCleanupRepository } from './persistence/market-data-foundation.repository.provider-cleanup';

/**
 * Composition facade. Delegates every public method to a per-concern
 * sub-repository. Class name, constructor signature, and every public method
 * signature are byte-compatible with the pre-split repository — pure relocation.
 */
export class MarketDataFoundationRepository {
  private readonly sourceImports: SourceImportsRepository;
  private readonly catalog: CatalogRepository;
  private readonly catalogQueries: CatalogQueriesRepository;
  private readonly price: PriceRepository;
  private readonly priceReads: PriceReadsRepository;
  private readonly priceReadiness: PriceReadinessRepository;
  private readonly corporateActions: CorporateActionsRepository;
  private readonly fundamentals: FundamentalsRepository;
  private readonly fx: FxRepository;
  private readonly scans: ScanQueryRepository;
  private readonly screenerRepo: ScreenerRepository;
  private readonly movers: MarketMoverRepository;
  private readonly repairState: RepairStateRepository;
  private readonly repairQueries: RepairQueriesRepository;
  private readonly providerCleanup: ProviderCleanupRepository;

  constructor(public readonly prisma: PrismaClient = defaultPrisma) {
    this.sourceImports = new SourceImportsRepository(this.prisma);
    this.catalog = new CatalogRepository(this.prisma);
    this.catalogQueries = new CatalogQueriesRepository(this.prisma);
    this.price = new PriceRepository(this.prisma);
    this.priceReads = new PriceReadsRepository(this.prisma);
    this.priceReadiness = new PriceReadinessRepository(this.prisma);
    this.corporateActions = new CorporateActionsRepository(this.prisma);
    this.fundamentals = new FundamentalsRepository(this.prisma);
    this.fx = new FxRepository(this.prisma);
    this.scans = new ScanQueryRepository(this.prisma);
    this.screenerRepo = new ScreenerRepository(this.prisma);
    this.movers = new MarketMoverRepository(this.prisma);
    this.repairState = new RepairStateRepository(this.prisma);
    this.repairQueries = new RepairQueriesRepository(this.prisma);
    this.providerCleanup = new ProviderCleanupRepository(this.prisma);
  }

  async upsertSourceFileImport(input: SourceFileImportInput) {
    return this.sourceImports.upsertSourceFileImport(input);
  }

  async findSourceFileImportByKey(input: Pick<SourceFileImportInput, 'source' | 'segment' | 'tradingDate' | 'fileHash'>) {
    return this.sourceImports.findSourceFileImportByKey(input);
  }

  async listCompletedSourceFileImportDates(input: {
    source: string;
    segment: string;
    startDate: Date;
    endDate: Date;
  }): Promise<Date[]> {
    return this.sourceImports.listCompletedSourceFileImportDates(input);
  }

  async listCompletedOfficialNseIndexImportDates(input: {
    startDate: Date;
    endDate: Date;
  }): Promise<Date[]> {
    return this.sourceImports.listCompletedOfficialNseIndexImportDates(input);
  }

  async listSourceFileImports(input: {
    source?: string;
    segment?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    sortBy?: 'importedAt' | 'tradingDate';
    sortDirection?: 'asc' | 'desc';
  } = {}) {
    return this.sourceImports.listSourceFileImports(input);
  }

  async listExchangeIdentitiesMissingPriceHistory(
    options: Pick<PaginationOptions, 'region' | 'assetType'> = {},
    exchanges: string[] = ['NSE', 'BSE']
  ) {
    return this.catalogQueries.listExchangeIdentitiesMissingPriceHistory(options, exchanges);
  }

  async findExchangeIdentitiesForExchangeSymbols(exchange: string, symbols: string[]) {
    return this.catalogQueries.findExchangeIdentitiesForExchangeSymbols(exchange, symbols);
  }

  async filterPricesMissingPrimaryExchangeCandles(prices: HistoricalPrice[], primaryExchange: string): Promise<HistoricalPrice[]> {
    return this.price.filterPricesMissingPrimaryExchangeCandles(prices, primaryExchange);
  }

  async findIndexStocksBySourceSymbols(sourceSymbols: string[]) {
    return this.catalogQueries.findIndexStocksBySourceSymbols(sourceSymbols);
  }

  async findStocksBySymbolsInScope(symbols: string[], options: Pick<PaginationOptions, 'region' | 'assetType'> = {}) {
    return this.catalogQueries.findStocksBySymbolsInScope(symbols, options);
  }

  async upsertDeliverySnapshots(snapshots: DeliverySnapshotInput[]): Promise<{ insertedOrUpdated: number }> {
    return this.priceReads.upsertDeliverySnapshots(snapshots);
  }

  async getRecentDeliveryBySymbol(symbol: string, limit = 5, endDate?: Date) {
    return this.priceReads.getRecentDeliveryBySymbol(symbol, limit, endDate);
  }

  async providerDataCleanupReport() {
    return this.providerCleanup.providerDataCleanupReport();
  }

  async executeProviderDataCleanup() {
    return this.providerCleanup.executeProviderDataCleanup();
  }

  async rebuildLatestPricesFromExchangeCandles() {
    return this.providerCleanup.rebuildLatestPricesFromExchangeCandles();
  }

  async listStocks(options: PaginationOptions) {
    return this.catalogQueries.listStocks(options);
  }

  findStockById(id: string) {
    return this.catalog.findStockById(id);
  }

  findStockByIdInScope(id: string, options: Pick<PaginationOptions, 'region' | 'assetType'> = {}) {
    return this.catalog.findStockByIdInScope(id, options);
  }

  async findStockBySymbol(symbol: string) {
    return this.catalog.findStockBySymbol(symbol);
  }

  findStockBySymbolAndExchange(symbol: string, exchange: string) {
    return this.catalog.findStockBySymbolAndExchange(symbol, exchange);
  }

  createStock(data: CreateStockRequest) {
    return this.catalog.createStock(data);
  }

  updateStock(id: string, data: UpdateStockRequest) {
    return this.catalog.updateStock(id, data);
  }

  deleteStock(id: string) {
    return this.catalog.deleteStock(id);
  }

  async toggleStockActive(id: string) {
    return this.catalog.toggleStockActive(id);
  }

  searchStocks(query: string, take = 10, options: Pick<PaginationOptions, 'region' | 'assetType' | 'instrumentSegment'> = {}) {
    return this.catalog.searchStocks(query, take, options);
  }

  listActiveStockSyncTasks(
    options: Pick<PaginationOptions, 'region' | 'assetType' | 'instrumentSegment'> = {},
    take?: number,
    excludeIds: string[] = []
  ) {
    return this.catalogQueries.listActiveStockSyncTasks(options, take, excludeIds);
  }

  async listStaleActiveStockSyncTasks(
    options: Pick<PaginationOptions, 'region' | 'assetType' | 'instrumentSegment'> = {},
    targetTradingDate: string,
    take?: number,
    excludeIds: string[] = []
  ) {
    return this.catalogQueries.listStaleActiveStockSyncTasks(options, targetTradingDate, take, excludeIds);
  }

  countActiveStockSyncTasks(options: Pick<PaginationOptions, 'region' | 'assetType' | 'instrumentSegment'> = {}) {
    return this.catalogQueries.countActiveStockSyncTasks(options);
  }

  async countStaleActiveStockSyncTasks(
    options: Pick<PaginationOptions, 'region' | 'assetType' | 'instrumentSegment'> = {},
    targetTradingDate: string
  ): Promise<number> {
    return this.catalogQueries.countStaleActiveStockSyncTasks(options, targetTradingDate);
  }

  async upsertCatalogInstrument(data: CreateStockRequest): Promise<{ stock: any; action: 'inserted' | 'updated' | 'noOp' }> {
    return this.catalog.upsertCatalogInstrument(data);
  }

  async repairCatalogIdentityForStock(
    stockId: string,
    data: CreateStockRequest,
    options: { force?: boolean } = {}
  ): Promise<{ stock: any; action: 'updated' | 'noOp' }> {
    return this.catalog.repairCatalogIdentityForStock(stockId, data, options);
  }

  async updateProviderSupportStatus(symbol: string, status: string, providerError?: string | null) {
    return this.catalog.updateProviderSupportStatus(symbol, status, providerError);
  }

  async markProviderSupportedFromStoredPrices(symbols: string[]) {
    return this.catalog.markProviderSupportedFromStoredPrices(symbols);
  }

  async listStocksForCatalogBackfill(options: Pick<PaginationOptions, 'region' | 'assetType'> & { offset: number; batchSize: number; catalogSource?: string }) {
    return this.catalogQueries.listStocksForCatalogBackfill(options);
  }

  updateStockLoadTimestampById(id: string, timestamp = new Date()) {
    return this.catalog.updateStockLoadTimestampById(id, timestamp);
  }

  async updateStockLoadTimestampBySymbol(symbol: string, timestamp = new Date()) {
    return this.catalog.updateStockLoadTimestampBySymbol(symbol, timestamp);
  }

  updateStockLoadTimestampBySymbols(symbols: string[], timestamp = new Date()) {
    return this.catalog.updateStockLoadTimestampBySymbols(symbols, timestamp);
  }

  async listPrices(symbol: string, limit: number, startDate?: Date, endDate?: Date) {
    return this.priceReads.listPrices(symbol, limit, startDate, endDate);
  }

  async listForwardPriceWindowsByInstrumentIds(
    instrumentIds: string[],
    startDate: Date,
    options: Pick<PaginationOptions, 'region' | 'assetType'> = {}
  ) {
    return this.priceReads.listForwardPriceWindowsByInstrumentIds(instrumentIds, startDate, options);
  }

  async latestPrice(symbol: string) {
    return this.priceReads.latestPrice(symbol);
  }

  instrumentCount(options: Pick<PaginationOptions, 'region' | 'assetType'> = {}) {
    return this.catalogQueries.instrumentCount(options);
  }

  async latestDataTimestamp(options: Pick<PaginationOptions, 'region' | 'assetType'> = {}) {
    return this.priceReads.latestDataTimestamp(options);
  }

  async marketMoversForRange(
    lookbackDays: number,
    options: Pick<PaginationOptions, 'region' | 'assetType'> & { limit?: number; minHistoryBars?: number; maxAbsReturn?: number; recentBars?: number; latestDateStart?: Date | null; latestDateEnd?: Date | null } = {},
  ): Promise<MarketMoverRow[]> {
    return this.movers.marketMoversForRange(lookbackDays, options);
  }

  listStocksForUniverseHealth(options: Pick<PaginationOptions, 'region' | 'assetType'> = {}) {
    return this.repairQueries.listStocksForUniverseHealth(options);
  }

  async listRepairStatesForStocks(
    stockIds: string[],
    options: Pick<PaginationOptions, 'region' | 'assetType'> & { repairTypes?: MarketDataRepairType[] } = {}
  ) {
    return this.repairQueries.listRepairStatesForStocks(stockIds, options);
  }

  async listStocksForProviderValidation(options: Pick<PaginationOptions, 'region' | 'assetType'> & {
    offset: number;
    batchSize: number;
    includeRetryFailed?: boolean;
    providerValidationQueue?: ProviderValidationQueue;
    force?: boolean;
  }) {
    return this.repairQueries.listStocksForProviderValidation(options);
  }

  async listStocksForMetadataEnrichment(options: Pick<PaginationOptions, 'region' | 'assetType'> & { offset: number; batchSize: number }) {
    return this.repairQueries.listStocksForMetadataEnrichment(options);
  }

  async listStocksForBusinessMetadataRepair(options: Pick<PaginationOptions, 'region' | 'assetType'> & {
    offset: number;
    batchSize: number;
    includeManualRequired?: boolean;
    includeRetryable?: boolean;
  }) {
    return this.repairQueries.listStocksForBusinessMetadataRepair(options);
  }

  async countStocksForBusinessMetadataRepair(options: Pick<PaginationOptions, 'region' | 'assetType'> & {
    includeManualRequired?: boolean;
    includeRetryable?: boolean;
  }) {
    return this.repairQueries.countStocksForBusinessMetadataRepair(options);
  }

  async countBusinessMetadataRepairStates(options: Pick<PaginationOptions, 'region' | 'assetType'> & {
    statuses: MarketDataRepairStateStatus[];
    retryTiming?: 'blocked' | 'eligible';
    now?: Date;
  }) {
    return this.repairQueries.countBusinessMetadataRepairStates(options);
  }

  async listBlockedPriceBackfillStockIds(options: Pick<PaginationOptions, 'region' | 'assetType'> & {
    now?: Date;
    includeRetryable?: boolean;
  }) {
    return this.repairQueries.listBlockedPriceBackfillStockIds(options);
  }

  async countPriceBackfillRepairStates(options: Pick<PaginationOptions, 'region' | 'assetType'> & {
    statuses: MarketDataRepairStateStatus[];
    retryTiming?: 'blocked' | 'eligible';
    now?: Date;
  }) {
    return this.repairQueries.countPriceBackfillRepairStates(options);
  }

  async countProviderValidationRepairStates(options: Pick<PaginationOptions, 'region' | 'assetType'> & {
    status?: 'eligible' | 'blocked' | 'manual';
    now?: Date;
  }) {
    return this.repairQueries.countProviderValidationRepairStates(options);
  }

  async nextProviderValidationRetryAt(options: Pick<PaginationOptions, 'region' | 'assetType'> & { now?: Date }) {
    return this.repairQueries.nextProviderValidationRetryAt(options);
  }

  async recordRepairAttempt(input: { stockId: string; region: string; assetType?: string | null; repairType: MarketDataRepairType; status: string; provider?: string | null; attemptedAt?: Date; completedAt?: Date | null; fieldsFilledJson?: Prisma.InputJsonValue | null; error?: string | null; manualRequiredReason?: string | null }) {
    return this.repairState.recordRepairAttempt(input);
  }

  async countRepairAttempts(input: { stockId: string; repairType: MarketDataRepairType }) {
    return this.repairState.countRepairAttempts(input);
  }

  async upsertRepairState(input: { stockId: string; region: string; assetType?: string | null; repairType: MarketDataRepairType; status: MarketDataRepairStateStatus; provider?: string | null; lastAttemptId?: string | null; fieldsFilledJson?: Prisma.InputJsonValue | null; error?: string | null; manualRequiredReason?: string | null; nextRetryAt?: Date | null; lastAttemptedAt?: Date | null; resolvedAt?: Date | null }) {
    return this.repairState.upsertRepairState(input);
  }

  async createRepairRun(input: { region: string; assetType?: string | null; status: MarketDataRepairRunStatus; beforeHealthJson?: Prisma.InputJsonValue | null; beforeRepairPlanJson?: Prisma.InputJsonValue | null; actionsJson: Prisma.InputJsonValue; warningsJson?: Prisma.InputJsonValue | null }) {
    return this.repairState.createRepairRun(input);
  }

  async updateRepairRun(id: string, input: { status: MarketDataRepairRunStatus; completedAt?: Date | null; afterHealthJson?: Prisma.InputJsonValue | null; afterRepairPlanJson?: Prisma.InputJsonValue | null; summaryJson?: Prisma.InputJsonValue | null; warningsJson?: Prisma.InputJsonValue | null; error?: string | null }) {
    return this.repairState.updateRepairRun(id, input);
  }

  async latestRepairRun(options: Pick<PaginationOptions, 'region' | 'assetType'>) {
    return this.repairState.latestRepairRun(options);
  }

  async latestPriceExists(symbol: string): Promise<boolean> {
    return this.priceReads.latestPriceExists(symbol);
  }

  async reassignPriceRowsToCanonicalSymbol(input: {
    stockId: string;
    fromSymbol: string;
    toSymbol: string;
  }): Promise<{ priceRowsMoved: number; latestPricesMoved: number }> {
    return this.priceReads.reassignPriceRowsToCanonicalSymbol(input);
  }

  async priceReadinessStatsForSymbols(symbols: string[]): Promise<Map<string, UniversePriceStats>> {
    return this.priceReadiness.priceReadinessStatsForSymbols(symbols);
  }

  async priceHistoryForSymbols(
    symbols: string[],
    options: { perSymbolLimit?: number } = {}
  ): Promise<Map<string, TrustedReviewUniversePriceRow[]>> {
    return this.priceReadiness.priceHistoryForSymbols(symbols, options);
  }

  async priceCoverage(symbol: string) {
    return this.priceReads.priceCoverage(symbol);
  }

  async storeHistorical(
    prices: HistoricalPrice[],
    inferRegion: InferPriceRegion,
    regionInfoBySymbol: Map<string, PriceRegionInfo> = new Map()
  ): Promise<SyncSummary> {
    return this.price.storeHistorical(prices, inferRegion, regionInfoBySymbol);
  }

  async storeHistoricalBulk(
    prices: HistoricalPrice[],
    inferRegion: InferPriceRegion,
    regionInfoBySymbol: Map<string, PriceRegionInfo> = new Map(),
    options: HistoricalStoreOptions = {}
  ): Promise<HistoricalBulkStoreSummary> {
    return this.price.storeHistoricalBulk(prices, inferRegion, regionInfoBySymbol, options);
  }

  async latestStoredTradingDateForRegion(region: string, assetType: string): Promise<string | null> {
    return this.priceReads.latestStoredTradingDateForRegion(region, assetType);
  }

  async listDailyRefreshEligibleInstrumentIds(input: {
    region: string;
    assetType: string;
    dataThroughDate: string;
    limit?: number;
  }): Promise<DailyRefreshEligibilityResult> {
    return this.repairQueries.listDailyRefreshEligibleInstrumentIds(input);
  }

  async getSyncState(
    region: string,
    assetType: string,
    tradingDate: string,
    options: { scopeType?: MarketDataSyncScopeType; scopeKey?: string; timeframe?: string } = {}
  ): Promise<MarketDataSyncStateDto | null> {
    return this.repairState.getSyncState(region, assetType, tradingDate, options);
  }

  async upsertSyncState(input: { region: string; assetType: string; scopeType?: MarketDataSyncScopeType; scopeKey?: string; timeframe?: string; tradingDate: string; status: MarketDataSyncStateStatus; summary?: ScheduledRegionSyncSummary | SyncSummary | null; lastCheckedAt?: Date; lastProviderFetchAt?: Date | null }) {
    return this.repairState.upsertSyncState(input);
  }

  async upsertReviewReadinessSnapshot(region: string, assetType: string, tradingDate: string, summary: unknown): Promise<void> {
    return this.repairState.upsertReviewReadinessSnapshot(region, assetType, tradingDate, summary);
  }

  async latestReviewReadinessSnapshot(region: string, assetType: string): Promise<unknown | null> {
    return this.repairState.latestReviewReadinessSnapshot(region, assetType);
  }

  async updateCompanyMasterData(stockId: string, data: Partial<CreateStockRequest>) {
    return this.catalog.updateCompanyMasterData(stockId, data);
  }

  async upsertFundamentals(stockId: string, fundamentals: CoreFundamentals) {
    return this.fundamentals.upsertFundamentals(stockId, fundamentals);
  }

  async upsertManualVerifiedFundamental(stockId: string, input: ManualVerifiedFundamentalInput) {
    return this.fundamentals.upsertManualVerifiedFundamental(stockId, input);
  }

  async listFundamentals(stockId: string) {
    return this.fundamentals.listFundamentals(stockId);
  }

  async listStocksForFundamentalsIngestion(options: {
    region?: string;
    assetType?: string;
    batchSize: number;
    offset: number;
  }): Promise<{ stocks: { id: string; symbol: string }[]; total: number }> {
    return this.fundamentals.listStocksForFundamentalsIngestion(options);
  }

  async listExistingFundamentalPeriods(stockId: string): Promise<Set<string>> {
    return this.fundamentals.listExistingFundamentalPeriods(stockId);
  }

  async upsertCorporateActions(stockId: string, actions: CorporateAction[]) {
    return this.corporateActions.upsertCorporateActions(stockId, actions);
  }

  async listRawPriceBarsForStock(symbol: string): Promise<Array<{ date: Date; close: number }>> {
    return this.corporateActions.listRawPriceBarsForStock(symbol);
  }

  async updateAdjustedCloses(
    symbol: string,
    updates: Array<{ date: Date; adjustedClose: number }>
  ): Promise<number> {
    return this.corporateActions.updateAdjustedCloses(symbol, updates);
  }

  async listStocksForAdjustedCloseRecompute(
    options: Pick<PaginationOptions, 'region' | 'assetType'> & { batchSize: number; offset: number }
  ): Promise<{ stocks: Array<{ id: string; symbol: string }>; total: number }> {
    return this.corporateActions.listStocksForAdjustedCloseRecompute(options);
  }

  async listStocksWithCorporateActionsBySymbols(symbols: string[]): Promise<Array<{ id: string; symbol: string }>> {
    return this.corporateActions.listStocksWithCorporateActionsBySymbols(symbols);
  }

  async listCorporateActions(stockId: string) {
    return this.corporateActions.listCorporateActions(stockId);
  }

  async dedupeCorporateActions(stockId: string): Promise<{ deletedCount: number; remainingCount: number }> {
    return this.corporateActions.dedupeCorporateActions(stockId);
  }

  async upsertFxRate(input: FxRateInput) {
    return this.fx.upsertFxRate(input);
  }

  async listFxRates() {
    return this.fx.listFxRates();
  }

  async findFxRate(pair: string) {
    return this.fx.findFxRate(pair);
  }

  async scan52wProximity(
    options: Pick<PaginationOptions, 'region' | 'assetType'> & { scanType: '52w-high' | '52w-low'; proximityPct?: number; limit?: number },
  ) {
    return this.scans.scan52wProximity(options);
  }

  async scanDeliverySpike(
    options: Pick<PaginationOptions, 'region' | 'assetType'> & { lookbackBars?: number; minSpikeRatio?: number; limit?: number },
  ) {
    return this.scans.scanDeliverySpike(options);
  }

  async scanVolumeSpike(
    options: Pick<PaginationOptions, 'region' | 'assetType'> & { lookbackBars?: number; minSpikeRatio?: number; limit?: number },
  ) {
    return this.scans.scanVolumeSpike(options);
  }

  async screener(options: {
    region?: string;
    signalDirection?: string;
    minScore?: number;
    minRsPercentile?: number;
    sector?: string;
    capBand?: 'LARGE' | 'MID' | 'SMALL';
    minDeliveryPct?: number;
    min52wPositionPct?: number;
    excludeFnoBan?: boolean;
    limit?: number;
  }) {
    return this.screenerRepo.screener(options);
  }

  async listPriceWindowsForSymbolChunk(symbols: string[], cutoff: Date, endDate: Date | null) {
    return this.scans.listPriceWindowsForSymbolChunk(symbols, cutoff, endDate);
  }
}
