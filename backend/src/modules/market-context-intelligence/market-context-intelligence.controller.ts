import type { Request, Response } from 'express';
import { MarketContextIntelligenceService } from './market-context-intelligence.service';

export class MarketContextIntelligenceController {
  constructor(private readonly service = new MarketContextIntelligenceService()) {}

  summary = async (_req: Request, res: Response) => this.respond(res, () => this.service.summary());

  run = async (_req: Request, res: Response) => this.respond(res, () => this.service.run());

  regime = async (_req: Request, res: Response) => this.respond(res, () => this.service.regime());
  sectors = async (_req: Request, res: Response) => this.respond(res, () => this.service.sectors());
  breadth = async (_req: Request, res: Response) => this.respond(res, () => this.service.breadth());
  countries = async (_req: Request, res: Response) => this.respond(res, () => this.service.countries());
  macro = async (_req: Request, res: Response) => this.respond(res, () => this.service.macro());
  refresh = async (_req: Request, res: Response) => this.respond(res, () => this.service.summary());

  private async respond(res: Response, fn: () => Promise<unknown> | unknown) {
    try {
      return res.json(await fn());
    } catch (error) {
      console.error('Market context endpoint error:', error);
      return res.status(500).json({ error: 'Failed to load market context' });
    }
  }
}
