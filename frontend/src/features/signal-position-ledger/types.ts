export type SignalPositionTriggerType = 'bullish_entry_trigger' | 'bearish_trigger';
export type SignalPositionReturnStatus = 'CURRENT' | 'STALE' | 'UNAVAILABLE';
export type SignalPositionLedgerStatus = 'ACTIVE' | 'CLOSED';
export type SignalPositionCloseReason = 'HORIZON_REACHED' | 'DEFENSIVE_EXIT' | 'INVALIDATED';
export type SignalPositionLedgerSortBy = 'entryTriggerTimestamp' | 'currentReturnPercent' | 'latestSignalScore';
export type SignalPositionLedgerSortDirection = 'asc' | 'desc';
export type SignalPositionHealthState = 'EXIT_TRIGGERED' | 'RISK_WARNING' | null;
export type SignalPositionLifecycleEvidenceStatus = 'ACTIVE_ENTRY' | 'EXIT_TRIGGERED' | 'UNAVAILABLE';
export type SignalPositionCalibrationEvidenceStatus = 'AVAILABLE' | 'UNAVAILABLE';
export type SignalPositionTrustEvidenceStatus =
  | 'SOURCE_PROVEN'
  | 'SOURCE_PROVEN_PRICE_STALE'
  | 'SOURCE_PROVEN_PRICE_UNAVAILABLE'
  | 'SOURCE_PROVEN_DQ_LIMITED'
  | 'SOURCE_PROVEN_DQ_UNAVAILABLE';

export interface SignalPositionLedgerScope {
  region: string;
  assetType: string;
}

export interface SignalPositionLedgerActiveQuery extends SignalPositionLedgerScope {
  limit: number;
  offset: number;
  sortBy?: SignalPositionLedgerSortBy;
  sortDirection?: SignalPositionLedgerSortDirection;
}

export type SignalPositionLedgerRefreshStatus = 'IDLE' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface SignalPositionLedgerRefreshProgress {
  runId: string | null;
  status: SignalPositionLedgerRefreshStatus;
  totalCount: number;
  processedCount: number;
  succeededCount: number;
  failedCount: number;
  skippedCount: number;
  materializedRowCount: number;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string | null;
  warnings: string[];
  errors: string[];
}

export interface SignalPositionLedgerActiveRow {
  ledgerKey: string;
  status: SignalPositionLedgerStatus;
  signalId: string | null;
  instrumentId: string;
  symbol: string;
  companyName: string | null;
  region: string | null;
  assetType: string | null;
  triggerType: SignalPositionTriggerType;
  entryTriggerTimestamp: string;
  entryTriggerPrice: number;
  entryReasonSummary: string;
  strategyId: string | null;
  strategyVersion: string | null;
  strategyDecision: string | null;
  strategyReadinessLabel: string | null;
  strategyRatingGrade: string | null;
  entryRuleId: string | null;
  latestTrustedPriceDate: string | null;
  latestTrustedPrice: number | null;
  currentReturnPercent: number | null;
  currentReturnStatus: SignalPositionReturnStatus;
  currentDataQualityStatus: string | null;
  healthState: SignalPositionHealthState;
  lifecycleEvidenceStatus: SignalPositionLifecycleEvidenceStatus;
  trustEvidenceStatus: SignalPositionTrustEvidenceStatus;
  calibrationEvidenceStatus: SignalPositionCalibrationEvidenceStatus;
  displayWarnings: string[];
  exitSignalId?: string | null;
  exitTriggerTimestamp?: string | null;
  exitTriggerPrice?: number | null;
  exitReasonSummary?: string | null;
  exitRuleId?: string | null;
  exitDecision?: string | null;
  closedAt?: string | null;
  // Fixed-horizon lifecycle (2026-07): terminal-close provenance + benchmark/alpha.
  closeReason?: SignalPositionCloseReason | null; // HORIZON_REACHED | DEFENSIVE_EXIT | INVALIDATED
  horizonTradingDays?: number | null;             // trading-bar horizon (60) when closeReason=HORIZON_REACHED
  benchmarkReturnPercent?: number | null;         // region-benchmark simple return over the same window
  alphaPercent?: number | null;                   // currentReturnPercent − benchmarkReturnPercent (pp)
  // Latest signal score for this stock — read-time join to signal_results ordered by
  // generatedAt DESC (ALWAYS the most recent score, never the frozen entry-time value).
  latestSignalScore?: number | null;
  latestSignalScoreDate?: string | null;          // generatedAt of the score above (ISO)
  latestSignalConfidence?: string | null;         // HIGH | MEDIUM | LOW of the latest signal
  latestSignalDirection?: string | null;          // BULLISH | BEARISH | ... of the latest signal
}

export interface SignalPositionLedgerActiveListResponse {
  items: SignalPositionLedgerActiveRow[];
  totalCount: number;
  limit: number;
  offset: number;
  nextOffset: number | null;
  hasMore: boolean;
  scope: SignalPositionLedgerScope;
  refresh: SignalPositionLedgerRefreshProgress;
  warnings: string[];
}
