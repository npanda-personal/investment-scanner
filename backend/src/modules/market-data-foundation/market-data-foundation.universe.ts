import type {
  InstrumentUniverseReadiness,
  ProviderSupportStatus,
  UniverseState,
} from './market-data-foundation.types';

export const STANDARD_REVIEW_MIN_BARS = 252;
export const SMA200_MIN_BARS = 200;

export const UNIVERSE_STATES: UniverseState[] = [
  'CATALOG_ONLY',
  'PROVIDER_SUPPORTED',
  'PRICE_READY',
  'CONTEXT_READY',
  'REVIEW_READY',
  'UNSUPPORTED',
  'STALE_OR_INCOMPLETE',
  'DELISTED_OR_INACTIVE',
];

export interface UniversePriceStats {
  priceHistoryBars: number;
  latestPriceDate: string | null;
  latestVolume?: bigint | number | string | null;
  latestAdjustedClose?: unknown;
  latestClose?: unknown;
  rollingWindowBars?: number;
  rollingWindowCoveragePercent?: number;
  maxPriceGapDays?: number | null;
  recentVolumeCoveragePercent?: number;
  adjustedCloseCoveragePercent?: number;
  usesAdjustedCloseFallback?: boolean;
}

export interface UniverseInstrumentInput {
  isActive?: boolean | null;
  isDelisted?: boolean | null;
  providerSupportStatus?: ProviderSupportStatus | string | null;
  providerSymbol?: string | null;
  providerError?: string | null;
  sector?: string | null;
  industry?: string | null;
  country?: string | null;
  currency?: string | null;
  marketCap?: unknown;
  isin?: string | null;
  ipoDate?: Date | string | null;
  region?: string | null;
  assetType?: string | null;
  expectedLatestTradingDate?: string | null;
  priceStats?: UniversePriceStats | null;
}

