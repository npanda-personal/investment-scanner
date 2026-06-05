export type SmartMoneyStatus = 'ACCUMULATION' | 'NEUTRAL' | 'DISTRIBUTION' | 'INSUFFICIENT_DATA';
export type SmartMoneyConfidence = 'LOW' | 'MEDIUM' | 'HIGH';
export type SmartMoneyDataStatus = 'COMPLETE' | 'PARTIAL' | 'MISSING' | 'ERROR';
export type SmartMoneyRange = '1M' | '3M' | '6M';
export type SmartMoneySignalDirection = 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL';
/**
 * Sector-level Smart Money classification status.
 *
 * Primary rule — count-based (used when classified stocks >= 3):
 *   netAccShare = accumulationCount / (accumulationCount + distributionCount)
 *   netAccShare >= 0.65 → STRONG_ACCUMULATION
 *   netAccShare >= 0.55 → ACCUMULATING
 *   netAccShare >= 0.45 → NEUTRAL
 *   netAccShare >= 0.35 → DISTRIBUTING
 *                else   → STRONG_DISTRIBUTION
 *
 * Score-based fallback (when classified < 3):
 *   averageSmartMoneyScore >= 62 → STRONG_ACCUMULATION
 *   averageSmartMoneyScore >= 56 → ACCUMULATING
 *   averageSmartMoneyScore >= 48 → NEUTRAL
 *   averageSmartMoneyScore >= 38 → DISTRIBUTING
 *                             else → STRONG_DISTRIBUTION
 */
export type SectorSmartMoneyStatus =
  | 'STRONG_ACCUMULATION'
  | 'ACCUMULATING'
  | 'NEUTRAL'
  | 'DISTRIBUTING'
  | 'STRONG_DISTRIBUTION';
export type SmartMoneyEvidenceStatus = 'USABLE' | 'LIMITED' | 'UNAVAILABLE';
export type SmartMoneyFreshnessStatus = 'CURRENT' | 'STALE' | 'UNKNOWN';
export type SmartMoneyEvidenceSource = 'PERSISTED_SNAPSHOT' | 'ON_DEMAND_DERIVED';
export type SmartMoneyDataThroughBasis = 'SNAPSHOT_DATE' | 'LAST_PRICE_BAR_DATE' | 'UNAVAILABLE';
export type SmartMoneyOwnershipTrustStatus = 'COMPLETE' | 'PARTIAL_OWNERSHIP_GAP';
export type SmartMoneyEvidenceReasonCode =
  | 'PERSISTED_SNAPSHOT_USED'
  | 'ON_DEMAND_FALLBACK_USED'
  | 'SNAPSHOT_CURRENT'
  | 'SNAPSHOT_STALE'
  | 'OWNERSHIP_PLACEHOLDER'
  | 'INSUFFICIENT_PRICE_HISTORY'
  | 'INSUFFICIENT_VOLUME_HISTORY'
  | 'DATA_THROUGH_FROM_SNAPSHOT_DATE'
  | 'DATA_THROUGH_FROM_LAST_PRICE_BAR'
  | 'DATA_QUALITY_READY'
  | 'DATA_QUALITY_LIMITED'
  | 'DATA_QUALITY_BLOCKED'
  | 'DATA_QUALITY_UNAVAILABLE'
  | 'DOWNSTREAM_PERSISTED_ONLY';

export interface SmartMoneyPriceBar {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  volume: number | null;
  dataStatus?: string | null;
}

export interface SmartMoneySignal {
  type: string;
  label: string;
  direction: SmartMoneySignalDirection;
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

export interface SmartMoneyEvidence {
  evidenceStatus: SmartMoneyEvidenceStatus;
  freshnessStatus: SmartMoneyFreshnessStatus;
  provenance: {
    source: SmartMoneyEvidenceSource;
    persistedSnapshotAvailableAtRequestStart: boolean;
    downstreamSafe: boolean;
    reasonSummary: string;
  };
  coverage: {
    requestedRange: SmartMoneyRange;
    snapshotDate: string | null;
    dataThroughDate: string | null;
    dataThroughBasis: SmartMoneyDataThroughBasis;
    rangeLabel: string;
  };
  ownershipTrust: {
    status: SmartMoneyOwnershipTrustStatus;
    ownershipDataStatus: SmartMoneyDataStatus;
    reasonSummary: string;
  };
  reasonCodes: SmartMoneyEvidenceReasonCode[];
  reasonSummary: string;
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
  dataQualityStatus?: string | null;
  dataQualityWarnings?: string[];
  evidence?: SmartMoneyEvidence;
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
  updatedAt: string;
}

export interface SmartMoneyHealth {
  status: 'ok';
  module: 'smart-money-intelligence';
  source: string;
  dataStatus: SmartMoneyDataStatus;
  updatedAt: string;
  notes: string[];
}

export interface SmartMoneyListQuery {
  limit: number;
  offset?: number;
  sector?: string;
  region?: string;
  assetType?: string;
  range: SmartMoneyRange;
}

export interface SmartMoneyRunResponse {
  generated: number;
  skipped: number;
  unchanged?: number;
  errors: string[];
  byRange: Record<SmartMoneyRange, { generated: number; skipped: number; unchanged?: number }>;
  processedCount: number;
  totalCount: number;
  batchSize: number;
  offset: number;
  nextOffset: number | null;
  hasMore: boolean;
  generatedCount: number;
  skippedCount: number;
  unchangedCount?: number;
  failedCount: number;
  warnings: string[];
  durationMs: number;
  scope: {
    region: string;
    assetType: string;
  };
}

export interface SmartMoneyRunQuery {
  region?: string;
  assetType?: string;
  offset?: number;
  instrumentIds?: string[];
}
