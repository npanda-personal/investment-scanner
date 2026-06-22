/**
 * Market Data Foundation — CENTRAL EXTERNAL ENDPOINT REGISTRY
 * ===========================================================
 *
 * Single source of truth for every external data-source host/URL the module
 * talks to, keyed by region and resolved at runtime with an env override +
 * documented default + provenance tag.
 *
 * WHY THIS EXISTS
 * ---------------
 * Before this module, external URLs were scattered as literals across ~10
 * files (exchange adapters, NSE/BSE/US catalog sources, XBRL exporter, the
 * service god-file, ...). Half were env-overridable (`catalog-sources.ts`,
 * Yahoo/SEC/crypto providers) and half were frozen string literals. There was
 * no single place that answered "what are region IN's endpoints?".
 *
 * This registry consolidates them so that:
 *   - every base host is overridable via a documented env var (12-factor),
 *   - the default is co-located with the override and carries provenance,
 *   - region selection injects the right source set at runtime
 *     (see `getRegionDataSources`), mirroring the existing
 *     `resolveEodProvider(region)` pattern in the provider-registry,
 *   - new regions/sources are added in ONE file, not hunted across the tree.
 *
 * DESIGN
 * ------
 * We expose env-overridable *base hosts* (trailing slash normalised) plus
 * thin path builders that compose full resource URLs from those bases. Callers
 * keep their date/file-name logic and only borrow the configurable base, so
 * the runtime URLs are byte-for-byte identical to the previous literals unless
 * an env override is set. No paid providers are ever wired here.
 */

import type { MarketRegion } from '../../../shared/utils/market-scope';

export type MarketDataEndpointSource = 'ENV' | 'DEFAULT';

/** A resolved base host with provenance for diagnostics/health endpoints. */
export interface ResolvedEndpoint {
  /** The effective base URL (trailing slashes stripped). */
  readonly url: string;
  /** Whether the value came from an env override or the built-in default. */
  readonly source: MarketDataEndpointSource;
  /** The env var that overrides this value (for docs/diagnostics). */
  readonly envVar: string;
  /** The built-in default (for diagnostics — what you'd get with no override). */
  readonly defaultUrl: string;
}

const stripTrailingSlashes = (value: string): string => value.replace(/\/+$/, '');

/**
 * Resolve a base host from an env override or a built-in default, normalising
 * trailing slashes and recording provenance. Empty/whitespace env values fall
 * back to the default (same semantics as the catalog-sources `sourceUrl`).
 */
const resolveBase = (envVar: string, defaultUrl: string): ResolvedEndpoint => {
  const raw = process.env[envVar];
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  const normalizedDefault = stripTrailingSlashes(defaultUrl);
  if (trimmed) {
    return {
      url: stripTrailingSlashes(trimmed),
      source: 'ENV',
      envVar,
      defaultUrl: normalizedDefault,
    };
  }
  return { url: normalizedDefault, source: 'DEFAULT', envVar, defaultUrl: normalizedDefault };
};

// ---------------------------------------------------------------------------
// IN — NSE / BSE
// ---------------------------------------------------------------------------

export interface NseEndpoints {
  /** www.nseindia.com — public APIs (holidays, index history, corp actions, XBRL pages). */
  readonly wwwBase: ResolvedEndpoint;
  /** nsearchives.nseindia.com — newer archives host (CM udiff, ETF list, XBRL archive). */
  readonly archivesBase: ResolvedEndpoint;
  /** archives.nseindia.com — legacy archives host (security bhavdata, index close-all). */
  readonly legacyArchivesBase: ResolvedEndpoint;
}

export const getNseEndpoints = (): NseEndpoints => ({
  wwwBase: resolveBase('MARKET_DATA_NSE_WWW_BASE', 'https://www.nseindia.com'),
  archivesBase: resolveBase('MARKET_DATA_NSE_ARCHIVES_BASE', 'https://nsearchives.nseindia.com'),
  legacyArchivesBase: resolveBase('MARKET_DATA_NSE_LEGACY_ARCHIVES_BASE', 'https://archives.nseindia.com'),
});

export interface BseEndpoints {
  /** m.bseindia.com — mobile index-watch page used for the BSE index catalog. */
  readonly mobileBase: ResolvedEndpoint;
}

export const getBseEndpoints = (): BseEndpoints => ({
  mobileBase: resolveBase('MARKET_DATA_BSE_MOBILE_BASE', 'https://m.bseindia.com'),
});

// --- NSE path builders (compose full URLs from the configurable base) -------

/** NSE official CM trading-holiday calendar (JSON) for a calendar year. */
export const nseHolidayMasterUrl = (year: number): string =>
  `${getNseEndpoints().wwwBase.url}/api/holiday-master?type=trading&year=${year}`;

