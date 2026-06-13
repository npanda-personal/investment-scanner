import {
  CoverageRepository,
  type TrackedCoverageEntry,
} from './persistence/market-data-foundation.repository.coverage';

/**
 * Universe curation: pick the actively-TRACKED instrument set for a region and
 * derive enforcement from it. Tracked = top-N by trailing liquidity (turnover)
 * PLUS always-pinned indices and seeded sector ETFs. The tracked set is what the
 * scheduler keeps current and what flows downstream; everything else in a curated
 * region is deactivated (Stock.isActive=false) so stale, out-of-scope instruments
 * stop consuming sync/analysis resources.
 *
 * Idempotent: a re-run fully recomputes the rank, replaces coverage, and re-derives
 * isActive — so it doubles as the periodic re-rank job.
 */

export interface CurationOptions {
  /** Number of liquidity-ranked STOCK/ETF names to track (pins are added on top). */
  targetTrackedCount?: number;
  /** Recent candles per symbol used for the turnover average. */
  lookbackBars?: number;
  now?: Date;
}

export interface CurationSummary {
  region: string;
  rankedCandidates: number;
  trackedTotal: number;
  trackedByLiquidity: number;
  pinnedCore: number;
  activated: number;
  deactivated: number;
  rankedAt: string;
}

export class UniverseCurationService {
  constructor(private readonly coverage: CoverageRepository = new CoverageRepository()) {}

  async curateRegion(region: string, options: CurationOptions = {}): Promise<CurationSummary> {
    const targetCount = Math.max(1, options.targetTrackedCount ?? 1500);
    const rankedAt = options.now ?? new Date();

    const [ranked, instruments] = await Promise.all([
      this.coverage.rankRegionLiquidity(region, { lookbackBars: options.lookbackBars, assetTypes: ['STOCK', 'ETF'] }),
      this.coverage.listRegionInstruments(region, ['STOCK', 'ETF', 'INDEX']),
    ]);

    // Liquidity-selected (STANDARD tier): top-N STOCK/ETF by trailing turnover.
    const byStockId = new Map<string, TrackedCoverageEntry>();
    ranked.slice(0, targetCount).forEach((row, i) => {
      byStockId.set(row.stockId, {
        stockId: row.stockId,
        symbol: row.symbol,
        trackingTier: 'STANDARD',
        reason: 'LIQUIDITY',
        liquidityScore: row.turnover,
        liquidityRank: i + 1,
      });
    });
    const trackedByLiquidity = byStockId.size;

    // Pins (CORE tier): all indices + seeded sector ETFs are always tracked so
    // benchmark/sector instruments never fall out even if their turnover dips.
    let pinnedCore = 0;
    for (const inst of instruments) {
      const assetType = (inst.assetType || '').toUpperCase();
      const isIndex = assetType === 'INDEX';
      const isSeededEtf = assetType === 'ETF' && inst.catalogSource === 'US_INDEX_SEED';
      if (!isIndex && !isSeededEtf) continue;
      const existing = byStockId.get(inst.stockId);
      byStockId.set(inst.stockId, {
        stockId: inst.stockId,
        symbol: inst.symbol,
        trackingTier: 'CORE',
        reason: isIndex ? 'INDEX' : 'ETF',
        liquidityScore: existing?.liquidityScore ?? null,
        liquidityRank: existing?.liquidityRank ?? null,
      });
      pinnedCore += 1;
    }

    const entries = [...byStockId.values()];
    const trackedStockIds = entries.map((e) => e.stockId);

    const trackedTotal = await this.coverage.replaceTrackedCoverage(region, entries, rankedAt);
    const { activated, deactivated } = await this.coverage.applyActiveEnforcement(region, trackedStockIds);

    return {
      region,
      rankedCandidates: ranked.length,
      trackedTotal,
      trackedByLiquidity,
      pinnedCore,
      activated,
      deactivated,
      rankedAt: rankedAt.toISOString(),
    };
  }
}
