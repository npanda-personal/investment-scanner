import type { MarketRegion } from './market-scope';
import { normalizeMarketRegion } from './market-scope';

/**
 * MarketProfile — the single source of truth for per-asset-class capabilities
 * and market parameters.
 *
 * Domain logic must branch on the capability FLAGS exposed here rather than on
 * scattered `assetType === 'CRYPTO'` string checks.  This keeps multi-market
 * behavior (India equities now, US/EU later, crypto now) declarative and in one
 * place.  It is a pure module: no DB, no IO, safe to import anywhere (including
 * shared/utils, ingestion, domain modules, and the pipeline).
 */

export type AssetClass = 'STOCK' | 'ETF' | 'INDEX' | 'CRYPTO' | 'FUND' | 'COMMODITY' | 'FOREX';

export interface MarketCapabilities {
  /** Has fundamental statements (revenue/EPS/PE/etc.). */
  hasFundamentals: boolean;
  /** Has exchange delivery / settlement participation data (NSE delivery%). */
  hasDelivery: boolean;
  /** Has institutional flow data (FII/DII, block/bulk deals). */
  hasInstitutionalFlow: boolean;
  /** Has SEC-filing "smart money": insider (Form 4) + institutional (13F) — US only. */
  hasSecSmartMoney: boolean;
  /** Pays dividends. */
  hasDividends: boolean;
  /** Subject to share splits / bonuses. */
  hasSplits: boolean;
  /** Belongs to a sector taxonomy. */
  hasSectors: boolean;
  /** Has tracked index constituents (Nifty 50 / Nifty Bank). */
  hasIndexConstituents: boolean;
  /** Has an earnings calendar (quarterly/annual results). */
  hasEarnings: boolean;
  /** Market-wide breadth (advance/decline, % above SMA) is meaningful. */
  hasMarketBreadth: boolean;
  /** A market-regime read (risk-on/off + score) is computed for this asset class. */
  hasRegime: boolean;
  /** Has a volatility index (India VIX). */
  hasVix: boolean;
  /** Volume-based interest scoring applies. */
  hasVolumeInterest: boolean;
}

export type TradingCalendarKind = 'EXCHANGE' | 'CONTINUOUS_24_7';

export interface TradingCalendarProfile {
  kind: TradingCalendarKind;
  region: MarketRegion;
  timezone: string;
  /** Days the market trades: 0=Sun .. 6=Sat. */
  weekdays: number[];
}

export interface MarketBenchmark {
  /** Provider symbol for the region's headline index (e.g. ^NSEI, ^GSPC, ^STOXX). */
  symbol: string;
  /** Display label (e.g. "Nifty 50", "S&P 500", "STOXX 600"). */
  label: string;
}

export interface MarketProfile {
  assetClass: AssetClass;
  region: MarketRegion;
  currency: string;
  tradingCalendar: TradingCalendarProfile;
  capabilities: MarketCapabilities;
  /** Annualised risk-free rate used in Sharpe/Sortino (decimal, 0.065 = 6.5%). */
  riskFreeRateAnnual: number;
  /** One-way transaction cost as a decimal fraction (0.00225 = 0.225%/leg). */
  oneWayTxnCostPercent: number;
  /** Headline benchmark index for relative-strength / backtest alpha. */
  benchmark: MarketBenchmark;
}

// ─── Canonical India-equity parameters (single source of truth) ──────────────
// These values were previously hardcoded inside backtesting-strategy-lab.service.ts.
// They now live here so every market reads from the same place.

/** Annualised risk-free rate baseline (Indian 91-day T-bill / Repo, ~2024). */
export const ANNUAL_RISK_FREE_RATE_IN = 0.065;
/** Annualised risk-free rate baselines for other regions (decimal). */
export const ANNUAL_RISK_FREE_RATE_US = 0.045;
export const ANNUAL_RISK_FREE_RATE_EU = 0.03;
/** India delivery-equity one-way transaction cost (0.225%/leg → 0.45% round-trip). */
export const IN_ONE_WAY_COST_PERCENT = 0.00225;
/** Default one-way cost for non-IN equities (flat baseline). */
export const DEFAULT_ONE_WAY_COST_PERCENT = 0.001;

/** Headline benchmark index per equity region (provider symbols). */
function equityBenchmark(region: MarketRegion): MarketBenchmark {
  switch (region) {
    case 'IN':
      return { symbol: '^NSEI', label: 'Nifty 50' };
    case 'US':
      return { symbol: '^GSPC', label: 'S&P 500' };
    case 'EU':
      return { symbol: '^STOXX', label: 'STOXX 600' };
    default:
      return { symbol: '^GSPC', label: 'S&P 500' };
  }
}

/** Annualised risk-free rate per equity region (IN preserved byte-identical). */
function equityRiskFreeRate(region: MarketRegion): number {
  switch (region) {
    case 'US':
      return ANNUAL_RISK_FREE_RATE_US;
    case 'EU':
      return ANNUAL_RISK_FREE_RATE_EU;
    default:
      return ANNUAL_RISK_FREE_RATE_IN;
  }
}

