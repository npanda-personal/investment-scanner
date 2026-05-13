import type { Request, Response } from 'express';
import { StrategyFrameworkService } from './strategy-framework.service';
import { getCode, parseBacktestRequest, parseEvaluateRequest, parseListQuery, parsePerformanceQuery, parseProofQuery, parseRankingsQuery } from './strategy-framework.validation';

const currentUserId = (req: Request) => (req as any).user?.id || 'default-user';

export class StrategyFrameworkController {
  constructor(private readonly service = new StrategyFrameworkService()) {}

  list = async (req: Request, res: Response) => this.respond(res, () => this.service.list(parseListQuery(req.query)));
  detail = async (req: Request, res: Response) => this.respond(res, () => this.service.detail(getCode(req.params.code), parsePerformanceQuery(req.query)));
  performance = async (req: Request, res: Response) => this.respond(res, () => this.service.performance(getCode(req.params.code), parsePerformanceQuery(req.query)));
  proofRegistry = async (req: Request, res: Response) => this.respond(res, () => this.service.proofRegistry(parseProofQuery(req.query)));
  proofDetail = async (req: Request, res: Response) => this.respond(res, () => this.service.proofDetail(getCode(req.params.code), parseProofQuery(req.query)));
  rankings = async (req: Request, res: Response) => this.respond(res, () => this.service.rankings(parseRankingsQuery(req.query)));
  model = async (_req: Request, res: Response) => this.respond(res, () => this.service.model());
  health = async (_req: Request, res: Response) => this.respond(res, () => this.service.health());
  seed = async (_req: Request, res: Response) => this.respond(res, async () => {
    await this.service.seedDefinitions();
    return { success: true };
  });

  evaluate = async (req: Request, res: Response) => this.respond(res, () => this.service.evaluate(parseEvaluateRequest(req.body)));

  backtest = async (req: Request, res: Response) => this.respond(res, () => this.service.runBacktest(parseBacktestRequest(getCode(req.params.code), req.body), currentUserId(req)), 201);

  private async respond(res: Response, fn: () => Promise<unknown> | unknown, status = 200) {
    try {
      return res.status(status).json(await fn());
    } catch (error: any) {
      const message = error.message || 'Strategy Framework request failed';
      const statusCode = message.toLowerCase().includes('not registered') || message.toLowerCase().includes('not found') ? 404 : 400;
      return res.status(statusCode).json({ error: message });
    }
  }
}
