// NSE/BSE-specific catalog row parsers (ingestion-extraction phase).
//
// These pure parsers were extracted out of MarketDataFoundationService into the india/ region
// folder because they are NSE/BSE-region-specific catalog-row mappers with NO instance state:
// every collaborator they used on the service (`this.readCsv`, `this.baseSymbolFromProviderSymbol`,
// `this.normalizeCatalogSymbol`, `this.cleanIndexName`, etc.) was already a thin byte-identical
// delegator to a PURE util/mapper free function. So they move as free functions importing those
// utils/mappers directly. Behaviour is byte-identical to the pre-extraction inline implementation.
//
// The catalog import/CRUD cluster (`catalogRowsForSource`, `catalogBackfillRow`,
// `legacyCatalogSourceForStock`) stays in the catalog ingestion cluster and calls these parsers.

import type { CreateStockRequest, CatalogSource } from '../../market-data-foundation.types';
import { readCsv, readObjectString } from '../../util/market-data-foundation.util.csv';
import { parseCatalogDate } from '../../util/market-data-foundation.util.dates';
import {
  cleanIndexName,
  isLikelyBseIndexName,
  providerSymbolForKnownIndianIndex,
  isDerivativesEligibleIndexName,
  slugForCatalogSymbol,
  decodeHtmlEntities,
} from '../../util/market-data-foundation.util.index-names';
import {
  hasValidMetadataValue,
  isKnownNseDerivativesEligibleStock,
} from '../../util/market-data-foundation.util.instrument-metadata';
import {
  baseSymbolFromProviderSymbol,
  providerSymbolForExchange,
  normalizeCatalogSymbol,
} from '../../analytics/market-data-foundation.instrument-mapper';

export function mapNseSecurityRow(row: Record<string, string>, source: string): CreateStockRequest | null {
  const exchange = source === 'BSE_EQUITY_SECURITIES' ? 'BSE' : 'NSE';
  const sourceSymbol = readCsv(row, [
    'SYMBOL',
    'SM_SYMBOL',
    'TRADING SYMBOL',
    'TRADINGSYMBOL',
    'SCRIP ID',
    'SCRIP_ID',
    'SCRIPID',
    'SECURITY ID',
    'SECURITY_ID',
    'SECURITYID',
  ]);
  const name = readCsv(row, [
    'NAME OF COMPANY',
    'NAME_OF_COMPANY',
    'NAME',
    'COMPANY NAME',
    'SECURITY NAME',
    'SECURITYNAME',
    'SCRIP NAME',
    'SCRIP_NAME',
    'SCRIPNAME',
    'ISSUER NAME',
    'ISSUER_NAME',
    'ISSUERNAME',
    'SM_NAME',
    'NAME OF ETF',
    'NAME OF THE ETF',
    'ETF NAME',
    'SCHEME NAME',
  ]);
  const isin = readCsv(row, ['ISIN', 'ISIN NUMBER', 'ISIN_NUMBER', 'ISINNUMBER']);
  const listingDate = readCsv(row, ['DATE OF LISTING', 'DATE_OF_LISTING', 'DATEOFLISTING']);
  const series = readCsv(row, ['SERIES', 'SM_SERIES', 'INSTRUMENT TYPE', 'INSTRUMENT']).toUpperCase();
  const sector = readCsv(row, ['SECTOR', 'SECTOR NAME', 'SECTOR_NAME', 'SECTORNAME']);
  const industry = readCsv(row, [
    'INDUSTRY',
    'INDUSTRY NAME',
    'INDUSTRY_NAME',
    'INDUSTRYNAME',
    'INDUSTRY NEW NAME',
    'INDUSTRY_NEW_NAME',
    'IGROUP NAME',
    'IGROUP_NAME',
    'ISUBGROUP NAME',
    'ISUBGROUP_NAME',
    'BASIC INDUSTRY',
    'BASIC_INDUSTRY',
  ]);
  if (!sourceSymbol || !name) return null;
  const sourceSymbolUpper = baseSymbolFromProviderSymbol(sourceSymbol);
  const normalized = normalizeCatalogSymbol({ sourceSymbol: sourceSymbolUpper, exchange }, source);
  const isEtf = source === 'NSE_ETF_SECURITIES' || series.includes('ETF') || /\bETF\b|BEES|NIFTY.*ETF/i.test(name);
  const isCashEquity = isEtf || !series || ['EQ', 'BE', 'BZ', 'SM', 'ST'].includes(series);
  if (!isCashEquity) return null;
  return {
    symbol: normalized.sourceSymbol,
    sourceSymbol: normalized.sourceSymbol,
    providerSymbol: normalized.providerSymbol,
    displaySymbol: normalized.displaySymbol,
    name: name.trim(),
    region: 'IN',
    exchange,
    country: 'India',
    currency: 'INR',
    assetType: isEtf ? 'ETF' : 'STOCK',
    instrumentSegment: isEtf ? 'ETF' : 'CASH',
    derivativesEligible: exchange === 'NSE' && isKnownNseDerivativesEligibleStock(normalized.sourceSymbol),
    catalogSource: isEtf && source !== 'BSE_EQUITY_SECURITIES' ? 'NSE_ETF_SECURITIES' : source,
    providerSupportStatus: 'UNKNOWN',
    isActive: true,
    sector: hasValidMetadataValue(sector) ? sector : null,
    industry: hasValidMetadataValue(industry) ? industry : null,
    isin: isin || null,
    ipoDate: parseCatalogDate(listingDate),
    source: source,
    dataStatus: 'PARTIAL',
  };
}

