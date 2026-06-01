export type StockInterestCategory =
  | 'TODAY_TOP_INTEREST'
  | 'GROWTH_CONSISTENCY'
  | 'GROWTH_ACCELERATION'
  | 'SECTOR_LEADERS'
  | 'ACCUMULATION'
  | 'BREAKOUTS'
  | 'RISK_AVOID';

export type StockInterestRefreshStatus = 'COMPLETED' | 'PARTIAL' | 'FAILED' | 'SKIPPED';
export type StockInterestAvailability = 'READY' | 'EMPTY' | 'ERROR';

export interface StockInterestScope {
  region: string;
  assetType: string;
}

export interface StockInterestStockInput {
  id: string;
  symbol: string;
  company: string;
  sector: string | null;
}

export interface StockInterestPriceInput {
  symbol: string;
  timestamp: Date;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  adjustedClose: number | null;
  volume: number | null;
}

export interface StockInterestLatestPriceInput {
  symbol: string;
  price: number;
  timestamp: Date;
}

export interface StockInterestDeliveryInput {
  symbol: string;
  tradingDate: Date;
  deliveryPercent: number | null;
}

export interface StockInterestFundamentalInput {
  stockId: string;
  symbol: string;
  periodEndDate: Date;
  revenue: number | null;
  netIncome: number | null;
  eps: number | null;
}

export interface StockInterestCalculationInput extends StockInterestScope {
  stocks: StockInterestStockInput[];
  priceTicks: StockInterestPriceInput[];
  latestPrices: StockInterestLatestPriceInput[];
  deliverySnapshots: StockInterestDeliveryInput[];
  fundamentals: StockInterestFundamentalInput[];
  totalUniverseCount?: number;
}

export interface StockInterestSnapshotWriteInput extends StockInterestScope {
  snapshotDate: Date;
  dataThroughDate: Date | null;
  generatedAt: Date;
  stockId: string;
  symbol: string;
  company: string;
  sector: string | null;
  timeframe: string;
  category: StockInterestCategory;
  score: number;
  direction: string;
  reasonTags: string[];
  riskTags: string[];
  freshness: string;
  warnings: string[];
  calculationVersion: string;
}

export interface StockInterestSnapshotDto {
  snapshotDate: string;
  dataThroughDate: string | null;
  generatedAt: string;
  category: StockInterestCategory;
  symbol: string;
  company: string;
  sector: string | null;
  score: number;
  direction: string;
  reasonTags: string[];
  riskTags: string[];
  freshness: string;
  warnings: string[];
}

export interface StockInterestSnapshotEnvelope {
  availability: StockInterestAvailability;
  scope: StockInterestScope;
  snapshot: StockInterestSnapshotDto[] | null;
  message: string;
  warnings: string[];
}

export interface StockInterestRefreshRequest extends Partial<StockInterestScope> {
  timeframe?: string;
  batchSize?: number;
  offset?: number;
  generatedAt?: Date;
  snapshotDate?: Date;
  dataThroughDate?: Date | null;
  pipelineRunId?: string | null;
}

export interface StockInterestRefreshResponse {
  status: StockInterestRefreshStatus;
  scope: StockInterestScope & { timeframe: string };
  snapshotDate: string;
  dataThroughDate: string | null;
  generatedAt: string;
  totalCount: number;
  processedCount: number;
  succeededCount: number;
  failedCount: number;
  skippedCount: number;
  unchangedCount: number;
  nextOffset: number | null;
  hasMore: boolean;
  warnings: string[];
  errors: string[];
  categories: Record<StockInterestCategory, number>;
}

export interface StockInterestSnapshotWriteSummary {
  createdCount: number;
  updatedCount: number;
  unchangedCount: number;
}
