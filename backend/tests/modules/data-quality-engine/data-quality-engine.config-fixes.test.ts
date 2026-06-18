/// <reference types="@types/jest" />
import { DataQualityEngineService } from '../../../src/modules/data-quality-engine';
import {
  DEFAULT_DATA_QUALITY_CONFIG,
  normalizeAssetType,
  resolveDataQualityConfig,
} from '../../../src/modules/data-quality-engine/data-quality-engine.config';
import { calculateLiquidity } from '../../../src/modules/data-quality-engine/data-quality-engine.scoring';
import { computeStaleness } from '../../../src/modules/data-quality-engine/data-quality-engine.staleness';

const DAY_MS = 86_400_000;

const inInstrument = (overrides: Record<string, any> = {}) => ({
  id: 'in-stock-1',
  symbol: 'RELIANCE',
  company_name: 'Reliance Industries',
  sector: 'Energy',
  industry: 'Integrated Oil and Gas',
  country: 'IN',
  currency: 'INR',
  region: 'IN',
  exchange: 'NSE',
  assetType: 'STOCK',
  required_history_status: 'COMPLETE',
  listing_date_status: 'PRESENT_OLDER_THAN_15Y_USED_15Y',
  ...overrides,
});

const pricesNewestFirst = (count: number, volume: number | null = 1_500_000) =>
  Array.from({ length: count }).map((_, index) => ({
    date: new Date(Date.now() - index * DAY_MS).toISOString(),
    close: 2500 - index * 0.5,
    adjusted_close: 2500 - index * 0.5,
    volume,
  }));

const constantVolumePrices = (count: number, volume: number) =>
  Array.from({ length: count }).map(() => ({ date: new Date().toISOString(), close: 100, volume }));

describe('DataQualityConfig resolution', () => {
  it('defaults to IN/STOCK behavior (sessions calendar; fundamentals no longer gate signal eligibility)', () => {
    const config = resolveDataQualityConfig({});
    expect(config.calendarRegion).toBe('IN');
    expect(config.tradingMode).toBe('SESSIONS');
    expect(config.staleSessionThreshold).toBe(3);
    // Fundamentals are NOT a hard signal-eligibility gate for any market (incl. NSE mainboard):
    // missing fundamentals downgrades reliabilityTier to PARTIAL in scoring, it does not exclude.
    expect(config.requiresFundamentals({ catalogSource: 'NSE_EQUITY_SECURITIES' })).toBe(false);
    expect(config.requiresFundamentals({ catalogSource: 'OTHER' })).toBe(false);
    // matches the frozen default object
    expect(config.liquidity.volumeBands).toEqual(DEFAULT_DATA_QUALITY_CONFIG.liquidity.volumeBands);
  });

  it('US region uses the US calendar, scaled volume bands, and no fundamentals gate', () => {
    const config = resolveDataQualityConfig({ region: 'US' });
    expect(config.calendarRegion).toBe('US');
    expect(config.tradingMode).toBe('SESSIONS');
    expect(config.requiresFundamentals({ catalogSource: 'NSE_EQUITY_SECURITIES' })).toBe(false);
    expect(config.liquidity.volumeBands[0].minAverageVolume).toBe(5_000_000);
  });

  it('CRYPTO asset type switches to a continuous 24/7 calendar with tight staleness', () => {
    const config = resolveDataQualityConfig({ region: 'GLOBAL', assetType: 'CRYPTO' });
    expect(config.tradingMode).toBe('CONTINUOUS');
    expect(config.staleSessionThreshold).toBe(1);
    expect(config.requiresFundamentals({ catalogSource: 'NSE_EQUITY_SECURITIES' })).toBe(false);
  });

  it('folds the legacy EQUITY asset alias into STOCK', () => {
    expect(normalizeAssetType('EQUITY')).toBe('STOCK');
    expect(normalizeAssetType('')).toBe('STOCK');
    expect(normalizeAssetType('crypto')).toBe('CRYPTO');
  });
});

describe('region-configurable liquidity bands', () => {
  it('scores the same volume differently under IN vs US bands (status can flip)', () => {
    const inConfig = resolveDataQualityConfig({ region: 'IN' });
    const usConfig = resolveDataQualityConfig({ region: 'US' });
    // 30k average daily volume: above IN's 10k band (+15 → LIQUID) but below
    // US's 50k band (+0 → THIN). Proves the bands are region-specific, not the
    // old one-size-fits-all INR-scale thresholds.
    const prices = constantVolumePrices(60, 30_000);
    const inLiquidity = calculateLiquidity(prices, inConfig);
    const usLiquidity = calculateLiquidity(prices, usConfig);
    expect(inLiquidity.status).toBe('LIQUID');
    expect(usLiquidity.status).toBe('THIN');
    expect(inLiquidity.score).toBeGreaterThan(usLiquidity.score);
  });
});

describe('continuous (crypto) staleness vs session staleness', () => {
  it('treats a 3-calendar-day-old price as stale for crypto but not for an equity weekend gap', () => {
    const cryptoConfig = resolveDataQualityConfig({ region: 'GLOBAL', assetType: 'CRYPTO' });
    const inConfig = resolveDataQualityConfig({ region: 'IN' });
    // asOf = Monday evening (past IN close); price dated the prior Friday.
    const asOf = new Date('2026-06-15T20:00:00.000Z');
    const fridayPrice = new Date('2026-06-12T00:00:00.000Z');

    const crypto = computeStaleness(fridayPrice, cryptoConfig, asOf);
    const equity = computeStaleness(fridayPrice, inConfig, asOf);

    // Crypto: every day trades → 3 days behind → stale (threshold 1).
    expect(crypto.isStale).toBe(true);
    // Equity: Fri→Mon spans ≤ 3 trading sessions → not stale (threshold 3).
    expect(equity.isStale).toBe(false);
  });

  it('a fresh price is never stale in either mode', () => {
    const cryptoConfig = resolveDataQualityConfig({ assetType: 'CRYPTO' });
    const now = new Date();
    expect(computeStaleness(now, cryptoConfig, now).isStale).toBe(false);
    expect(computeStaleness(now, cryptoConfig, now).staleSessions).toBe(0);
  });
});

describe('calibration eligibility is price-driven (dead-signal-gate fix)', () => {
  const service = new DataQualityEngineService();
  const latest = pricesNewestFirst(1)[0];
  const fundamentals = [{ eps: 1 }];
  const actions = [{ action_type: 'dividend' }];

  it('is eligible at >=60 price bars even when no signal history exists', () => {
    // hasSignal=false reproduces the production reality (signal service is never
    // injected). Previously this forced eligibleForCalibration=false forever.
    const result = service.evaluateInstrument(inInstrument(), pricesNewestFirst(60), latest, fundamentals, actions, false);
    expect(result.eligibleForCalibration).toBe(true);
  });

  it('is ineligible below the calibration bar minimum', () => {
    const result = service.evaluateInstrument(inInstrument(), pricesNewestFirst(59), latest, fundamentals, actions, false);
    expect(result.eligibleForCalibration).toBe(false);
  });

  it('agrees with the instrument_eligibility verdict (both price-bars-based)', () => {
    const facts = service.computeEligibilityFacts(inInstrument(), pricesNewestFirst(60), latest, fundamentals, 0, 80);
    const verdicts = service.computeEligibilityVerdicts(facts, inInstrument(), 90);
    const dtoEligible = service.evaluateInstrument(inInstrument(), pricesNewestFirst(60), latest, fundamentals, actions, false).eligibleForCalibration;
    expect(verdicts.calibrationEligible).toBe(dtoEligible);
  });
});
