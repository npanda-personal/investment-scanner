import type { Request, Response } from 'express';
import { ResearchHubService } from './research-hub.service';

export class ResearchHubController {
  constructor(private readonly service = new ResearchHubService()) {}

  overview = async (req: Request, res: Response) => {
    try {
      const data = await this.service.overview({
        region: typeof req.query.region === 'string' ? req.query.region : undefined,
        assetType: typeof req.query.assetType === 'string' ? req.query.assetType : undefined,
        live: req.query.live === 'true',
      });
      return res.json(data);
    } catch (error) {
      console.error('Research Hub overview error:', error);
      return res.status(500).json({ error: 'Failed to load research overview' });
    }
  };

  health = async (_req: Request, res: Response) => {
    try {
      const data = await this.service.health();
      return res.json(data);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to load research hub health' });
    }
  };
}
