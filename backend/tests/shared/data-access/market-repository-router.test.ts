import { resolveMarketPlane, isCryptoScope } from '../../../src/shared/data-access/market-repository-router';

describe('market-repository-router', () => {
  it('routes CRYPTO scope to the crypto plane regardless of region', () => {
    const plane = resolveMarketPlane({ assetType: 'CRYPTO', region: 'IN' });
    expect(plane.isCrypto).toBe(true);
    expect(plane.assetClass).toBe('CRYPTO');
    expect(plane.profile.capabilities.hasInstitutionalFlow).toBe(false);
    expect(plane.profile.tradingCalendar.kind).toBe('CONTINUOUS_24_7');
  });

  it('routes IN/STOCK scope to the equity plane', () => {
    const plane = resolveMarketPlane({ assetType: 'STOCK', region: 'IN' });
    expect(plane.isCrypto).toBe(false);
    expect(plane.assetClass).toBe('STOCK');
    expect(plane.profile.capabilities.hasDelivery).toBe(true);
  });

  it('defaults missing assetType to the equity plane', () => {
    const plane = resolveMarketPlane({ region: 'IN' });
    expect(plane.isCrypto).toBe(false);
  });

  it('isCryptoScope mirrors the plane resolution', () => {
    expect(isCryptoScope({ assetType: 'CRYPTO' })).toBe(true);
    expect(isCryptoScope({ assetType: 'STOCK', region: 'IN' })).toBe(false);
    expect(isCryptoScope({})).toBe(false);
  });
});
