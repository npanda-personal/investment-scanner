// Shared instrument mapper — symbol-normalization cluster + the V1 instrument shaper.
//
// Phase 5a of the market-data-foundation decomposition extracts these as pure, exported
// FREE FUNCTIONS so the serving-read classes, the ingestion files, repair, and
// createInstrument can all share ONE home for them (they are used across many seams, so
// they cannot live in a single serving class). Behaviour is byte-identical to the
// pre-extraction inline service methods.
//
// The symbol cluster (baseSymbolFromProviderSymbol / providerSymbolForExchange /
// internalStorageSymbol / yahooHistoricalProviderSymbol / normalizeCatalogSymbol) is fully
// self-contained (the functions only call one another). toV1Instrument additionally needs a
// handful of metadata helpers that STAY on the service (they have many non-mapper call
// sites); those are injected via the InstrumentMapperDeps object so the move stays scoped to
// this phase. The service keeps a thin private toV1Instrument(stock, overrides?) delegator
// that calls toV1Instrument(this, stock, overrides) so all existing call sites are unchanged.

import type {
  InstrumentUniverseReadiness,
  MarketDataStatus,
  V1CreateInstrumentRequest,
  V1Instrument,
} from '../market-data-foundation.types';

// ───────────────────────────────────────────────────────────────────────────
// Symbol-normalization cluster (pure free functions)
// ───────────────────────────────────────────────────────────────────────────

export function baseSymbolFromProviderSymbol(symbol: string): string {
  return symbol.trim().toUpperCase().replace(/\.(NS|BO|BS|NL)$/i, '');
}

export function providerSymbolForExchange(sourceSymbol: string, exchange?: string | null): string {
  const symbol = sourceSymbol.trim().toUpperCase();
  if (!symbol || symbol.startsWith('^')) return symbol;
  if (/\.(NS|BO)$/i.test(symbol)) return symbol;
  const normalizedExchange = exchange?.trim().toUpperCase();
  if (normalizedExchange === 'BSE') return `${symbol}.BO`;
  if (normalizedExchange === 'NSE' || normalizedExchange === 'NSE_EQ' || normalizedExchange === 'NSE_EQUITY') return `${symbol}.NS`;
  return symbol;
}

export function internalStorageSymbol(symbol: string, options: { region?: string; assetType?: string; exchange?: string | null } = {}): string {
  const normalized = symbol.trim().toUpperCase();
  const region = options.region?.trim().toUpperCase();
  const assetType = options.assetType?.trim().toUpperCase() || 'STOCK';
  const exchange = options.exchange?.trim().toUpperCase();
  if (region === 'IN' && assetType === 'STOCK' && (exchange === 'NSE' || normalized.endsWith('.NS'))) {
    return baseSymbolFromProviderSymbol(normalized);
  }
  return normalized;
}

export function yahooHistoricalProviderSymbol(symbol: string, options: { region?: string; assetType?: string; exchange?: string | null } = {}): string {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized || normalized.startsWith('^') || /\.(NS|BO)$/i.test(normalized)) return normalized;
  const region = options.region?.trim().toUpperCase();
  const assetType = options.assetType?.trim().toUpperCase() || 'STOCK';
  if (region !== 'IN' || assetType !== 'STOCK') return normalized;
  return providerSymbolForExchange(normalized, options.exchange || 'NSE');
}

