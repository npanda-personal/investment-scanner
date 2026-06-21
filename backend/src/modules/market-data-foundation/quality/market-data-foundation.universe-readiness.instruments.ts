// Auto-extracted universe-readiness sibling (Phase 5b). Bodies are byte-identical to the
// pre-extraction inline implementation in market-data-foundation.service.ts, except that
// stays-on-service / cross-cluster collaborators are reached through the host
// (this.X -> this.host.X) and the snapshot-cache field (substrate only) now lives on this class.
// The service constructs this once and keeps byte-identical public delegators.

import type { MarketDataUniverseReadinessHost } from './market-data-foundation.universe-readiness-host';
import type {
  StockColumnMissingDataDiagnostic,
  StockExpectedNullColumnDiagnostic,
  StockIdentityMismatchWarning,
  StockIdentityMismatchDiagnostic,
  StockMissingDataDiagnostics,
  StockMissingDataDiagnosticsActionCounts,
  StockMissingDataDiagnosticsCountMap,
  StockMissingDataSample,
  PaginationOptions,
} from '../market-data-foundation.types';
import { normalizeProviderStatus, STANDARD_REVIEW_MIN_BARS } from '../ingestion/market-data-foundation.universe';
import { isCryptoScope } from '../../../shared/data-access/market-repository-router';

export class UniverseInstrumentsService {
  constructor(private readonly host: MarketDataUniverseReadinessHost) {}

  async listInstruments(options: Partial<PaginationOptions> = {}) {
    const requestOptions: PaginationOptions = {
      page: options.page ?? 1,
      pageSize: options.pageSize ?? 50,
      sortBy: options.sortBy,
      sortOrder: options.sortOrder,
      region: options.region,
      country: options.country,
      exchange: options.exchange,
      assetType: options.assetType,
      instrumentSegment: options.instrumentSegment,
      currency: options.currency,
      sector: options.sector,
      industry: options.industry,
      dataStatus: options.dataStatus,
      catalogSource: options.catalogSource,
      providerSupportStatus: options.providerSupportStatus,
      derivativesEligible: options.derivativesEligible,
      search: options.search,
      symbol: options.symbol,
    };
    // Crypto scope → isolated crypto_assets plane (mapped to the same V1Instrument shape).
    if (isCryptoScope(requestOptions)) {
      const pageSize = requestOptions.pageSize;
      const page = requestOptions.page;
      const search = requestOptions.search;
      const [assets, total] = await Promise.all([
        this.host.cryptoRepository.listAssets({ activeOnly: true, search, limit: pageSize, offset: (page - 1) * pageSize }),
        this.host.cryptoRepository.countAssets({ activeOnly: true, search }),
      ]);
      return {
        instruments: assets.map((asset) => this.host.toV1Instrument(asset)),
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      };
    }
    const result = await this.host.list(requestOptions);
    const { readinessBySymbol, statsBySymbol } = await this.host.universeReadinessAndStatsForStocks(result.stocks, requestOptions);
    const baselineByStockId = await this.host.trustedBaselineByStockId(result.stocks, readinessBySymbol, statsBySymbol, requestOptions);

    return {
      instruments: result.stocks.map((stock: any) => this.host.toV1Instrument({
        ...stock,
        universeReadiness: readinessBySymbol.get(stock.symbol),
        trustedBaseline: baselineByStockId.get(stock.id),
      })),
      pagination: result.pagination,
    };
  }

  async getInstrument(id: string, options: Pick<PaginationOptions, 'region' | 'assetType'> = {}) {
    // Crypto scope → isolated crypto_assets plane (mapped to the same V1Instrument shape).
    if (isCryptoScope(options)) {
      const asset = await this.host.cryptoRepository.getAssetById(id);
      if (!asset) return null;
      return this.host.toV1Instrument(asset);
    }
    const stock = await this.host.repository.findStockByIdInScope(id, options);
    if (!stock) return null;
    const { readinessBySymbol, statsBySymbol } = await this.host.universeReadinessAndStatsForStocks([stock], options);
    const baselineByStockId = await this.host.trustedBaselineByStockId([stock], readinessBySymbol, statsBySymbol, options);
    return this.host.toV1Instrument({
      ...stock,
      universeReadiness: readinessBySymbol.get(stock.symbol),
      trustedBaseline: baselineByStockId.get(stock.id),
    });
  }

  async getInstrumentsByIds(ids: string[]) {
    const stocks = await this.host.repository.prisma.stock.findMany({
      where: { id: { in: ids } },
    });
    return stocks.map((stock) => this.host.toV1Instrument(stock));
  }

