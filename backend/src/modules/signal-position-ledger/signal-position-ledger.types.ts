import type { SignalResultDto } from '../signal-generation-engine';

export type SignalPositionTriggerType = 'bullish_entry_trigger' | 'bearish_trigger';
export type SignalPositionReturnStatus = 'CURRENT' | 'STALE' | 'UNAVAILABLE';
export type SignalPositionLedgerStatus = 'ACTIVE' | 'RISK_WARNING' | 'EXIT_TRIGGERED' | 'INVALIDATED' | 'CLOSED';
export type SignalPositionLedgerSortBy = 'entryTriggerTimestamp' | 'currentReturnPercent';
export type SignalPositionLedgerSortDirection = 'asc' | 'desc';
export type SignalPositionHealthState = 'EXIT_TRIGGERED' | 'RISK_WARNING' | null;
export type SignalPositionLifecycleEvidenceStatus = 'ACTIVE_ENTRY' | 'RISK_WARNING' | 'EXIT_TRIGGERED' | 'INVALIDATED' | 'CLOSED' | 'UNAVAILABLE';
export type SignalPositionCalibrationEvidenceStatus = 'AVAILABLE' | 'UNAVAILABLE';
export type SignalPositionClosePriceStatus = 'SOURCE_PROVEN' | 'UNAVAILABLE';
export type SignalPositionTrustEvidenceStatus =
  | 'SOURCE_PROVEN'
  | 'SOURCE_PROVEN_PRICE_STALE'
  | 'SOURCE_PROVEN_PRICE_UNAVAILABLE'
  | 'SOURCE_PROVEN_DQ_LIMITED'
  | 'SOURCE_PROVEN_DQ_UNAVAILABLE';

export interface SignalPositionLedgerActiveQuery {
  region: string;
  assetType: string;
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

export interface SignalPositionLedgerSignalPage {
  items: SignalResultDto[];
  totalCount: number;
  limit: number;
  offset: number;
  nextOffset: number | null;
  hasMore: boolean;
}

export interface SignalPositionLedgerActiveCandidate {
  signal: SignalResultDto;
  triggerContract: SignalPositionTriggerContractReadModel;
}

export interface SignalPositionTriggerContractReadModel {
  signal_id: string | null;
  instrument_id: string;
  symbol: string;
  asset_class: string | null;
  region: string | null;
  strategy_id: string | null;
  strategy_version: string | null;
  trigger_type: string;
  trigger_price: number | null;
  trigger_timestamp: string | null;
  entry_rule_id: string | null;
  reason_summary: string;
  data_quality_status: string | null;
  trigger_price_evidence: {
    status: string | null;
  } | null;
}

export interface SignalPositionLatestPriceSnapshot {
  date: string;
  close: number;
  adjustedClose: number;
  dataStatus: string;
  source: string | null;
}

export interface SignalPositionDataQualitySnapshot {
  signalReadinessStatus: string | null;
  coverageStatus: string | null;
  liquidityStatus: string | null;
  lastEvaluatedAt: string;
}

export interface SignalPositionExitDecisionSnapshot {
  id?: string | null;
  strategy: string;
  strategyVersion?: string | null;
  decision: string;
  generatedAt: string;
  generatedDate?: string | null;
  reasons?: string[];
  exitRulesTriggered?: string[];
  invalidationRulesTriggered?: string[];
}

export interface SignalPositionLedgerRowSnapshots {
  latestPrice: SignalPositionLatestPriceSnapshot | null;
  quality: SignalPositionDataQualitySnapshot | null;
  exitDecision: SignalPositionExitDecisionSnapshot | null;
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
  exitStrategyId?: string | null;
  exitStrategyVersion?: string | null;
  exitSourceDecisionId?: string | null;
  exitTriggerTimestamp?: string | null;
  exitTriggerPrice?: number | null;
  closePriceStatus?: SignalPositionClosePriceStatus;
  exitReasonSummary?: string | null;
  exitRuleId?: string | null;
  exitRuleIds?: string[];
  exitDecision?: string | null;
  invalidationSourceDecisionId?: string | null;
  invalidationRuleIds?: string[];
  invalidationTimestamp?: string | null;
  closedAt?: string | null;
}

export interface SignalPositionLedgerActiveListResponse {
  items: SignalPositionLedgerActiveRow[];
  totalCount: number;
  limit: number;
  offset: number;
  nextOffset: number | null;
  hasMore: boolean;
  scope: {
    region: string;
    assetType: string;
  };
  refresh: SignalPositionLedgerRefreshProgress;
  warnings: string[];
}

export interface SignalPositionLedgerMaterializedSnapshot {
  rows: SignalPositionLedgerActiveRow[];
  refresh: SignalPositionLedgerRefreshProgress;
}

