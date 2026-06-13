// Auto-extracted repair sibling (Phase 5c). Bodies are byte-identical to the pre-extraction inline
// implementation in market-data-foundation.service.ts, except that stays-on-service / cross-engine
// collaborators are reached through the host (this.X -> this.host.X) and pure util/mapper helpers
// are imported directly. The service constructs this once and keeps byte-identical public delegators
// for the controller-facing repair surface.

import type { MarketDataRepairHost } from './market-data-foundation.repair-host';
import type { MarketDataFoundationService } from '../market-data-foundation.service';
import type {
  CatalogSource,
  CreateStockRequest,
  MarketDataRepairRequest,
  MarketDataRepairSourceIdentity,
  MarketDataRepairSummary,
} from '../market-data-foundation.types';
import type {
  CatalogIdentityRowsSnapshot,
  CatalogIdentityWorkItem,
} from './market-data-foundation.repair.types';
import {
  isBlank as isBlankUtil,
  normalizeCatalogSource as normalizeCatalogSourceUtil,
} from '../util/market-data-foundation.util.instrument-metadata';
import {
  baseSymbolFromProviderSymbol as baseSymbolFromProviderSymbolMapper,
} from '../analytics/market-data-foundation.instrument-mapper';
import { getCatalogSourceConfig } from '../ingestion/market-data-foundation.catalog-sources';

export class RepairCatalogIdentityService {
  constructor(private readonly host: MarketDataRepairHost) {}

  public async repairCatalogIdentity(request: MarketDataRepairRequest = {}): Promise<MarketDataRepairSummary> {
    const scope = this.host.repairScope(request);
    const catalogSource = normalizeCatalogSourceUtil(request.catalogSource || this.host.defaultCatalogIdentitySource(scope));
    const catalog = await this.loadCatalogIdentityRows(catalogSource, request.csvText, request.importMode);
    return this.repairCatalogIdentityFromRows(request, {
      catalogSource,
      ...catalog,
    });
  }


  public async repairCatalogIdentityFromRows(
    request: MarketDataRepairRequest,
    catalog: CatalogIdentityRowsSnapshot,
    options: { actionableOnly?: boolean } = {}
  ): Promise<MarketDataRepairSummary> {
    const started = Date.now();
    const scope = this.host.repairScope(request);
    const batch = this.host.stableSourceRepairBatch(request);
    const sourceRows = catalog.rows;
    const scopedStocks = (await this.host.repository.listStocksForUniverseHealth(scope))
      .filter((stock) => stock.isActive !== false && stock.isDelisted !== true);
    const stocksByKey = this.stocksByIdentityKey(scopedStocks);
    const workItems: Array<Partial<CatalogIdentityWorkItem> & { row: CreateStockRequest }> = options.actionableOnly
      ? this.actionableCatalogIdentityWorkItems(sourceRows, stocksByKey)
      : sourceRows.map((row) => ({ row }));
    const page = workItems.slice(batch.offset, batch.offset + batch.batchSize);
    const summary = this.host.emptyRepairSummary(scope, batch, workItems.length, false);
    summary.catalogSource = catalog.catalogSource;
    summary.catalogRowsRead = sourceRows.length;
    summary.downloaded = catalog.downloaded;
    summary.sourceFingerprint = catalog.sourceFingerprint;
    summary.sourceIdentity = catalog.sourceIdentity;
    summary.fieldsFilled = {};
    summary.fieldProvenance = [];
    summary.warnings.push(...catalog.warnings);

    for (const item of page) {
      summary.processedCount += 1;
      const row = item.row;
      const stock = item.stock || this.findStockForCatalogIdentityRow(row, stocksByKey);
      if (!stock) {
        summary.skipped += 1;
        summary.noOp = (summary.noOp || 0) + 1;
        summary.unmatchedCatalogRows = (summary.unmatchedCatalogRows || 0) + 1;
        continue;
      }
      summary.matchedExistingRows = (summary.matchedExistingRows || 0) + 1;

      const filledFields = item.filledFields || this.repairedCatalogIdentityFields(stock, row);
      if (filledFields.length === 0) {
        summary.skipped += 1;
        summary.noOp = (summary.noOp || 0) + 1;
        if (this.needsCatalogIdentityRepair(stock)) summary.manualRequired = (summary.manualRequired || 0) + 1;
        continue;
      }

      const result = await this.host.repository.repairCatalogIdentityForStock(stock.id, row, { force: Boolean(request.force) });
      if (result.action === 'updated') {
        summary.updated += 1;
        summary.catalogIdentityRepaired = (summary.catalogIdentityRepaired || 0) + 1;
        for (const field of filledFields) {
          summary.fieldsFilled[field] = (summary.fieldsFilled[field] || 0) + 1;
        }
        summary.fieldProvenance.push({
          instrumentId: stock.id,
          symbol: stock.symbol,
          isinSource: row.isin ? catalog.catalogSource : stock.isin ? 'existing_db' : null,
          listingDateSource: row.ipoDate ? catalog.catalogSource : stock.ipoDate ? 'existing_db' : null,
          metadataUpdatedAt: new Date().toISOString(),
        });
      } else {
        summary.skipped += 1;
        summary.noOp = (summary.noOp || 0) + 1;
      }
    }

    if (summary.updated > 0) {
      this.host.invalidateUniverseComputationSnapshot(scope);
    }
    this.host.finishRepairSummary(summary, started);
    return summary;
  }


