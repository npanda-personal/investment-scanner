import type { Request, Response } from 'express';
import { EarningsIntelligenceService } from './earnings-intelligence.service';
import { parseEarningsIntelligenceQuery } from './earnings-intelligence.validation';

export class EarningsIntelligenceController {
  constructor(private readonly service = new EarningsIntelligenceService()) {}

  latest = async (req: Request, res: Response) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const query = parseEarningsIntelligenceQuery(req.query as Record<string, unknown>);
      return res.json(await this.service.latest(query));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load earnings intelligence snapshot';
      return res.status(400).json({ error: message });
    }
  };
}

