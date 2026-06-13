/**
 * Market Data Foundation — INDIA (NSE/BSE) REGION INGESTION ADAPTER
 * ================================================================
 *
 * India ingests daily EOD from official NSE/BSE exchange FILES (UDiFF CM
 * bhavcopy, index close-all, delivery, F&O) — a fundamentally different
 * mechanism from the free-provider (US/EU) and crypto regions.
 *
 * STATUS: registry placeholder. The exchange-file ingestion logic
 * (`importNseCmUdiffDaily` / `importNseIndexOfficialDaily` / official-EOD bulk
 * fallback) currently lives INLINE in the orchestrator (`syncScheduledRegion`,
 * the IN branches). Phase 4 of the revamp moves that logic into this adapter's
 * `syncDaily(...)`; until then the orchestrator keeps handling IN inline and
 * never calls this adapter. It is registered now only so the registry — and the
 * "every region has an adapter" design — is visible and complete at the
 * checkpoint.
 */

import {
  RegionAdapterNotYetExtractedError,
  type RegionDailySyncRequest,
  type RegionDailySyncResult,
  type RegionIngestionAdapter,
  type RegionIngestionMechanism,
} from '../market-data-foundation.region-ingestion-adapter';

export class IndiaExchangeIngestionAdapter implements RegionIngestionAdapter {
  readonly region = 'IN' as const;
  readonly mechanism: RegionIngestionMechanism = 'EXCHANGE_FILE';

  handles(region: string, assetType: string): boolean {
    return region === 'IN' && ['STOCK', 'INDEX'].includes(assetType);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async syncDaily(_request: RegionDailySyncRequest): Promise<RegionDailySyncResult> {
    // Phase 4 relocates the inline NSE/BSE exchange-file ingestion here.
    throw new RegionAdapterNotYetExtractedError('IN');
  }
}
