import type { MarketDataStatus } from './market-data-foundation.types.core';
import type { SyncSummary } from './market-data-foundation.types.sync';
import type { V1Instrument } from './market-data-foundation.types.instrument';

export interface V1IngestionRequest {
  symbol?: string;
  instrumentId?: string;
  region?: string;
  company_name?: string;
  exchange?: string;
  currency?: string;
  asset_type?: string;
  isin?: string;
  fullReload?: boolean;
  force?: boolean;
}

export interface V1SyncResult {
  success: boolean;
  instrument: V1Instrument | null;
  message: string;
  pricesStored?: boolean;
  fundamentalsAvailable?: boolean;
  corporateActionsAvailable?: boolean;
  syncSummary?: SyncSummary;
  errors?: string[];

  // Detailed Audit Counts
  instrumentsReceived?: number;
  instrumentsInserted?: number;
  instrumentsUpdated?: number;
  instrumentsSkipped?: number;

  priceRowsReceived?: number;
  priceRowsInserted?: number;
  priceRowsUpdated?: number;
  priceRowsSkipped?: number;

  fundamentalsReceived?: number;
  fundamentalsInserted?: number;
  fundamentalsUpdated?: number;
  fundamentalsSkipped?: number;

  corporateActionsReceived?: number;
  corporateActionsInserted?: number;
  corporateActionsUpdated?: number;
  corporateActionsSkipped?: number;

  fxRatesReceived?: number;
  fxRatesInserted?: number;
  fxRatesUpdated?: number;
  fxRatesSkipped?: number;

  warningCount?: number;
  warnings?: string[];
  durationMs?: number;
  duplicateProviderRowsSkipped?: number;
  malformedRowsSkipped?: number;
  noNewData?: boolean;
  skippedBeforeFetchCount?: number;
  providerFetchSkippedCount?: number;
  skippedReasonCounts?: Record<string, number>;
  skippedReasons?: string[];
  lastCheckedAt?: string;
  nextEligibleSyncAt?: string;
}

export interface CoreFundamentals {
  symbol: string;
  revenue: number | null;
  eps: number | null;
  earnings: number | null;
  dividendYield: number | null;
  sharesOutstanding: number | null;
  marketCap: number | null;
  currency: string | null;
  periodType: string;
  ratios: {
    trailingPe: number | null;
    forwardPe: number | null;
    priceToBook: number | null;
    profitMargins: number | null;
    returnOnEquity: number | null;
    debtToEquity: number | null;
  };
  source: string;
  asOf: string;
}

export type CorporateActionType = 'dividend' | 'split';

export interface CorporateAction {
  symbol: string;
  type: CorporateActionType | 'reverse_split';
  date: string;
  value: number | string;
  declaredDate?: string | null;
  paymentDate?: string | null;
  amount?: number | null;
  splitRatio?: number | null;
  currency?: string | null;
  source: string;
}

export interface FxRateInput {
  pair: string;
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  rateTimestamp: Date;
  source: string;
  dataStatus?: MarketDataStatus;
}
