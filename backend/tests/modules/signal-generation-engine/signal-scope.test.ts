/**
 * SG-1 region-isolation contract tests.
 *
 * These lock the rule the user requires: selecting US/EU/Crypto must never resolve
 * to IN data, and vice-versa.  The scope resolver is the single seam every read,
 * generation, regime/context lookup and cohort flows through, so isolating it here
 * isolates the whole engine.
 */
import {
  resolveEffectiveScope,
  concreteRegionOrNull,
} from '../../../src/modules/signal-generation-engine/signal-scope';

describe('resolveEffectiveScope — region isolation', () => {
  it('keeps a concrete region concrete and isolated', () => {
    for (const region of ['IN', 'US', 'EU'] as const) {
      const scope = resolveEffectiveScope({ region, assetType: 'STOCK' });
      expect(scope.region).toBe(region);
      expect(scope.isConcreteRegion).toBe(true);
      expect(scope.isCryptoPlane).toBe(false);
      expect(scope.cohortKey).toBe(`STOCK|${region}`);
    }
  });

  it('normalizes region aliases without crossing markets', () => {
    expect(resolveEffectiveScope({ region: 'INDIA' }).region).toBe('IN');
    expect(resolveEffectiveScope({ region: 'EUROPE' }).region).toBe('EU');
    expect(resolveEffectiveScope({ region: 'us' }).region).toBe('US');
  });

  it('treats GLOBAL/ALL/absent/unknown as an explicit GLOBAL aggregate, NEVER IN', () => {
    for (const region of ['GLOBAL', 'ALL', 'DEFAULT', '', undefined, null]) {
      const scope = resolveEffectiveScope({ region: region as any });
      expect(scope.region).toBe('GLOBAL');
      expect(scope.isConcreteRegion).toBe(false);
      // The core anti-leak assertion: absent/unknown must not silently become IN.
      expect(scope.region).not.toBe('IN');
    }
  });

  it('routes CRYPTO to the isolated crypto plane regardless of region', () => {
    for (const region of ['IN', 'US', 'GLOBAL', undefined]) {
      const scope = resolveEffectiveScope({ region: region as any, assetType: 'CRYPTO' });
      expect(scope.isCryptoPlane).toBe(true);
      expect(scope.cohortKey).toBe('CRYPTO|GLOBAL');
      expect(scope.isConcreteRegion).toBe(false);
    }
  });

  it('produces disjoint cohort keys across markets (no cross-market ranking)', () => {
    const keys = new Set([
      resolveEffectiveScope({ region: 'IN' }).cohortKey,
      resolveEffectiveScope({ region: 'US' }).cohortKey,
      resolveEffectiveScope({ region: 'EU' }).cohortKey,
      resolveEffectiveScope({ assetType: 'CRYPTO' }).cohortKey,
    ]);
    expect(keys.size).toBe(4);
  });
});

describe('concreteRegionOrNull — context-read guard', () => {
  it('returns the concrete region for single markets', () => {
    expect(concreteRegionOrNull({ region: 'IN' })).toBe('IN');
    expect(concreteRegionOrNull({ region: 'US' })).toBe('US');
    expect(concreteRegionOrNull({ region: 'EU' })).toBe('EU');
  });

  it('returns null (skip region context — no IN fabrication) for GLOBAL/absent/crypto', () => {
    expect(concreteRegionOrNull({ region: 'GLOBAL' })).toBeNull();
    expect(concreteRegionOrNull({})).toBeNull();
    expect(concreteRegionOrNull({ region: undefined })).toBeNull();
    expect(concreteRegionOrNull({ assetType: 'CRYPTO' })).toBeNull();
  });
});
