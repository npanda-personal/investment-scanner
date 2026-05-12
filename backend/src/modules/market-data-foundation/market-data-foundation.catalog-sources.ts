import path from 'path';
import type { CatalogSource } from './market-data-foundation.types';

export type CatalogImportMode = 'MANUAL_CSV' | 'CONFIGURED_URL' | 'INTERNAL_SEED';
export type CatalogUrlSource = 'DEFAULT' | 'ENV' | 'NONE' | 'INTERNAL_SEED';

export interface CatalogSourceConfig {
  catalogSource: CatalogSource;
  displayName: string;
  url?: string;
  urlSource: CatalogUrlSource;
  enabled: boolean;
  region: string;
  assetType?: string;
  segmentClass?: string;
  fileType: 'CSV' | 'JSON' | 'HTML';
  parserType: string;
  expectedColumnGroups?: string[][];
  providerSymbolSuffix?: string;
  exchange?: string;
  country?: string;
  currency?: string;
  maxDownloadBytes: number;
  timeoutMs: number;
  setupHint?: string;
  supportsManualCsv: boolean;
  supportsConfiguredUrl: boolean;
  supportsInternalSeed: boolean;
}

export interface CatalogDownloadConfig {
  tempDir: string;
  keepTempFiles: boolean;
  defaultMaxDownloadBytes: number;
  defaultTimeoutMs: number;
}

const readPositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const readBoolean = (value: string | undefined, fallback = false) => {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
};

export const getCatalogDownloadConfig = (): CatalogDownloadConfig => {
  const defaultTimeoutMs = readPositiveInt(process.env.MARKET_DATA_CATALOG_DOWNLOAD_TIMEOUT_MS, 15_000);
  const defaultMaxDownloadBytes = readPositiveInt(process.env.MARKET_DATA_CATALOG_MAX_DOWNLOAD_MB, 10) * 1024 * 1024;
  return {
    tempDir: process.env.MARKET_DATA_CATALOG_TEMP_DIR || path.join(process.cwd(), 'tmp', 'catalog-imports'),
    keepTempFiles: readBoolean(process.env.MARKET_DATA_CATALOG_KEEP_TEMP_FILES, false),
    defaultMaxDownloadBytes,
    defaultTimeoutMs,
  };
};

