import type { Request, Response } from 'express';
import { StockInterestSnapshotService } from './stock-interest-snapshot.service';
import { SectorConstituentsService } from './sector-constituents.service';
import { parseStockInterestScope } from './stock-interest-snapshot.validation';

export class MarketIntelligenceController {
  constructor(
    private readonly stockInterestService = new StockInterestSnapshotService(),
    private readonly sectorConstituentsService = new SectorConstituentsService(),
  ) {}

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

  sectorConstituents = async (req: Request, res: Response) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const result = await this.sectorConstituentsService.constituentsForSector({
        sector: typeof req.query.sector === 'string' ? req.query.sector : null,
        region: typeof req.query.region === 'string' ? req.query.region : 'IN',
        assetType: typeof req.query.assetType === 'string' ? req.query.assetType : 'STOCK',
      });
      return res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load sector constituents';
      return res.status(500).json({
        availability: 'ERROR',
        sector: req.query.sector ?? '',
        region: req.query.region ?? 'IN',
        assetType: req.query.assetType ?? 'STOCK',
        constituents: [],
        count: 0,
        message,
        warnings: [message],
      });
    }
  };
}
