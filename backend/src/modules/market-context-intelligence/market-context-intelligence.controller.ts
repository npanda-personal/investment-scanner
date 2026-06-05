import type { Request, Response } from 'express';
import { MarketContextIntelligenceService } from './market-context-intelligence.service';
import { MarketPulseSnapshotService } from './market-pulse-snapshot.service';
import { CapitalPostureService } from './capital-posture.service';
import { ingestFiiDii, getLatestFiiDiiActivity } from './fii-dii.service';
import { ingestBulkBlockDeals, getLatestBulkBlockDeals } from './bulk-block-deals.service';

export class MarketContextIntelligenceController {
  constructor(
    private readonly service = new MarketContextIntelligenceService(),
    private readonly marketPulseService = new MarketPulseSnapshotService(),
    private readonly capitalPostureService = new CapitalPostureService(),
  ) {}

  summary = async (req: Request, res: Response) => {
    // Persisted-read only: never generate or write on a GET.
    // Repoints to the same persisted path used by persistedSummary so no
    // live .run() / saveSnapshot() is triggered.
    const region = this.region(req) || 'GLOBAL';
    return this.respond(res, async () => {
      const persisted = await this.service.latestPersistedSummary(region);
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
    const region = this.region(req) || 'GLOBAL';
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
    const region = this.region(req) || 'GLOBAL';
    return this.respond(res, () => this.service.latestPersistedBreadth(region));
  };

  marketPulse = async (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    return this.respond(res, () => this.marketPulseService.latestSnapshot({
      region: this.region(req) || 'IN',
      assetType: this.assetType(req) || 'STOCK',
      timeframe: this.timeframe(req) || '1d',
    }));
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
    const days = typeof req.query.days === 'string' ? Math.max(1, Math.min(30, Number(req.query.days) || 1)) : 1;
    return this.respond(res, () => getLatestBulkBlockDeals(days));
  };

  bulkBlockDealsIngest = async (_req: Request, res: Response) =>
    this.respond(res, () => ingestBulkBlockDeals());

  regime = async (req: Request, res: Response) => this.respond(res, () => this.service.regime(this.region(req)));
  sectors = async (req: Request, res: Response) => this.respond(res, () => this.service.sectors(this.region(req)));
  breadth = async (req: Request, res: Response) => this.respond(res, () => this.service.breadth(this.region(req)));
  countries = async (req: Request, res: Response) => this.respond(res, () => this.service.countries(this.region(req)));
  macro = async (_req: Request, res: Response) => this.respond(res, () => this.service.macro());
  refresh = async (req: Request, res: Response) => this.respond(res, () => this.service.summary({ region: this.region(req) }));

  private region(req: Request): string | undefined {
    return typeof req.query.region === 'string' ? req.query.region.trim() || undefined : undefined;
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
