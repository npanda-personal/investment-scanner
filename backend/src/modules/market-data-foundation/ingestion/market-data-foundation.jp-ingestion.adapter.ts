/**
 * Market Data Foundation — 5th-REGION SKETCH: JAPAN (TSE)
 * ======================================================
 *
 * WORKED PROOF of acceptance-criterion #2: "adding a future region = one new
 * adapter file + one registry entry, ZERO edits to core files."
 *
 * Japan equities are available on the same FREE keyless Yahoo chart API the
 * US/EU adapter already uses (TSE symbols carry a `.T` suffix, e.g. `7203.T`).
 * So a real JP rollout reuses `FreeProviderIngestionAdapter` — this file only
 * has to exist to make the region concrete; it adds NO new mechanism.
 *
 * To ACTIVATE Japan, the ONLY changes are additive and outside the core:
 *   1. THIS adapter file (done — a one-line subclass; or just
 *      `new FreeProviderIngestionAdapter('JP')` once 'JP' joins MarketRegion).
 *   2. One line in `.region-ingestion-registry.ts`  → `new JpIngestionAdapter()`.
 *   3. One `getRegionDataSources('JP')` case in `.endpoints.ts` (Yahoo host).
 *   4. One `.jp-holidays.ts` calendar (like `.us-holidays.ts`).
 *   5. Enable its provider flag in `.provider-registry.ts` (`resolveEodProvider`).
 *
 * NOTHING in `syncScheduledRegion` (the orchestrator), the persistence facade,
 * the serving layer, or any other region's adapter changes. The orchestrator
 * calls `resolveRegionAdapter('JP', 'STOCK')` and gets this adapter back.
 *
 * It is intentionally NOT registered in the live registry (Japan is not a
 * supported market today and has no endpoints/holidays/provider wiring); it
 * compiles against the same interface, which is the proof that the contract is
 * sufficient. `MarketRegion` does not yet include 'JP', so this sketch casts at
 * the single seam — the real rollout would extend that union (a shared-utils
 * edit, not a market-data-foundation core edit).
 */

import type { MarketRegion } from '../../../shared/utils/market-scope';
import type {
  RegionDailySyncRequest,
  RegionDailySyncResult,
  RegionIngestionAdapter,
  RegionIngestionMechanism,
} from './market-data-foundation.region-ingestion-adapter';
import { usEquityIngestionService } from './us/market-data-foundation.us-equity-ingestion.service';

export class JpIngestionAdapter implements RegionIngestionAdapter {
  // 'JP' is not yet in the MarketRegion union; the real rollout extends that
  // union in shared-utils. Cast only at this declaration seam.
  readonly region = 'JP' as unknown as MarketRegion;
  readonly mechanism: RegionIngestionMechanism = 'FREE_PROVIDER';

  handles(region: string, assetType: string): boolean {
    return region === 'JP' && assetType === 'STOCK';
  }

  async syncDaily(request: RegionDailySyncRequest): Promise<RegionDailySyncResult> {
    // Identical free-provider path as US/EU — Yahoo serves TSE `.T` symbols.
    const backfill = await usEquityIngestionService.backfillPrices({
      symbols: request.symbols,
      lookbackDays: request.lookbackTradingDays,
    });
    return {
      symbolsProcessed: backfill.symbolsProcessed,
      barsReceived: backfill.barsReceived,
      barsInserted: backfill.barsInserted,
      barsUpdated: backfill.barsUpdated,
      barsSkipped: backfill.barsSkipped,
      changedSymbols: backfill.changedSymbols,
      warnings: backfill.warnings,
    };
  }
}
