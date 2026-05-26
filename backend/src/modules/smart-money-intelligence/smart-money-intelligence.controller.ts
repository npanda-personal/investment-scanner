import type { Request, Response } from 'express';
import { SmartMoneyIntelligenceService } from './smart-money-intelligence.service';
import { getParam, parseLimit, parseOffset, parseOptionalText, parseRange } from './smart-money-intelligence.validation';

export class SmartMoneyIntelligenceController {
  constructor(private readonly service = new SmartMoneyIntelligenceService()) {}

  stock = async (req: Request, res: Response) => this.respondMaybeFound(res, () =>
    this.service.stock(getParam(req.params.instrumentId), parseRange(req.query.range))
  );

  sectors = async (req: Request, res: Response) => this.respond(res, () =>
    this.service.sectors(parseRange(req.query.range), {
      region: parseOptionalText(req.query.region),
      assetType: parseOptionalText(req.query.assetType),
    })
  );

  run = async (req: Request, res: Response) => this.respond(res, () =>
    this.service.run(parseLimit(req.body.batchSize, 100), {
      region: parseOptionalText(req.body.region),
      assetType: parseOptionalText(req.body.assetType),
      offset: parseOffset(req.body.offset ?? req.body.cursor),
    })
  );

  top = async (req: Request, res: Response) => this.respond(res, () =>
    this.service.top({
      limit: parseLimit(req.query.limit),
      offset: parseOffset(req.query.offset),
      sector: parseOptionalText(req.query.sector),
      region: parseOptionalText(req.query.region),
      assetType: parseOptionalText(req.query.assetType),
      range: parseRange(req.query.range),
    })
  );

  distribution = async (req: Request, res: Response) => this.respond(res, () =>
    this.service.distribution({
      limit: parseLimit(req.query.limit),
      offset: parseOffset(req.query.offset),
      sector: parseOptionalText(req.query.sector),
      region: parseOptionalText(req.query.region),
      assetType: parseOptionalText(req.query.assetType),
      range: parseRange(req.query.range),
    })
  );

  health = async (_req: Request, res: Response) => this.respond(res, () => this.service.health());

  private async respond(res: Response, fn: () => Promise<unknown> | unknown) {
    try {
      return res.json(await fn());
    } catch (error: any) {
      const message = error.message || 'Smart money request failed';
      const status = message.toLowerCase().includes('required') ? 400 : 500;
      return res.status(status).json({ error: message });
    }
  }

  private async respondMaybeFound(res: Response, fn: () => Promise<unknown | null> | unknown | null) {
    try {
      const result = await fn();
      if (!result) return res.status(404).json({ error: 'Not found' });
      return res.json(result);
    } catch (error: any) {
      const message = error.message || 'Smart money request failed';
      const status = message.toLowerCase().includes('required') ? 400 : 500;
      return res.status(status).json({ error: message });
    }
  }
}
