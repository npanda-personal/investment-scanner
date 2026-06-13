// Universe-readiness internal types (Phase 5b).
//
// These local types were previously declared inline in market-data-foundation.service.ts and are
// consumed by the extracted universe-readiness substrate/review/instruments classes. They are
// moved here verbatim so both the service (which keeps delegators) and the new sibling classes
// import the SAME type identities — no behaviour or shape change. `validationWindow` keeps its
// exact `ReturnType<MarketDataFoundationService['providerValidationWindow']>` shape; the service
// retains a `providerValidationWindow` delegator so that reference resolves unchanged.

import type { MarketDataFoundationService } from '../market-data-foundation.service';
import type {
  InstrumentUniverseReadiness,
  PaginationOptions,
  TrustedBaselineListingDateStatus,
  TrustedBaselineProviderFallbackState,
  TrustedBaselineRequiredHistoryStatus,
  TrustedBaselineResidualState,
} from '../market-data-foundation.types';

export const TRUSTED_REVIEW_SCAN_ORDERING = 'recentVolumeDesc_priceHistoryCompleteness_latestFreshness_symbol';

export type TrustedReviewUniverseOptions = Pick<PaginationOptions, 'region' | 'assetType'> & { now?: Date; recompute?: boolean };

export type UniverseComputationSnapshot = {
  scope: { region: string; assetType: string };
  stocks: any[];
  readinessBySymbol: Map<string, InstrumentUniverseReadiness>;
  statsBySymbol: Map<string, any>;
  validationWindow: ReturnType<MarketDataFoundationService['providerValidationWindow']>;
  priceBackfillBlockedStockIds: Set<string>;
  repairStatesByStockId?: Map<string, any[]>;
};

export type UniverseComputationSnapshotCacheEntry = {
  expiresAt: number;
  snapshot?: UniverseComputationSnapshot;
  promise?: Promise<UniverseComputationSnapshot>;
};

export type StockMissingDataColumnConfig = {
  column: string;
  label: string;
  nullable: boolean;
  value: (stock: any) => unknown;
  expectedNull?: (stock: any) => boolean;
  expectedNullReason?: string;
  expected?: (stock: any) => string | null;
  invalid?: (stock: any, value: unknown, priceStatsBySymbol: Map<string, any>) => string | null;
};

export type TrustedBaselineSnapshot = {
  trustedBaselineResidualState: TrustedBaselineResidualState;
  trustedBaselineBlockerCodes: string[];
  latestCompletedEodDate: string | null;
  latestCompletedEodPresent: boolean;
  storedDataThroughDate: string | null;
  requiredHistoryStartDate: string | null;
  requiredHistoryEndDate: string | null;
  requiredHistoryStatus: TrustedBaselineRequiredHistoryStatus;
  listingDate: string | null;
  listingDateStatus: TrustedBaselineListingDateStatus;
  providerFallbackState: TrustedBaselineProviderFallbackState;
  primarySourceAttempted: 'NSE_BSE_EXCHANGE_EOD' | 'YAHOO' | null;
  fallbackSourcesAttempted: string[];
  sourceFallbackReason: string | null;
};

export type RepairStateLookup = {
  providerValidation: any | null;
  priceBackfill: any | null;
  catalogIdentity: any | null;
};