export function classifyInstrumentUniverseReadiness(input: UniverseInstrumentInput): InstrumentUniverseReadiness {
  const blockers = new Set<string>();
  const warnings = new Set<string>();
  const expectedLatestTradingDate = normalizeDate(input.expectedLatestTradingDate);
  const priceStats = input.priceStats || {
    priceHistoryBars: 0,
    latestPriceDate: null,
    latestVolume: null,
    latestAdjustedClose: null,
    latestClose: null,
    rollingWindowBars: 0,
    rollingWindowCoveragePercent: 0,
    maxPriceGapDays: null,
    recentVolumeCoveragePercent: 0,
    adjustedCloseCoveragePercent: 0,
    usesAdjustedCloseFallback: true,
  };
  const priceHistoryBars = Math.max(Number(priceStats.priceHistoryBars || 0), 0);
  const rollingWindowBars = Math.max(Number(priceStats.rollingWindowBars ?? Math.min(priceHistoryBars, STANDARD_REVIEW_MIN_BARS)), 0);
  const rollingWindowCoveragePercent = boundedPercent(priceStats.rollingWindowCoveragePercent ?? ((rollingWindowBars / STANDARD_REVIEW_MIN_BARS) * 100));
  const recentVolumeCoveragePercent = boundedPercent(priceStats.recentVolumeCoveragePercent ?? (hasUsableVolume(priceStats.latestVolume) ? 100 : 0));
  const adjustedCloseCoveragePercent = boundedPercent(priceStats.adjustedCloseCoveragePercent ?? (priceStats.latestAdjustedClose === null || priceStats.latestAdjustedClose === undefined ? 0 : 100));
  const maxPriceGapDays = priceStats.maxPriceGapDays ?? null;
  const usesAdjustedCloseFallback = Boolean(priceStats.usesAdjustedCloseFallback ?? adjustedCloseCoveragePercent < 100);
  const latestPriceDate = normalizeDate(priceStats.latestPriceDate);
  const hasRecentVolume = hasUsableVolume(priceStats.latestVolume);
  const providerStatus = normalizeProviderStatus(input.providerSupportStatus);
  const isInactiveOrDelisted = input.isActive === false || input.isDelisted === true;
  const isUnsupported = providerStatus === 'UNSUPPORTED' || providerStatus === 'VALIDATION_FAILED';
  const isProviderUnknown = providerStatus === 'UNKNOWN';
  const isProviderSupported = providerStatus === 'SUPPORTED';

  if (isInactiveOrDelisted) blockers.add('DELISTED_OR_INACTIVE');
  if (isUnsupported) blockers.add('PROVIDER_UNSUPPORTED');
  if (isProviderUnknown) blockers.add('PROVIDER_UNKNOWN');
  if (!input.providerSymbol && isProviderSupported) blockers.add('PROVIDER_SYMBOL_MISSING');
  if (hasCriticalProviderMismatch(input.providerError)) blockers.add('CRITICAL_PROVIDER_SYMBOL_MISMATCH');

  if (!latestPriceDate) blockers.add('MISSING_LATEST_PRICE');
  else if (!expectedLatestTradingDate) blockers.add('MARKET_CALENDAR_UNCERTAIN');
  else if (!isFreshLatestPrice(latestPriceDate, expectedLatestTradingDate)) blockers.add('STALE_LATEST_PRICE');
  if (priceHistoryBars < STANDARD_REVIEW_MIN_BARS) blockers.add('INADEQUATE_PRICE_HISTORY');
  if (priceHistoryBars < SMA200_MIN_BARS) blockers.add('INADEQUATE_SMA200_HISTORY');
  if (rollingWindowBars < STANDARD_REVIEW_MIN_BARS || rollingWindowCoveragePercent < 98) blockers.add('INADEQUATE_ROLLING_PRICE_WINDOW');
  if (maxPriceGapDays !== null && maxPriceGapDays > 7) blockers.add('PRICE_HISTORY_GAPS');
  if (!hasRecentVolume) blockers.add('MISSING_RECENT_VOLUME');
  if (recentVolumeCoveragePercent < 95) blockers.add('LOW_RECENT_VOLUME_COVERAGE');
  if (priceStats.latestAdjustedClose === null || priceStats.latestAdjustedClose === undefined || usesAdjustedCloseFallback) {
    warnings.add('ADJUSTED_CLOSE_MISSING_USING_CLOSE_FALLBACK');
  }

  const metadataFields = {
    sector: hasMetadata(input.sector),
    industry: hasMetadata(input.industry),
    country: hasMetadata(input.country),
    currency: hasMetadata(input.currency),
    marketCap: isIndianStock(input) ? hasValidMarketCap(input.marketCap) : true,
    isin: isIndianStock(input) ? hasMetadata(input.isin) : true,
    listingDate: isIndianStock(input) ? Boolean(normalizeDate(input.ipoDate)) : true,
  };
  if (!metadataFields.sector) blockers.add('MISSING_SECTOR');
  if (!metadataFields.industry) blockers.add('MISSING_INDUSTRY');
  if (!metadataFields.country) blockers.add('MISSING_COUNTRY');
  if (!metadataFields.currency) blockers.add('MISSING_CURRENCY');
  if (!metadataFields.marketCap) blockers.add('MISSING_MARKET_CAP');
  if (!metadataFields.isin) blockers.add('MISSING_ISIN');
  if (!metadataFields.listingDate) blockers.add('MISSING_LISTING_DATE');

  const priceBlockingCodes = [
    'MISSING_LATEST_PRICE',
    'MARKET_CALENDAR_UNCERTAIN',
    'STALE_LATEST_PRICE',
    'INADEQUATE_PRICE_HISTORY',
    'INADEQUATE_SMA200_HISTORY',
    'INADEQUATE_ROLLING_PRICE_WINDOW',
    'PRICE_HISTORY_GAPS',
    'MISSING_RECENT_VOLUME',
    'LOW_RECENT_VOLUME_COVERAGE',
  ];
  const metadataBlockingCodes = ['MISSING_SECTOR', 'MISSING_INDUSTRY', 'MISSING_COUNTRY', 'MISSING_CURRENCY', 'MISSING_MARKET_CAP', 'MISSING_ISIN', 'MISSING_LISTING_DATE'];
  const reviewBlockingCodes = [
    'DELISTED_OR_INACTIVE',
    'PROVIDER_UNSUPPORTED',
    'PROVIDER_UNKNOWN',
    'PROVIDER_SYMBOL_MISSING',
    'CRITICAL_PROVIDER_SYMBOL_MISMATCH',
  ];

  const isPriceReady = priceBlockingCodes.every((code) => !blockers.has(code));
  const isMetadataReady = metadataBlockingCodes.every((code) => !blockers.has(code));
  const isContextReady = isPriceReady && isMetadataReady;
  const isReviewReady = isContextReady && reviewBlockingCodes.every((code) => !blockers.has(code));
  const metadataCompletenessScore = Math.round(
    (Object.values(metadataFields).filter(Boolean).length / Object.keys(metadataFields).length) * 100
  );

  let universeState: UniverseState;
  if (isInactiveOrDelisted) universeState = 'DELISTED_OR_INACTIVE';
  else if (isUnsupported) universeState = 'UNSUPPORTED';
  else if (isProviderUnknown) universeState = 'CATALOG_ONLY';
  else if (isReviewReady) universeState = 'REVIEW_READY';
  else if (isContextReady) universeState = 'CONTEXT_READY';
  else if (isPriceReady) universeState = 'PRICE_READY';
  else if (isProviderSupported && blockers.size === 0) universeState = 'PROVIDER_SUPPORTED';
  else universeState = 'STALE_OR_INCOMPLETE';

  return {
    universeState,
    providerReadiness: providerStatus,
    priceReadiness: priceReadinessStatus(blockers),
    metadataReadiness: isMetadataReady ? 'READY' : 'MISSING_REQUIRED_METADATA',
    reviewReadiness: isReviewReady ? 'REVIEW_READY' : 'NOT_REVIEW_READY',
    priceHistoryBars,
    latestPriceDate,
    expectedLatestTradingDate,
    hasRecentVolume,
    rollingWindowBars,
    rollingWindowCoveragePercent,
    maxPriceGapDays,
    recentVolumeCoveragePercent,
    adjustedCloseCoveragePercent,
    usesAdjustedCloseFallback,
    metadataCompletenessScore,
    readinessBlockers: Array.from(blockers),
    readinessWarnings: Array.from(warnings),
    isPriceReady,
    isContextReady,
    isReviewReady,
  };
}

