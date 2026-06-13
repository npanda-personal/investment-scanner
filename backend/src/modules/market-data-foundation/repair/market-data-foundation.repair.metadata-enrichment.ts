// Repair metadata-enrichment / manual-metadata-import sibling (Phase 5c). Split out of
// RepairBusinessMetadataService so each file stays under the 500-line source cap. Bodies are
// byte-identical to the pre-extraction inline implementation (this.X -> this.host.X for
// stays-on-service / cross-engine collaborators; pure util/mapper + business-metadata helpers
// imported directly).

import type { MarketDataRepairHost } from './market-data-foundation.repair-host';
import type {
  CreateStockRequest,
  MarketDataRepairRequest,
  MarketDataRepairSummary,
} from '../market-data-foundation.types';
import {
  parseCsv as parseCsvUtil,
  readCsv as readCsvUtil,
} from '../util/market-data-foundation.util.csv';
import {
  parseCatalogDate as parseCatalogDateUtil,
} from '../util/market-data-foundation.util.dates';
import {
  defaultCountryForInstrument as defaultCountryForInstrumentUtil,
  defaultCurrencyForInstrument as defaultCurrencyForInstrumentUtil,
  hasValidMarketCap as hasValidMarketCapUtil,
  hasValidMetadataValue as hasValidMetadataValueUtil,
} from '../util/market-data-foundation.util.instrument-metadata';
import {
  baseSymbolFromProviderSymbol as baseSymbolFromProviderSymbolMapper,
  providerSymbolForExchange as providerSymbolForExchangeMapper,
} from '../analytics/market-data-foundation.instrument-mapper';
import {
  emptyRepairSummary as emptyRepairSummaryFn,
  finishRepairSummary as finishRepairSummaryFn,
  missingRepairFields as missingRepairFieldsFn,
  providerMetadataHasUsefulFields as providerMetadataHasUsefulFieldsFn,
  repairedMetadataFields as repairedMetadataFieldsFn,
  providerBusinessStateAfterRepair as providerBusinessStateAfterRepairFn,
} from './market-data-foundation.repair.business-metadata.helpers';

export class RepairMetadataEnrichmentService {
  constructor(private readonly host: MarketDataRepairHost) {}

