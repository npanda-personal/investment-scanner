import type { AssetType, MarketRegion } from '@/contexts/MarketScopeContext';

export function normalizeMarketForApi(region?: MarketRegion | string | null): string | undefined {
  const value = String(region || '').trim().toUpperCase();
  if (!value || value === 'GLOBAL' || value === 'ALL' || value === 'DEFAULT') return undefined;
  if (value === 'INDIA') return 'IN';
  if (value === 'EUROPE') return 'EU';
  return value;
}

/**
 * Like normalizeMarketForApi but PRESERVES 'GLOBAL'. Use where the backend must act on the
 * concrete scope rather than treat a missing region as "all markets" — e.g. source-file
 * imports, where GLOBAL/crypto and US/EU must resolve to an empty exchange-file list instead
 * of leaking India's NSE/BSE rows. normalizeMarketForApi() drops GLOBAL→undefined, which the
 * backend reads as unscoped; this keeps GLOBAL so the region filter can return zero rows.
 */
export function scopedRegionForApi(region?: MarketRegion | string | null): string | undefined {
  const value = String(region || '').trim().toUpperCase();
  if (!value || value === 'ALL' || value === 'DEFAULT') return undefined;
  if (value === 'INDIA') return 'IN';
  if (value === 'EUROPE') return 'EU';
  return value;
}

export function normalizeAssetTypeForMarketDataApi(assetType?: AssetType | string | null): string | undefined {
  const value = String(assetType || '').trim().toUpperCase();
  if (!value || value === 'ALL') return undefined;
  if (value === 'STOCK') return 'STOCK';
  return value;
}

export function logMarketDataApi(scopeRegion: string, normalizedRegion: string | undefined, params: Record<string, unknown>, label: string) {
  if (!import.meta.env.DEV) return;
  console.debug('[MarketDataFoundation]', {
    label,
    selectedGlobalMarket: scopeRegion,
    normalizedMarketValue: normalizedRegion || 'GLOBAL',
    finalQueryParams: params,
  });
}
