// Repair-engine internal types (Phase 5c — repair/remediation extraction).
//
// These local types were previously declared inline in market-data-foundation.service.ts and are
// consumed by the extracted repair classes under repair/. They are moved here verbatim so both the
// service (which keeps thin delegators for the public repair surface) and the new repair classes
// import the SAME type identities — no behaviour or shape change.

import type {
  CreateStockRequest,
  CatalogSource,
  InstrumentUniverseReadiness,
  MarketDataRepairRequest,
  MarketDataRepairSourceIdentity,
  PriceBackfillRunStatusResponse,
} from '../market-data-foundation.types';

export const NSE_BSE_ONLY_PROVIDER_DISABLED_CODE = 'EXTERNAL_PROVIDER_DISABLED_NSE_BSE_ONLY';
export const NSE_BSE_ONLY_PROVIDER_DISABLED_MESSAGE =
  'External Yahoo/yfinance and Angel One provider paths are disabled. Use NSE/BSE exchange-file imports or manual verified evidence only.';
export const MANUAL_VERIFIED_FUNDAMENTALS_SOURCE = 'MANUAL_VERIFIED';
export const MANUAL_VERIFIED_FUNDAMENTALS_SEGMENT = 'FUNDAMENTALS';
export const MANUAL_VERIFIED_FUNDAMENTALS_PARSER_VERSION = 'manual-verified-fundamentals-csv-v1';

export const providerDisabledError = (operation: string) => {
  const error = new Error(`${operation} disabled: ${NSE_BSE_ONLY_PROVIDER_DISABLED_MESSAGE}`);
  (error as any).code = NSE_BSE_ONLY_PROVIDER_DISABLED_CODE;
  return error;
};

export type ManualVerifiedFundamentalsPeriodType = 'ANNUAL' | 'QUARTERLY';

export type ParsedManualVerifiedFundamentalRow = {
  rowNumber: number;
  symbol: string;
  periodType: ManualVerifiedFundamentalsPeriodType;
  periodEndDate: Date;
  revenue: number;
  netIncome: number;
  eps: number;
  peRatio: number | null;
  marketCap: number | null;
  currency: string | null;
  sourceNote: string | null;
  sourceUrl: string | null;
  validatedBy: string;
  validatedAt: Date;
};

export type RejectedManualVerifiedFundamentalRow = {
  rowNumber: number;
  symbol: string | null;
  reason: string;
  errors: string[];
};

export type MarketDataPipelineRecorder = {
  recordMarketDataStageSnapshot(input: {
    region: string;
    assetType: string;
    timeframe: '1d';
    pipelineKey: 'market-intelligence';
    triggerType: 'startup' | 'backfill' | 'scheduled' | 'manual';
    operation: 'PRICE_BACKFILL';
    runId: string;
    status: PriceBackfillRunStatusResponse['status'];
    dataThroughDate?: string | null;
    totalCount: number;
    processedCount: number;
    succeededCount: number;
    failedCount: number;
    skippedCount: number;
    unchangedCount: number;
    changedInstrumentIds?: string[];
    batchSize: number;
    nextOffset: number | null;
    hasMore: boolean;
    startedAt: string;
    completedAt: string | null;
    warnings: string[];
    errors: string[];
    metadata: Record<string, unknown>;
  }): Promise<unknown>;
};

export type MarketDataPipelineSnapshotInput = Parameters<MarketDataPipelineRecorder['recordMarketDataStageSnapshot']>[0];

export type PriceBackfillRunRecord = PriceBackfillRunStatusResponse & {
  activeKey: string;
  cancelRequested: boolean;
  force: boolean;
  fullReload: boolean;
  policy: MarketDataRepairRequest['policy'];
  triggerType: 'startup' | 'backfill' | 'manual' | 'scheduled';
  processedStockIds: Set<string>;
};

export type CatalogIdentityRowsSnapshot = {
  catalogSource: CatalogSource;
  rows: CreateStockRequest[];
  warnings: string[];
  downloaded: boolean;
  sourceFingerprint: string;
  sourceIdentity: MarketDataRepairSourceIdentity;
};

export type CatalogIdentityWorkItem = {
  stock: any;
  row: CreateStockRequest;
  filledFields: string[];
};

export type RepairRunSourceSnapshot = {
  fingerprint?: string;
  identity?: MarketDataRepairSourceIdentity;
  catalogSnapshot?: CatalogIdentityRowsSnapshot;
  error?: string;
  warnings?: string[];
};

export type PriceBackfillCandidate = {
  stock: any;
  readiness: InstrumentUniverseReadiness;
  historyDiagnostics: {
    requiredHistoryStartDate: string;
    latestCompletedEodDate: string | null;
    listingDate: string | null;
    listingDateMissing: boolean;
    storedHistoryStartDate: string | null;
    storedHistoryEndDate: string | null;
    storedHistoryBars: number;
    requiredHistoryMinimumBars: number;
    storedHistoryCoveragePercent: number;
    requiredHistoryComplete: boolean;
  };
};
