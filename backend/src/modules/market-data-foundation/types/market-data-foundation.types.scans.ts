import type { MarketDataStatus } from './market-data-foundation.types.core';

export type MarketMoverRange = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y';

export interface MarketMoverRow {
  instrumentId: string;
  symbol: string;
  companyName: string;
  sector: string | null;
  latestDate: string;
  latestClose: number;
  baseDate: string;
  baseClose: number;
  returnPercent: number;
  priceBasis?: 'ADJUSTED_CLOSE' | 'CLOSE_FALLBACK';
  latestSource?: string | null;
  baseSource?: string | null;
  actualLookbackDays?: number;
  historyBarsInWindow?: number;
  averageRecentTurnover?: number | null;
  /** Populated by the service layer when building the response DTO (not stored in scan snapshot). */
  currency?: string;
  region?: string;
}

export interface MarketMoverRangeSummary {
  range: MarketMoverRange;
  gainers: MarketMoverRow[];
  losers: MarketMoverRow[];
  warnings: string[];
}

export interface MarketMoversSummary {
  scope: {
    region: string;
    assetType: string;
  };
  generatedAt: string;
  ranges: MarketMoverRangeSummary[];
}

export interface MarketMapTile {
  instrumentId: string;
  symbol: string;
  displaySymbol: string;
  companyName: string;
  sector: string | null;
  derivativesEligible: boolean | null;
  dataStatus: MarketDataStatus | null;
  returnPercent: number | null;
  latestDate: string | null;
  priceBasis?: 'ADJUSTED_CLOSE' | 'CLOSE_FALLBACK';
  currency: string;
  region?: string;
}

export interface MarketMapGroup {
  key: string;
  label: string;
  tileCount: number;
  avgReturnPercent: number | null;
}

export interface MarketMapSummary {
  status: 'ready' | 'missing';
  scope: {
    region: string;
    assetType: string;
  };
  asOf: string | null;
  range: MarketMoverRange;
  materialized: false;
  sourceLabels: {
    catalog: string;
    prices: string;
  };
  warnings: string[];
  gaps: string[];
  groups: MarketMapGroup[];
  tiles: MarketMapTile[];
}

// ---------------------------------------------------------------------------
// Market Scans
// ---------------------------------------------------------------------------

export interface MarketScanRow52w {
  instrumentId: string;
  symbol: string;
  companyName: string;
  sector: string | null;
  latestDate: string;
  currentPrice: number;
  high52w: number;
  low52w: number;
  pctFromHigh: number;
  pctFromLow: number;
  priceBasis: 'ADJUSTED_CLOSE' | 'CLOSE_FALLBACK';
  signalDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | null;
  signalScore: number | null;
  currency: string;
  region?: string;
}

export interface MarketScanSummary52w {
  scanType: '52w-high' | '52w-low';
  scope: { region: string; assetType: string };
  generatedAt: string;
  proximityPct: number;
  results: MarketScanRow52w[];
  warnings: string[];
}

export interface MarketScanRowDeliverySpike {
  instrumentId: string;
  symbol: string;
  companyName: string;
  sector: string | null;
  tradingDate: string;
  deliveryPct: number;
  avgDeliveryPct: number;
  spikeRatio: number;
  lookbackBars: number;
  signalDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | null;
  signalScore: number | null;
  currency: string;
  region?: string;
}

export interface MarketScanSummaryDeliverySpike {
  scanType: 'delivery-spike';
  scope: { region: string; assetType: string };
  generatedAt: string;
  minSpikeRatio: number;
  results: MarketScanRowDeliverySpike[];
  warnings: string[];
}

export interface MarketScanRowVolumeSpike {
  instrumentId: string;
  symbol: string;
  companyName: string;
  sector: string | null;
  latestDate: string;
  latestVolume: number;
  avgVolume: number;
  spikeRatio: number;
  lookbackBars: number;
  signalDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | null;
  signalScore: number | null;
  currency: string;
  region?: string;
}

export interface MarketScanSummaryVolumeSpike {
  scanType: 'volume-spike';
  scope: { region: string; assetType: string };
  generatedAt: string;
  minSpikeRatio: number;
  results: MarketScanRowVolumeSpike[];
  warnings: string[];
}

export interface MarketScanRowPotentialMovers {
  instrumentId: string;
  symbol: string;
  companyName: string;
  sector: string | null;
  latestDate: string;
  latestClose: number;
  dailyChangePct: number;
  move3dPct: number;
  avgVolume20: number;
  sma20: number;
  signalDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | null;
  signalScore: number | null;
  currency: string;
  region?: string;
}

export interface MarketScanSummaryPotentialMovers {
  scanType: 'potential-movers';
  scope: { region: string; assetType: string };
  generatedAt: string;
  results: MarketScanRowPotentialMovers[];
  warnings: string[];
}

export interface OfficialEodBulkSyncEvidence {
  enabled: boolean;
  attempted: boolean;
  sourceName: string | null;
  sourceUrl: string | null;
  sourceFileName: string | null;
  targetTradingDate: string | null;
  sourceFingerprint: string | null;
  rowsRead: number;
  rowsParsed: number;
  matchedInstruments: number;
  rowsInserted: number;
  rowsUpdated: number;
  rowsNoOp: number;
  fallbackReason: string | null;
  warnings: string[];
}
