/**
 * Market Data Foundation — CRYPTO REGION INGESTION ADAPTER (GLOBAL)
 * ================================================================
 *
 * Crypto (region GLOBAL) ingests 24/7 from its own isolated keyless providers
 * (CoinPaprika universe + Binance klines) into the isolated `crypto_*` tables —
 * never touching equity tables. That mechanism already lives in
 * `cryptoIngestionService`; this adapter formalises it behind the shared
 * `RegionIngestionAdapter` contract so the registry is uniform across all
 * regions.
 *
 * NOTE ON WIRING: crypto runs on its own 24/7 scheduler lane (`runCryptoLane`),
 * separate from the equity `syncScheduledRegion` loop, because its cadence and
 * isolation differ. This adapter wraps the same `cryptoIngestionService` entry
 * the lane uses, so the orchestration is expressible through the registry; the
 * equity orchestrator does not call it (crypto keeps its dedicated lane).
 */

import { cryptoIngestionService } from './market-data-foundation.crypto-ingestion.service';
import type {
  RegionDailySyncRequest,
  RegionDailySyncResult,
  RegionIngestionAdapter,
  RegionIngestionMechanism,
} from '../market-data-foundation.region-ingestion-adapter';

export class CryptoIngestionAdapter implements RegionIngestionAdapter {
  readonly region = 'GLOBAL' as const;
  readonly mechanism: RegionIngestionMechanism = 'CRYPTO_PROVIDER';

  handles(region: string, assetType: string): boolean {
    return (region === 'GLOBAL' || region === 'CRYPTO') && assetType === 'CRYPTO';
  }

  async syncDaily(request: RegionDailySyncRequest): Promise<RegionDailySyncResult> {
    const backfill = await cryptoIngestionService.backfillPrices({
      symbols: request.symbols.length > 0 ? request.symbols : undefined,
      lookbackDays: request.lookbackTradingDays,
      incremental: true,
    });
    const barsReceived = backfill.perSymbol.reduce((sum, row) => sum + row.received, 0);
    const changedSymbols = backfill.perSymbol
      .filter((row) => row.inserted > 0 || row.updated > 0)
      .map((row) => row.symbol);
    return {
      symbolsProcessed: backfill.symbolsProcessed,
      barsReceived,
      barsInserted: backfill.barsInserted,
      barsUpdated: backfill.barsUpdated,
      barsSkipped: backfill.barsSkipped,
      changedSymbols,
      warnings: backfill.warnings,
    };
  }
}