/** NSE indicesHistory API base (query string appended by the caller). */
export const nseIndexHistoryBaseUrl = (): string =>
  `${getNseEndpoints().wwwBase.url}/api/historical/indicesHistory`;

/** NSE corporate-actions API base (query string appended by the caller). */
export const nseCorporateActionsEndpoint = (): string =>
  `${getNseEndpoints().wwwBase.url}/api/corporates-corporateActions`;

/** NSE get-quotes equity page (used as a cookie-priming referer by the XBRL exporter). */
export const nseGetQuotesEquityUrl = (symbol: string): string =>
  `${getNseEndpoints().wwwBase.url}/get-quotes/equity?symbol=${encodeURIComponent(symbol.trim().toUpperCase())}`;

/** Referer used for NSE bot-protected JSON fetches. */
export const nseDefaultReferer = (): string =>
  `${getNseEndpoints().wwwBase.url}/resources/exchange-communication-holidays`;

/** Daily index close-all archive CSV on the legacy archives host. */
export const nseIndexCloseAllArchiveUrl = (fileName: string): string =>
  `${getNseEndpoints().legacyArchivesBase.url}/content/indices/${fileName}`;

/** NSE CM UDiFF bhavcopy ZIP on the newer archives host. */
export const nseUdiffCmBhavcopyArchiveUrl = (fileName: string): string =>
  `${getNseEndpoints().archivesBase.url}/content/cm/${fileName}`;

/** NSE full security bhavdata CSV on the legacy archives host. */
export const nseSecurityBhavdataArchiveUrl = (fileName: string): string =>
  `${getNseEndpoints().legacyArchivesBase.url}/products/content/${fileName}`;

/** NSE legacy CM bhavcopy ZIP (pre-UDiFF) under the historical EQUITIES tree. */
export const nseLegacyCmBhavcopyArchiveUrl = (yyyy: string | number, mmm: string, fileName: string): string =>
  `${getNseEndpoints().archivesBase.url}/content/historical/EQUITIES/${yyyy}/${mmm}/${fileName}`;

// ---------------------------------------------------------------------------
// US — NASDAQ Trader / Yahoo / SEC
// ---------------------------------------------------------------------------

export interface UsCatalogEndpoints {
  /** www.nasdaqtrader.com — NASDAQ Trader symbol directory host. */
  readonly nasdaqTraderBase: ResolvedEndpoint;
}

export const getUsCatalogEndpoints = (): UsCatalogEndpoints => ({
  nasdaqTraderBase: resolveBase('MARKET_DATA_NASDAQ_TRADER_BASE', 'https://www.nasdaqtrader.com'),
});

export const nasdaqListedUrl = (): string => {
  const override = process.env.MARKET_DATA_CATALOG_NASDAQ_LISTED_URL?.trim();
  return override || `${getUsCatalogEndpoints().nasdaqTraderBase.url}/dynamic/SymDir/nasdaqlisted.txt`;
};

export const nasdaqOtherUrl = (): string => {
  const override = process.env.MARKET_DATA_CATALOG_NASDAQ_OTHER_URL?.trim();
  return override || `${getUsCatalogEndpoints().nasdaqTraderBase.url}/dynamic/SymDir/otherlisted.txt`;
};

export interface YahooEndpoints {
  readonly chartBase: ResolvedEndpoint;
}

export const getYahooEndpoints = (): YahooEndpoints => ({
  chartBase: resolveBase('YAHOO_CHART_API_BASE', 'https://query1.finance.yahoo.com'),
});

export interface SecEndpoints {
  /** data.sec.gov — submissions + XBRL company-facts API. */
  readonly dataBase: ResolvedEndpoint;
  /** www.sec.gov — static files (company_tickers.json, EDGAR archives). */
  readonly wwwBase: ResolvedEndpoint;
}

export const getSecEndpoints = (): SecEndpoints => ({
  dataBase: resolveBase('SEC_EDGAR_BASE', 'https://data.sec.gov'),
  wwwBase: resolveBase('SEC_WWW_BASE', 'https://www.sec.gov'),
});

export interface FinraEndpoints {
  /**
   * cdn.finra.org — FINRA Reg SHO daily short-sale volume files
   * (CNMSshvol<YYYYMMDD>.txt). FREE, public; fetched with a browser-like
   * User-Agent. One pipe-delimited file per trading day, all US symbols.
   */
  readonly cdnBase: ResolvedEndpoint;
}

export const getFinraEndpoints = (): FinraEndpoints => ({
  cdnBase: resolveBase('FINRA_CDN_BASE', 'https://cdn.finra.org'),
});

