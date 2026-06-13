/// <reference types="@types/jest" />
import {
  DEFAULT_EARNINGS_REGION,
  EARNINGS_REGION_CONFIGS,
  getEarningsRegionConfig,
  isSupportedEarningsRegion,
  normalizeRegionCode,
  supportedEarningsRegions,
} from '../../../src/modules/earnings-intelligence/earnings-intelligence.region-config';

describe('earnings region config', () => {
  it('ships tuned configs for IN, US and EU', () => {
    expect(supportedEarningsRegions().sort()).toEqual(['EU', 'IN', 'US']);
    expect(isSupportedEarningsRegion('IN')).toBe(true);
    expect(isSupportedEarningsRegion('us')).toBe(true);
    expect(isSupportedEarningsRegion('EU')).toBe(true);
  });

  it('preserves the legacy NSE-tuned constants for IN (no behavioural drift)', () => {
    const inConfig = getEarningsRegionConfig('IN');
    expect(inConfig.upcomingWindowDays).toBe(90);
    expect(inConfig.recentResultWindowDays).toBe(60);
    expect(inConfig.priceReactionSessions).toBe(5);
    expect(inConfig.quarterlyCadenceMonths).toBe(3);
    expect(inConfig.quarterlyCadenceLagDays).toBe(45);
    expect(inConfig.annualCadenceMonths).toBe(12);
    expect(inConfig.annualCadenceLagDays).toBe(60);
    expect(inConfig.freshnessFreshMaxDays).toBe(120);
    expect(inConfig.freshnessPartialMaxDays).toBe(240);
  });

  it('normalises region input and defaults blanks to the default region', () => {
    expect(normalizeRegionCode('us')).toBe('US');
    expect(normalizeRegionCode('  in ')).toBe('IN');
    expect(normalizeRegionCode('')).toBe(DEFAULT_EARNINGS_REGION);
    expect(normalizeRegionCode(null)).toBe(DEFAULT_EARNINGS_REGION);
  });

  it('falls back to default tuning for an unknown region (graceful, never throws)', () => {
    const config = getEarningsRegionConfig('MARS');
    expect(isSupportedEarningsRegion('MARS')).toBe(false);
    // Region code is carried through, but tuning mirrors the default region.
    expect(config.region).toBe('MARS');
    expect(config.upcomingWindowDays).toBe(EARNINGS_REGION_CONFIGS[DEFAULT_EARNINGS_REGION].upcomingWindowDays);
  });

  it('US uses a tighter 10-Q filing cadence than IN', () => {
    expect(getEarningsRegionConfig('US').quarterlyCadenceLagDays)
      .toBeLessThan(getEarningsRegionConfig('IN').quarterlyCadenceLagDays);
  });
});
