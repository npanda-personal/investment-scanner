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
  | 'DATE_TBA'
  | 'ESTIMATED_FROM_PERIOD_CADENCE'
  | 'PERIOD_END_DATE_FALLBACK'
  | 'VALIDATED_AT_FALLBACK'
  | 'UNKNOWN';

export interface EarningsProvenanceSummary {
  rowCount: number;
  resultDateSourceCounts: Record<string, number>;
  warningCounts: Record<string, number>;
  officialCalendarRows: number;
  tbaDatesRows: number;
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

/**
 * Compact view of the stock's CURRENT trading signal, joined read-time from the
 * persisted signal-generation-engine snapshot (no live generation).  Present only
 * when a TRUSTED signal exists for the instrument; null/absent otherwise.
 * Research-support framing: a candidate posture for review, never a buy/sell call.
 */
export interface EarningsSignalSummary {
  direction: 'BULLISH' | 'NEUTRAL' | 'BEARISH' | string;
  score: number;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  lifecycleState: 'ENTRY' | 'ACTIVE' | 'EXIT' | 'EXPIRED' | string | null;
  triggerPrice: number | null;
  generatedDate: string | null;
}

export interface EarningsSnapshotDto {
  id: string;
  /** Instrument id (Stock.id) — used to join signals/technicals; also lets the UI deep-link. */
  stockId: string;
  snapshotDate: string;
  dataThroughDate: string | null;
  symbol: string;
  resultDate: string | null;
  /**
   * Human-readable label that indicates whether the result date is authoritative
   * (from the official NSE board-meeting calendar) or not yet announced.
   * Consumers should display this label next to the date so the trader
   * immediately knows the reliability level without decoding the enum.
   *
   * Values:
   *   "Official"   — resultDateSource === 'OFFICIAL_CALENDAR'
   *   "TBA"        — resultDateSource === 'DATE_TBA' (no official date available;
   *                  resultDate will be null)
   *   null         — fallback/unknown sources where label is not meaningful
   */
  resultDateLabel: 'Official' | 'TBA' | null;
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
  /**
   * Current trading signal for this instrument, joined read-time from the
   * persisted signal snapshot.  null when no trusted signal exists (e.g. the
   * instrument is outside current signal coverage).  Undefined only if the
   * signal join was skipped/failed for the whole response (see warnings).
   */
  signal?: EarningsSignalSummary | null;
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
