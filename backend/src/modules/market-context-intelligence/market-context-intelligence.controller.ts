import type { Request, Response } from 'express';
import { MarketContextIntelligenceService } from './market-context-intelligence.service';
import { MarketPulseSnapshotService } from './market-pulse-snapshot.service';
import { CapitalPostureService } from './capital-posture.service';
import { ingestFiiDii, getLatestFiiDiiActivity } from './fii-dii.service';
import { ingestBulkBlockDeals, getLatestBulkBlockDeals } from './bulk-block-deals.service';
import { sendBlockDealsAlert } from './block-deals-telegram';
import { getInstitutionalActivity } from './institutional-activity.service';
import { resolveMarketProfile } from '../../shared/utils/market-profile';
import { notApplicablePayload } from '../../shared/utils/not-applicable';
import { cacheService, type CacheService } from '../../cache/cache.service';
import { marketContextSummaryKey, marketPulseKey } from '../../cache/cache-keys';

export class MarketContextIntelligenceController {
  constructor(
    private readonly service = new MarketContextIntelligenceService(),
    private readonly marketPulseService = new MarketPulseSnapshotService(),
    private readonly capitalPostureService = new CapitalPostureService(),
    private readonly cache: CacheService = cacheService,
  ) {}

  summary = async (req: Request, res: Response) => {
    // Persisted-read only: never generate or write on a GET.
    // Repoints to the same persisted path used by persistedSummary so no
    // live .run() / saveSnapshot() is triggered.
    // Uppercase so the cache key matches the warm/invalidation paths (region keys are canonical).
    const region = this.contextRegion(req).toUpperCase();
    return this.respond(res, async () => {
      // Cache the expensive persisted read; the cheap envelope shaping below runs on cached data.
      const { data: persisted, cacheHit } = await this.cache.cacheReadThroughWithMeta(
        marketContextSummaryKey(region),
        () => this.service.latestPersistedSummary(region),
        undefined,
        (v) => v != null && (v as any).regime != null,
      );
      res.setHeader('X-Cache', cacheHit ? 'HIT' : 'MISS');
      if (!persisted) {
        return {
          status: 'missing',
          scope: { region },
          summary: null,
          asOf: null,
          materialized: false,
          message: 'Persisted market context is not available for this scope.',
        };
      }
      return {
        status: 'ready',
        scope: { region },
        summary: persisted,
        asOf: persisted.updatedAt || persisted.regime?.updatedAt || null,
        materialized: false,
      };
    });
  };

  persistedSummary = async (req: Request, res: Response) => {
    const region = this.contextRegion(req);
    return this.respond(res, async () => {
      const summary = await this.service.latestPersistedSummary(region);
      if (!summary) {
        return {
          status: 'missing',
          scope: { region },
          summary: null,
          asOf: null,
          materialized: false,
          message: 'Persisted market context is not available for this scope.',
        };
      }
      return {
        status: 'ready',
        scope: { region },
        summary,
        asOf: summary.updatedAt || summary.regime.updatedAt || null,
        materialized: false,
      };
    });
  };

  persistedBreadth = async (req: Request, res: Response) => {
    const region = this.contextRegion(req);
    return this.respond(res, () => this.service.latestPersistedBreadth(region));
  };

  /**
   * NR-104: Breadth Internals time series
   * GET /market-context/breadth-internals?days=60&region=GLOBAL
   * Persisted-read only. Returns oldest→newest series of breadth metrics.
   */
  breadthInternals = async (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    const region = this.region(req) || 'GLOBAL';
    const days = typeof req.query.days === 'string' ? Math.max(1, Math.min(180, Number(req.query.days) || 60)) : 60;
    return this.respond(res, () => this.service.breadthInternals(region, days));
  };

  marketPulse = async (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    const scope = {
      region: (this.region(req) || 'IN').toUpperCase(),
      assetType: (this.assetType(req) || 'STOCK').toUpperCase(),
      timeframe: (this.timeframe(req) || '1d').toLowerCase(),
    };
    return this.respond(res, async () => {
      const { data, cacheHit } = await this.cache.cacheReadThroughWithMeta(
        marketPulseKey(scope),
        () => this.marketPulseService.latestSnapshot(scope),
        undefined,
        (v: any) => v?.availability !== 'EMPTY',
      );
      res.setHeader('X-Cache', cacheHit ? 'HIT' : 'MISS');
      return data;
    });
  };

  marketPulseHistory = async (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    return this.respond(res, () => this.marketPulseService.snapshotHistory({
      region: this.region(req) || 'IN',
      assetType: this.assetType(req) || 'STOCK',
      timeframe: this.timeframe(req) || '1d',
      limit: this.limit(req),
    }));
  };

  sectorSnapshots = async (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    return this.respond(res, () => this.service.latestSectorIntelligenceSnapshot({
      region: this.region(req),
      assetType: this.assetType(req),
    }));
  };

  capitalPosture = async (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    return this.respond(res, () =>
      this.capitalPostureService.capitalPosture(this.region(req) || 'IN')
    );
  };

  run = async (req: Request, res: Response) => this.respond(res, () => this.service.run(this.region(req)));

