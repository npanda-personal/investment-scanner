// Auto-extracted universe-readiness sibling (Phase 5b). Bodies are byte-identical to the
// pre-extraction inline implementation in market-data-foundation.service.ts, except that
// stays-on-service / cross-cluster collaborators are reached through the host
// (this.X -> this.host.X) and the snapshot-cache field (substrate only) now lives on this class.
// The service constructs this once and keeps byte-identical public delegators.

import type { MarketDataUniverseReadinessHost } from './market-data-foundation.universe-readiness-host';
import type {
  StockColumnMissingDataDiagnostic,
  StockMissingDataIssueKind,
  StockMissingDataSample,
} from '../market-data-foundation.types';
import type {
  StockMissingDataColumnConfig,
} from './market-data-foundation.universe-readiness.types';
import { normalizeProviderStatus } from '../ingestion/market-data-foundation.universe';

export class StockMissingDataColumnService {
  constructor(private readonly host: MarketDataUniverseReadinessHost) {}

  stockMissingDataColumnConfigs(scope: { region: string; assetType: string }): StockMissingDataColumnConfig[] {
    const isInStockScope = scope.region === 'IN' && scope.assetType === 'STOCK';
    const expectedNullDerivativeReason = 'Cash STOCK instruments should not carry derivative contract fields.';
    const derivativeExpectedNull = (stock: any) => isInStockScope && !this.host.isDerivativeLikeInstrument(stock);
    return [
      { column: 'id', label: 'Stock ID', nullable: false, value: (stock) => stock.id },
      { column: 'symbol', label: 'Canonical symbol', nullable: false, value: (stock) => stock.symbol },
      { column: 'name', label: 'Company name', nullable: false, value: (stock) => stock.name },
      {
        column: 'region',
        label: 'Region',
        nullable: false,
        value: (stock) => stock.region,
        expected: () => scope.region,
        invalid: (_stock, value) => String(value || '').trim().toUpperCase() !== scope.region ? `Expected scoped region ${scope.region}.` : null,
      },
      {
        column: 'exchange',
        label: 'Exchange',
        nullable: true,
        value: (stock) => stock.exchange,
        expected: () => scope.region === 'IN' ? 'NSE or BSE' : null,
        invalid: (_stock, value) => scope.region === 'IN' && !['NSE', 'BSE'].includes(String(value || '').trim().toUpperCase()) ? 'Expected NSE or BSE for IN scope.' : null,
      },
      {
        column: 'country',
        label: 'Country',
        nullable: true,
        value: (stock) => stock.country,
        expected: () => scope.region === 'IN' ? 'India' : null,
        invalid: (_stock, value) => scope.region === 'IN' && !['INDIA', 'IN'].includes(String(value || '').trim().toUpperCase()) ? 'Expected India for IN scope.' : null,
      },
      { column: 'sector', label: 'Sector', nullable: true, value: (stock) => stock.sector },
      { column: 'industry', label: 'Industry', nullable: true, value: (stock) => stock.industry },
      {
        column: 'currency',
        label: 'Currency',
        nullable: true,
        value: (stock) => stock.currency,
        expected: () => scope.region === 'IN' ? 'INR' : null,
        invalid: (_stock, value) => scope.region === 'IN' && String(value || '').trim().toUpperCase() !== 'INR' ? 'Expected INR for IN scope.' : null,
      },
      {
        column: 'marketCap',
        label: 'Market cap',
        nullable: true,
        value: (stock) => stock.marketCap,
        invalid: (_stock, value) => !this.host.hasValidMarketCap(value) ? 'Expected a positive numeric market cap.' : null,
      },
      {
        column: 'assetType',
        label: 'Asset type',
        nullable: true,
        value: (stock) => stock.assetType,
        expected: () => scope.assetType,
        invalid: (_stock, value) => this.host.normalizeInstrumentAssetType(String(value || ''), '', '').toUpperCase() !== scope.assetType ? `Expected scoped asset type ${scope.assetType}.` : null,
      },
      {
        column: 'instrumentSegment',
        label: 'Instrument segment',
        nullable: true,
        value: (stock) => stock.instrumentSegment,
        expected: () => isInStockScope ? 'CASH' : null,
        invalid: (_stock, value) => isInStockScope && String(value || '').trim().toUpperCase() !== 'CASH' ? 'Expected CASH segment for IN/STOCK scope.' : null,
      },
      { column: 'displaySymbol', label: 'Display symbol', nullable: true, value: (stock) => stock.displaySymbol },
      {
        column: 'providerSymbol',
        label: 'Provider symbol',
        nullable: true,
        value: (stock) => stock.providerSymbol,
        expected: (stock) => this.host.expectedProviderSuffixForStock(stock) ? `suffix ${this.host.expectedProviderSuffixForStock(stock)}` : null,
        invalid: (stock, value) => {
          const suffix = this.host.expectedProviderSuffixForStock(stock);
          return suffix && !String(value || '').trim().toUpperCase().endsWith(suffix) ? `Provider symbol should end with ${suffix}.` : null;
        },
      },
      { column: 'sourceSymbol', label: 'Source symbol', nullable: true, value: (stock) => stock.sourceSymbol },
      { column: 'catalogSource', label: 'Catalog source', nullable: true, value: (stock) => stock.catalogSource },
      {
        column: 'providerSupportStatus',
        label: 'Provider support status',
        nullable: true,
        value: (stock) => stock.providerSupportStatus,
        invalid: (_stock, value) => ['SUPPORTED', 'UNSUPPORTED', 'UNKNOWN', 'VALIDATION_FAILED'].includes(String(value || '').trim().toUpperCase()) ? null : 'Expected SUPPORTED, UNSUPPORTED, UNKNOWN, or VALIDATION_FAILED.',
      },
      {
        column: 'providerError',
        label: 'Provider error',
        nullable: true,
        value: (stock) => stock.providerError,
        expectedNull: (stock) => !['VALIDATION_FAILED', 'UNSUPPORTED'].includes(normalizeProviderStatus(stock.providerSupportStatus)),
        expectedNullReason: 'Provider error is expected to be null unless provider validation failed or classified the symbol as unsupported.',
      },
      { column: 'derivativesEligible', label: 'Derivatives eligible', nullable: false, value: (stock) => stock.derivativesEligible },
      {
        column: 'underlyingSymbol',
        label: 'Underlying symbol',
        nullable: true,
        value: (stock) => stock.underlyingSymbol,
        expectedNull: derivativeExpectedNull,
        expectedNullReason: expectedNullDerivativeReason,
      },
      {
        column: 'expiryDate',
        label: 'Expiry date',
        nullable: true,
        value: (stock) => stock.expiryDate,
        expectedNull: derivativeExpectedNull,
        expectedNullReason: expectedNullDerivativeReason,
      },
      {
        column: 'contractMonth',
        label: 'Contract month',
        nullable: true,
        value: (stock) => stock.contractMonth,
        expectedNull: derivativeExpectedNull,
        expectedNullReason: expectedNullDerivativeReason,
      },
      {
        column: 'lotSize',
        label: 'Lot size',
        nullable: true,
        value: (stock) => stock.lotSize,
        expectedNull: derivativeExpectedNull,
        expectedNullReason: expectedNullDerivativeReason,
        invalid: (stock, value) => this.host.isDerivativeLikeInstrument(stock) && Number(value) <= 0 ? 'Derivative-like instruments require a positive lot size.' : null,
      },
      {
        column: 'contractStatus',
        label: 'Contract status',
        nullable: true,
        value: (stock) => stock.contractStatus,
        expectedNull: derivativeExpectedNull,
        expectedNullReason: expectedNullDerivativeReason,
      },
      {
        column: 'isDelisted',
        label: 'Delisted flag',
        nullable: false,
        value: (stock) => stock.isDelisted,
        invalid: (_stock, value) => value === true ? 'Active diagnostics exclude delisted stocks; active scoped rows should be false.' : null,
      },
      {
        column: 'ipoDate',
        label: 'Listing date',
        nullable: true,
        value: (stock) => stock.ipoDate,
        invalid: (_stock, value) => value instanceof Date && value.getTime() > Date.now() ? 'Listing date is in the future.' : null,
      },
      {
        column: 'isin',
        label: 'ISIN',
        nullable: true,
        value: (stock) => stock.isin,
        invalid: (_stock, value) => scope.region === 'IN' && !/^IN[A-Z0-9]{10}$/i.test(String(value || '').trim()) ? 'Expected a 12-character Indian ISIN beginning with IN.' : null,
      },
      { column: 'source', label: 'Source', nullable: false, value: (stock) => stock.source },
      {
        column: 'dataStatus',
        label: 'Data status',
        nullable: false,
        value: (stock) => stock.dataStatus,
        invalid: (_stock, value) => ['COMPLETE', 'PARTIAL', 'DELAYED', 'MISSING', 'ERROR'].includes(String(value || '').trim().toUpperCase()) ? null : 'Expected COMPLETE, PARTIAL, DELAYED, MISSING, or ERROR.',
      },
      {
        column: 'lastSuccessfulDataLoadTimestamp',
        label: 'Last successful data load timestamp',
        nullable: true,
        value: (stock) => stock.lastSuccessfulDataLoadTimestamp,
        invalid: (stock, value, priceStatsBySymbol) => {
          const bars = this.host.priceBarsForSymbol(priceStatsBySymbol, stock.symbol);
          if (value && bars === 0) {
            const providerBars = this.host.priceBarsForSymbol(priceStatsBySymbol, stock.providerSymbol);
            return providerBars > 0
              ? 'Data load timestamp exists, but price rows are stored under provider symbol instead of Stock.symbol.'
              : 'Data load timestamp exists, but no canonical price rows were found.';
          }
          return bars > 0 && !value ? 'Price rows exist but last successful data load timestamp is missing.' : null;
        },
      },
    ];
  }

