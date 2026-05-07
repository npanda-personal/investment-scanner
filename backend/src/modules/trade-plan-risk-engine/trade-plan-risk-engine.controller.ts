import { Request, Response } from 'express';
import { TradePlanRiskEngineService } from './trade-plan-risk-engine.service';
import { parseGenerateRequest, parseBatchGenerateRequest, parseListQuery } from './trade-plan-risk-engine.validation';

export class TradePlanRiskEngineController {
  private service = new TradePlanRiskEngineService();

  getHealth = async (_req: Request, res: Response) => {
    try {
      const stats = await this.service.getHealthStats();
      return res.json(stats);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  };

  getModelRules = async (_req: Request, res: Response) => {
    try {
      const rules = this.service.getModelRules();
      return res.json(rules);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  };

  getLatestForInstrument = async (req: Request, res: Response) => {
    try {
      const instrumentId = String(req.params.instrumentId);
      const strategyCode = typeof req.query.strategyCode === 'string' ? req.query.strategyCode : undefined;
      const portfolioId = typeof req.query.portfolioId === 'string' ? req.query.portfolioId : undefined;
      const plan = await this.service.latestForInstrument(instrumentId, strategyCode, portfolioId);
      
      if (!plan) {
         // Auto-generate if missing
         // We need the symbol. We can't auto-generate without symbol easily unless we fetch it.
         // Let's just return 404 for now, and the UI should call /generate instead.
         return res.status(404).json({ error: 'Trade plan not found for instrument.' });
      }
      return res.json(plan);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  };

  generatePlan = async (req: Request, res: Response) => {
    try {
      const requestDto = parseGenerateRequest(req.body);
      const plan = await this.service.generatePlan(requestDto);
      return res.json(plan);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  };

  batchGenerate = async (req: Request, res: Response) => {
    try {
      const requestDto = parseBatchGenerateRequest(req.body);
      const result = await this.service.batchGenerate(requestDto);
      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  };

  listCandidates = async (req: Request, res: Response) => {
    try {
      const query = parseListQuery(req.query);
      const result = await this.service.list(query);
      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  };
}
