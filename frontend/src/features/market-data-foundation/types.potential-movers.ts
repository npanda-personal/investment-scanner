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
