import type { Request, Response } from 'express';
import { HistoricalContextSnapshotsService } from './historical-context-snapshots.service';
import { parseGenerateRequest, parseLookupQuery, parseSnapshotQuery } from './historical-context-snapshots.validation';

export class HistoricalContextSnapshotsController {
  constructor(private readonly service = new HistoricalContextSnapshotsService()) {}

  generate = async (req: Request, res: Response) => {
    try {
      const input = parseGenerateRequest(req.body || {});
      return res.status(201).json(await this.service.generate(input.snapshotDate, input.limit));
    } catch (error) { return this.error(res, error, 'Failed to generate context snapshots', 400); }
  };

  summary = async (_req: Request, res: Response) => {
    try { return res.json(await this.service.summary()); }
    catch (error) { return this.error(res, error, 'Failed to load snapshot summary'); }
  };

  market = async (req: Request, res: Response) => {
    try { return res.json({ items: await this.service.market(parseSnapshotQuery(req.query)) }); }
    catch (error) { return this.error(res, error, 'Failed to load market snapshots', 400); }
  };

  sectors = async (req: Request, res: Response) => {
    try { return res.json({ items: await this.service.sectors(parseSnapshotQuery(req.query)) }); }
    catch (error) { return this.error(res, error, 'Failed to load sector snapshots', 400); }
  };

  countries = async (req: Request, res: Response) => {
    try { return res.json({ items: await this.service.countries(parseSnapshotQuery(req.query)) }); }
    catch (error) { return this.error(res, error, 'Failed to load country snapshots', 400); }
  };

  smartMoney = async (req: Request, res: Response) => {
    try { return res.json({ items: await this.service.smartMoney(parseSnapshotQuery(req.query)) }); }
    catch (error) { return this.error(res, error, 'Failed to load smart-money snapshots', 400); }
  };

  coverage = async (_req: Request, res: Response) => {
    try { return res.json(await this.service.coverage()); }
    catch (error) { return this.error(res, error, 'Failed to load snapshot coverage'); }
  };

  lookup = async (req: Request, res: Response) => {
    try {
      const query = parseLookupQuery(req.query);
      return res.json(await this.service.lookup(query.date, query.lookbackDays, query));
    } catch (error) { return this.error(res, error, 'Failed to lookup context snapshots', 400); }
  };

  private error(res: Response, error: unknown, fallback: string, status = 500) {
    const message = error instanceof Error ? error.message : fallback;
    console.error(fallback, error);
    return res.status(status).json({ error: message });
  }
}
