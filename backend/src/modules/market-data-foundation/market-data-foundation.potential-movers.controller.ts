import type { Request, Response } from 'express';
import { PotentialMoversService } from './analytics/market-data-foundation.serving.potential-movers';

/**
 * Potential-movers scan HTTP controller.
 *
 * Split out of the market-data-foundation god-controller (shrink-only) per the
 * one-responsibility-per-file rule — same pattern as MarketDataFoundationConvictionController.
 * Serves: GET /market-data/scans/potential-movers
 */
export class MarketDataFoundationPotentialMoversController {
  constructor(private readonly service = new PotentialMoversService()) {}

  marketScanPotentialMovers = async (req: Request, res: Response) => {
    try {
      const region = ((req.query.region || req.query.market) as string | undefined)?.trim().toUpperCase();
      const assetType = (req.query.assetType as string | undefined)?.trim().toUpperCase();
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      return res.json(await this.service.marketScanPotentialMovers({ region, assetType, limit }));
    } catch (error) {
      console.error('Potential-movers scan error:', error);
      return res.status(500).json({ error: 'Potential-movers scan failed' });
    }
  };
}