  async stockMissingDataDiagnostics(options: Pick<PaginationOptions, 'region' | 'assetType'> & { sampleLimit?: number } = {}): Promise<StockMissingDataDiagnostics> {
    const scope = {
      region: options.region?.trim().toUpperCase() || 'IN',
      assetType: options.assetType?.trim().toUpperCase() || 'STOCK',
    };
    const sampleLimit = Math.max(1, Math.min(Number(options.sampleLimit) || 5, 50));
    const stocks = (await this.host.repository.listStocksForUniverseHealth(scope))
      .filter((stock) => stock.isActive !== false && stock.isDelisted !== true);
    const identitySymbols = [...new Set(stocks.flatMap((stock) => [
      stock.symbol,
      stock.providerSymbol,
      stock.sourceSymbol,
      stock.displaySymbol,
    ]).filter((value): value is string => typeof value === 'string' && value.trim().length > 0))];
    const warnings: string[] = [];
    const repositoryAny = this.host.repository as any;
    const priceStatsBySymbol: Map<string, any> = typeof repositoryAny.priceReadinessStatsForSymbols === 'function'
      ? await repositoryAny.priceReadinessStatsForSymbols(identitySymbols)
      : new Map();
    if (typeof repositoryAny.priceReadinessStatsForSymbols !== 'function') {
      warnings.push('Price identity diagnostics are limited because price readiness stats are unavailable.');
    }

    const columns = this.host.stockMissingDataColumnConfigs(scope).map((config) =>
      this.host.stockColumnMissingDataDiagnostic(config, stocks, priceStatsBySymbol, sampleLimit)
    );
    const expectedNullColumns = columns
      .filter((column) => column.expectedNullCount > 0)
      .map((column): StockExpectedNullColumnDiagnostic => ({
        column: column.column,
        reason: column.expectedNullReason || 'Column is expected to remain null for at least one active scoped stock.',
        expectedNullCount: column.expectedNullCount,
        unexpectedNonNullCount: column.unexpectedNonNullCount,
        samples: column.samples.filter((sample) => sample.issue === 'UNEXPECTED_NON_NULL').slice(0, sampleLimit),
      }));
    const { diagnostics: identityMismatches, affectedRows: identityMismatchRows } = this.stockIdentityMismatchDiagnostics(stocks, priceStatsBySymbol, sampleLimit);
    const counts = this.stockMissingDataCounts(stocks, columns, priceStatsBySymbol, identityMismatchRows);
    const actionCounts = this.stockMissingDataActionCounts(counts);
    const identityMismatchWarnings = this.stockIdentityMismatchWarnings(identityMismatches, sampleLimit);

    return {
      scope,
      generatedAt: new Date().toISOString(),
      activeStockCount: stocks.length,
      sampleLimit,
      columns,
      expectedNullColumns,
      identityMismatches,
      identityMismatchWarnings,
      counts,
      actionCounts,
      totals: {
        columnsAudited: columns.length,
        columnsWithIssues: columns.filter((column) => column.affectedCount > 0).length,
        nullCount: columns.reduce((sum, column) => sum + column.nullCount, 0),
        blankCount: columns.reduce((sum, column) => sum + column.blankCount, 0),
        nullEquivalentCount: columns.reduce((sum, column) => sum + column.nullEquivalentCount, 0),
        invalidCount: columns.reduce((sum, column) => sum + column.invalidCount, 0),
        unexpectedNonNullCount: columns.reduce((sum, column) => sum + column.unexpectedNonNullCount, 0),
        affectedColumnValues: columns.reduce((sum, column) => sum + column.affectedCount, 0),
        identityMismatchRows,
      },
      warnings,
    };
  }

