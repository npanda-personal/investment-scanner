// Potential-movers scan serving-read.
//
// Standalone by necessity: the market-data-foundation service and scan-reads are
// shrink-only god-files, so this serving owns its own Prisma read — same pattern as
// conviction-reads.ts. Layering still holds: controller → this service → DB.

import type { PrismaClient } from '@prisma/client';
import defaultPrisma from '../../../db/prisma';
import { isCryptoScope } from '../../../shared/data-access/market-repository-router';
import { resolveMarketProfile } from '../../../shared/utils/market-profile';
import type { MarketScanRowPotentialMovers, MarketScanSummaryPotentialMovers } from '../market-data-foundation.types';

export class PotentialMoversService {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  private async readLatestSnapshot(region: string, assetType: string): Promise<{ rows: object[] } | null> {
    const db = this.prisma as any;
    const latest = await db.marketScanSnapshot.findFirst({
      where: { scanType: 'POTENTIAL_MOVERS', scanRange: null, region, assetType },
      orderBy: { tradingDate: 'desc' },
      select: { tradingDate: true },
    });
    if (!latest) return null;
    const rows = await db.marketScanSnapshot.findMany({
      where: { scanType: 'POTENTIAL_MOVERS', scanRange: null, region, assetType, tradingDate: latest.tradingDate },
      orderBy: { rank: 'asc' },
      select: { payloadJson: true },
    });
    return { rows: rows.map((r: any) => r.payloadJson as object) };
  }

  async marketScanPotentialMovers(options: {
    region?: string;
    assetType?: string;
    limit?: number;
  } = {}): Promise<MarketScanSummaryPotentialMovers> {
    const scope = {
      region: options.region?.trim().toUpperCase() || 'IN',
      assetType: options.assetType?.trim().toUpperCase() || 'STOCK',
    };
    const limit = Math.max(1, Math.min(options.limit ?? 50, 100));

    if (isCryptoScope(options)) {
      return {
        scanType: 'potential-movers',
        scope,
        generatedAt: new Date().toISOString(),
        results: [],
        warnings: ['Potential-movers scan is equity-only; price-band circuits are not applicable to crypto.'],
      };
    }

    const snap = await this.readLatestSnapshot(scope.region, scope.assetType);
    if (!snap) {
      return {
        scanType: 'potential-movers',
        scope,
        generatedAt: new Date().toISOString(),
        results: [],
        warnings: [`No potential-movers snapshot found for ${scope.region}/${scope.assetType}. Run MARKET_SCAN_REFRESH to populate.`],
      };
    }

    const currency = resolveMarketProfile(scope).currency;
    const results = (snap.rows.slice(0, limit) as unknown as MarketScanRowPotentialMovers[]).map((r) => ({
      ...r,
      currency: (r as any).currency || currency,
      region: (r as any).region || scope.region,
    }));

    return {
      scanType: 'potential-movers',
      scope,
      generatedAt: new Date().toISOString(),
      results,
      warnings: ['Potential-movers served from stored daily snapshot. Shows stocks with 3 consecutive rising closes above SMA20 — pre-momentum accumulation pattern.'],
    };
  }
}
