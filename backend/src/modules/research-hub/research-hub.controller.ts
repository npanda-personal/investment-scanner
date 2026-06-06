import type { Request, Response } from 'express';
import { ResearchHubService } from './research-hub.service';

// NR-57: Lazily resolve today-trade-review and trade-plan-risk-engine services to
// avoid circular-dependency risk at module load time.  The specific .service file is
// imported directly (never the index barrel) — matching the pattern used elsewhere.
function resolveOptionalServices(): { todayTradeReview: any; tradePlanRiskEngine: any } {
  let todayTradeReview: any = null;
  let tradePlanRiskEngine: any = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ttr = require('../today-trade-review/today-trade-review.service');
    todayTradeReview = new ttr.TodayTradeReviewService();
  } catch {
    // Service unavailable at startup (e.g. test environment) — dimension falls back to UNAVAILABLE
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const tpre = require('../trade-plan-risk-engine/trade-plan-risk-engine.service');
    tradePlanRiskEngine = new tpre.TradePlanRiskEngineService();
  } catch {
    // Same
  }
  return { todayTradeReview, tradePlanRiskEngine };
}

export class ResearchHubController {
  private readonly service: ResearchHubService;

  constructor() {
    const { todayTradeReview, tradePlanRiskEngine } = resolveOptionalServices();
    this.service = new ResearchHubService(
      undefined, // strategyService — uses default
      undefined, // contextService — uses default
      undefined, // signalService — uses default
      undefined, // smartMoneyService — uses default
      undefined, // strategyFrameworkService — uses default
      undefined, // calibrationService — uses default
      undefined, // db — uses default
      todayTradeReview,
      tradePlanRiskEngine
    );
  }

  overview = async (req: Request, res: Response) => {
    try {
      const data = await this.service.overview({
        region: typeof req.query.region === 'string' ? req.query.region : undefined,
        assetType: typeof req.query.assetType === 'string' ? req.query.assetType : undefined,
        live: req.query.live === 'true',
      });
      return res.json(data);
    } catch (error) {
      console.error('Research Hub overview error:', error);
      return res.status(500).json({ error: 'Failed to load research overview' });
    }
  };

  health = async (_req: Request, res: Response) => {
    try {
      const data = await this.service.health();
      return res.json(data);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to load research hub health' });
    }
  };
}
