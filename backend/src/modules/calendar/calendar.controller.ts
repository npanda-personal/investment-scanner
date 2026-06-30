import type { Request, Response } from 'express';
import { CalendarService } from './calendar.service';
import { parseCalendarQuery, parseCalendarRefreshBody } from './calendar.validation';
import { poolContext } from '../../db/prisma';

export class CalendarController {
  constructor(private readonly service = new CalendarService()) {}

  /**
   * GET /api/v1/calendar?type=IPO|DIVIDEND|SPLIT|EARNINGS|ECONOMIC|ALL&region&assetType&from&to&limit
   * Persisted read — assembles the unified event calendar from snapshots only.
   */
  latest = async (req: Request, res: Response) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const query = parseCalendarQuery(req.query as Record<string, unknown>);
      return res.json(await this.service.latest(query));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load calendar';
      return res.status(400).json({ error: message });
    }
  };

  /**
   * POST /api/v1/calendar/refresh
   * Materialize the IPO snapshot (recently-listed window), ingest the FRED
   * economic-release schedule, and ingest the NSE/BSE forthcoming-IPO feed.
   * Explicit action only — never runs on a GET.
   *
   * Body (all optional): region, assetType, snapshotDate (ISO), lookbackDays,
   * includeEconomic, includeUpcomingIpo.
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
      const parsed = parseCalendarRefreshBody(body);
      // Heavy multi-feed snapshot rebuild — run on the dedicated pipeline pool so a
      // long manual refresh doesn't contend with user traffic on the API pool.
      const result = await poolContext.run('pipeline', () =>
        this.service.refreshSnapshots({ ...parsed, snapshotDate }),
      );
      return res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refresh calendar';
      return res.status(500).json({ error: message });
    }
  };
}