export function mapNseUnderlyingRow(row: Record<string, string>): CreateStockRequest | null {
  const raw = readCsv(row, ['SYMBOL', 'UNDERLYING', 'UNDERLYING SYMBOL', 'NAME', 'UNDERLYING_NAME']);
  if (!raw) return null;
  const sourceSymbol = baseSymbolFromProviderSymbol(raw).replace(/\s+/g, ' ');
  const isIndex = /NIFTY|SENSEX|BANKNIFTY|FINNIFTY|MIDCPNIFTY/.test(sourceSymbol);
  const indexSeed = indianIndexSeedRows().find((item) => item.sourceSymbol === sourceSymbol || item.displaySymbol === sourceSymbol);
  if (isIndex) {
    const symbol = indexSeed?.symbol || sourceSymbol.replace(/\s+/g, '');
    return {
      symbol,
      sourceSymbol,
      providerSymbol: indexSeed?.providerSymbol || symbol,
      displaySymbol: sourceSymbol,
      name: indexSeed?.name || sourceSymbol,
      region: 'IN',
      exchange: sourceSymbol.includes('SENSEX') ? 'BSE_INDEX' : 'NSE_INDEX',
      country: 'India',
      currency: 'INR',
      assetType: 'INDEX',
      instrumentSegment: 'INDEX',
      derivativesEligible: true,
      catalogSource: 'NSE_EQUITY_DERIVATIVES_UNDERLYINGS',
      providerSupportStatus: 'UNKNOWN',
      isActive: true,
      dataStatus: 'PARTIAL',
    };
  }
  return {
    symbol: sourceSymbol,
    sourceSymbol,
    providerSymbol: providerSymbolForExchange(sourceSymbol, 'NSE'),
    displaySymbol: sourceSymbol,
    name: sourceSymbol,
    region: 'IN',
    exchange: 'NSE',
    country: 'India',
    currency: 'INR',
    assetType: 'STOCK',
    instrumentSegment: 'CASH',
    derivativesEligible: true,
    catalogSource: 'NSE_EQUITY_DERIVATIVES_UNDERLYINGS',
    providerSupportStatus: 'UNKNOWN',
    isActive: true,
    dataStatus: 'PARTIAL',
  };
}

