import type { Request, Response } from 'express';
import { AiInvestmentCopilotService } from './ai-investment-copilot.service';
import { requireString } from './ai-investment-copilot.validation';

const currentUserId = (req: Request) => (req as any).user?.id || 'default-user';

export class AiInvestmentCopilotController {
  constructor(private readonly service = new AiInvestmentCopilotService()) {}

  stockSummary = async (req: Request, res: Response) => this.respond(res, () =>
    this.service.stockSummary(requireString(req.body?.instrumentId, 'instrumentId'), currentUserId(req))
  );

  portfolioSummary = async (req: Request, res: Response) => this.respond(res, () =>
    this.service.portfolioSummary(requireString(req.body?.portfolioId, 'portfolioId'), currentUserId(req))
  );

  watchlistSummary = async (req: Request, res: Response) => this.respond(res, () =>
    this.service.watchlistSummary(requireString(req.body?.watchlistId, 'watchlistId'), currentUserId(req))
  );

  marketBrief = async (req: Request, res: Response) => this.respond(res, () =>
    this.service.marketBrief(currentUserId(req), (req.query.region as string | undefined) ?? undefined)
  );
  alertDigest = async (req: Request, res: Response) => this.respond(res, () => this.service.alertDigest(currentUserId(req)));

  private async respond(res: Response, fn: () => Promise<unknown> | unknown) {
    try {
      return res.json(await fn());
    } catch (error: any) {
      const message = error.message || 'Copilot request failed';
      const status = message.toLowerCase().includes('required') ? 400 : 500;
      return res.status(status).json({ error: message });
    }
  }
}
