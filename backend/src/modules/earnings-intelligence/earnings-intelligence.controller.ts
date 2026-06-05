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

  /**
   * POST /api/v1/market-intelligence/earnings/refresh
   *
   * Materialises (or re-materialises) the Earnings Intelligence snapshot for
   * all active IN/STOCK instruments that have persisted fundamentals.
   *
   * Body (all optional):
   *   region       – defaults to "IN"
   *   assetType    – defaults to "STOCK"
   *   snapshotDate – ISO date string; defaults to today
   *   batchSize    – 1–100; defaults to 25
   *   offset       – for resumable batching; defaults to 0
   *
   * This is a write endpoint — call it after fundamentals are updated or after
   * the NSE board-meetings ingest to materialise fresh categories.
   */
  refresh = async (req: Request, res: Response) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const body = req.body as Record<string, unknown>;
      const snapshotDateRaw = body.snapshotDate;
      const snapshotDate = snapshotDateRaw ? new Date(String(snapshotDateRaw)) : new Date();
      if (Number.isNaN(snapshotDate.getTime())) {
        return res.status(400).json({ error: 'snapshotDate must be a valid ISO date string' });
      }
      const result = await this.service.refreshSnapshots({
        region: body.region ? String(body.region) : 'IN',
        assetType: body.assetType ? String(body.assetType) : 'STOCK',
        snapshotDate,
        batchSize: body.batchSize ? Number(body.batchSize) : 25,
        offset: body.offset ? Number(body.offset) : 0,
      });
      return res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refresh earnings intelligence snapshot';
      return res.status(500).json({ error: message });
    }
  };
}