  stockColumnMissingDataDiagnostic(
    config: StockMissingDataColumnConfig,
    stocks: any[],
    priceStatsBySymbol: Map<string, any>,
    sampleLimit: number
  ): StockColumnMissingDataDiagnostic {
    const diagnostic: StockColumnMissingDataDiagnostic = {
      column: config.column,
      label: config.label,
      nullable: config.nullable,
      expectedNull: false,
      expectedNullReason: config.expectedNullReason,
      totalRows: stocks.length,
      nullCount: 0,
      blankCount: 0,
      nullEquivalentCount: 0,
      invalidCount: 0,
      expectedNullCount: 0,
      unexpectedNonNullCount: 0,
      affectedCount: 0,
      samples: [],
    };

    for (const stock of stocks) {
      const value = config.value(stock);
      const expectedNull = Boolean(config.expectedNull?.(stock));
      if (expectedNull) diagnostic.expectedNull = true;
      const expected = expectedNull ? 'null' : config.expected?.(stock) ?? null;
      const addSample = (issue: StockMissingDataIssueKind, reason: string) => {
        if (diagnostic.samples.length >= sampleLimit) return;
        diagnostic.samples.push(this.stockMissingDataSample(stock, {
          column: config.column,
          issue,
          value,
          expected,
          reason,
        }));
      };

      if (value === null || value === undefined) {
        diagnostic.nullCount += 1;
        if (expectedNull) {
          diagnostic.expectedNullCount += 1;
        } else {
          diagnostic.affectedCount += 1;
          addSample('NULL', `${config.label} is null.`);
        }
        continue;
      }

      if (typeof value === 'string' && value.trim().length === 0) {
        diagnostic.blankCount += 1;
        diagnostic.affectedCount += 1;
        if (expectedNull) diagnostic.unexpectedNonNullCount += 1;
        addSample(expectedNull ? 'UNEXPECTED_NON_NULL' : 'BLANK', expectedNull ? `${config.label} should be null, not blank.` : `${config.label} is blank.`);
        continue;
      }

      if (this.isNullEquivalentValue(value)) {
        diagnostic.nullEquivalentCount += 1;
        diagnostic.affectedCount += 1;
        if (expectedNull) diagnostic.unexpectedNonNullCount += 1;
        addSample(expectedNull ? 'UNEXPECTED_NON_NULL' : 'NULL_EQUIVALENT', expectedNull ? `${config.label} should be null, not a null-equivalent value.` : `${config.label} uses a null-equivalent value.`);
        continue;
      }

      if (expectedNull) {
        diagnostic.unexpectedNonNullCount += 1;
        diagnostic.affectedCount += 1;
        addSample('UNEXPECTED_NON_NULL', `${config.label} is expected to be null for this stock.`);
        continue;
      }

      const invalidReason = config.invalid?.(stock, value, priceStatsBySymbol);
      if (invalidReason) {
        diagnostic.invalidCount += 1;
        diagnostic.affectedCount += 1;
        addSample('INVALID', invalidReason);
      }
    }

    return diagnostic;
  }

