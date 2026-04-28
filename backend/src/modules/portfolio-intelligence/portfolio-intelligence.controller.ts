import type { Request, Response } from 'express';
import { PortfolioIntelligenceService } from './portfolio-intelligence.service';
import { getPortfolioId } from './portfolio-intelligence.validation';

export class PortfolioIntelligenceController {
  constructor(private readonly service = new PortfolioIntelligenceService()) {}

  intelligence = async (req: Request, res: Response) => {
    try {
      const result = await this.service.intelligence(getPortfolioId(req.params.id));
      if (!result) return res.status(404).json({ error: 'Portfolio not found' });
      return res.json(result);
    } catch (error) {
      return this.error(res, error, 'Failed to load portfolio intelligence');
    }
  };

  redFlags = async (req: Request, res: Response) => {
    try {
      const redFlags = await this.service.redFlags(getPortfolioId(req.params.id));
      if (!redFlags) return res.status(404).json({ error: 'Portfolio not found' });
      return res.json({ redFlags });
    } catch (error) {
      return this.error(res, error, 'Failed to load portfolio red flags');
    }
  };

  review = async (req: Request, res: Response) => {
    try {
      const review = await this.service.review(getPortfolioId(req.params.id));
      if (!review) return res.status(404).json({ error: 'Portfolio not found' });
      return res.json({ review });
    } catch (error) {
      return this.error(res, error, 'Failed to load portfolio review');
    }
  };

  private error(res: Response, error: unknown, fallback: string) {
    const message = error instanceof Error ? error.message : fallback;
    console.error(fallback, error);
    return res.status(500).json({ error: message });
  }
}
