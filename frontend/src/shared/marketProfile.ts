/**
 * Frontend mirror of the backend MarketProfile capability layer
 * (backend/src/shared/utils/market-profile.ts).
 *
 * Pure, dependency-free: screens read these capability flags to render crypto
 * data where applicable and gracefully degrade equity-only panels (showing a
 * NotApplicableForAssetClass state) for assetType=CRYPTO.
 *
 * Keep in lock-step with the backend resolver.
 */

export interface UiMarketCapabilities {
  hasFundamentals: boolean;
  hasDelivery: boolean;
  hasInstitutionalFlow: boolean;
  hasDividends: boolean;
  hasSplits: boolean;
  hasSectors: boolean;
  hasIndexConstituents: boolean;
  hasEarnings: boolean;
  hasMarketBreadth: boolean;
  hasRegime: boolean;
  hasVix: boolean;
  hasVolumeInterest: boolean;
}

export interface UiMarketProfile {
  assetClass: string;
  isCrypto: boolean;
  currency: string;
  /** Headline benchmark label for relative-strength / alpha displays. */
  benchmarkLabel: string;
  capabilities: UiMarketCapabilities;
}

/** Headline benchmark label per region (mirrors backend market-profile). */
export function benchmarkLabelForRegion(region?: string | null): string {
  const r = String(region || '').trim().toUpperCase();
  if (r === 'US') return 'S&P 500';
  if (r === 'EU') return 'STOXX 600';
  return 'Nifty 50';
}

const EQUITY_CAPS_FULL: UiMarketCapabilities = {
  hasFundamentals: true,
  hasDelivery: true,
  hasInstitutionalFlow: true,
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

const CRYPTO_CAPS: UiMarketCapabilities = {
  hasFundamentals: false,
  hasDelivery: false,
  hasInstitutionalFlow: false,
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

export function resolveUiMarketProfile(scope: { region?: string | null; assetType?: string | null }): UiMarketProfile {
  const assetClass = String(scope.assetType || 'STOCK').trim().toUpperCase();
  if (assetClass === 'CRYPTO') {
    return { assetClass: 'CRYPTO', isCrypto: true, currency: 'USD', benchmarkLabel: 'Bitcoin', capabilities: CRYPTO_CAPS };
  }
  const region = String(scope.region || '').trim().toUpperCase();
  const isIndia = region === 'IN' || region === 'INDIA';
  const currency = isIndia ? 'INR' : region === 'US' ? 'USD' : region === 'EU' ? 'EUR' : 'USD';
  return {
    assetClass: assetClass || 'STOCK',
    isCrypto: false,
    currency,
    benchmarkLabel: benchmarkLabelForRegion(region),
    capabilities: {
      ...EQUITY_CAPS_FULL,
      hasDelivery: isIndia,
      hasInstitutionalFlow: isIndia,
      // US has curated S&P 500 / NASDAQ-100 constituents (backend index-constituents service).
      hasIndexConstituents: isIndia || region === 'US',
      // Volatility index: India VIX (NSE) for IN, CBOE ^VIX (Yahoo) for US.
      hasVix: isIndia || region === 'US',
    },
  };
}