  public async loadCatalogIdentityRows(catalogSource: CatalogSource, csvText?: string, importMode?: MarketDataRepairRequest['importMode']): Promise<{
    rows: CreateStockRequest[];
    warnings: string[];
    downloaded: boolean;
    sourceFingerprint: string;
    sourceIdentity: MarketDataRepairSourceIdentity;
  }> {
    const warnings: string[] = [];
    let resolvedCsvText = csvText || '';
    let downloadInfo: Awaited<ReturnType<MarketDataFoundationService['downloadConfiguredCatalogCsv']>> | null = null;
    let resolvedImportMode: MarketDataRepairRequest['importMode'] = importMode;
    try {
      if (importMode === 'MANUAL_CSV' && !resolvedCsvText.trim()) {
        throw new Error('Manual CSV catalog identity repair requires csvText.');
      }
      if (importMode === 'CONFIGURED_URL' || !resolvedCsvText.trim()) {
        resolvedImportMode = 'CONFIGURED_URL';
        const sourceConfig = getCatalogSourceConfig(catalogSource);
        if (!sourceConfig?.supportsConfiguredUrl) {
          throw new Error(`Catalog identity repair requires CSV text or a configured URL for ${catalogSource}.`);
        }
        downloadInfo = await this.host.downloadConfiguredCatalogCsv(catalogSource);
        resolvedCsvText = downloadInfo.csvText;
      } else {
        resolvedImportMode = 'MANUAL_CSV';
      }
      this.host.validateCsvColumns(catalogSource, resolvedCsvText);
      const rows = this.host.catalogRowsForSource(catalogSource, resolvedCsvText, warnings);
      const sourceConfig = getCatalogSourceConfig(catalogSource);
      const sourceIdentity = this.host.repairSourceIdentity({
        action: 'CATALOG_IDENTITY_REPAIR',
        catalogSource,
        importMode: resolvedImportMode || 'MANUAL_CSV',
        sourceKey: resolvedImportMode === 'CONFIGURED_URL'
          ? `${sourceConfig?.urlSource || 'NONE'}:${sourceConfig?.url || ''}`
          : 'MANUAL_CSV',
        sourceUrl: resolvedImportMode === 'CONFIGURED_URL' ? sourceConfig?.url || null : null,
        urlSource: sourceConfig?.urlSource || null,
        rawText: resolvedCsvText,
        rows,
      });
      return {
        rows,
        warnings,
        downloaded: Boolean(downloadInfo),
        sourceFingerprint: sourceIdentity.fingerprint,
        sourceIdentity: sourceIdentity.identity,
      };
    } finally {
      if (downloadInfo) {
        await this.host.cleanupCatalogTempFile(downloadInfo).catch((error) => {
          warnings.push(`${catalogSource}: temporary catalog file cleanup failed: ${error instanceof Error ? error.message : 'unknown error'}`);
        });
      }
    }
  }


  public stocksByIdentityKey(stocks: any[]) {
    const byKey = new Map<string, any[]>();
    for (const stock of stocks) {
      for (const key of this.identityKeysForStock(stock)) {
        byKey.set(key, [...(byKey.get(key) || []), stock]);
      }
    }
    return byKey;
  }


  private actionableCatalogIdentityWorkItems(
    rows: CreateStockRequest[],
    stocksByKey: Map<string, any[]>
  ): CatalogIdentityWorkItem[] {
    const workItems: CatalogIdentityWorkItem[] = [];
    for (const row of rows) {
      for (const stock of this.findStocksForCatalogIdentityRow(row, stocksByKey)) {
        const filledFields = this.repairedCatalogIdentityFields(stock, row);
        if (filledFields.length === 0) continue;
        workItems.push({ stock, row, filledFields });
      }
    }
    return workItems;
  }


  public findStockForCatalogIdentityRow(row: CreateStockRequest, stocksByKey: Map<string, any[]>) {
    for (const key of this.identityKeysForCatalogRow(row)) {
      const stocks = this.uniqueStocks(stocksByKey.get(key) || []);
      if (stocks.length === 1) return stocks[0];
      if (stocks.length > 1) return null;
    }
    return null;
  }


  private findStocksForCatalogIdentityRow(row: CreateStockRequest, stocksByKey: Map<string, any[]>): any[] {
    for (const key of this.identityKeysForCatalogRow(row)) {
      const stocks = this.uniqueStocks(stocksByKey.get(key) || []);
      if (stocks.length === 0) continue;
      if (stocks.length === 1) return stocks;
      const safeMatches = this.safeDuplicateCatalogIdentityMatches(row, stocks);
      if (safeMatches.length > 0) return safeMatches;
      return [];
    }
    return [];
  }


