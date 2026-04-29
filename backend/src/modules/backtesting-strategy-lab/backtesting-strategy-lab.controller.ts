import type { Request, Response } from 'express';
import { BacktestingStrategyLabService } from './backtesting-strategy-lab.service';
import { getParam } from './backtesting-strategy-lab.validation';

const currentUserId = (req: Request) => (req as any).user?.id || 'default-user';

export class BacktestingStrategyLabController {
  constructor(private readonly service = new BacktestingStrategyLabService()) {}

  listStrategies = async (req: Request, res: Response) => this.respond(res, () => this.service.listStrategies(currentUserId(req)));
  createStrategy = async (req: Request, res: Response) => this.respond(res, () => this.service.createStrategy(req.body, currentUserId(req)), 201);
  getStrategy = async (req: Request, res: Response) => this.respondMaybeFound(res, () => this.service.getStrategy(getParam(req.params.id), currentUserId(req)));
  updateStrategy = async (req: Request, res: Response) => this.respond(res, () => this.service.updateStrategy(getParam(req.params.id), req.body, currentUserId(req)));
  deleteStrategy = async (req: Request, res: Response) => this.respond(res, async () => {
    await this.service.deleteStrategy(getParam(req.params.id), currentUserId(req));
    return { success: true };
  });

  run = async (req: Request, res: Response) => this.respond(res, () => this.service.run(req.body, currentUserId(req)), 201);
  runStrategy = async (req: Request, res: Response) => this.respond(res, () => this.service.runStrategy(getParam(req.params.id), currentUserId(req)), 201);
  listRuns = async (req: Request, res: Response) => this.respond(res, () => this.service.listRuns(currentUserId(req)));
  getRun = async (req: Request, res: Response) => this.respondMaybeFound(res, () => this.service.getRun(getParam(req.params.id), currentUserId(req)));
  deleteRun = async (req: Request, res: Response) => this.respond(res, async () => {
    await this.service.deleteRun(getParam(req.params.id), currentUserId(req));
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
