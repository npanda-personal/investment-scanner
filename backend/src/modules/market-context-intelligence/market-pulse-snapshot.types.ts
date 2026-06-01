export type MarketPulseSnapshotStatus = 'FRESH' | 'PARTIAL' | 'STALE' | 'FAILED';
export type MarketPulseHealthLabel = 'HEALTHY' | 'TRADABLE_BUT_SELECTIVE' | 'FRAGILE' | 'RISKY';

export interface MarketPulseScope {
  region: string;
  assetType: string;
  timeframe?: string;
}

export interface MarketPulsePricePoint {
  symbol: string;
  label?: string | null;
  source?: string | null;
  timestamp: Date;
  close: number;
  adjustedClose?: number | null;
  volume?: number | null;
}

export interface MarketPulseStockUniverseItem {
  id: string;
  symbol: string;
  sector?: string | null;
  marketCap?: number | null;
}

export interface MarketPulseSourceImport {
  source: string;
  segment: string;
  status: string;
  tradingDate: Date;
  importedAt?: Date | null;
}

export interface MarketPulseDeliveryPoint {
  symbol: string;
  tradingDate: Date;
  deliveryPercent?: number | null;
  tradedQuantity?: number | null;
  deliverableQuantity?: number | null;
}

export interface MarketPulseCalculationData {
  region: string;
  assetType: string;
  stockUniverse: MarketPulseStockUniverseItem[];
  stockPrices: MarketPulsePricePoint[];
  indexPrices: MarketPulsePricePoint[];
  sectorIndexPrices: MarketPulsePricePoint[];
  deliverySnapshots: MarketPulseDeliveryPoint[];
  sourceImports: MarketPulseSourceImport[];
}

export interface MarketPulseIndexSummary {
  symbol: string;
  label: string;
  value: number | null;
  changePercent: number | null;
  return1W: number | null;
  return1M: number | null;
  return3M: number | null;
  score: number;
  freshness?: string | null;
}

export interface MarketPulseSectorSummary {
  sector: string;
  return1W: number | null;
  return1M: number | null;
  return3M: number | null;
  score: number;
  classification: 'STRONG' | 'IMPROVING' | 'NEUTRAL' | 'WEAK';
}

export interface MarketPulseBreadthSummary {
  status: 'READY' | 'PARTIAL' | 'UNAVAILABLE';
  percentAbove20Dma: number | null;
  percentAbove50Dma: number | null;
  percentAbove200Dma: number | null;
  percentPositive1M: number | null;
  percentPositive3M: number | null;
  sampleCount: number;
  sma20SampleCount: number;
  sma50SampleCount: number;
  sma200SampleCount: number;
  positive1MSampleCount: number;
  positive3MSampleCount: number;
  summaryText: string;
}

export interface MarketPulseDeliverySummary {
  status: 'READY' | 'PARTIAL' | 'UNAVAILABLE';
  sampleCount: number;
  highDeliveryCount: number;
  highDeliveryPercent: number | null;
  latestTradingDate: string | null;
  summaryText: string;
}

export interface MarketPulseSourceSummary {
  status: MarketPulseSnapshotStatus;
  score: number;
  latestCompletedTradingDate: string | null;
  dataThroughDate: string | null;
  segments: Record<string, {
    status: 'FRESH' | 'STALE' | 'MISSING';
    tradingDate: string | null;
    importedAt: string | null;
  }>;
}

export interface MarketPulseSnapshotInput {
  snapshotDate: Date;
  dataThroughDate: Date;
  generatedAt: Date;
  region: string;
  assetType: string;
  timeframe: string;
  status: MarketPulseSnapshotStatus;
  marketHealthScore: number;
  marketHealthLabel: MarketPulseHealthLabel;
  indexTrendScore: number;
  sectorStrengthScore: number;
  breadthScore: number;
  deliveryParticipationScore: number;
  dataFreshnessScore: number;
  topIndicesJson: MarketPulseIndexSummary[];
  strongSectorsJson: MarketPulseSectorSummary[];
  weakSectorsJson: MarketPulseSectorSummary[];
  breadthSummaryJson: MarketPulseBreadthSummary;
  deliverySummaryJson: MarketPulseDeliverySummary;
  candidateCount: number;
  warningsJson: string[];
  sourceSummaryJson: MarketPulseSourceSummary;
  pipelineRunId?: string | null;
}

export interface MarketPulseSnapshotRecord extends MarketPulseSnapshotInput {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MarketPulseSnapshotDto {
  snapshotDate: string;
  dataThroughDate: string;
  generatedAt: string;
  status: MarketPulseSnapshotStatus;
  marketHealthScore: number;
  marketHealthLabel: MarketPulseHealthLabel;
  indexTrendScore: number;
  sectorStrengthScore: number;
  breadthScore: number;
  deliveryParticipationScore: number;
  dataFreshnessScore: number;
  topIndices: MarketPulseIndexSummary[];
  strongSectors: string[];
  weakSectors: string[];
  breadthSummary: string;
  deliverySummary: string;
  candidateCount: number;
  warnings: string[];
  sourceSummary: MarketPulseSourceSummary;
  pipelineRunId?: string | null;
}

export interface MarketPulseSnapshotEnvelope {
  availability: 'READY' | 'EMPTY';
  scope: {
    region: string;
    assetType: string;
    timeframe: string;
  };
  snapshot: MarketPulseSnapshotDto | null;
  message: string;
  warnings: string[];
}

export interface MarketPulseRefreshRequest extends MarketPulseScope {
  generatedAt?: Date;
  pipelineRunId?: string | null;
}

export interface MarketPulseCalculationOptions {
  generatedAt?: Date;
  pipelineRunId?: string | null;
  timeframe?: string;
}