  /**
   * CB-21: FII/DII Activity
   * GET  /market-context/fii-dii          — persisted-read (last N days)
   * POST /market-context/fii-dii/ingest   — fetch from NSE + persist
   */
  fiiDiiActivity = async (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    const region = this.region(req) || 'IN';
    const profile = resolveMarketProfile({ region, assetType: this.assetType(req) });
    if (!profile.capabilities.hasInstitutionalFlow) {
      return res.json(notApplicablePayload(
        `FII/DII activity is not applicable to ${region} equities (NSE-sourced, India only).`,
        { rows: [] },
      ));
    }
    const days = typeof req.query.days === 'string' ? Math.max(1, Math.min(30, Number(req.query.days) || 5)) : 5;
    return this.respond(res, () => getLatestFiiDiiActivity(days));
  };

  fiiDiiIngest = async (_req: Request, res: Response) =>
    this.respond(res, () => ingestFiiDii());

  /**
   * CB-22: Bulk & Block Deals
   * GET  /market-context/bulk-block-deals           — persisted-read (last N days)
   * POST /market-context/bulk-block-deals/ingest    — fetch from NSE + persist
   */
  bulkBlockDeals = async (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    const region = this.region(req) || 'IN';
    const profile = resolveMarketProfile({ region, assetType: this.assetType(req) });
    if (!profile.capabilities.hasInstitutionalFlow) {
      return res.json(notApplicablePayload(
        `Bulk/block deals are not applicable to ${region} equities (NSE-sourced, India only).`,
        { rows: [] },
      ));
    }
    const days = typeof req.query.days === 'string' ? Math.max(1, Math.min(30, Number(req.query.days) || 1)) : 1;
    return this.respond(res, () => getLatestBulkBlockDeals(days));
  };

  bulkBlockDealsIngest = async (_req: Request, res: Response) => {
    try {
      const result = await ingestBulkBlockDeals();
      if (result.status === 'success' && result.rowsUpserted > 0) {
        getLatestBulkBlockDeals(1)
          .then((data) => sendBlockDealsAlert(data.rows))
          .catch(() => {});
      }
      return res.json(result);
    } catch (error) {
      console.error('Market context endpoint error:', error);
      return res.status(500).json({ error: 'Failed to load market context' });
    }
  };

  /**
   * CB-25: Institutional Activity Aggregate
   * GET /market-context/institutional-activity
   * Composes FII/DII + bulk/block deals + F&O ban + smart-money sectors
   * into a single persisted-read summary DTO.
   */
  institutionalActivity = async (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    const region = this.region(req) || 'IN';
    const profile = resolveMarketProfile({ region, assetType: this.assetType(req) });
    if (!profile.capabilities.hasInstitutionalFlow) {
      return res.json(notApplicablePayload(
        `Institutional activity is not applicable to ${region} equities (NSE-sourced, India only).`,
      ));
    }
    return this.respond(res, () => getInstitutionalActivity());
  };

  regime = async (req: Request, res: Response) => this.respond(res, () => this.service.regime(this.contextRegion(req)));
  sectors = async (req: Request, res: Response) => this.respond(res, () => this.service.sectors(this.contextRegion(req)));
  breadth = async (req: Request, res: Response) => this.respond(res, () => this.service.breadth(this.contextRegion(req)));
  countries = async (req: Request, res: Response) => this.respond(res, () => this.service.countries(this.contextRegion(req)));
  macro = async (_req: Request, res: Response) => this.respond(res, () => this.service.macro());
  refresh = async (req: Request, res: Response) => this.respond(res, () => this.service.summary({ region: this.contextRegion(req) }));

  private region(req: Request): string | undefined {
    return typeof req.query.region === 'string' ? req.query.region.trim() || undefined : undefined;
  }

  /**
   * Region key for persisted market-context reads. Crypto scope maps to the dedicated
   * 'CRYPTO' partition (the snapshot table has no assetType column), so crypto requests
   * read the crypto-native regime/breadth instead of the equity GLOBAL/IN snapshot.
   */
  private contextRegion(req: Request): string {
    const region = this.region(req);
    const profile = resolveMarketProfile({ region, assetType: this.assetType(req) });
    return profile.assetClass === 'CRYPTO' ? 'CRYPTO' : (region || 'GLOBAL');
  }

  private assetType(req: Request): string | undefined {
    return typeof req.query.assetType === 'string' ? req.query.assetType.trim() || undefined : undefined;
  }

  private timeframe(req: Request): string | undefined {
    return typeof req.query.timeframe === 'string' ? req.query.timeframe.trim() || undefined : undefined;
  }

  private limit(req: Request): number | undefined {
    const raw = typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined;
    if (!Number.isInteger(raw) || raw === undefined || raw <= 0) return undefined;
    return Math.min(raw, 100);
  }

  private async respond(res: Response, fn: () => Promise<unknown> | unknown) {
    try {
      return res.json(await fn());
    } catch (error) {
      console.error('Market context endpoint error:', error);
      return res.status(500).json({ error: 'Failed to load market context' });
    }
  }
}
