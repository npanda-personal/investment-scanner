/**
 * Market Data Foundation — FREE-PROVIDER REGION INGESTION ADAPTER (US / EU)
 * ========================================================================
 *
 * US and EU equities both ingest daily EOD through the FREE keyless Yahoo chart
 * API (see `.provider-registry.ts` `resolveEodProvider`). That shared mechanism
 * is implemented once here, parameterised by region — US and EU are two registry
 * entries pointing at this one adapter class. This is deliberate REUSE (two real
 * regions repeat the exact path), not speculative abstraction: a region whose
 * mechanism differs (IN exchange-file, GLOBAL crypto) gets its own adapter.
 *
 * The adapter owns only the region-specific FETCH; it forwards to the existing
 * `usEquityIngestionService.backfillPrices(...)` and returns the normalised
 * `RegionDailySyncResult` the orchestrator assembles into its summary. Behaviour
 * is byte-identical to the previous inline `usEquityIngestionService` call.
 */

import type { MarketRegion } from '../../../shared/utils/market-scope';
import { regionUsesRegionProviderPath } from './market-data-foundation.provider-registry';
import { usEquityIngestionService } from './us/market-data-foundation.us-equity-ingestion.service';
import type {
  RegionDailySyncRequest,
  RegionDailySyncResult,
  RegionIngestionAdapter,
  RegionIngestionMechanism,
} from './market-data-foundation.region-ingestion-adapter';

export class FreeProviderIngestionAdapter implements RegionIngestionAdapter {
  readonly mechanism: RegionIngestionMechanism = 'FREE_PROVIDER';

  constructor(public readonly region: MarketRegion) {}

  /**
   * Free-provider regions handle STOCK ingestion when their provider is enabled
   * in the per-region provider registry. Mirrors the orchestrator's existing
   * `shouldUseRegionProviderImportPath` gate (region-agnostic: same check the
   * inline branch used) — no region literal here beyond `this.region`.
   */
  handles(region: string, assetType: string): boolean {
    return assetType === 'STOCK'
      && region === this.region
      && regionUsesRegionProviderPath(region);
  }

  async syncDaily(request: RegionDailySyncRequest): Promise<RegionDailySyncResult> {
    const backfill = await usEquityIngestionService.backfillPrices({
      region: request.region,
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
      processedSymbols: backfill.processedSymbols,
      warnings: backfill.warnings,
    };
  }
}