  stockIdentityMismatchDiagnostics(
    stocks: any[],
    priceStatsBySymbol: Map<string, any>,
    sampleLimit: number
  ): { diagnostics: StockIdentityMismatchDiagnostic[]; affectedRows: number } {
    const diagnosticsByCode = new Map<string, StockIdentityMismatchDiagnostic>();
    const affectedRows = new Set<string>();
    const add = (code: string, label: string, stock: any, reason: string, extra: Partial<StockMissingDataSample> = {}) => {
      let diagnostic = diagnosticsByCode.get(code);
      if (!diagnostic) {
        diagnostic = { code, label, count: 0, samples: [] };
        diagnosticsByCode.set(code, diagnostic);
      }
      diagnostic.count += 1;
      affectedRows.add(stock.id || stock.symbol);
      if (diagnostic.samples.length < sampleLimit) {
        diagnostic.samples.push(this.host.stockMissingDataSample(stock, {
          issue: 'IDENTITY_MISMATCH',
          reason,
          ...extra,
        }));
      }
    };

    for (const stock of stocks) {
      const providerSymbol = this.host.trimmedUpper(stock.providerSymbol);
      const sourceSymbol = this.host.trimmedUpper(stock.sourceSymbol);
      const displaySymbol = this.host.trimmedUpper(stock.displaySymbol);
      const canonicalSymbol = this.host.trimmedUpper(stock.symbol);
      const expectedSuffix = this.host.expectedProviderSuffixForStock(stock);
      const canonicalBars = this.host.priceBarsForSymbol(priceStatsBySymbol, stock.symbol);

      if (!providerSymbol) {
        add('PROVIDER_SYMBOL_MISSING', 'Provider symbol is missing', stock, 'Provider validation and price backfill need a provider symbol.');
      } else if (expectedSuffix && !providerSymbol.endsWith(expectedSuffix)) {
        add('PROVIDER_SYMBOL_SUFFIX_MISMATCH', 'Provider symbol suffix does not match exchange', stock, `Expected provider symbol suffix ${expectedSuffix}.`, { expected: `*${expectedSuffix}`, value: providerSymbol });
      }

      if (providerSymbol && sourceSymbol && this.host.baseSymbolFromProviderSymbol(providerSymbol) !== this.host.baseSymbolFromProviderSymbol(sourceSymbol)) {
        add('SOURCE_PROVIDER_BASE_MISMATCH', 'Source/provider symbol bases differ', stock, 'Provider symbol base should match the source symbol base.', { expected: sourceSymbol, value: providerSymbol });
      }

      if (displaySymbol && sourceSymbol && this.host.baseSymbolFromProviderSymbol(displaySymbol) !== this.host.baseSymbolFromProviderSymbol(sourceSymbol)) {
        add('DISPLAY_SOURCE_BASE_MISMATCH', 'Display/source symbol bases differ', stock, 'Display symbol should match the source symbol base.', { expected: sourceSymbol, value: displaySymbol });
      }

      const alternateSymbols = [stock.providerSymbol, stock.sourceSymbol, stock.displaySymbol]
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .filter((value) => value.trim().toUpperCase() !== canonicalSymbol);
      const alternateWithPrices = alternateSymbols
        .map((symbol) => ({ symbol, bars: this.host.priceBarsForSymbol(priceStatsBySymbol, symbol) }))
        .find((item) => item.bars > 0);
      if (canonicalBars === 0 && alternateWithPrices) {
        add('PRICE_ROWS_UNDER_ALTERNATE_SYMBOL', 'Price rows exist under alternate identity only', stock, 'Stock has no price rows under its canonical symbol, but an alternate identity has price rows.', {
          priceHistoryBars: canonicalBars,
          alternateSymbol: alternateWithPrices.symbol,
          alternatePriceHistoryBars: alternateWithPrices.bars,
        });
      }

      if (normalizeProviderStatus(stock.providerSupportStatus) === 'SUPPORTED' && canonicalBars === 0) {
        add('SUPPORTED_WITHOUT_CANONICAL_PRICES', 'Provider-supported stock has no canonical price rows', stock, 'Provider-supported stock has no price history under Stock.symbol.', { priceHistoryBars: canonicalBars });
      }
    }

    return {
      diagnostics: [...diagnosticsByCode.values()].sort((left, right) => right.count - left.count || left.code.localeCompare(right.code)),
      affectedRows: affectedRows.size,
    };
  }

