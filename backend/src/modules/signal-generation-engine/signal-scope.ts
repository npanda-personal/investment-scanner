/**
 * signal-scope.ts
 *
 * Single source of truth for resolving a request/query into an effective signal
 * scope.  Region isolation is enforced here:
 *
 *  - A concrete region (IN / US / EU) is applied strictly to every read,
 *    generation, regime/market-context lookup, peer set and cohort.
 *  - `GLOBAL` is an EXPLICIT cross-region aggregate, never a silent default that
 *    quietly mixes IN + US + EU rows.
 *  - CRYPTO resolves to the isolated crypto plane.
 *
 * Critically, this module NEVER defaults an unknown/absent region to 'IN'.
 *
 * WIRING STATUS (SG-1 vs SG-2/SG-3):
 *   - The leak this slice (SG-1) actually fixes is the legacy
 *     `canonicalRegion(value) => normalizeMarketRegion(value) || 'IN'` default and
 *     the repository's `latestPersistedMarketContext` IN fallback — both flipped so
 *     an unscoped/US/EU read no longer imports the Indian regime/market-context.
 *   - `resolveEffectiveScope` / `concreteRegionOrNull` / `cohortKey` are the seam
 *     the cohort-scoped features (SG-2 evidence model, SG-3 vol-normalization +
 *     universe RS percentile, SG-4 peer aggregates) will consume.  They are NOT yet
 *     wired into the service read/generation paths — that is the SG-2+ work.  Until
 *     then this file is exercised by its unit tests and is the single definition of
 *     the isolation contract, not the active per-read mechanism.
 */
import { normalizeMarketRegion } from '../../shared/utils/market-scope';
import { resolveMarketProfile } from '../../shared/utils/market-profile';

export type CanonicalRegion = 'IN' | 'US' | 'EU' | 'GLOBAL';

export interface EffectiveSignalScope {
  /** Canonical region.  'GLOBAL' is an explicit cross-region aggregate. */
  region: CanonicalRegion;
  /** Normalized asset type (defaults to STOCK). */
  assetType: string;
  /** True for a single concrete market (IN/US/EU); false for GLOBAL/crypto. */
  isConcreteRegion: boolean;
  /** True when the scope resolves to the isolated crypto plane. */
  isCryptoPlane: boolean;
  /**
   * Cohort key used to isolate cross-sectional features (vol-normalization,
   * universe RS percentile, peer aggregates) to a single market + asset class.
   * Guarantees an IN name is never ranked against a US/EU/crypto name.
   */
  cohortKey: string;
}

function isCanonicalRegion(value: string | undefined): value is 'IN' | 'US' | 'EU' {
  return value === 'IN' || value === 'US' || value === 'EU';
}

/**
 * Resolve a request/query scope into the effective signal scope.
 *
 * `region`:
 *   - 'IN' | 'US' | 'EU'                  → concrete, strictly isolated.
 *   - 'GLOBAL' / 'ALL' / absent / unknown → GLOBAL (explicit aggregate).
 * Crypto asset type always resolves to the crypto plane (region GLOBAL).
 */
export function resolveEffectiveScope(
  input: { region?: string | null; assetType?: string | null } = {},
): EffectiveSignalScope {
  const assetType = input.assetType?.trim().toUpperCase() || 'STOCK';
  const profile = resolveMarketProfile({ region: input.region, assetType });
  const isCryptoPlane = profile.assetClass === 'CRYPTO';

  // normalizeMarketRegion → undefined for GLOBAL/ALL/DEFAULT/empty/unknown-empty.
  const normalized = normalizeMarketRegion(input.region ?? undefined);
  const region: CanonicalRegion = isCryptoPlane
    ? 'GLOBAL'
    : isCanonicalRegion(normalized)
      ? normalized
      : 'GLOBAL';
  const isConcreteRegion = isCanonicalRegion(region as string | undefined);

  const cohortKey = isCryptoPlane
    ? 'CRYPTO|GLOBAL'
    : `${assetType}|${region}`;

  return { region, assetType, isConcreteRegion, isCryptoPlane, cohortKey };
}

/**
 * Region used for region-specific context reads (regime, market-context, sector
 * leadership, smart money) and cohorts.  Returns null when there is no single
 * concrete region (GLOBAL aggregate or crypto) — callers MUST then skip
 * region-specific context rather than defaulting to IN.
 */
export function concreteRegionOrNull(
  input: { region?: string | null; assetType?: string | null },
): 'IN' | 'US' | 'EU' | null {
  const scope = resolveEffectiveScope(input);
  return scope.isConcreteRegion ? (scope.region as 'IN' | 'US' | 'EU') : null;
}
