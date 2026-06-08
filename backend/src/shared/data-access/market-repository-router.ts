import { resolveMarketProfile } from '../utils/market-profile';
import type { AssetClass, MarketProfile } from '../utils/market-profile';

/**
 * Market repository router.
 *
 * Storage is physically isolated per market: crypto data lives in `crypto_*`
 * tables, equities in the original tables.  Domain COMPUTE is shared; only
 * PERSISTENCE is routed.  This module is the single, pure place that answers
 * "for this scope, which physical table family + capabilities apply" so that
 * domain modules can pick their equity-vs-crypto repository (and gate equity-only
 * features) without importing one another — keeping module boundaries intact.
 *
 * Modules use it like:
 *   const plane = resolveMarketPlane(scope);
 *   const repo = plane.isCrypto ? this.cryptoRepo : this.equityRepo;
 *   if (!plane.profile.capabilities.hasInstitutionalFlow) return notApplicable();
 */

export interface MarketScopeInput {
  region?: string | null;
  assetType?: string | null;
}

export interface ResolvedMarketPlane {
  assetClass: AssetClass;
  /** True when this scope is served from the crypto_* table family. */
  isCrypto: boolean;
  profile: MarketProfile;
}

/** Resolve the storage plane + capability profile for a scope. */
export function resolveMarketPlane(scope: MarketScopeInput): ResolvedMarketPlane {
  const profile = resolveMarketProfile(scope);
  return {
    assetClass: profile.assetClass,
    isCrypto: profile.assetClass === 'CRYPTO',
    profile,
  };
}

/** Convenience guard: does this scope resolve to the crypto plane? */
export function isCryptoScope(scope: MarketScopeInput): boolean {
  return resolveMarketProfile(scope).assetClass === 'CRYPTO';
}