const EQUITY_CAPABILITIES_FULL: MarketCapabilities = {
  hasFundamentals: true,
  hasDelivery: true,
  hasInstitutionalFlow: true,
  hasSecSmartMoney: false,
  hasDividends: true,
  hasSplits: true,
  hasSectors: true,
  hasIndexConstituents: true,
  hasEarnings: true,
  hasMarketBreadth: true,
  hasRegime: true,
  hasVix: true,
  hasVolumeInterest: true,
};

const CRYPTO_CAPABILITIES: MarketCapabilities = {
  hasFundamentals: false,
  hasDelivery: false,
  hasInstitutionalFlow: false,
  hasSecSmartMoney: false,
  hasDividends: false,
  hasSplits: false,
  hasSectors: false,
  hasIndexConstituents: false,
  hasEarnings: false,
  hasMarketBreadth: false,
  hasRegime: true,
  hasVix: false,
  hasVolumeInterest: true,
};

function normalizeAssetClass(assetType?: string | null): AssetClass {
  const value = String(assetType || '').trim().toUpperCase();
  switch (value) {
    case 'CRYPTO':
    case 'ETF':
    case 'INDEX':
    case 'FUND':
    case 'COMMODITY':
    case 'FOREX':
    case 'STOCK':
      return value as AssetClass;
    case 'EQUITY':
    case 'SHARE':
      return 'STOCK';
    default:
      return 'STOCK';
  }
}

function equityTimezone(region: MarketRegion): string {
  switch (region) {
    case 'IN':
      return 'Asia/Kolkata';
    case 'US':
      return 'America/New_York';
    case 'EU':
      return 'Europe/Berlin';
    default:
      return 'UTC';
  }
}

function equityCurrency(region: MarketRegion): string {
  switch (region) {
    case 'IN':
      return 'INR';
    case 'US':
      return 'USD';
    case 'EU':
      return 'EUR';
    default:
      return 'USD';
  }
}

/**
 * The crypto market profile: 24/7 continuous trading, USD-quoted, no equity-only
 * capabilities, zero risk-free rate, flat one-way cost.
 */
export const CRYPTO_PROFILE: MarketProfile = {
  assetClass: 'CRYPTO',
  region: 'GLOBAL',
  currency: 'USD',
  tradingCalendar: {
    kind: 'CONTINUOUS_24_7',
    region: 'GLOBAL',
    timezone: 'UTC',
    weekdays: [0, 1, 2, 3, 4, 5, 6],
  },
  capabilities: CRYPTO_CAPABILITIES,
  riskFreeRateAnnual: 0,
  oneWayTxnCostPercent: DEFAULT_ONE_WAY_COST_PERCENT,
  benchmark: { symbol: 'BTCUSDT', label: 'Bitcoin' },
};

function makeEquityProfile(assetClass: AssetClass, region: MarketRegion): MarketProfile {
  const isIndia = region === 'IN';
  return {
    assetClass,
    region,
    currency: equityCurrency(region),
    tradingCalendar: {
      kind: 'EXCHANGE',
      region,
      timezone: equityTimezone(region),
      weekdays: [1, 2, 3, 4, 5],
    },
    capabilities: {
      ...EQUITY_CAPABILITIES_FULL,
      // India-specific data sources: delivery%, FII/DII.
      hasDelivery: isIndia,
      hasInstitutionalFlow: isIndia,
      // US-specific "smart money" from free SEC filings: Form 4 insider + 13F institutional.
      hasSecSmartMoney: region === 'US',
      // Index Constituents screen: available for IN (Nifty 50/Bank) and US (S&P 500/NASDAQ-100).
      hasIndexConstituents: isIndia || region === 'US',
      // Volatility index: India VIX (NSE) for IN, CBOE ^VIX (Yahoo) for US.
      hasVix: isIndia || region === 'US',
    },
    // IN preserved byte-identical (0.065); US/EU use their own baselines.
    riskFreeRateAnnual: equityRiskFreeRate(region),
    oneWayTxnCostPercent: isIndia ? IN_ONE_WAY_COST_PERCENT : DEFAULT_ONE_WAY_COST_PERCENT,
    benchmark: equityBenchmark(region),
  };
}

/** The canonical India-equity profile (byte-identical to prior hardcoded behavior). */
export const IN_STOCK_PROFILE: MarketProfile = makeEquityProfile('STOCK', 'IN');

/**
 * Resolve the MarketProfile for a given scope.  Asset class wins over region:
 * a CRYPTO scope always returns the crypto profile regardless of region.
 */
export function resolveMarketProfile(input: { assetType?: string | null; region?: string | null }): MarketProfile {
  const assetClass = normalizeAssetClass(input.assetType);
  if (assetClass === 'CRYPTO') {
    return CRYPTO_PROFILE;
  }
  const region = normalizeMarketRegion(input.region) ?? 'GLOBAL';
  return makeEquityProfile(assetClass, region);
}

/** Convenience: daily risk-free rate (252-trading-day approximation). */
export function dailyRiskFreeRate(profile: MarketProfile): number {
  return profile.riskFreeRateAnnual / 252;
}
