// Market-scan snapshot WRITER cluster (ingestion-extraction phase).
//
// Owns refreshMarketScanSnapshots — the MARKET_SCAN_REFRESH pipeline step that computes all 6 scan
// families (movers gainers/losers, market-map, 52w-high/low, delivery-spike, volume-spike) for a
// scope and atomically replaces today's market_scan_snapshot rows. The mover lookback/min-bars/
// max-return tuning tables move with it (they were only used by this writer). Bodies are
// byte-identical to the pre-extraction inline implementation in market-data-foundation.service.ts
// (this.X -> this.host.X for the repository, the only stays-on-service collaborator). The service
// keeps a thin byte-identical delegator (refreshMarketScanSnapshots is invoked by the pipeline).

import type { MarketDataIngestionHost } from './market-data-foundation.ingestion-host';
import type { MarketMoverRange } from '../market-data-foundation.types';

const MARKET_MOVER_LOOKBACK_DAYS: Record<MarketMoverRange, number> = {
  '1D': 1,
  '1W': 7,
  '1M': 30,
  '3M': 90,
  '6M': 180,
  '1Y': 365,
};
const MARKET_MOVER_MIN_HISTORY_BARS: Record<MarketMoverRange, number> = {
  '1D': 2,
  '1W': 5,
  '1M': 20,
  '3M': 60,
  '6M': 120,
  '1Y': 240,
};
const MARKET_MOVER_MAX_ABS_RETURN: Record<MarketMoverRange, number> = {
  '1D': 10,
  '1W': 25,
  '1M': 50,
  '3M': 100,
  '6M': 250,
  '1Y': 1000,
};

export class ScanSnapshotWriterService {
  constructor(private readonly host: MarketDataIngestionHost) {}

