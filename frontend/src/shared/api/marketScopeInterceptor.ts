import axios from 'axios';

/**
 * Global market-scope request interceptor.
 *
 * Every feature service uses the default `axios` instance directly, so a single
 * request interceptor is the one place that makes the WHOLE app market-aware:
 * it appends the persisted `region` + `assetType` (from MarketScopeContext's
 * `localStorage.market_scope`) as query params on all `/api/` requests, unless
 * the caller already set them explicitly.
 *
 * Backend controllers read `req.query.region` / `req.query.assetType`
 * (normalizeMarketRegion + resolveMarketRegionFilter), so this transparently
 * scopes screeners, instrument lists, market context, etc. to the selected
 * region (IN / US / EU) or crypto plane (GLOBAL/CRYPTO).
 */

const STORAGE_KEY = 'market_scope';

interface PersistedScope {
  region?: string;
  assetType?: string;
}

function readScope(): PersistedScope | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedScope;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

let installed = false;

export function installMarketScopeInterceptor(): void {
  if (installed) return;
  installed = true;

  axios.interceptors.request.use((config) => {
    const url = config.url || '';
    if (!url.includes('/api/')) return config;

    const scope = readScope();
    if (!scope) return config;

    const params = (config.params || {}) as Record<string, unknown>;
    // Never override an explicitly-provided value.
    if (scope.region && params.region === undefined && params.market === undefined) {
      params.region = scope.region;
    }
    if (scope.assetType && params.assetType === undefined) {
      params.assetType = scope.assetType;
    }
    config.params = params;
    return config;
  });
}
