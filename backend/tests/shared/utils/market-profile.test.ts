import {
  resolveMarketProfile,
  CRYPTO_PROFILE,
  IN_STOCK_PROFILE,
  ANNUAL_RISK_FREE_RATE_IN,
  IN_ONE_WAY_COST_PERCENT,
  DEFAULT_ONE_WAY_COST_PERCENT,
  dailyRiskFreeRate,
} from '../../../src/shared/utils/market-profile';

describe('market-profile', () => {
  describe('resolveMarketProfile — India equity (baseline, must be byte-identical)', () => {
    it('IN/STOCK resolves to the canonical India equity profile', () => {
      const profile = resolveMarketProfile({ assetType: 'STOCK', region: 'IN' });
      expect(profile.assetClass).toBe('STOCK');
      expect(profile.region).toBe('IN');
      expect(profile.currency).toBe('INR');
      expect(profile.riskFreeRateAnnual).toBe(ANNUAL_RISK_FREE_RATE_IN);
      expect(profile.oneWayTxnCostPercent).toBe(IN_ONE_WAY_COST_PERCENT);
      expect(profile.tradingCalendar.kind).toBe('EXCHANGE');
      expect(profile.tradingCalendar.weekdays).toEqual([1, 2, 3, 4, 5]);
    });

    it('all India equity capabilities are enabled', () => {
      const { capabilities } = IN_STOCK_PROFILE;
      expect(capabilities.hasFundamentals).toBe(true);
      expect(capabilities.hasDelivery).toBe(true);
      expect(capabilities.hasInstitutionalFlow).toBe(true);
      expect(capabilities.hasIndexConstituents).toBe(true);
      expect(capabilities.hasVix).toBe(true);
      expect(capabilities.hasEarnings).toBe(true);
      expect(capabilities.hasSectors).toBe(true);
      expect(capabilities.hasMarketBreadth).toBe(true);
    });

    it('defaults unknown/empty scope to India-default risk-free (preserves prior global default)', () => {
      // Prior behavior applied a single global 6.5% risk-free regardless of scope.
      const profile = resolveMarketProfile({});
      expect(profile.riskFreeRateAnnual).toBe(ANNUAL_RISK_FREE_RATE_IN);
    });
  });

  describe('resolveMarketProfile — crypto', () => {
    it('CRYPTO wins over region and yields a 24/7 USD profile', () => {
      const profile = resolveMarketProfile({ assetType: 'CRYPTO', region: 'IN' });
      expect(profile).toBe(CRYPTO_PROFILE);
      expect(profile.assetClass).toBe('CRYPTO');
      expect(profile.region).toBe('GLOBAL');
      expect(profile.currency).toBe('USD');
      expect(profile.riskFreeRateAnnual).toBe(0);
      expect(profile.oneWayTxnCostPercent).toBe(DEFAULT_ONE_WAY_COST_PERCENT);
      expect(profile.tradingCalendar.kind).toBe('CONTINUOUS_24_7');
      expect(profile.tradingCalendar.weekdays).toEqual([0, 1, 2, 3, 4, 5, 6]);
    });

    it('disables every equity-only capability except volume interest', () => {
      const { capabilities } = CRYPTO_PROFILE;
      expect(capabilities.hasFundamentals).toBe(false);
      expect(capabilities.hasDelivery).toBe(false);
      expect(capabilities.hasInstitutionalFlow).toBe(false);
      expect(capabilities.hasDividends).toBe(false);
      expect(capabilities.hasSplits).toBe(false);
      expect(capabilities.hasSectors).toBe(false);
      expect(capabilities.hasIndexConstituents).toBe(false);
      expect(capabilities.hasEarnings).toBe(false);
      expect(capabilities.hasMarketBreadth).toBe(false);
      expect(capabilities.hasVix).toBe(false);
      expect(capabilities.hasVolumeInterest).toBe(true);
    });
  });

  describe('resolveMarketProfile — non-IN equities (future US/EU seam)', () => {
    it('US/STOCK uses the flat one-way cost and drops India-only capabilities', () => {
      const profile = resolveMarketProfile({ assetType: 'STOCK', region: 'US' });
      expect(profile.region).toBe('US');
      expect(profile.currency).toBe('USD');
      expect(profile.oneWayTxnCostPercent).toBe(DEFAULT_ONE_WAY_COST_PERCENT);
      expect(profile.capabilities.hasDelivery).toBe(false);
      expect(profile.capabilities.hasInstitutionalFlow).toBe(false);
      expect(profile.capabilities.hasVix).toBe(false);
    });
  });

  describe('dailyRiskFreeRate', () => {
    it('divides the annual rate by 252 trading days', () => {
      expect(dailyRiskFreeRate(IN_STOCK_PROFILE)).toBeCloseTo(ANNUAL_RISK_FREE_RATE_IN / 252, 12);
      expect(dailyRiskFreeRate(CRYPTO_PROFILE)).toBe(0);
    });
  });
});
