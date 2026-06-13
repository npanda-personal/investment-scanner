// Instrument metadata defaulting / normalization / validation leaf utilities extracted from
// MarketDataFoundationService. Free functions, no instance/repository state. Behavior is
// byte-identical to the prior private/public methods.
import { baseSymbolFromProviderSymbol } from '../analytics/market-data-foundation.instrument-mapper';
import { isKnownNseFnoStockUnderlying } from '../ingestion/india/market-data-foundation.fno-underlyings';
import type { CatalogSource, V1CreateInstrumentRequest } from '../market-data-foundation.types';

// Conservative built-in NSE F&O stock-underlying seed (moved verbatim from the service).
const KNOWN_NSE_FNO_STOCK_UNDERLYINGS = new Set([
  '360ONE',
  'ABB',
  'ABCAPITAL',
  'ABFRL',
  'ADANIENSOL',
  'ADANIENT',
  'ADANIGREEN',
  'ADANIPORTS',
  'ALKEM',
  'AMBER',
  'AMBUJACEM',
  'ANGELONE',
  'APLAPOLLO',
  'APOLLOHOSP',
  'ASHOKLEY',
  'ASIANPAINT',
  'ASTRAL',
  'ATGL',
  'AUBANK',
  'AUROPHARMA',
  'AXISBANK',
  'BAJAJ-AUTO',
  'BAJAJFINSV',
  'BAJFINANCE',
  'BALKRISIND',
  'BANDHANBNK',
  'BANKBARODA',
  'BANKINDIA',
  'BDL',
  'BEL',
  'BHARATFORG',
  'BHARTIARTL',
  'BHEL',
  'BIOCON',
  'BLUESTARCO',
  'BOSCHLTD',
  'BPCL',
  'BRITANNIA',
  'BSE',
  'CAMS',
  'CANBK',
  'CDSL',
  'CGPOWER',
  'CHAMBLFERT',
  'CHOLAFIN',
  'CIPLA',
  'COALINDIA',
  'COFORGE',
  'COLPAL',
  'CONCOR',
  'CROMPTON',
  'CUMMINSIND',
  'CYIENT',
  'DABUR',
  'DALBHARAT',
  'DELHIVERY',
  'DIVISLAB',
  'DIXON',
  'DLF',
  'DMART',
  'DRREDDY',
  'EICHERMOT',
  'ETERNAL',
  'EXIDEIND',
  'FEDERALBNK',
  'FORTIS',
  'GAIL',
  'GLENMARK',
  'GMRINFRA',
  'GODREJCP',
  'GODREJPROP',
  'GRANULES',
  'GRASIM',
  'HAL',
  'HAVELLS',
  'HCLTECH',
  'HDFCAMC',
  'HDFCBANK',
  'HDFCLIFE',
  'HEROMOTOCO',
  'HFCL',
  'HINDALCO',
  'HINDCOPPER',
  'HINDPETRO',
  'HINDUNILVR',
  'HINDZINC',
  'HUDCO',
  'ICICIBANK',
  'ICICIGI',
  'ICICIPRULI',
  'IDEA',
  'IDFCFIRSTB',
  'IEX',
  'IGL',
  'IIFL',
  'INDHOTEL',
  'INDIANB',
  'INDIGO',
  'INDUSINDBK',
  'INDUSTOWER',
  'INFY',
  'INOXWIND',
  'IOC',
  'IRB',
  'IRCTC',
  'IREDA',
  'IRFC',
  'ITC',
  'JINDALSTEL',
  'JIOFIN',
  'JSL',
  'JSWENERGY',
  'JSWSTEEL',
  'JUBLFOOD',
  'KALYANKJIL',
  'KAYNES',
  'KEI',
  'KFINTECH',
  'KOTAKBANK',
  'KPITTECH',
  'LAURUSLABS',
  'LICHSGFIN',
  'LICI',
  'LODHA',
  'LT',
  'LTF',
  'LTIM',
  'LUPIN',
  'M&M',
  'M&MFIN',
  'MANAPPURAM',
  'MANKIND',
  'MARICO',
  'MARUTI',
  'MAXHEALTH',
  'MAZDOCK',
  'MCX',
  'MFSL',
  'MOTHERSON',
  'MPHASIS',
  'MUTHOOTFIN',
  'NATIONALUM',
  'NAUKRI',
  'NBCC',
  'NCC',
  'NESTLEIND',
  'NHPC',
  'NMDC',
  'NTPC',
  'NYKAA',
  'OBEROIRLTY',
  'OFSS',
  'OIL',
  'ONGC',
  'PAGEIND',
  'PATANJALI',
  'PAYTM',
  'PERSISTENT',
  'PETRONET',
  'PFC',
  'PGEL',
  'PHOENIXLTD',
  'PIDILITIND',
  'PIIND',
  'PNB',
  'PNBHOUSING',
  'POLICYBZR',
  'POLYCAB',
  'POONAWALLA',
  'POWERGRID',
  'PRESTIGE',
  'RBLBANK',
  'RECLTD',
  'RELIANCE',
  'SAIL',
  'SBICARD',
  'SBILIFE',
  'SBIN',
  'SHREECEM',
  'SHRIRAMFIN',
  'SIEMENS',
  'SJVN',
  'SOLARINDS',
  'SONACOMS',
  'SRF',
  'SUNPHARMA',
  'SUPREMEIND',
  'SUZLON',
  'SYNGENE',
  'TATACHEM',
  'TATACOMM',
  'TATACONSUM',
  'TATAELXSI',
  'TATAMOTORS',
  'TATAPOWER',
  'TATASTEEL',
  'TATATECH',
  'TCS',
  'TECHM',
  'TIINDIA',
  'TITAGARH',
  'TITAN',
  'TORNTPHARM',
  'TORNTPOWER',
  'TRENT',
  'TVSMOTOR',
  'ULTRACEMCO',
  'UNIONBANK',
  'UNITDSPR',
  'UNOMINDA',
  'UPL',
  'VBL',
  'VEDL',
  'VOLTAS',
  'WIPRO',
  'YESBANK',
  'ZYDUSLIFE',
]);