  public async enrichMetadata(request: MarketDataRepairRequest = {}): Promise<MarketDataRepairSummary> {
    const started = Date.now();
    const scope = this.host.repairScope(request);
    const batch = this.host.mutatingRepairBatch(request);
    const catalogOverrides = this.metadataOverridesFromCsv(request.csvText || '', request.catalogSource || 'NSE_EQUITY_SECURITIES');
    const { stocks, total } = await this.host.repository.listStocksForMetadataEnrichment({
      ...scope,
      ...batch,
    });
    const summary = emptyRepairSummaryFn(scope, batch, total, true);
    summary.fieldProvenance = [];
    summary.fieldsFilled = {};

    for (const stock of stocks) {
      summary.processedCount += 1;
      try {
        const missingBefore = missingRepairFieldsFn(stock);
        const providerSymbol = stock.providerSymbol || stock.symbol;
        const providerData = await this.host.marketDataProvider.fetchCompanyMasterData(providerSymbol).catch(() => null);
        const providerUseful = providerMetadataHasUsefulFieldsFn(providerData);
        const providerUpdate = providerUseful ? providerData : null;
        if (!providerUseful) summary.providerNotFound = (summary.providerNotFound || 0) + 1;
        const override = catalogOverrides.get(String(stock.sourceSymbol || stock.displaySymbol || stock.symbol).replace(/\.(NS|BO)$/i, '').toUpperCase())
          || catalogOverrides.get(String(stock.symbol || '').replace(/\.(NS|BO)$/i, '').toUpperCase())
          || catalogOverrides.get(String(stock.providerSymbol || '').replace(/\.(NS|BO)$/i, '').toUpperCase());
        const update: Partial<CreateStockRequest> = {
          name: providerUpdate?.companyName || stock.name,
          region: stock.region || (providerUpdate?.country === 'India' ? 'IN' : undefined),
          exchange: providerUpdate?.exchange || stock.exchange || undefined,
          country: providerUpdate?.country || stock.country || defaultCountryForInstrumentUtil(stock.symbol, stock.exchange, stock.region) || undefined,
          sector: providerUpdate?.sector || stock.sector || undefined,
          industry: providerUpdate?.industry || stock.industry || undefined,
          currency: providerUpdate?.currency || stock.currency || defaultCurrencyForInstrumentUtil(stock.symbol, stock.exchange, stock.region),
          marketCap: providerUpdate?.marketCap ?? (stock.marketCap !== null && stock.marketCap !== undefined ? Number(stock.marketCap) : undefined),
          assetType: providerUpdate?.assetType || stock.assetType || undefined,
          isDelisted: providerUpdate?.isDelisted ?? stock.isDelisted,
          ipoDate: override?.ipoDate || stock.ipoDate || undefined,
          isin: override?.isin || stock.isin || undefined,
          source: providerUseful ? 'yahoo' : stock.source,
        };
        const filledFields = repairedMetadataFieldsFn(stock, update, missingBefore);
        const missingAfter = missingRepairFieldsFn({ ...stock, ...update });

        if (missingAfter.length > 0) {
          summary.manualRequired = (summary.manualRequired || 0) + 1;
        }

        if (filledFields.length === 0) {
          summary.noOp = (summary.noOp || 0) + 1;
          summary.skipped += 1;
          summary.warnings.push(`${stock.symbol}: no missing metadata fields were repaired; manual metadata remains required for ${missingAfter.join(', ') || 'none'}.`);
          continue;
        }

        await this.host.repository.updateCompanyMasterData(stock.id, update);
        summary.updated += 1;
        summary.metadataEnriched = (summary.metadataEnriched || 0) + 1;
        for (const field of filledFields) {
          summary.fieldsFilled[field] = (summary.fieldsFilled[field] || 0) + 1;
        }
        if (filledFields.some((field) => ['isin', 'ipoDate', 'exchange', 'providerSymbol', 'sourceSymbol'].includes(field))) {
          summary.catalogIdentityRepaired = (summary.catalogIdentityRepaired || 0) + 1;
        }
        if (filledFields.some((field) => ['sector', 'industry', 'marketCap', 'country', 'currency'].includes(field))) {
          summary.providerBusinessMetadataRepaired = (summary.providerBusinessMetadataRepaired || 0) + 1;
        }
        summary.fieldProvenance.push({
          instrumentId: stock.id,
          symbol: stock.symbol,
          sectorSource: providerUpdate?.sector ? 'yahoo' : stock.sector ? 'existing_db' : null,
          industrySource: providerUpdate?.industry ? 'yahoo' : stock.industry ? 'existing_db' : null,
          marketCapSource: providerUpdate?.marketCap !== null && providerUpdate?.marketCap !== undefined ? 'yahoo' : stock.marketCap ? 'existing_db' : null,
          isinSource: override?.isin ? String(request.catalogSource || 'manual_csv') : stock.isin ? 'existing_db' : null,
          listingDateSource: override?.ipoDate ? String(request.catalogSource || 'manual_csv') : stock.ipoDate ? 'existing_db' : null,
          metadataUpdatedAt: new Date().toISOString(),
        });
      } catch (error) {
        summary.failed += 1;
        summary.warnings.push(`${stock.symbol}: ${error instanceof Error ? error.message : 'metadata enrichment failed'}`);
      }
    }

    finishRepairSummaryFn(summary, started);
    return summary;
  }