export function normalizeProviderStatus(status?: ProviderSupportStatus | string | null): ProviderSupportStatus {
  const normalized = String(status || '').trim().toUpperCase();
  if (normalized === 'SUPPORTED' || normalized === 'UNSUPPORTED' || normalized === 'VALIDATION_FAILED') {
    return normalized;
  }
  return 'UNKNOWN';
}

export function isFreshLatestPrice(latestPriceDate: string | null, expectedLatestTradingDate: string | null): boolean {
  if (!latestPriceDate || !expectedLatestTradingDate) return false;
  const latest = Date.parse(`${latestPriceDate}T00:00:00.000Z`);
  const expected = Date.parse(`${expectedLatestTradingDate}T00:00:00.000Z`);
  if (Number.isNaN(latest) || Number.isNaN(expected)) return false;
  return latest >= expected;
}

function priceReadinessStatus(blockers: Set<string>): InstrumentUniverseReadiness['priceReadiness'] {
  if (blockers.has('MISSING_LATEST_PRICE')) return 'MISSING_LATEST_PRICE';
  if (blockers.has('MARKET_CALENDAR_UNCERTAIN')) return 'MARKET_CALENDAR_UNCERTAIN';
  if (blockers.has('STALE_LATEST_PRICE')) return 'STALE_LATEST_PRICE';
  if (blockers.has('INADEQUATE_PRICE_HISTORY') || blockers.has('INADEQUATE_SMA200_HISTORY') || blockers.has('INADEQUATE_ROLLING_PRICE_WINDOW') || blockers.has('PRICE_HISTORY_GAPS')) return 'INADEQUATE_HISTORY';
  if (blockers.has('MISSING_RECENT_VOLUME') || blockers.has('LOW_RECENT_VOLUME_COVERAGE')) return 'MISSING_RECENT_VOLUME';
  return 'READY';
}

function boundedPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Number(value.toFixed(1))));
}

function normalizeDate(value?: string | Date | null): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function hasUsableVolume(value: bigint | number | string | null | undefined): boolean {
  if (value === null || value === undefined) return false;
  return Number(value) > 0;
}

function hasMetadata(value?: string | null): boolean {
  const normalized = String(value || '').trim().toUpperCase();
  return Boolean(normalized) && !['UNKNOWN', 'N/A', 'NA', 'NULL', 'NONE'].includes(normalized);
}

function hasValidMarketCap(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0;
}

function isIndianStock(input: UniverseInstrumentInput): boolean {
  const region = String(input.region || '').trim().toUpperCase();
  const assetType = String(input.assetType || '').trim().toUpperCase();
  return (region === 'IN' || input.currency === 'INR' || input.country === 'India') && (!assetType || assetType === 'STOCK' || assetType === 'EQUITY');
}

function hasCriticalProviderMismatch(providerError?: string | null): boolean {
  return /critical.*(symbol|provider).*mismatch|(symbol|provider).*mismatch.*critical/i.test(providerError || '');
}
