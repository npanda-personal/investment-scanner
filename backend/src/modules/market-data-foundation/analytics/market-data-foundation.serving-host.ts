// Serving-read collaboration contract (Phase 5a).
//
// Phase 5a extracts the cleanly-separable SERVING/READ clusters out of
// MarketDataFoundationService into dedicated sibling classes:
//   - CryptoReadsService        (market-data-foundation.serving.crypto-reads.ts)
//   - PriceReadsService         (market-data-foundation.serving.price-reads.ts)
//   - FundamentalsReadsService  (market-data-foundation.serving.fundamentals-reads.ts)
//   - ScanReadsService          (market-data-foundation.serving.scan-reads.ts)
//   - CatalogReadsService       (market-data-foundation.serving.catalog-reads.ts)
//
// Each serving class takes the service as its `host` and reaches the shared collaborators it
// still needs (the per-concern repositories, the universe-substrate helpers that STAY on the
// service, and a few cross-cluster seams) through the MarketDataServingHost interface here.
// The service implements this interface; the public read methods on the service are kept as
// thin byte-identical delegators that forward to the matching serving-class instance.
// Behaviour is byte-identical to the pre-extraction inline implementation.
//
// Pure sibling-module functions (market-session, market-profile, market-data-read.api, the
// instrument-mapper, the catalog-source registry, the market-repository-router scope helper)
// are imported directly by the serving classes and are NOT routed through this host.

import type { MarketDataUniverseHealth, MarketDataUniverseSignoff } from '../market-data-foundation.types';
import type { MarketDataFoundationRepository } from '../market-data-foundation.repository';
import type { MarketDataFoundationCryptoRepository } from '../ingestion/crypto/market-data-foundation.crypto-repository';

export interface MarketDataServingHost {
  // Prisma access: the per-concern equity/catalog repository and the isolated crypto repository.
  // Both are reached via `this.host.X` in the moved serving bodies exactly as they were reached
  // via `this.X` before the extraction (`this.repository.prisma` raw-SQL access still resolves).
  // Typed with their concrete classes (not `any`) so the moved read methods keep the exact public
  // return types they had on the service — consumers see no type-surface change.
  readonly repository: MarketDataFoundationRepository;
  readonly cryptoRepository: MarketDataFoundationCryptoRepository;

  // ── Universe-substrate helpers (STAY on the service; Phase 5b/6 owns them) ─────────────────
  // cryptoUniverseHealth composes these shared universe-health primitives. They remain on the
  // service because the equity universe-health path uses them too.
  emptyUniverseCounts(): MarketDataUniverseHealth['counts'];
  percent(value: number, denominator: number): number;
  universeTrustStatus(
    counts: MarketDataUniverseHealth['counts'],
    coverage: MarketDataUniverseHealth['coverage'],
  ): MarketDataUniverseHealth['trustStatus'];
  universeTrustReasons(
    counts: MarketDataUniverseHealth['counts'],
    coverage: MarketDataUniverseHealth['coverage'],
  ): string[];
  universeSignoffFromHealth(health: Omit<MarketDataUniverseHealth, 'universeSignoff'>): MarketDataUniverseSignoff;

  // ── Cross-cluster serving seams ───────────────────────────────────────────────────────────
  // listPricesByInstrumentId (PriceReads) dispatches the crypto branch to the crypto-reads
  // owner; routed via the host so the service delegator stays in the call path.
  // Return shape keeps `prices` as an array (not bare `any`) so callers that
  // union this with the equity price-response (e.g. listPricesByInstrumentId)
  // preserve a typed `.prices` field instead of collapsing to `any`.
  listCryptoPricesByInstrumentId(instrumentId: string, limit?: number): Promise<{ prices: any[]; [key: string]: any } | null>;

  // health (CatalogReads) dispatches the crypto branch to the crypto-reads owner; routed via the
  // host so the service `cryptoHealth` delegator (also called by `universeHealth`) stays the seam.
  cryptoHealth(): Promise<{
    status: string;
    module: string;
    instrumentCount: number;
    latestDataTimestamp: string | null;
    source: string;
    ingestion_timestamp: string;
    last_updated_timestamp: string | null;
    data_status: string;
    timestamp: string;
    region: string;
    assetType: string;
  }>;
}