  public async importManualMetadata(request: MarketDataRepairRequest = {}): Promise<MarketDataRepairSummary> {
    const started = Date.now();
    const scope = this.host.repairScope(request);
    const batch = this.host.stableSourceRepairBatch(request);
    const csvText = request.csvText || '';
    if (!csvText.trim()) {
      throw new Error('Manual metadata import requires CSV text.');
    }
    const rows = parseCsvUtil(csvText);
    const firstRow = rows[0] || {};
    const headers = new Set(Object.keys(firstRow).map((key) => key.toUpperCase()));
    const hasSymbolColumn = headers.has('SYMBOL') || headers.has('PROVIDERSYMBOL') || headers.has('PROVIDER SYMBOL');
    if (!hasSymbolColumn) {
      throw new Error('Manual metadata import requires symbol or providerSymbol column.');
    }
    if (!headers.has('SECTOR') || !headers.has('INDUSTRY')) {
      throw new Error('Manual metadata import requires sector and industry columns.');
    }
    if (!headers.has('MARKETCAP') && !headers.has('MARKET CAP')) {
      throw new Error('Manual metadata import requires marketCap column.');
    }
    const page = rows.slice(batch.offset, batch.offset + batch.batchSize);
    const scopedStocks = (await this.host.repository.listStocksForUniverseHealth(scope))
      .filter((stock) => stock.isActive !== false && stock.isDelisted !== true);
    const stocksByKey = this.host.stocksByIdentityKey(scopedStocks);
    const summary = emptyRepairSummaryFn(scope, batch, rows.length, false);
    summary.catalogSource = 'MANUAL';
    const manualSource = this.host.repairSourceIdentity({
      action: 'MANUAL_METADATA_IMPORT',
      importMode: 'MANUAL_CSV',
      sourceKey: 'MANUAL_CSV',
      rawText: csvText,
      rows,
    });
    summary.sourceFingerprint = manualSource.fingerprint;
    summary.sourceIdentity = manualSource.identity;
    summary.fieldsFilled = {};
    summary.fieldProvenance = [];

    for (const row of page) {
      summary.processedCount += 1;
      const symbol = readCsvUtil(row, ['SYMBOL', 'symbol', 'SOURCE SYMBOL', 'TRADING SYMBOL']);
      const providerSymbol = readCsvUtil(row, ['PROVIDERSYMBOL', 'PROVIDER SYMBOL', 'providerSymbol']);
      if (!symbol) {
        if (!providerSymbol) {
          summary.failed += 1;
          summary.warnings.push('Manual metadata row rejected: symbol or providerSymbol is required.');
          continue;
        }
      }
      const lookupSymbol = symbol || providerSymbol;
      const sector = readCsvUtil(row, ['SECTOR', 'sector']);
      const industry = readCsvUtil(row, ['INDUSTRY', 'industry']);
      const marketCapText = readCsvUtil(row, ['MARKET CAP', 'MARKETCAP', 'marketCap']);
      const marketCap = Number(marketCapText);
      if (!hasValidMetadataValueUtil(sector) || !hasValidMetadataValueUtil(industry)) {
        summary.failed += 1;
        summary.warnings.push(`${lookupSymbol}: manual sector/industry rejected because both fields are required and cannot be null-equivalent.`);
        continue;
      }
      if (!marketCapText || !hasValidMarketCapUtil(marketCap)) {
        summary.failed += 1;
        summary.manualRequired = (summary.manualRequired || 0) + 1;
        summary.warnings.push(`${lookupSymbol}: manual marketCap rejected because a positive numeric marketCap is required to resolve business metadata.`);
        continue;
      }
      const stock = this.host.findStockForCatalogIdentityRow({
        symbol: lookupSymbol,
        sourceSymbol: symbol || baseSymbolFromProviderSymbolMapper(providerSymbol),
        providerSymbol: providerSymbol || providerSymbolForExchangeMapper(lookupSymbol, readCsvUtil(row, ['EXCHANGE', 'exchange']) || undefined),
        displaySymbol: symbol || baseSymbolFromProviderSymbolMapper(providerSymbol),
        name: lookupSymbol,
        region: scope.region,
        assetType: scope.assetType,
        exchange: readCsvUtil(row, ['EXCHANGE', 'exchange']) || undefined,
      } as CreateStockRequest, stocksByKey);
      if (!stock) {
        summary.skipped += 1;
        summary.manualRequired = (summary.manualRequired || 0) + 1;
        summary.warnings.push(`${lookupSymbol}: no existing scoped instrument matched manual metadata row.`);
        continue;
      }

      const listingDateText = readCsvUtil(row, ['LISTING DATE', 'LISTINGDATE', 'DATE OF LISTING', 'IPO DATE', 'IPODATE']);
      const update: Partial<CreateStockRequest> = {
        sector: sector.trim(),
        industry: industry.trim(),
        isin: readCsvUtil(row, ['ISIN', 'ISIN NUMBER', 'ISINNUMBER']) || stock.isin || undefined,
        ipoDate: listingDateText ? parseCatalogDateUtil(listingDateText) || stock.ipoDate || undefined : stock.ipoDate || undefined,
        exchange: readCsvUtil(row, ['EXCHANGE', 'exchange']) || stock.exchange || undefined,
        marketCap,
        source: stock.source || 'manual_metadata',
      };
      const missingBefore = missingRepairFieldsFn(stock);
      const filledFields = repairedMetadataFieldsFn(stock, update, missingBefore);
      if (filledFields.length === 0) {
        summary.skipped += 1;
        summary.noOp = (summary.noOp || 0) + 1;
        summary.manualRequired = (summary.manualRequired || 0) + 1;
        continue;
      }

      await this.host.repository.updateCompanyMasterData(stock.id, update);
      const stockAfterRepair = { ...stock, ...update };
      await this.recordManualMetadataRepairSuccess(stockAfterRepair, scope, filledFields);
      const businessRepairState = providerBusinessStateAfterRepairFn(
        stockAfterRepair,
        filledFields.filter((field) => ['sector', 'industry', 'marketCap'].includes(field))
      );
      if (businessRepairState.attemptStatus === 'PARTIAL_SUCCESS') {
        summary.partialSuccess = (summary.partialSuccess || 0) + 1;
        summary.manualRequired = (summary.manualRequired || 0) + 1;
        summary.warnings.push(`${stock.symbol}: manual metadata import remains incomplete; required fields still missing: ${businessRepairState.remainingFields.join(', ')}.`);
      }
      summary.updated += 1;
      for (const field of filledFields) {
        summary.fieldsFilled[field] = (summary.fieldsFilled[field] || 0) + 1;
      }
      summary.fieldProvenance.push({
        instrumentId: stock.id,
        symbol: stock.symbol,
        sectorSource: filledFields.includes('sector') ? 'manual_csv' : stock.sector ? 'existing_db' : null,
        industrySource: filledFields.includes('industry') ? 'manual_csv' : stock.industry ? 'existing_db' : null,
        isinSource: filledFields.includes('isin') ? 'manual_csv' : stock.isin ? 'existing_db' : null,
        listingDateSource: filledFields.includes('ipoDate') ? 'manual_csv' : stock.ipoDate ? 'existing_db' : null,
        metadataUpdatedAt: new Date().toISOString(),
      });
    }

    if (summary.updated > 0) {
      this.host.invalidateUniverseComputationSnapshot(scope);
    }
    finishRepairSummaryFn(summary, started);
    return summary;
  }