  private safeDuplicateCatalogIdentityMatches(row: CreateStockRequest, stocks: any[]): any[] {
    const rowExchange = this.identityText(row.exchange);
    const rowProviderSymbol = this.identityText(row.providerSymbol);
    const rowSourceSymbol = this.identityText(row.sourceSymbol || row.symbol || row.displaySymbol);
    return stocks.filter((stock) => {
      const stockExchange = this.identityText(stock.exchange);
      if (rowExchange && stockExchange && rowExchange !== stockExchange) return false;
      const stockProviderSymbol = this.identityText(stock.providerSymbol);
      if (rowProviderSymbol && stockProviderSymbol === rowProviderSymbol) return true;
      const stockSourceSymbol = this.identityText(stock.sourceSymbol || stock.symbol || stock.displaySymbol);
      return Boolean(rowSourceSymbol && stockSourceSymbol && baseSymbolFromProviderSymbolMapper(stockSourceSymbol) === baseSymbolFromProviderSymbolMapper(rowSourceSymbol));
    });
  }


  private identityKeysForCatalogRow(row: Partial<CreateStockRequest>): string[] {
    const keys: string[] = [];
    const exchange = this.identityText(row.exchange);
    const region = this.identityText(row.region);
    const assetType = this.identityAssetType(row.assetType);
    const providerSymbol = this.identityText(row.providerSymbol);
    const sourceSymbol = this.identityText(row.sourceSymbol);
    const symbol = this.identityText(row.symbol || row.displaySymbol);
    const name = this.identityText(row.name);
    if (providerSymbol && exchange) keys.push(`provider:${exchange}:${providerSymbol}`);
    if (sourceSymbol && exchange) keys.push(`source:${exchange}:${baseSymbolFromProviderSymbolMapper(sourceSymbol)}`);
    if (symbol && region && assetType) keys.push(`symbol:${region}:${assetType}:${baseSymbolFromProviderSymbolMapper(symbol)}`);
    if (name && exchange) keys.push(`name:${exchange}:${name}`);
    return keys;
  }


  private identityKeysForStock(stock: any): string[] {
    const keys: string[] = [];
    const exchange = this.identityText(stock.exchange);
    const region = this.identityText(stock.region);
    const assetType = this.identityAssetType(stock.assetType);
    const providerSymbol = this.identityText(stock.providerSymbol);
    const sourceSymbol = this.identityText(stock.sourceSymbol);
    const symbol = this.identityText(stock.symbol || stock.displaySymbol);
    const name = this.identityText(stock.name);
    if (providerSymbol && exchange) keys.push(`provider:${exchange}:${providerSymbol}`);
    if (sourceSymbol && exchange) keys.push(`source:${exchange}:${baseSymbolFromProviderSymbolMapper(sourceSymbol)}`);
    if (symbol && region && assetType) keys.push(`symbol:${region}:${assetType}:${baseSymbolFromProviderSymbolMapper(symbol)}`);
    if (name && exchange) keys.push(`name:${exchange}:${name}`);
    return keys;
  }


  private uniqueStocks(stocks: any[]) {
    const byId = new Map<string, any>();
    for (const stock of stocks) {
      byId.set(stock.id || stock.symbol, stock);
    }
    return [...byId.values()];
  }


  private identityText(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim().toUpperCase();
    return trimmed.length > 0 ? trimmed : null;
  }


  private identityAssetType(value: unknown): string {
    const normalized = typeof value === 'string' ? value.trim().toUpperCase() : '';
    if (!normalized || normalized === 'EQUITY') return 'STOCK';
    return normalized;
  }


  public needsCatalogIdentityRepair(stock: any): boolean {
    return isBlankUtil(stock.exchange)
      || isBlankUtil(stock.providerSymbol)
      || isBlankUtil(stock.sourceSymbol)
      || isBlankUtil(stock.displaySymbol)
      || isBlankUtil(stock.catalogSource)
      || isBlankUtil(stock.isin)
      || !stock.ipoDate;
  }


  private repairedCatalogIdentityFields(stock: any, row: CreateStockRequest): string[] {
    const repaired: string[] = [];
    if (isBlankUtil(stock.exchange) && !isBlankUtil(row.exchange)) repaired.push('exchange');
    if (isBlankUtil(stock.providerSymbol) && !isBlankUtil(row.providerSymbol)) repaired.push('providerSymbol');
    if (isBlankUtil(stock.sourceSymbol) && !isBlankUtil(row.sourceSymbol)) repaired.push('sourceSymbol');
    if (isBlankUtil(stock.displaySymbol) && !isBlankUtil(row.displaySymbol)) repaired.push('displaySymbol');
    if (isBlankUtil(stock.catalogSource) && !isBlankUtil(row.catalogSource)) repaired.push('catalogSource');
    if (isBlankUtil(stock.isin) && !isBlankUtil(row.isin)) repaired.push('isin');
    if (!stock.ipoDate && row.ipoDate) repaired.push('ipoDate');
    return repaired;
  }

}
