export type EarningsIntelligenceCategory =
  | 'UPCOMING_RESULTS'
  | 'PRE_RESULT_INTEREST'
  | 'RESULT_WINNERS'
  | 'RESULT_DISAPPOINTMENTS'
  | 'RESULT_REACTION_HISTORY'
  | 'EARNINGS_WATCHLIST';

export type EarningsFreshness = 'FRESH' | 'PARTIAL' | 'STALE' | 'MISSING';

export type EarningsResultDateSource =
  | 'OFFICIAL_CALENDAR'
  | 'ESTIMATED_FROM_PERIOD_CADENCE'
  | 'PERIOD_END_DATE_FALLBACK'
  | 'VALIDATED_AT_FALLBACK'
  | 'UNKNOWN';

export interface EarningsProvenanceSummary {
  rowCount: number;
  resultDateSourceCounts: Record<string, number>;
  warningCounts: Record<string, number>;
  officialCalendarRows: number;
  estimatedRows: number;
  fallbackRows: number;
  unknownRows: number;
}

export interface EarningsIntelligenceQuery {
  region: string;
  assetType: string;
  category?: EarningsIntelligenceCategory;
  limit: number;
}

export interface EarningsIntelligenceRefreshRequest {
  region?: string;
  assetType?: string;
  snapshotDate?: Date;
  dataThroughDate?: Date | null;
  batchSize?: number;
  offset?: number;
  instrumentIds?: string[];
}

export interface EarningsIntelligenceRefreshResult {
  status: 'COMPLETED' | 'PARTIAL' | 'FAILED' | 'SKIPPED';
  snapshotDate: string;
  dataThroughDate: string | null;
  region: string;
  assetType: string;
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
  categories: Record<EarningsIntelligenceCategory, number>;
}

export interface EarningsSnapshotDto {
  id: string;
  snapshotDate: string;
  dataThroughDate: string | null;
  symbol: string;
  resultDate: string | null;
  resultDateSource: EarningsResultDateSource | string;
  periodEndDate: string | null;
  validatedAt: string | null;
  daysToResult: number | null;
  revenueGrowth: number | null;
  profitGrowth: number | null;
  epsGrowth: number | null;
  marginTrend: number | null;
  consistencyScore: number;
  accelerationScore: number;
  reasonTags: string[];
  riskTags: string[];
  warnings: string[];
  freshness: EarningsFreshness | string;
  categories: EarningsIntelligenceCategory[];
}

export interface EarningsIntelligenceResponse {
  scope: {
    region: string;
    assetType: string;
  };
  snapshotDate: string | null;
  dataThroughDate: string | null;
  generatedAt: string;
  freshness: EarningsFreshness | 'NO_SNAPSHOT';
  categories: Record<EarningsIntelligenceCategory, EarningsSnapshotDto[]>;
  items: EarningsSnapshotDto[];
  warnings: string[];
  provenance: EarningsProvenanceSummary;
}

export interface EarningsFundamentalInput {
  id?: string;
  stockId: string;
  revenue: number | null;
  eps: number | null;
  netIncome: number | null;
  periodType: string;
  periodEndDate: Date;
  officialResultDate?: Date | null;
  source: string;
  validatedAt?: Date | null;
  ingestionTimestamp?: Date | null;
  lastUpdatedTimestamp?: Date | null;
  dataStatus?: string | null;
}

export interface EarningsPricePointInput {
  symbol: string;
  timestamp: Date;
  close: number;
  adjustedClose: number | null;
  volume: number | null;
}

export interface EarningsDeliveryInput {
  stockId: string;
  symbol: string;
  tradingDate: Date;
  deliveryPercent: number | null;
  tradedQuantity: number | null;
  deliverableQuantity: number | null;
}

export interface EarningsSnapshotCalculationInput {
  stockId: string;
  symbol: string;
  region: string;
  assetType: string;
  snapshotDate: Date;
  dataThroughDate: Date | null;
  fundamentals: EarningsFundamentalInput[];
  prices: EarningsPricePointInput[];
  deliverySnapshots: EarningsDeliveryInput[];
}

export type EarningsSnapshotUpsertInput = Omit<EarningsSnapshotDto, 'id' | 'snapshotDate' | 'dataThroughDate' | 'resultDate' | 'periodEndDate' | 'validatedAt'> & {
  snapshotDate: Date;
  dataThroughDate: Date | null;
  stockId: string;
  scopeRegion: string;
  scopeAssetType: string;
  resultDate: Date | null;
  periodEndDate: Date | null;
  validatedAt: Date | null;
};
