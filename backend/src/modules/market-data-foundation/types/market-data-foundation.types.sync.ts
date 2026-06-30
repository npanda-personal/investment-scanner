import type { OfficialEodBulkSyncEvidence } from './market-data-foundation.types.scans';

export interface SyncSummary {
  rowsReceived: number;
  rowsInserted: number;
  rowsUpdated: number;
  rowsSkipped: number;
  rowsNoOp?: number;
  noNewData?: boolean;
  skippedBeforeFetchCount?: number;
  providerFetchSkippedCount?: number;
  skippedReasonCounts?: Record<string, number>;
  skippedReasons?: string[];
  lastCheckedAt?: string;
  nextEligibleSyncAt?: string;
  duplicateProviderRowsSkipped?: number;
  warningCount: number;
  warnings: string[];
}

export type MarketDataSyncScopeType = 'CATALOG' | 'INSTRUMENT';
export type MarketDataSyncStateStatus = 'PENDING' | 'SYNCED' | 'FINAL_CONFIRMED' | 'FAILED';

export type MarketDataSyncSkipReason =
  | 'RECENTLY_SYNCED'
  | 'MARKET_CLOSED_NO_NEW_DAILY_DATA'
  | 'BEFORE_MARKET_OPEN'
  | 'WEEKEND_OR_HOLIDAY'
  | 'FINAL_CANDLE_CONFIRMED';

export type MarketDataSchedulerReasonCode =
  | 'BEFORE_MARKET_OPEN'
  | 'MARKET_OPEN'
  | 'POST_CLOSE_FINALIZATION_WINDOW'
  | 'FINAL_CANDLE_CONFIRMED'
  | 'MARKET_CLOSED_NO_SYNC'
  /** Market closed but the EOD file (e.g. NSE bhavcopy) is not yet published — within the finalization grace window. The "missing date" override must NOT fire during this state, because the calendar may have an unrecognised holiday in its static list. */
  | 'MARKET_CLOSED_AWAITING_EOD_FILE'
  | 'WEEKEND_OR_HOLIDAY'
  | 'UNKNOWN_SESSION'
  | 'MISSING_FINAL_CANDLE_RETRY';

export interface MarketDataSchedulerDecision {
  shouldRun: boolean;
  reasonCode: MarketDataSchedulerReasonCode;
  reason: string;
  sessionState: MarketDataSchedulerReasonCode;
  todayTradingDate: string | null;
  nextSuggestedRunAt?: string | null;
}

export interface LatestStoredCandleInfo {
  latestTradingDate?: string | null;
  finalConfirmed?: boolean;
}

export interface MarketDataSyncStateDto {
  region: string;
  assetType: string;
  scopeType: MarketDataSyncScopeType;
  scopeKey: string;
  timeframe: string;
  tradingDate: string;
  status: MarketDataSyncStateStatus;
  lastCheckedAt: string | null;
  lastProviderFetchAt: string | null;
  lastRunAt: string | null;
  lastInsertedCount: number;
  lastUpdatedCount: number;
  lastNoOpCount: number;
  lastSkippedCount: number;
  lastWarningCount: number;
  lastSummary?: unknown;
}

export interface ScheduledRegionSyncSummary {
  region: string;
  assetType: string;
  tradingDate: string;
  dataThroughDate?: string | null;
  sourceFingerprint?: string | null;
  changedInstrumentIds?: string[];
  downstreamInstrumentIds?: string[];
  downstreamEligibilitySource?: string | null;
  changedInstrumentCount?: number;
  dqStageEligible?: boolean;
  instrumentsProcessed: number;
  rowsReceived: number;
  rowsInserted: number;
  rowsUpdated: number;
  rowsSkipped: number;
  rowsNoOp: number;
  noNewData?: boolean;
  skippedBeforeFetchCount?: number;
  providerFetchSkippedCount?: number;
  skippedReasonCounts?: Record<string, number>;
  skippedReasons?: string[];
  lastCheckedAt?: string;
  nextEligibleSyncAt?: string;
  warningCount: number;
  warnings: string[];
  errors: string[];
  officialEodBulk?: OfficialEodBulkSyncEvidence | null;
}

export interface DailyRefreshEligibilityResult {
  region: string;
  assetType: string;
  dataThroughDate: string;
  source: 'LATEST_PRICE' | 'PRICE_TICK' | 'NONE';
  instrumentIds: string[];
  instrumentCount: number;
}

export interface MarketDataSchedulerRegionStatus {
  region: string;
  assetType: string;
  sessionState: MarketDataSchedulerReasonCode;
  shouldRunNow: boolean;
  reason: string;
  todayTradingDate: string | null;
  latestCompletedTradingDate: string | null;
  latestStoredTradingDate: string | null;
  todayCandleStored: boolean;
  latestCompletedCandleStored: boolean;
  latestStoredCandleIsCurrent: boolean;
  candleSyncStatus: 'CURRENT' | 'MISSING_LATEST_COMPLETED' | 'NO_STORED_CANDLES' | 'TODAY_STORED_PENDING_FINAL_CONFIRMATION' | 'UNKNOWN_SESSION';
  finalConfirmed: boolean;
  nextSuggestedRunAt?: string | null;
  lastSummary?: unknown;
}

export interface MarketDataSchedulerStatus {
  enabled: boolean;
  intervalMinutes: number;
  regions: string[];
  assetType: string;
  activeRun: boolean;
  lastRunAt: string | null;
  nextSuggestedRunAt: string | null;
  regionStatuses: MarketDataSchedulerRegionStatus[];
}
