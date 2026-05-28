export type SignalPositionTriggerType = 'bullish_entry_trigger' | 'bearish_trigger';
export type SignalPositionReturnStatus = 'CURRENT' | 'STALE' | 'UNAVAILABLE';
export type SignalPositionLedgerStatus = 'ACTIVE' | 'CLOSED';
export type SignalPositionLedgerSortBy = 'entryTriggerTimestamp' | 'currentReturnPercent';
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
