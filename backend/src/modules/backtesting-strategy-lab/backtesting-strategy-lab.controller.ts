import type { Request, Response } from 'express';
import { BacktestingStrategyLabService } from './backtesting-strategy-lab.service';
import { getParam } from './backtesting-strategy-lab.validation';

export class BacktestingStrategyLabController {
  constructor(private readonly service = new BacktestingStrategyLabService()) {}

  listStrategies = async (_req: Request, res: Response) => this.respond(res, () => this.service.listStrategies());
  createStrategy = async (req: Request, res: Response) => this.respond(res, () => this.service.createStrategy(req.body), 201);
  getStrategy = async (req: Request, res: Response) => this.respondMaybeFound(res, () => this.service.getStrategy(getParam(req.params.id)));
  updateStrategy = async (req: Request, res: Response) => this.respond(res, () => this.service.updateStrategy(getParam(req.params.id), req.body));
  deleteStrategy = async (req: Request, res: Response) => this.respond(res, async () => {
    await this.service.deleteStrategy(getParam(req.params.id));
    return { success: true };
  });

  run = async (req: Request, res: Response) => this.respond(res, () => this.service.run(req.body), 201);
  runStrategy = async (req: Request, res: Response) => this.respond(res, () => this.service.runStrategy(getParam(req.params.id)), 201);
  listRuns = async (_req: Request, res: Response) => this.respond(res, () => this.service.listRuns());
  getRun = async (req: Request, res: Response) => this.respondMaybeFound(res, () => this.service.getRun(getParam(req.params.id)));
  deleteRun = async (req: Request, res: Response) => this.respond(res, async () => {
    await this.service.deleteRun(getParam(req.params.id));
    return { success: true };
  });

  private async respond(res: Response, fn: () => Promise<unknown> | unknown, status = 200) {
    try {
      return res.status(status).json(await fn());
    } catch (error: any) {
      const message = error.message || 'Backtesting request failed';
      const statusCode = message.toLowerCase().includes('not found') ? 404 : 400;
      return res.status(statusCode).json({ error: message });
    }
  }

  private async respondMaybeFound(res: Response, fn: () => Promise<unknown | null> | unknown | null) {
    try {
      const result = await fn();
      if (!result) return res.status(404).json({ error: 'Not found' });
      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Backtesting request failed' });
    }
  }
}