export const getCatalogSourceConfigs = (): CatalogSourceConfig[] => {
  const download = getCatalogDownloadConfig();
  const sourceUrl = (envValue: string | undefined, defaultUrl?: string): { url?: string; urlSource: CatalogUrlSource } => {
    if (envValue?.trim()) return { url: envValue.trim(), urlSource: 'ENV' };
    if (defaultUrl) return { url: defaultUrl, urlSource: 'DEFAULT' };
    return { urlSource: 'NONE' };
  };
  const nseEquity = sourceUrl(process.env.MARKET_DATA_CATALOG_NSE_EQUITY_URL, 'https://archives.nseindia.com/content/equities/EQUITY_L.csv');
  const nseEtf = sourceUrl(process.env.MARKET_DATA_CATALOG_NSE_ETF_URL, 'https://nsearchives.nseindia.com/content/equities/eq_etfseclist.csv');
  const nseIndices = sourceUrl(process.env.MARKET_DATA_CATALOG_NSE_INDICES_URL, 'https://www.nseindia.com/api/allIndices');
  const bseIndices = sourceUrl(process.env.MARKET_DATA_CATALOG_BSE_INDICES_URL, 'https://m.bseindia.com/IndicesView_New.aspx');
  const nseFo = sourceUrl(process.env.MARKET_DATA_CATALOG_NSE_FO_UNDERLYINGS_URL);
  const bseEquity = sourceUrl(process.env.MARKET_DATA_CATALOG_BSE_EQUITY_URL);
  const broker = sourceUrl(process.env.MARKET_DATA_CATALOG_BROKER_SCRIP_MASTER_URL);
  return [
    {
      catalogSource: 'NSE_EQUITY_SECURITIES',
      displayName: 'NSE Equity Securities',
      url: nseEquity.url,
      urlSource: nseEquity.urlSource,
      enabled: true,
      region: 'IN',
      assetType: 'STOCK',
      segmentClass: 'CASH',
      fileType: 'CSV',
      parserType: 'NSE_EQUITY_SECURITIES',
      expectedColumnGroups: [['SYMBOL', 'SM_SYMBOL', 'TRADING SYMBOL', 'TRADINGSYMBOL'], ['NAME OF COMPANY', 'NAME', 'COMPANY NAME', 'SECURITY NAME', 'SM_NAME']],
      providerSymbolSuffix: '.NS',
      exchange: 'NSE',
      country: 'India',
      currency: 'INR',
      maxDownloadBytes: download.defaultMaxDownloadBytes,
      timeoutMs: download.defaultTimeoutMs,
      setupHint: 'Uses the built-in public NSE listed-equity security master by default. Override with MARKET_DATA_CATALOG_NSE_EQUITY_URL if needed.',
      supportsManualCsv: true,
      supportsConfiguredUrl: true,
      supportsInternalSeed: false,
    },
    {
      catalogSource: 'NSE_ETF_SECURITIES',
      displayName: 'NSE ETF Securities',
      url: nseEtf.url,
      urlSource: nseEtf.urlSource,
      enabled: true,
      region: 'IN',
      assetType: 'ETF',
      segmentClass: 'ETF',
      fileType: 'CSV',
      parserType: 'NSE_ETF_SECURITIES',
      expectedColumnGroups: [
        ['SYMBOL', 'SM_SYMBOL', 'TRADING SYMBOL', 'TRADINGSYMBOL'],
        ['NAME OF COMPANY', 'NAME', 'COMPANY NAME', 'SECURITY NAME', 'SECURITYNAME', 'SM_NAME', 'NAME OF ETF', 'NAME OF THE ETF', 'ETF NAME', 'SCHEME NAME'],
      ],
      providerSymbolSuffix: '.NS',
      exchange: 'NSE',
      country: 'India',
      currency: 'INR',
      maxDownloadBytes: download.defaultMaxDownloadBytes,
      timeoutMs: download.defaultTimeoutMs,
      setupHint: 'Uses the built-in public NSE ETF security list by default. Override with MARKET_DATA_CATALOG_NSE_ETF_URL if needed.',
      supportsManualCsv: true,
      supportsConfiguredUrl: true,
      supportsInternalSeed: false,
    },
    {
      catalogSource: 'NSE_INDEX_SECURITIES',
      displayName: 'NSE Indices',
      url: nseIndices.url,
      urlSource: nseIndices.urlSource,
      enabled: true,
      region: 'IN',
      assetType: 'INDEX',
      segmentClass: 'INDEX',
      fileType: 'JSON',
      parserType: 'NSE_ALL_INDICES_JSON',
      exchange: 'NSE_INDEX',
      country: 'India',
      currency: 'INR',
      maxDownloadBytes: download.defaultMaxDownloadBytes,
      timeoutMs: download.defaultTimeoutMs,
      setupHint: 'Uses the built-in public NSE all-indices JSON endpoint by default. Override with MARKET_DATA_CATALOG_NSE_INDICES_URL if needed.',
      supportsManualCsv: false,
      supportsConfiguredUrl: true,
      supportsInternalSeed: false,
    },
    {
      catalogSource: 'BSE_INDEX_SECURITIES',
      displayName: 'BSE Indices',
      url: bseIndices.url,
      urlSource: bseIndices.urlSource,
      enabled: true,
      region: 'IN',
      assetType: 'INDEX',
      segmentClass: 'INDEX',
      fileType: 'HTML',
      parserType: 'BSE_INDICES_HTML',
      exchange: 'BSE_INDEX',
      country: 'India',
      currency: 'INR',
      maxDownloadBytes: download.defaultMaxDownloadBytes,
      timeoutMs: download.defaultTimeoutMs,
      setupHint: 'Uses the built-in public BSE mobile index-watch page by default. Override with MARKET_DATA_CATALOG_BSE_INDICES_URL if needed.',
      supportsManualCsv: false,
      supportsConfiguredUrl: true,
      supportsInternalSeed: false,
    },
    {
      catalogSource: 'NSE_INDEX_SEED',
      displayName: 'NSE/BSE Index Seed',
      urlSource: 'INTERNAL_SEED',
      enabled: true,
      region: 'IN',
      assetType: 'INDEX',
      segmentClass: 'INDEX',
      fileType: 'CSV',
      parserType: 'NSE_INDEX_SEED',
      exchange: 'NSE_INDEX',
      country: 'India',
      currency: 'INR',
      maxDownloadBytes: download.defaultMaxDownloadBytes,
      timeoutMs: download.defaultTimeoutMs,
      setupHint: 'Uses a small built-in fallback seed list: NIFTY 50, NIFTY BANK, and SENSEX. For broader catalogs, import NSE Indices and BSE Indices.',
      supportsManualCsv: false,
      supportsConfiguredUrl: false,
      supportsInternalSeed: true,
    },
    {
      catalogSource: 'NSE_EQUITY_DERIVATIVES_UNDERLYINGS',
      displayName: 'NSE F&O Underlyings',
      url: nseFo.url,
      urlSource: nseFo.urlSource,
      enabled: true,
      region: 'IN',
      segmentClass: 'CASH',
      fileType: 'CSV',
      parserType: 'NSE_EQUITY_DERIVATIVES_UNDERLYINGS',
      expectedColumnGroups: [['SYMBOL', 'UNDERLYING', 'UNDERLYING SYMBOL', 'NAME', 'UNDERLYING_NAME']],
      exchange: 'NSE',
      country: 'India',
      currency: 'INR',
      maxDownloadBytes: download.defaultMaxDownloadBytes,
      timeoutMs: download.defaultTimeoutMs,
      setupHint: 'No stable default CSV URL is configured. Set MARKET_DATA_CATALOG_NSE_FO_UNDERLYINGS_URL or use Manual CSV. Underlyings mark derivatives eligibility only; they do not create futures contracts.',
      supportsManualCsv: true,
      supportsConfiguredUrl: nseFo.urlSource !== 'NONE',
      supportsInternalSeed: false,
    },
    {
      catalogSource: 'BSE_EQUITY_SECURITIES',
      displayName: 'BSE Equity Securities',
      url: bseEquity.url,
      urlSource: bseEquity.urlSource,
      enabled: true,
      region: 'IN',
      assetType: 'STOCK',
      segmentClass: 'CASH',
      fileType: 'CSV',
      parserType: 'BSE_EQUITY_SECURITIES',
      providerSymbolSuffix: '.BO',
      exchange: 'BSE',
      country: 'India',
      currency: 'INR',
      maxDownloadBytes: download.defaultMaxDownloadBytes,
      timeoutMs: download.defaultTimeoutMs,
      setupHint: 'No stable default BSE CSV URL is configured. Set MARKET_DATA_CATALOG_BSE_EQUITY_URL or use Manual CSV.',
      supportsManualCsv: true,
      supportsConfiguredUrl: bseEquity.urlSource !== 'NONE',
      supportsInternalSeed: false,
    },
    {
      catalogSource: 'BROKER_SCRIP_MASTER',
      displayName: 'Broker/Public Scrip Master',
      url: broker.url,
      urlSource: broker.urlSource,
      enabled: false,
      region: 'IN',
      fileType: 'CSV',
      parserType: 'BROKER_SCRIP_MASTER',
      maxDownloadBytes: download.defaultMaxDownloadBytes,
      timeoutMs: download.defaultTimeoutMs,
      setupHint: 'Disabled by default. If enabled later, use only vetted public/broker scrip-master CSVs as fallback discovery sources.',
      supportsManualCsv: true,
      supportsConfiguredUrl: false,
      supportsInternalSeed: false,
    },
  ];
};

export const getCatalogSourceConfig = (catalogSource: string) =>
  getCatalogSourceConfigs().find((source) => source.catalogSource === catalogSource);