  private async recordManualMetadataRepairSuccess(stock: any, scope: { region: string; assetType: string }, filledFields: string[]) {
    const repositoryAny = this.host.repository as any;
    if (typeof repositoryAny.recordRepairAttempt !== 'function') return;
    const fieldsFilled = Object.fromEntries(filledFields.map((field) => [field, 1]));
    const businessState = providerBusinessStateAfterRepairFn(
      stock,
      filledFields.filter((field) => ['sector', 'industry', 'marketCap'].includes(field))
    );
    const attempt = await repositoryAny.recordRepairAttempt({
      stockId: stock.id,
      region: scope.region,
      assetType: scope.assetType,
      repairType: 'MANUAL_METADATA_IMPORT',
      status: businessState.attemptStatus,
      provider: 'manual_csv',
      fieldsFilledJson: fieldsFilled,
      manualRequiredReason: businessState.manualRequiredReason,
    });
    if (typeof repositoryAny.upsertRepairState !== 'function') return;
    await repositoryAny.upsertRepairState({
      stockId: stock.id,
      region: scope.region,
      assetType: scope.assetType,
      repairType: 'PROVIDER_BUSINESS_METADATA',
      status: businessState.stateStatus,
      provider: 'manual_csv',
      lastAttemptId: attempt?.id ?? null,
      fieldsFilledJson: fieldsFilled,
      error: null,
      manualRequiredReason: businessState.manualRequiredReason ?? null,
      nextRetryAt: null,
      resolvedAt: businessState.stateStatus === 'RESOLVED' ? new Date() : null,
    });
  }

  private metadataOverridesFromCsv(csvText: string, catalogSource: string): Map<string, { isin?: string | null; ipoDate?: Date | null }> {
    const overrides = new Map<string, { isin?: string | null; ipoDate?: Date | null }>();
    if (!csvText.trim()) return overrides;
    const warnings: string[] = [];
    for (const row of this.host.catalogRowsForSource(String(catalogSource || 'NSE_EQUITY_SECURITIES').toUpperCase(), csvText, warnings)) {
      const keys = [row.sourceSymbol, row.symbol, row.providerSymbol, row.displaySymbol]
        .filter((value): value is string => Boolean(value))
        .map((value) => baseSymbolFromProviderSymbolMapper(value));
      for (const key of keys) {
        overrides.set(key, { isin: row.isin || null, ipoDate: row.ipoDate || null });
      }
    }
    return overrides;
  }

}
