export type SmartMoneyStatus = 'ACCUMULATION' | 'NEUTRAL' | 'DISTRIBUTION' | 'INSUFFICIENT_DATA';
export type SmartMoneyConfidence = 'LOW' | 'MEDIUM' | 'HIGH';
export type SmartMoneyDataStatus = 'COMPLETE' | 'PARTIAL' | 'MISSING' | 'ERROR';
export type SmartMoneyRange = '1M' | '3M' | '6M';
export type SectorSmartMoneyStatus =
  | 'STRONG_ACCUMULATION'
  | 'ACCUMULATING'
  | 'NEUTRAL'
  | 'DISTRIBUTING'
  | 'STRONG_DISTRIBUTION';

export interface SmartMoneySignal {
  type: string;
  label: string;
  direction: 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL';
  strength: number;
  details: string;
}

export interface InsiderOwnershipSummary {
  insiderBuyCount: number | null;
  insiderSellCount: number | null;
  netInsiderActivity: number | null;
  institutionalOwnershipPercent: number | null;
  ownershipDataStatus: SmartMoneyDataStatus;
  source: string;
  explanation: string;
}

export interface SmartMoneyStockSummary {
  instrumentId: string;
  symbol: string;
  companyName: string | null;
  sector: string | null;
  smartMoneyScore: number;
  status: SmartMoneyStatus;
  confidence: SmartMoneyConfidence;
  explanation: string;
  updatedAt: string;
  dataStatus: SmartMoneyDataStatus;
  source: string;
  range: SmartMoneyRange;
  latestClose: number | null;
  latestVolume: number | null;
  averageVolume20: number | null;
  dailyChangePercent: number | null;
  signals: SmartMoneySignal[];
  insiderOwnership: InsiderOwnershipSummary;
  researchUrl: string;
  snapshotDate?: string | null;
  dataThroughDate?: string | null;
}

export interface SectorSmartMoneySummary {
  sector: string;
  averageSmartMoneyScore: number;
  accumulationCount: number;
  distributionCount: number;
  unusualVolumeCount: number;
  instrumentCount: number;
  sectorStatus: SectorSmartMoneyStatus;
  dataStatus: SmartMoneyDataStatus;
  snapshotDate?: string | null;
  dataThroughDate?: string | null;
  updatedAt: string;
}

export interface PaginatedSmartMoneyListResponse {
  results: SmartMoneyStockSummary[];
  total: number;
}

export interface SmartMoneyHealth {
  status: 'ok';
  module: 'smart-money-intelligence';
  source: string;
  dataStatus: SmartMoneyDataStatus;
  updatedAt: string;
  notes: string[];
}

export interface FnoBanListResponse {
  status: 'ready' | 'missing' | 'error';
  source: string;
  banDate: string | null;
  fetchedAt: string;
  symbols: string[];
  count: number;
  message?: string;
}

export interface SmartMoneyRunResponse {
  generated: number;
  skipped: number;
  errors: string[];
  byRange?: Record<SmartMoneyRange, { generated: number; skipped: number }>;
  processedCount?: number;
  totalCount?: number;
  batchSize?: number;
  offset?: number;
  nextOffset?: number | null;
  hasMore?: boolean;
  generatedCount?: number;
  skippedCount?: number;
  failedCount?: number;
  warnings?: string[];
  durationMs?: number;
  scope?: {
    region: string;
    assetType: string;
  };
}
