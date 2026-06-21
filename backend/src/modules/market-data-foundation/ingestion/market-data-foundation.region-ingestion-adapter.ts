/**
 * Market Data Foundation — REGION INGESTION ADAPTER CONTRACT
 * =========================================================
 *
 * The third leg of the region-injection seam. The module already resolves
 * per-region external *hosts* (`getRegionDataSources(region)` in
 * `.endpoints.ts`) and per-region price *providers*
 * (`resolveEodProvider(region)` in `.provider-registry.ts`). This file adds the
 * orchestration leg: a single contract every region's daily EOD ingestion
 * implements, so the region-agnostic scheduler/orchestrator never branches on a
 * specific region — it asks the registry for the region's adapter and calls
 * `syncDaily(...)`.
 *
 * DESIGN
 * ------
 *  - `RegionDailySyncRequest` / `RegionDailySyncResult` are region-AGNOSTIC
 *    DTOs. The orchestrator passes the active tasks' symbols + lookback and gets
 *    back a normalised row-count/changed-symbol result, which it assembles into
 *    the existing `ScheduledRegionSyncSummary` uniformly (no per-region summary
 *    code in the core).
 *  - Each adapter declares which `(region, assetType)` pairs it `handles(...)`
 *    and its `mechanism` (exchange-file vs free provider vs crypto provider) for
 *    diagnostics. No adapter knows about another region.
 *
 * ADDING A REGION (the acceptance-criterion contract)
 * ---------------------------------------------------
 * One new adapter file implementing this interface + one line in
 * `.region-ingestion-registry.ts` (+ its endpoints entry + holidays file).
 * ZERO edits to the orchestrator or to any other region's adapter. See
 * `.jp-ingestion.adapter.ts` for the worked 5th-region sketch.
 */

import type { MarketRegion } from '../../../shared/utils/market-scope';

/** Region-agnostic input for a daily EOD ingestion pass. */
export interface RegionDailySyncRequest {
  readonly region: string;
  readonly assetType: string;
  /** Canonical symbols of the active sync tasks the orchestrator selected. */
  readonly symbols: string[];
  /** Forward lookback (trading days) so one tick captures the latest candle. */
  readonly lookbackTradingDays: number;
}

/**
 * Normalised result of a daily ingestion pass. Field names mirror the existing
 * region-provider summary shape the orchestrator already consumes, so wiring an
 * adapter in is byte-compatible with the prior inline call.
 */
export interface RegionDailySyncResult {
  readonly symbolsProcessed: number;
  readonly barsReceived: number;
  readonly barsInserted: number;
  readonly barsUpdated: number;
  readonly barsSkipped: number;
  readonly changedSymbols: string[];
  readonly processedSymbols?: string[];
  readonly warnings: string[];
}

/** How a region physically pulls its EOD data (diagnostics/provenance only). */
export type RegionIngestionMechanism = 'EXCHANGE_FILE' | 'FREE_PROVIDER' | 'CRYPTO_PROVIDER';

export interface RegionIngestionAdapter {
  /** The market region this adapter ingests. */
  readonly region: MarketRegion;
  /** Physical ingestion mechanism (for diagnostics/health surfaces). */
  readonly mechanism: RegionIngestionMechanism;
  /** Whether this adapter owns daily ingestion for the given region+assetType. */
  handles(region: string, assetType: string): boolean;
  /** Run the region's daily EOD ingestion and return a normalised result. */
  syncDaily(request: RegionDailySyncRequest): Promise<RegionDailySyncResult>;
}

/**
 * Thrown by an adapter that is registered for registry/diagnostic completeness
 * but whose ingestion logic still lives inline in the orchestrator (pending a
 * later extraction phase). The orchestrator must never reach this for a region
 * it still handles inline.
 */
export class RegionAdapterNotYetExtractedError extends Error {
  constructor(region: string) {
    super(`Region ${region} ingestion is still handled inline by the orchestrator; its adapter is a registry placeholder pending extraction.`);
    this.name = 'RegionAdapterNotYetExtractedError';
  }
}
