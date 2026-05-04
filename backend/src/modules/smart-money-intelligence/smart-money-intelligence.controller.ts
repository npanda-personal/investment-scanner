import type { Request, Response } from 'express';
import { SmartMoneyIntelligenceService } from './smart-money-intelligence.service';
import { getParam, parseLimit, parseOptionalText, parseRange } from './smart-money-intelligence.validation';

export class SmartMoneyIntelligenceController {
  constructor(private readonly service = new SmartMoneyIntelligenceService()) {}

  stock = async (req: Request, res: Response) => this.respondMaybeFound(res, () =>
    this.service.stock(getParam(req.params.instrumentId), parseRange(req.query.range))
  );

  sectors = async (req: Request, res: Response) => this.respond(res, () =>
    this.service.sectors(parseRange(req.query.range))
  );

  run = async (req: Request, res: Response) => this.respond(res, () =>
    this.service.run(Number(req.body.batchSize) || 20)
  );

  top = async (req: Request, res: Response) => this.respond(res, () =>
    this.service.top({
      limit: parseLimit(req.query.limit),
      sector: parseOptionalText(req.query.sector),
      range: parseRange(req.query.range),
    })
  );

  distribution = async (req: Request, res: Response) => this.respond(res, () =>
    this.service.distribution({
      limit: parseLimit(req.query.limit),
      sector: parseOptionalText(req.query.sector),
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