/** Daily Reg SHO consolidated short-volume file URL for an ISO YYYY-MM-DD date. */
export const finraRegShoDailyUrl = (isoDate: string): string => {
  const compact = isoDate.replace(/-/g, ''); // YYYYMMDD
  return `${getFinraEndpoints().cdnBase.url}/equity/regsho/daily/CNMSshvol${compact}.txt`;
};

// ---------------------------------------------------------------------------
// GLOBAL — crypto providers
// ---------------------------------------------------------------------------

export interface CryptoEndpoints {
  readonly coingeckoBase: ResolvedEndpoint;
  readonly binanceBase: ResolvedEndpoint;
  readonly binanceFuturesBase: ResolvedEndpoint;
  readonly binanceFuturesDataBase: ResolvedEndpoint;
  readonly coinpaprikaBase: ResolvedEndpoint;
  readonly defillamaBase: ResolvedEndpoint;
  readonly fearGreedBase: ResolvedEndpoint;
}

export const getCryptoEndpoints = (): CryptoEndpoints => ({
  coingeckoBase: resolveBase('COINGECKO_API_BASE', 'https://api.coingecko.com/api/v3'),
  binanceBase: resolveBase('BINANCE_API_BASE', 'https://api.binance.com/api/v3'),
  // USDⓈ-M perpetual futures REST (funding rate + open interest). Keyless, free.
  binanceFuturesBase: resolveBase('BINANCE_FUTURES_API_BASE', 'https://fapi.binance.com/fapi/v1'),
  binanceFuturesDataBase: resolveBase('BINANCE_FUTURES_DATA_BASE', 'https://fapi.binance.com/futures/data'),
  coinpaprikaBase: resolveBase('COINPAPRIKA_API_BASE', 'https://api.coinpaprika.com/v1'),
  defillamaBase: resolveBase('DEFILLAMA_API_BASE', 'https://api.llama.fi'),
  // alternative.me Crypto Fear & Greed Index. Keyless, free.
  fearGreedBase: resolveBase('CRYPTO_FEARGREED_API_BASE', 'https://api.alternative.me'),
});

// ---------------------------------------------------------------------------
// Region-keyed resolver — "inject the right source set at runtime"
// ---------------------------------------------------------------------------

export interface RegionDataSources {
  readonly region: MarketRegion;
  readonly nse?: NseEndpoints;
  readonly bse?: BseEndpoints;
  readonly usCatalog?: UsCatalogEndpoints;
  readonly yahoo?: YahooEndpoints;
  readonly sec?: SecEndpoints;
  readonly finra?: FinraEndpoints;
  readonly crypto?: CryptoEndpoints;
}

/**
 * Resolve the external data-source endpoints that apply to a region. This is
 * the runtime-injection entry point: ingestion/scheduler code asks for a
 * region and gets exactly the source set wired for it.
 *
 *   - IN     → NSE + BSE (file/archive based)
 *   - US     → NASDAQ Trader catalog + Yahoo EOD + SEC fundamentals
 *   - EU     → Yahoo EOD (catalog/fundamentals roll out later)
 *   - GLOBAL → crypto providers
 */
export const getRegionDataSources = (region: MarketRegion): RegionDataSources => {
  switch (region) {
    case 'IN':
      return { region, nse: getNseEndpoints(), bse: getBseEndpoints() };
    case 'US':
      return {
        region,
        usCatalog: getUsCatalogEndpoints(),
        yahoo: getYahooEndpoints(),
        sec: getSecEndpoints(),
        finra: getFinraEndpoints(),
      };
    case 'EU':
      return { region, yahoo: getYahooEndpoints() };
    case 'GLOBAL':
      return { region, crypto: getCryptoEndpoints() };
    default:
      return { region };
  }
};

/**
 * Flat provenance snapshot of every resolved base — handy for a diagnostics/
 * health endpoint so operators can see which sources are overridden.
 */
export const describeMarketDataEndpoints = (): Record<string, ResolvedEndpoint> => {
  const nse = getNseEndpoints();
  const bse = getBseEndpoints();
  const us = getUsCatalogEndpoints();
  const yahoo = getYahooEndpoints();
  const sec = getSecEndpoints();
  const finra = getFinraEndpoints();
  const crypto = getCryptoEndpoints();
  return {
    nseWww: nse.wwwBase,
    nseArchives: nse.archivesBase,
    nseLegacyArchives: nse.legacyArchivesBase,
    bseMobile: bse.mobileBase,
    nasdaqTrader: us.nasdaqTraderBase,
    yahooChart: yahoo.chartBase,
    secData: sec.dataBase,
    secWww: sec.wwwBase,
    finraCdn: finra.cdnBase,
    coingecko: crypto.coingeckoBase,
    binance: crypto.binanceBase,
    coinpaprika: crypto.coinpaprikaBase,
    defillama: crypto.defillamaBase,
  };
};