export function isBlank(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === 'string' && value.trim().length === 0);
}

export function hasValidMetadataValue(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toUpperCase();
  return Boolean(normalized) && !['UNKNOWN', 'N/A', 'NA', 'NONE', 'NULL', '-', '--'].includes(normalized);
}

export function hasValidMarketCap(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0;
}

export function defaultCurrencyForRegion(region?: string | null): string {
  if (region === 'IN') return 'INR';
  if (region === 'UK') return 'GBP';
  if (region === 'EU') return 'EUR';
  if (region === 'CA') return 'CAD';
  return 'USD';
}

export function defaultCountryForRegion(region?: string | null): string | null {
  if (region === 'IN') return 'India';
  if (region === 'US') return 'United States';
  if (region === 'UK') return 'United Kingdom';
  return null;
}

export function defaultCountryForInstrument(symbol?: string | null, exchange?: string | null, region?: string | null): string | null {
  const normalizedExchange = exchange?.trim().toUpperCase();
  if (symbol?.endsWith('.NS') || symbol?.endsWith('.BO') || normalizedExchange === 'NSE' || normalizedExchange === 'BSE') return 'India';
  return defaultCountryForRegion(region);
}

export function defaultCurrencyForInstrument(symbol?: string | null, exchange?: string | null, region?: string | null): string {
  const normalizedExchange = exchange?.trim().toUpperCase();
  if (symbol?.endsWith('.NS') || symbol?.endsWith('.BO') || normalizedExchange === 'NSE' || normalizedExchange === 'BSE') return 'INR';
  return defaultCurrencyForRegion(region);
}

export function normalizeAssetType(value?: string | null): string {
  const normalized = value?.trim().toUpperCase();
  if (!normalized || normalized === 'EQUITY') return 'STOCK';
  if (normalized === 'FX' || normalized === 'CURRENCY') return 'FOREX';
  if (['STOCK', 'ETF', 'INDEX', 'FUTURE', 'FOREX', 'COMMODITY', 'CRYPTO', 'FUND', 'OTHER', 'UNKNOWN'].includes(normalized)) return normalized;
  return 'UNKNOWN';
}

export function normalizeInstrumentAssetType(value?: string | null, symbol?: string | null, _name?: string | null): string {
  const normalizedSymbol = symbol?.trim().toUpperCase() || '';
  if (normalizedSymbol.startsWith('^')) return 'INDEX';
  return normalizeAssetType(value);
}

export function deriveInstrumentSegment(assetType: string, symbol?: string | null): string {
  const normalized = normalizeAssetType(assetType);
  if (normalized === 'STOCK') return 'CASH';
  if (normalized === 'FUTURE') return 'FUTURES';
  if (normalized === 'FOREX') return 'CURRENCY';
  if (['INDEX', 'ETF', 'COMMODITY', 'CRYPTO', 'FUND', 'OTHER', 'UNKNOWN'].includes(normalized)) return normalized;
  if (symbol?.startsWith('^')) return 'INDEX';
  return 'UNKNOWN';
}

export function missingMetadataFields(input: Record<string, unknown>): string[] {
  return Object.entries(input)
    .filter(([, value]) => value === null || value === undefined || value === '')
    .map(([key]) => key);
}

export function metadataCompletenessScore(missingFields: string[]): number {
  const total = 11;
  return Math.max(0, Math.round(((total - missingFields.length) / total) * 100));
}

export function isKnownNseDerivativesEligibleStock(symbol?: string | null): boolean {
  const normalized = baseSymbolFromProviderSymbol(String(symbol || '').replace(/\s+/g, '').toUpperCase());
  return isKnownNseFnoStockUnderlying(symbol) || KNOWN_NSE_FNO_STOCK_UNDERLYINGS.has(normalized);
}

export function inferRegionFromInstrument(data: V1CreateInstrumentRequest): string {
  const exchange = data.exchange.toUpperCase();
  if (exchange === 'NSE' || exchange === 'BSE' || data.currency.toUpperCase() === 'INR') return 'IN';
  if (exchange === 'LSE' || data.currency.toUpperCase() === 'GBP') return 'UK';
  if (data.currency.toUpperCase() === 'EUR') return 'EU';
  if (data.currency.toUpperCase() === 'CAD') return 'CA';
  return 'US';
}

export function normalizeCatalogSource(value: string): CatalogSource {
  const normalized = value?.trim().toUpperCase();
  const allowed = new Set([
    'MANUAL',
    'LEGACY_NIFTY500',
    'LEGACY_DATABASE',
    'NSE_EQUITY_SECURITIES',
    'NSE_SME_EQUITY_SECURITIES',
    'NSE_EQUITY_DERIVATIVES_UNDERLYINGS',
    'NSE_INDEX_SECURITIES',
    'BSE_INDEX_SECURITIES',
    'NSE_INDEX_SEED',
    'NSE_ETF_SECURITIES',
    'BSE_EQUITY_SECURITIES',
    'BROKER_SCRIP_MASTER',
    'UNKNOWN',
  ]);
  return (allowed.has(normalized) ? normalized : 'UNKNOWN') as CatalogSource;
}
