import type { Request, Response } from 'express';
import { EarningsIntelligenceService } from './earnings-intelligence.service';
import { parseEarningsIntelligenceQuery } from './earnings-intelligence.validation';
import { ingestNseBoardMeetings } from './earnings-intelligence.board-meetings-ingest';

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
   * POST /api/v1/market-intelligence/earnings/ingest-board-meetings
   *
   * Fetches the NSE board-meetings calendar, matches result-announcement dates
   * to Fundamental rows, and persists officialResultDate for each match.
   * After this completes, call /refresh to re-materialise the earnings snapshot
   * with the new OFFICIAL_CALENDAR dates.
   *
   * Body (all optional):
   *   fromDate   – 'DD-MM-YYYY'; defaults to 90 days ago
   *   toDate     – 'DD-MM-YYYY'; defaults to 90 days ahead
   *   dryRun     – boolean; if true, parse + match but do NOT write to DB
   *   symbol     – single NSE symbol (uses per-symbol endpoint)
   *
   * NOTE: NSE is bot-protected. This endpoint must be called from a host with
   * direct NSE access (not a datacenter IP).  If blocked it returns
   * status='BLOCKED' with an error field rather than a 500.
   */
  ingestBoardMeetings = async (req: Request, res: Response) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const body = req.body as Record<string, unknown>;
      const result = await ingestNseBoardMeetings({
        fromDate: body.fromDate ? String(body.fromDate) : undefined,
        toDate: body.toDate ? String(body.toDate) : undefined,
        dryRun: body.dryRun === true || body.dryRun === 'true' || body.dryRun === '1',
        symbol: body.symbol ? String(body.symbol) : undefined,
      });
      const httpStatus = result.status === 'FAILED' ? 500 : 200;
      return res.status(httpStatus).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to ingest NSE board meetings';
      return res.status(500).json({ error: message });
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
   * This is a write endpoint — call it after the NSE board-meetings ingest
   * to materialise fresh UPCOMING_RESULTS categories.
   */
  refresh = async (req: Request, res: Response) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const body = (req.body ?? {}) as Record<string, unknown>;
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

