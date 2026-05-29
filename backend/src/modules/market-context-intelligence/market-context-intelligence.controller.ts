import type { Request, Response } from 'express';
import { MarketContextIntelligenceService } from './market-context-intelligence.service';

export class MarketContextIntelligenceController {
  constructor(private readonly service = new MarketContextIntelligenceService()) {}

  summary = async (req: Request, res: Response) => this.respond(res, () => this.service.summary({ region: this.region(req) }));

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

  run = async (req: Request, res: Response) => this.respond(res, () => this.service.run(this.region(req)));

  regime = async (req: Request, res: Response) => this.respond(res, () => this.service.regime(this.region(req)));
  sectors = async (req: Request, res: Response) => this.respond(res, () => this.service.sectors(this.region(req)));
  breadth = async (req: Request, res: Response) => this.respond(res, () => this.service.breadth(this.region(req)));
  countries = async (req: Request, res: Response) => this.respond(res, () => this.service.countries(this.region(req)));
  macro = async (_req: Request, res: Response) => this.respond(res, () => this.service.macro());
  refresh = async (req: Request, res: Response) => this.respond(res, () => this.service.summary({ region: this.region(req) }));

  private region(req: Request): string | undefined {
    return typeof req.query.region === 'string' ? req.query.region.trim() || undefined : undefined;
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
