export type EarningsIntelligenceCategory =
  | 'UPCOMING_RESULTS'
  | 'PRE_RESULT_INTEREST'
  // Growth tab (renamed from Pre-Result Interest in the UI): broader population of
  // instruments with a computable QoQ-EPS trend, ranked by epsGrowthTrendScore.
  | 'GROWTH'
  | 'RESULT_WINNERS'
  | 'RESULT_DISAPPOINTMENTS'
  | 'RESULT_REACTION_HISTORY'
  | 'EARNINGS_WATCHLIST';

export type EarningsFreshness = 'FRESH' | 'PARTIAL' | 'STALE' | 'MISSING';

export type EarningsResultDateSource =
  | 'OFFICIAL_CALENDAR'
  | 'DATE_TBA'
  // Honest forward estimate (Phase 3): periodEnd + cadence + lag, surfaced with an
  // "Estimated" badge.  Distinct from the legacy ESTIMATED_FROM_PERIOD_CADENCE
  // value, which the read path still downgrades to DATE_TBA for back-compat.
  | 'ESTIMATED_FROM_CADENCE'
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
  /**
   * Full company name (Stock.name), joined read-time in the read path so the UI can
   * show it next to the symbol.  Not persisted on the snapshot (avoids name staleness);
   * null on the write path and whenever the join cannot resolve the instrument.
   */
  name: string | null;
  resultDate: string | null;
  /**
   * Human-readable label that indicates whether the result date is authoritative
   * (from the official NSE board-meeting calendar) or not yet announced.
   * Consumers should display this label next to the date so the trader
   * immediately knows the reliability level without decoding the enum.
   *
   * Values:
   *   "Official"   — resultDateSource === 'OFFICIAL_CALENDAR'
   *   "Estimated"  — resultDateSource === 'ESTIMATED_FROM_CADENCE' (projected from
   *                  the persisted period cadence; resultDate/daysToResult present)
   *   "TBA"        — resultDateSource === 'DATE_TBA' (no official date available;
   *                  resultDate will be null)
   *   null         — fallback/unknown sources where label is not meaningful
   */
  resultDateLabel: 'Official' | 'TBA' | 'Estimated' | null;
  resultDateSource: EarningsResultDateSource | string;
  periodEndDate: string | null;
  validatedAt: string | null;
  daysToResult: number | null;
  /**
   * Legacy growth fields — now an alias for the QoQ figures below.  Kept so existing
   * consumers (scoring/classification, persisted snapshots) keep working during the
   * transition; `growthComparisonBasis` documents what basis these represent.
   */
  revenueGrowth: number | null;
  profitGrowth: number | null;
  epsGrowth: number | null;
  /**
   * Phase 2 — fundamentals growth split into two honest bases:
   *   QoQ — vs the most recent prior comparable quarter (dense; ~1,900 IN stocks).
   *   YoY — vs the same quarter one year ago; **null when no true year-ago comparable
   *         exists** (no silent prior-quarter fallback masquerading as YoY).
   * `growthComparisonBasis` names the basis of the legacy alias above ('QOQ', or null
   * when no comparable at all).
   */
  revenueGrowthQoQ: number | null;
  profitGrowthQoQ: number | null;
  epsGrowthQoQ: number | null;
  revenueGrowthYoY: number | null;
  profitGrowthYoY: number | null;
  epsGrowthYoY: number | null;
  growthComparisonBasis: string | null;
  /**
   * Tab-redesign sort metrics, computed at refresh from the full same-period-type
   * quarter series (only available at materialization, hence persisted):
   *   avgProfitGrowthQoQ4q — mean of the last ≤4 consecutive QoQ profit growth %s.
   *     Result Winners sort desc / Result Disappointments sort asc.  Null when <2
   *     consecutive QoQ profit deltas exist.
   *   epsGrowthTrendScore  — recency-weighted mean of the last ≤4 QoQ EPS growth %s
   *     plus a monotonic-uptrend bonus (higher = more consistently growing).  Growth
   *     tab sort desc.  Null when <2 consecutive QoQ EPS deltas exist (i.e. <3
   *     EPS-bearing quarters) — also the GROWTH-category eligibility gate.
   */
  avgProfitGrowthQoQ4q: number | null;
  epsGrowthTrendScore: number | null;
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
  /**
   * Numeric technicals bundle (Phase 3), computed at refresh from the persisted
   * price/delivery history.  Each field is independently nullable when its warm-up
   * window is not met (or, for deliveryPercent, outside India).  Descriptive
   * posture only — research-support framing, never a buy/sell call.
   */
  rsi14: number | null;
  smaPosture: string | null;
  pricePosition52w: number | null;
  adx14: number | null;
  deliveryPercent: number | null;
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
  // Raw daily high/low — used by the technicals bundle (ADX / range maths).  Null
  // for latest-price fallback rows that carry only a single close; optional so a
  // close-only price source still satisfies the contract (ADX degrades to null).
  high?: number | null;
  low?: number | null;
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