  stockMissingDataCounts(
    stocks: any[],
    columns: StockColumnMissingDataDiagnostic[],
    priceStatsBySymbol: Map<string, any>,
    identityMismatchRows: number
  ): StockMissingDataDiagnosticsCountMap {
    const byColumn = new Map(columns.map((column) => [column.column, column]));
    const affected = (column: string) => byColumn.get(column)?.affectedCount ?? 0;
    let providerUnknown = 0;
    let providerRetryValidationNeeded = 0;
    let supportedCatalogIdentityRepairNeeded = 0;
    let supportedBusinessMetadataRepairNeeded = 0;
    let supportedPriceBackfillNeeded = 0;
    let priceBackfillNeeded = 0;
    let missingOrInadequatePriceHistory = 0;

    for (const stock of stocks) {
      const providerStatus = normalizeProviderStatus(stock.providerSupportStatus);
      const supported = providerStatus === 'SUPPORTED';
      if (providerStatus === 'UNKNOWN') providerUnknown += 1;
      if (providerStatus === 'VALIDATION_FAILED') providerRetryValidationNeeded += 1;

      const identityGap = !stock.providerSymbol || !stock.exchange || !stock.sourceSymbol || !stock.displaySymbol || !stock.catalogSource || !stock.isin || !stock.ipoDate;
      const businessGap = !this.host.hasValidMetadataValue(stock.sector) || !this.host.hasValidMetadataValue(stock.industry) || !this.host.hasValidMarketCap(stock.marketCap);
      const priceBars = this.host.priceBarsForSymbol(priceStatsBySymbol, stock.symbol);
      const priceGap = priceBars <= 0;
      if (identityGap && supported) supportedCatalogIdentityRepairNeeded += 1;
      if (businessGap && supported) supportedBusinessMetadataRepairNeeded += 1;
      if (priceGap) priceBackfillNeeded += 1;
      if (priceGap && supported) supportedPriceBackfillNeeded += 1;
      if (priceBars > 0 && priceBars < STANDARD_REVIEW_MIN_BARS) missingOrInadequatePriceHistory += 1;
    }

    const catalogIdentityRepairNeeded = stocks.filter((stock) =>
      !stock.providerSymbol || !stock.exchange || !stock.sourceSymbol || !stock.displaySymbol || !stock.catalogSource || !stock.isin || !stock.ipoDate
    ).length;
    const businessMetadataRepairNeeded = stocks.filter((stock) =>
      !this.host.hasValidMetadataValue(stock.sector) || !this.host.hasValidMetadataValue(stock.industry) || !this.host.hasValidMarketCap(stock.marketCap)
    ).length;

    return {
      activeStocks: stocks.length,
      providerUnknown,
      providerRetryValidationNeeded,
      providerValidationNeeded: providerUnknown + providerRetryValidationNeeded,
      missingProviderSymbol: affected('providerSymbol'),
      missingSourceSymbol: affected('sourceSymbol'),
      missingDisplaySymbol: affected('displaySymbol'),
      missingExchange: affected('exchange'),
      missingCurrency: affected('currency'),
      missingIsin: affected('isin'),
      missingListingDate: affected('ipoDate'),
      missingSector: affected('sector'),
      missingIndustry: affected('industry'),
      missingMarketCap: affected('marketCap'),
      missingLatestPrice: priceBackfillNeeded,
      missingOrInadequatePriceHistory,
      catalogIdentityRepairNeeded,
      supportedCatalogIdentityRepairNeeded,
      businessMetadataRepairNeeded,
      businessMetadataAutoRepairable: supportedBusinessMetadataRepairNeeded,
      manualBusinessMetadataRequired: businessMetadataRepairNeeded,
      priceBackfillNeeded,
      supportedPriceBackfillNeeded,
      identityMismatches: identityMismatchRows,
    };
  }

  stockMissingDataActionCounts(counts: StockMissingDataDiagnosticsCountMap): StockMissingDataDiagnosticsActionCounts {
    return {
      providerValidationNeeded: counts.providerValidationNeeded,
      catalogIdentityRepairNeeded: counts.supportedCatalogIdentityRepairNeeded || counts.catalogIdentityRepairNeeded,
      providerBusinessMetadataRepairNeeded: counts.businessMetadataAutoRepairable,
      manualMetadataImportNeeded: counts.manualBusinessMetadataRequired,
      priceBackfillNeeded: counts.supportedPriceBackfillNeeded || counts.priceBackfillNeeded,
    };
  }

  stockIdentityMismatchWarnings(
    diagnostics: StockIdentityMismatchDiagnostic[],
    sampleLimit: number
  ): StockIdentityMismatchWarning[] {
    const warnings: StockIdentityMismatchWarning[] = [];
    for (const diagnostic of diagnostics) {
      for (const sample of diagnostic.samples) {
        if (warnings.length >= sampleLimit) return warnings;
        warnings.push({
          symbol: sample.symbol,
          issue: diagnostic.label,
          severity: diagnostic.code === 'PRICE_ROWS_UNDER_ALTERNATE_SYMBOL' || diagnostic.code === 'SUPPORTED_WITHOUT_CANONICAL_PRICES' ? 'critical' : 'warning',
          providerSymbol: sample.providerSymbol ?? null,
          expectedProviderSymbol: diagnostic.code.includes('PROVIDER') ? sample.expected ?? null : null,
          sourceSymbol: sample.sourceSymbol ?? null,
          expectedSourceSymbol: diagnostic.code.includes('SOURCE') ? sample.expected ?? null : null,
          displaySymbol: sample.displaySymbol ?? null,
          expectedDisplaySymbol: diagnostic.code.includes('DISPLAY') ? sample.expected ?? null : null,
          exchange: sample.exchange ?? null,
          expectedExchange: null,
          alternateSymbol: sample.alternateSymbol ?? null,
          alternatePriceHistoryBars: sample.alternatePriceHistoryBars,
          priceHistoryBars: sample.priceHistoryBars,
        });
      }
    }
    return warnings;
  }
}