export function normalizeCatalogSymbol(row: { symbol?: string | null; sourceSymbol?: string | null; providerSymbol?: string | null; displaySymbol?: string | null; exchange?: string | null }, source?: string) {
  const rawSymbol = (row.sourceSymbol || row.providerSymbol || row.symbol || '').trim().toUpperCase();
  const exchange = row.exchange?.trim().toUpperCase() || (source?.startsWith('BSE') ? 'BSE' : source?.startsWith('NSE') ? 'NSE' : undefined);
  const baseSymbol = baseSymbolFromProviderSymbol(rawSymbol);
  const existingProviderSymbol = row.providerSymbol?.trim().toUpperCase();
  const shouldRebuildProviderSymbol = Boolean(exchange && ['NSE', 'BSE', 'NSE_EQ', 'NSE_EQUITY'].includes(exchange))
    && (!existingProviderSymbol || !new RegExp(exchange === 'BSE' ? '\\.BO$' : '\\.NS$', 'i').test(existingProviderSymbol));
  const providerSymbol = shouldRebuildProviderSymbol
    ? providerSymbolForExchange(baseSymbol, exchange)
    : existingProviderSymbol || providerSymbolForExchange(baseSymbol, exchange);
  return {
    sourceSymbol: baseSymbol,
    providerSymbol,
    displaySymbol: row.displaySymbol?.trim().toUpperCase() || baseSymbol,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// V1 instrument shaper
// ───────────────────────────────────────────────────────────────────────────

// Structurally identical to the service-local TrustedBaselineSnapshot; re-declared here so
// the mapper and the service share one home for the cast without importing a service-private
// type. Only used by toV1Instrument as a read cast on stock.trustedBaseline.
type TrustedBaselineSnapshot = {
  trustedBaselineResidualState: V1Instrument['trusted_baseline_residual_state'];
  trustedBaselineBlockerCodes: string[];
  latestCompletedEodDate: string | null;
  latestCompletedEodPresent: boolean;
  storedDataThroughDate: string | null;
  requiredHistoryStartDate: string | null;
  requiredHistoryEndDate: string | null;
  requiredHistoryStatus: V1Instrument['required_history_status'];
  listingDate: string | null;
  listingDateStatus: V1Instrument['listing_date_status'];
  providerFallbackState: V1Instrument['provider_fallback_state'];
  primarySourceAttempted: 'NSE_BSE_EXCHANGE_EOD' | 'YAHOO' | null;
  fallbackSourcesAttempted: string[];
  sourceFallbackReason: string | null;
};

// The metadata helpers toV1Instrument needs that STAY on the service (they have many
// non-mapper call sites). Injected so the mapper stays a pure free function without pulling
// those helpers — and their numerous call sites — into this phase.
export interface InstrumentMapperDeps {
  normalizeInstrumentAssetType(value?: string | null, symbol?: string | null, name?: string | null): string;
  deriveInstrumentSegment(assetType: string, symbol?: string | null): string;
  defaultCurrencyForInstrument(symbol?: string | null, exchange?: string | null, region?: string | null): string;
  defaultCountryForInstrument(symbol?: string | null, exchange?: string | null, region?: string | null): string | null;
  isKnownNseDerivativesEligibleStock(symbol?: string | null): boolean;
  missingMetadataFields(input: Record<string, unknown>): string[];
  metadataCompletenessScore(missingFields: string[]): number;
}

export function toV1Instrument(deps: InstrumentMapperDeps, stock: any, overrides?: Partial<V1CreateInstrumentRequest>): V1Instrument {
  const assetType = deps.normalizeInstrumentAssetType(overrides?.asset_type || stock.assetType || 'STOCK', stock.symbol, stock.name);
  const segment = deps.deriveInstrumentSegment(assetType, stock.symbol);
  const currency = overrides?.currency || stock.currency || deps.defaultCurrencyForInstrument(stock.symbol, stock.exchange, stock.region);
  const country = stock.country || deps.defaultCountryForInstrument(stock.symbol, stock.exchange, stock.region);
  const symbolParts = normalizeCatalogSymbol({
    symbol: stock.symbol,
    sourceSymbol: stock.sourceSymbol,
    providerSymbol: stock.providerSymbol,
    displaySymbol: stock.displaySymbol,
    exchange: stock.exchange,
  });
  const derivativesEligible = Boolean(stock.derivativesEligible) || (assetType === 'STOCK' && deps.isKnownNseDerivativesEligibleStock(symbolParts.sourceSymbol));
  const readiness = stock.universeReadiness as InstrumentUniverseReadiness | undefined;
  const trustedBaseline = stock.trustedBaseline as TrustedBaselineSnapshot | undefined;
  const missingFields = deps.missingMetadataFields({
    companyName: overrides?.company_name || stock.name,
    exchange: overrides?.exchange || stock.exchange,
    country,
    currency,
    sector: stock.sector,
    industry: stock.industry,
    marketCap: stock.marketCap,
    assetType,
    instrumentSegment: segment,
    isin: stock.isin,
    listingDate: stock.ipoDate,
  });
  return {
    id: stock.id,
    symbol: stock.symbol,
    display_symbol: symbolParts.displaySymbol || stock.symbol,
    provider_symbol: symbolParts.providerSymbol || stock.symbol,
    source_symbol: symbolParts.sourceSymbol || null,
    company_name: overrides?.company_name || stock.name,
    exchange: overrides?.exchange || stock.exchange || null,
    country,
    region: stock.region || null,
    sector: stock.sector || null,
    industry: stock.industry || null,
    currency,
    market_cap: stock.marketCap !== null && stock.marketCap !== undefined ? Number(stock.marketCap) : null,
    asset_type: assetType,
    instrument_segment: stock.instrumentSegment || segment,
    derivatives_eligible: derivativesEligible,
    provider_support_status: stock.providerSupportStatus || 'UNKNOWN',
    catalog_source: stock.catalogSource || stock.source || 'UNKNOWN',
    provider_error: stock.providerError || null,
    underlying_symbol: stock.underlyingSymbol || null,
    expiry_date: stock.expiryDate instanceof Date ? stock.expiryDate.toISOString() : stock.expiryDate ? new Date(stock.expiryDate).toISOString() : null,
    contract_month: stock.contractMonth || null,
    lot_size: stock.lotSize ?? null,
    contract_status: stock.contractStatus || null,
    metadata_completeness_score: deps.metadataCompletenessScore(missingFields),
    missing_metadata_fields: missingFields,
    universe_state: readiness?.universeState,
    price_history_bars: readiness?.priceHistoryBars,
    latest_price_date: readiness?.latestPriceDate ?? undefined,
    expected_latest_trading_date: readiness?.expectedLatestTradingDate ?? undefined,
    has_recent_volume: readiness?.hasRecentVolume,
    rolling_window_bars: readiness?.rollingWindowBars,
    rolling_window_coverage_percent: readiness?.rollingWindowCoveragePercent,
    max_price_gap_days: readiness?.maxPriceGapDays ?? null,
    recent_volume_coverage_percent: readiness?.recentVolumeCoveragePercent,
    adjusted_close_coverage_percent: readiness?.adjustedCloseCoveragePercent,
    uses_adjusted_close_fallback: readiness?.usesAdjustedCloseFallback,
    readiness_blockers: readiness?.readinessBlockers,
    readiness_warnings: readiness?.readinessWarnings,
    provider_readiness: readiness?.providerReadiness,
    price_readiness: readiness?.priceReadiness,
    metadata_readiness: readiness?.metadataReadiness,
    review_readiness: readiness?.reviewReadiness,
    trusted_baseline_residual_state: trustedBaseline?.trustedBaselineResidualState,
    trusted_baseline_blocker_codes: trustedBaseline?.trustedBaselineBlockerCodes,
    latest_completed_eod_date: trustedBaseline?.latestCompletedEodDate ?? null,
    latest_completed_eod_present: trustedBaseline?.latestCompletedEodPresent,
    stored_data_through_date: trustedBaseline?.storedDataThroughDate ?? readiness?.latestPriceDate ?? null,
    required_history_start_date: trustedBaseline?.requiredHistoryStartDate ?? null,
    required_history_end_date: trustedBaseline?.requiredHistoryEndDate ?? null,
    required_history_status: trustedBaseline?.requiredHistoryStatus,
    listing_date_status: trustedBaseline?.listingDateStatus,
    provider_fallback_state: trustedBaseline?.providerFallbackState,
    // Report a region-correct source label: non-IN instruments are fetched via Yahoo,
    // not the NSE/BSE exchange file path; the fallback label avoids misleading operators.
    primary_source_attempted: trustedBaseline?.primarySourceAttempted
      ?? ((stock.region && stock.region !== 'IN') ? 'YAHOO_EOD' : 'NSE_BSE_EXCHANGE_EOD'),
    fallback_sources_attempted: trustedBaseline?.fallbackSourcesAttempted,
    source_fallback_reason: trustedBaseline?.sourceFallbackReason ?? null,
    is_active: stock.isActive ?? true,
    is_delisted: stock.isDelisted ?? false,
    ipo_date: stock.ipoDate instanceof Date ? stock.ipoDate.toISOString() : stock.ipoDate ? new Date(stock.ipoDate).toISOString() : null,
    isin: overrides?.isin || stock.isin || null,
    source: stock.source || 'database',
    ingestion_timestamp: stock.createdAt instanceof Date ? stock.createdAt.toISOString() : new Date(stock.createdAt).toISOString(),
    last_updated_timestamp: stock.updatedAt instanceof Date ? stock.updatedAt.toISOString() : new Date(stock.updatedAt).toISOString(),
    data_status: (stock.dataStatus || (stock.lastSuccessfulDataLoadTimestamp ? 'COMPLETE' : 'PARTIAL')) as MarketDataStatus,
  };
}