  /**
   * MARKET_SCAN_REFRESH: compute all 6 scan families for the given scope and
   * replace today's snapshot rows (delete-old-for-date + bulk insert).
   * Called once per day by the pipeline after MARKET_DATA sync.
   */
  async refreshMarketScanSnapshots(options: {
    region?: string;
    assetType?: string;
    now?: Date;
  } = {}): Promise<{
    tradingDate: string;
    totalInserted: number;
    scanTypes: string[];
    warnings: string[];
    errors: string[];
  }> {
    const scope = {
      region: options.region?.trim().toUpperCase() || 'IN',
      assetType: options.assetType?.trim().toUpperCase() || 'STOCK',
    };
    const now = options.now ?? new Date();
    const warnings: string[] = [];
    const errors: string[] = [];
    const allRows: Array<{
      scanType: string;
      scanRange: string | null;
      region: string;
      assetType: string;
      tradingDate: Date;
      rank: number;
      payloadJson: object;
      computedAt: Date;
    }> = [];

    // ---- helpers ----
    const latestDataTimestamp = await this.host.repository.latestDataTimestamp(scope).catch(() => null);
    if (!latestDataTimestamp) {
      warnings.push(`No price data found for ${scope.region}/${scope.assetType} — scan snapshot skipped.`);
      return { tradingDate: now.toISOString().slice(0, 10), totalInserted: 0, scanTypes: [], warnings, errors };
    }
    const tradingDate = new Date(latestDataTimestamp);
    tradingDate.setUTCHours(0, 0, 0, 0);

    const latestDateStart = new Date(tradingDate);
    const latestDateEnd = new Date(tradingDate);
    latestDateEnd.setUTCDate(latestDateEnd.getUTCDate() + 1);

    // ---- movers (6 ranges × gainers + losers) + market-map (6 ranges) ----
    for (const range of Object.keys(MARKET_MOVER_LOOKBACK_DAYS) as MarketMoverRange[]) {
      try {
        const rows = await this.host.repository.marketMoversForRange(MARKET_MOVER_LOOKBACK_DAYS[range], {
          ...scope,
          limit: 20,
          minHistoryBars: MARKET_MOVER_MIN_HISTORY_BARS[range],
          maxAbsReturn: MARKET_MOVER_MAX_ABS_RETURN[range],
          recentBars: Math.min(20, MARKET_MOVER_MIN_HISTORY_BARS[range]),
          latestDateStart,
          latestDateEnd,
        });
        const ordered = rows.filter((r) => Number.isFinite(r.returnPercent));
        const gainers = ordered.filter((r) => r.returnPercent > 0).sort((a, b) => b.returnPercent - a.returnPercent).slice(0, 10);
        const losers = ordered.filter((r) => r.returnPercent < 0).sort((a, b) => a.returnPercent - b.returnPercent).slice(0, 10);
        gainers.forEach((r, i) => allRows.push({ scanType: 'MOVERS_GAINERS', scanRange: range, ...scope, tradingDate, rank: i + 1, payloadJson: r as unknown as object, computedAt: now }));
        losers.forEach((r, i) => allRows.push({ scanType: 'MOVERS_LOSERS', scanRange: range, ...scope, tradingDate, rank: i + 1, payloadJson: r as unknown as object, computedAt: now }));

        // market-map (top 60 by abs return, same data source)
        const seen = new Set<string>();
        const mapTiles = ordered
          .sort((a, b) => Math.abs(b.returnPercent) - Math.abs(a.returnPercent))
          .filter((r) => { if (seen.has(r.instrumentId)) return false; seen.add(r.instrumentId); return true; })
          .slice(0, 60);
        mapTiles.forEach((r, i) => allRows.push({ scanType: 'MARKET_MAP', scanRange: range, ...scope, tradingDate, rank: i + 1, payloadJson: r as unknown as object, computedAt: now }));
      } catch (err) {
        errors.push(`Movers/map range ${range}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // ---- 52w-high + 52w-low ----
    for (const scanType of ['52w-high', '52w-low'] as const) {
      try {
        const rows = await this.host.repository.scan52wProximity({ ...scope, scanType, proximityPct: 5, limit: 50 });
        rows.forEach((r, i) => allRows.push({ scanType: scanType === '52w-high' ? '52W_HIGH' : '52W_LOW', scanRange: null, ...scope, tradingDate, rank: i + 1, payloadJson: r as unknown as object, computedAt: now }));
      } catch (err) {
        errors.push(`52w ${scanType}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // ---- delivery-spike ----
    try {
      const rows = await this.host.repository.scanDeliverySpike({ ...scope, lookbackBars: 20, minSpikeRatio: 1.5, limit: 50 });
      rows.forEach((r, i) => allRows.push({ scanType: 'DELIVERY_SPIKE', scanRange: null, ...scope, tradingDate, rank: i + 1, payloadJson: r as unknown as object, computedAt: now }));
    } catch (err) {
      errors.push(`delivery-spike: ${err instanceof Error ? err.message : String(err)}`);
    }

    // ---- volume-spike ----
    try {
      const rows = await this.host.repository.scanVolumeSpike({ ...scope, lookbackBars: 20, minSpikeRatio: 2.0, limit: 50 });
      rows.forEach((r, i) => allRows.push({ scanType: 'VOLUME_SPIKE', scanRange: null, ...scope, tradingDate, rank: i + 1, payloadJson: r as unknown as object, computedAt: now }));
    } catch (err) {
      errors.push(`volume-spike: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (allRows.length === 0) {
      warnings.push('No scan rows computed — nothing to persist.');
      return { tradingDate: tradingDate.toISOString().slice(0, 10), totalInserted: 0, scanTypes: [], warnings, errors };
    }

    const db = this.host.repository.prisma;

    // Atomic replace: delete + chunked insert run inside a single transaction so
    // concurrent GETs never see an empty/torn snapshot between the two operations.
    const CHUNK = 200;
    await (db as any).$transaction(async (tx: any) => {
      await tx.marketScanSnapshot.deleteMany({
        where: {
          region: scope.region,
          assetType: scope.assetType,
          tradingDate,
        },
      });
      for (let i = 0; i < allRows.length; i += CHUNK) {
        const chunk = allRows.slice(i, i + CHUNK);
        await tx.marketScanSnapshot.createMany({ data: chunk });
      }
    });

    const scanTypes = [...new Set(allRows.map((r) => r.scanType))];
    return {
      tradingDate: tradingDate.toISOString().slice(0, 10),
      totalInserted: allRows.length,
      scanTypes,
      warnings,
      errors,
    };
  }
}
