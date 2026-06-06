import type { Request, Response } from 'express';
import { PortfolioIntelligenceService } from './portfolio-intelligence.service';
import { getPortfolioId } from './portfolio-intelligence.validation';

const currentUserId = (req: Request) => (req as any).user?.id || 'default-user';

export class PortfolioIntelligenceController {
  constructor(private readonly service = new PortfolioIntelligenceService()) {}

  /** Persisted-read GET: reads snapshot from DB, materialises lazily on first call. */
  intelligence = async (req: Request, res: Response) => {
    try {
      const result = await this.service.intelligence(getPortfolioId(req.params.id), currentUserId(req));
      if (!result) return res.status(404).json({ error: 'Portfolio not found' });
      return res.json(result);
    } catch (error) {
      return this.error(res, error, 'Failed to load portfolio intelligence');
    }
  };

  redFlags = async (req: Request, res: Response) => {
    try {
      const redFlags = await this.service.redFlags(getPortfolioId(req.params.id), currentUserId(req));
      if (!redFlags) return res.status(404).json({ error: 'Portfolio not found' });
      return res.json({ redFlags });
    } catch (error) {
      return this.error(res, error, 'Failed to load portfolio red flags');
    }
  };

  review = async (req: Request, res: Response) => {
    try {
      const review = await this.service.review(getPortfolioId(req.params.id), currentUserId(req));
      if (!review) return res.status(404).json({ error: 'Portfolio not found' });
      return res.json({ review });
    } catch (error) {
      return this.error(res, error, 'Failed to load portfolio review');
    }
  };

  /**
   * POST /portfolios/:id/intelligence/refresh
   *
   * Forces a full recompute + upsert of the snapshot.
   * Called (a) after holdings mutations and (b) from daily refresh jobs.
   */
  refresh = async (req: Request, res: Response) => {
    try {
      const result = await this.service.refreshPortfolioIntelligence(getPortfolioId(req.params.id), currentUserId(req));
      if (!result) return res.status(404).json({ error: 'Portfolio not found' });
      return res.status(200).json(result);
    } catch (error) {
      return this.error(res, error, 'Failed to refresh portfolio intelligence');
    }
  };

  private error(res: Response, error: unknown, fallback: string) {
    const message = error instanceof Error ? error.message : fallback;
    console.error(fallback, error);
    return res.status(500).json({ error: message });
  }
}
