import type { Request, Response } from 'express';
import { StockInterestSnapshotService } from './stock-interest-snapshot.service';
import { parseStockInterestScope } from './stock-interest-snapshot.validation';

export class MarketIntelligenceController {
  constructor(private readonly stockInterestService = new StockInterestSnapshotService()) {}

  stockInterest = async (req: Request, res: Response) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      return res.json(await this.stockInterestService.latestSnapshot(parseStockInterestScope(req.query as Record<string, unknown>)));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load Stock Interest snapshot';
      return res.status(500).json({
        availability: 'ERROR',
        scope: parseStockInterestScope({}),
        snapshot: null,
        message,
        warnings: [message],
      });
    }
  };
}
