/**
 * Market Data Foundation — REGION INGESTION REGISTRY
 * ==================================================
 *
 * The single dispatch point the orchestrator uses to find a region's ingestion
 * adapter. `resolveRegionAdapter(region, assetType)` is the ONLY place that maps
 * a region to its ingestion implementation — the orchestrator never branches on
 * a region literal for dispatch.
 *
 * Adding a region = append one adapter instance below + ship its adapter file.
 * No edits to the orchestrator or any other adapter. (See the JP sketch in
 * `.jp-ingestion.adapter.ts` for the worked proof — it is intentionally not
 * listed here because Japan is not a supported market yet.)
 *
 * Registry order is irrelevant: at most one adapter `handles(...)` a given
 * (region, assetType) pair.
 */

import type {
  RegionDailySyncRequest,
  RegionDailySyncResult,
  RegionIngestionAdapter,
} from './market-data-foundation.region-ingestion-adapter';
import { FreeProviderIngestionAdapter } from './market-data-foundation.us-eu-ingestion.adapter';
import { CryptoIngestionAdapter } from './crypto/market-data-foundation.crypto-ingestion.adapter';
import { IndiaExchangeIngestionAdapter } from './india/market-data-foundation.india-ingestion.adapter';

/**
 * Every region's ingestion adapter. US and EU share the one parameterised
 * free-provider adapter (deliberate reuse — same Yahoo mechanism). IN is a
 * placeholder pending Phase 4 (orchestrator still handles it inline). GLOBAL is
 * crypto, driven by its own 24/7 lane.
 */
const REGION_INGESTION_ADAPTERS: readonly RegionIngestionAdapter[] = [
  new FreeProviderIngestionAdapter('US'),
  new FreeProviderIngestionAdapter('EU'),
  new CryptoIngestionAdapter(),
  new IndiaExchangeIngestionAdapter(),
];

/**
 * Resolve the ingestion adapter that owns a region+assetType, or null when no
 * adapter handles it (e.g. a region whose provider is disabled). The
 * orchestrator falls back to its inline path only when this returns null.
 */
export function resolveRegionAdapter(region: string, assetType: string): RegionIngestionAdapter | null {
  return REGION_INGESTION_ADAPTERS.find((adapter) => adapter.handles(region, assetType)) ?? null;
}

/** Snapshot of registered adapters for diagnostics/health surfaces. */
export function describeRegionIngestionAdapters(): Array<{ region: string; mechanism: string }> {
  return REGION_INGESTION_ADAPTERS.map((adapter) => ({ region: adapter.region, mechanism: adapter.mechanism }));
}

export type { RegionDailySyncRequest, RegionDailySyncResult, RegionIngestionAdapter };
