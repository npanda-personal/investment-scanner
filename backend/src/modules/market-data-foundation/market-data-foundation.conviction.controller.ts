import type { Request, Response } from 'express';
import { normalizeMarketRegion } from '../../shared/utils/market-scope';
import { cacheService, type CacheService } from '../../cache/cache.service';
import { convictionKey } from '../../cache/cache-keys';
import { ConvictionReadsService } from './analytics/market-data-foundation.serving.conviction-reads';

/**
 * High-conviction screener HTTP controller (persisted-reads only).
 *
 * Split out of the market-data-foundation god-controller (shrink-only) per the
 * one-responsibility-per-file rule — same pattern as MarketDataFoundationCryptoBoardController.
 * Serves the Screener "Conviction" tab:
 *   - GET /market-data/screener/conviction  → top-20 stocks where the signal engine and
 *     smart-money accumulation agree across 1W/1M/3M/6M (bar in analytics/conviction-score.ts).
 *
 * Pure persisted-read: parses query params and shapes the response only. No live fetch.
 */
export class MarketDataFoundationConvictionController {
  constructor(
    private readonly service = new ConvictionReadsService(),
    private readonly cache: CacheService = cacheService,
  ) {}

  private parseBoolean(value: unknown): boolean {
    const v = Array.isArray(value) ? value[0] : value;
    return v === '1' || v === 'true' || v === true;
  }

  /** GET /market-data/screener/conviction */
  conviction = async (req: Request, res: Response) => {
    try {
      const region = normalizeMarketRegion(
        (req.query.region || req.query.market) as string | undefined,
      );
      const assetType = ((req.query.assetType || req.query.asset_type) as string | undefined)
        ?.trim()
        .toUpperCase() || undefined;
      const onlyFnoEligible = this.parseBoolean(req.query.onlyFnoEligible);
      const { data, cacheHit } = await this.cache.cacheReadThroughWithMeta(
        convictionKey({ region, assetType, onlyFnoEligible }),
        () => this.service.conviction({ region, assetType, onlyFnoEligible }),
        undefined,
        (v: any) => (v?.count ?? 0) > 0,
      );
      res.setHeader('X-Cache', cacheHit ? 'HIT' : 'MISS');
      return res.json(data);
    } catch (error) {
      console.error('Conviction screener error:', error);
      return res.status(500).json({ error: 'Conviction screener query failed' });
    }
  };
}