export function indianIndexSeedRows(): CreateStockRequest[] {
  return [
    { symbol: '^NSEI', sourceSymbol: 'NIFTY 50', providerSymbol: '^NSEI', displaySymbol: 'NIFTY 50', name: 'NIFTY 50', exchange: 'NSE_INDEX' },
    { symbol: '^NSEBANK', sourceSymbol: 'NIFTY BANK', providerSymbol: '^NSEBANK', displaySymbol: 'NIFTY BANK', name: 'NIFTY BANK', exchange: 'NSE_INDEX' },
    { symbol: '^BSESN', sourceSymbol: 'SENSEX', providerSymbol: '^BSESN', displaySymbol: 'SENSEX', name: 'SENSEX', exchange: 'BSE_INDEX' },
  ].map((item) => ({
    ...item,
    region: 'IN',
    country: 'India',
    currency: 'INR',
    assetType: 'INDEX',
    instrumentSegment: 'INDEX',
    derivativesEligible: item.symbol !== '^BSESN',
    catalogSource: 'NSE_INDEX_SEED',
    providerSupportStatus: 'UNKNOWN',
    isActive: true,
    dataStatus: 'PARTIAL',
  }));
}

export function parseNseIndicesJson(jsonText: string, warnings: string[]): CreateStockRequest[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new Error(`JSON format did not match expected NSE_INDEX_SECURITIES payload: ${error instanceof Error ? error.message : 'invalid JSON'}.`);
  }

  const arrays = collectObjectArrays(parsed);
  const records = arrays
    .filter((items) => items.some((item) => readObjectString(item, ['index', 'indexName', 'index_name', 'name', 'Index Name'])))
    .sort((a, b) => b.length - a.length)[0] || [];

  if (records.length === 0) {
    warnings.push('NSE_INDEX_SECURITIES: no index records found in JSON payload.');
    return [];
  }

  return uniqueIndexRows(records.map((record) => {
    const name = cleanIndexName(readObjectString(record, ['index', 'indexName', 'index_name', 'name', 'Index Name']));
    if (!name) return null;
    return mapIndexCatalogRow(name, 'NSE_INDEX_SECURITIES', 'NSE_INDEX');
  }));
}

export function parseBseIndicesHtml(htmlText: string, warnings: string[]): CreateStockRequest[] {
  const text = decodeHtmlEntities(htmlText)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, '\n');
  const candidates = text
    .split(/\r?\n/)
    .map((line) => cleanIndexName(line))
    .filter((line) => isLikelyBseIndexName(line));

  const rows = uniqueIndexRows(candidates.map((name) => mapIndexCatalogRow(name, 'BSE_INDEX_SECURITIES', 'BSE_INDEX')));
  if (rows.length === 0) warnings.push('BSE_INDEX_SECURITIES: no index names found in HTML payload.');
  return rows;
}

function collectObjectArrays(value: unknown): Array<Array<Record<string, unknown>>> {
  if (Array.isArray(value)) {
    const objectItems = value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item));
    const childArrays = value.flatMap((item) => collectObjectArrays(item));
    return objectItems.length > 0 ? [objectItems, ...childArrays] : childArrays;
  }
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).flatMap((item) => collectObjectArrays(item));
  }
  return [];
}

function mapIndexCatalogRow(name: string, catalogSource: CatalogSource, exchange: 'NSE_INDEX' | 'BSE_INDEX'): CreateStockRequest | null {
  const displayName = cleanIndexName(name);
  if (!displayName) return null;
  const upperName = displayName.toUpperCase();
  const providerSymbol = providerSymbolForKnownIndianIndex(upperName);
  const fallbackSymbol = `${exchange}_${slugForCatalogSymbol(upperName)}`;
  const symbol = providerSymbol || fallbackSymbol;
  return {
    symbol,
    sourceSymbol: upperName,
    providerSymbol: providerSymbol || null,
    displaySymbol: displayName,
    name: displayName,
    region: 'IN',
    exchange,
    country: 'India',
    currency: 'INR',
    assetType: 'INDEX',
    instrumentSegment: 'INDEX',
    derivativesEligible: isDerivativesEligibleIndexName(upperName),
    catalogSource,
    providerSupportStatus: 'UNKNOWN',
    isActive: true,
    source: catalogSource,
    dataStatus: 'PARTIAL',
  };
}

function uniqueIndexRows(rows: Array<CreateStockRequest | null>): CreateStockRequest[] {
  const seen = new Set<string>();
  const unique: CreateStockRequest[] = [];
  for (const row of rows) {
    if (!row) continue;
    const key = `${row.exchange}:${row.sourceSymbol || row.name}`.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
  }
  return unique;
}