  stockMissingDataSample(
    stock: any,
    details: {
      issue: StockMissingDataIssueKind;
      reason: string;
      column?: string;
      value?: unknown;
      expected?: string | null;
      priceHistoryBars?: number;
      alternateSymbol?: string | null;
      alternatePriceHistoryBars?: number;
    }
  ): StockMissingDataSample {
    return {
      id: String(stock.id || ''),
      symbol: String(stock.symbol || ''),
      name: stock.name ?? null,
      exchange: stock.exchange ?? null,
      providerSymbol: stock.providerSymbol ?? null,
      sourceSymbol: stock.sourceSymbol ?? null,
      displaySymbol: stock.displaySymbol ?? null,
      column: details.column,
      issue: details.issue,
      value: details.value === undefined ? undefined : this.formatDiagnosticValue(details.value),
      expected: details.expected ?? null,
      reason: details.reason,
      priceHistoryBars: details.priceHistoryBars,
      alternateSymbol: details.alternateSymbol,
      alternatePriceHistoryBars: details.alternatePriceHistoryBars,
    };
  }

  isNullEquivalentValue(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    return ['UNKNOWN', 'N/A', 'NA', 'NONE', 'NULL', '-', '--'].includes(value.trim().toUpperCase());
  }

  formatDiagnosticValue(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    if (value instanceof Date) return value.toISOString();
    return String(value);
  }
}
