import type { Request, Response } from 'express';
import { StrategyDecisionEngineService } from './strategy-decision-engine.service';
import { parseEvaluateRequest, parseStrategyQuery } from './strategy-decision-engine.validation';

export class StrategyDecisionEngineController {
  constructor(private readonly service = new StrategyDecisionEngineService()) {}

  marketGate = async (req: Request, res: Response) => {
    try {
      const region = req.query.region as string | undefined;
      const gate = await this.service.marketGate(region);
      return res.json(gate);
    } catch (error: any) {
      console.error('Market gate controller error:', error);
      return res.status(500).json({ error: 'Failed to retrieve market gate' });
    }
  };

  evaluate = async (req: Request, res: Response) => {
    try {
      const request = parseEvaluateRequest(req.body);
      const response = await this.service.evaluate(request);
      return res.json(response);
    } catch (error: any) {
      console.error('Evaluate controller error:', error);
      return res.status(500).json({ error: 'Strategy evaluation failed' });
    }
  };

  candidates = async (req: Request, res: Response) => {
    try {
      const query = parseStrategyQuery(req.query as any);
      const response = await this.service.candidates(query);
      return res.json(response);
    } catch (error: any) {
      console.error('Candidates controller error:', error);
      return res.status(500).json({ error: 'Failed to retrieve candidates' });
    }
  };

  exits = async (req: Request, res: Response) => {
    try {
      const portfolioId = req.query.portfolioId as string;
      const region = req.query.region as string | undefined;
      const response = await this.service.exits(portfolioId, region);
      return res.json(response);
    } catch (error: any) {
      console.error('Exits controller error:', error);
      return res.status(500).json({ error: 'Failed to retrieve exits' });
    }
  };

  watchlist = async (req: Request, res: Response) => {
    try {
      const { watchlistId } = req.params;
      const response = await this.service.watchlist(watchlistId as string);
      return res.json(response);
    } catch (error: any) {
      console.error('Watchlist controller error:', error);
      return res.status(500).json({ error: 'Failed to retrieve watchlist strategy decisions' });
    }
  };

  portfolio = async (req: Request, res: Response) => {
    try {
      const { portfolioId } = req.params;
      const response = await this.service.portfolio(portfolioId as string);
      return res.json(response);
    } catch (error: any) {
      console.error('Portfolio controller error:', error);
      return res.status(500).json({ error: 'Failed to retrieve portfolio strategy decisions' });
    }
  };

  model = async (_req: Request, res: Response) => {
    try {
      const response = await this.service.model();
      return res.json(response);
    } catch (error: any) {
      console.error('Model controller error:', error);
      return res.status(500).json({ error: 'Failed to retrieve strategy model' });
    }
  };

  latestForInstrument = async (req: Request, res: Response) => {
    try {
      const { instrumentId } = req.params;
      const response = await this.service.latestForInstrument(instrumentId as string);
      return res.json(response);
    } catch (error: any) {
      console.error('LatestForInstrument controller error:', error);
      return res.status(500).json({ error: 'Failed to retrieve strategy decision' });
    }
  };

  history = async (req: Request, res: Response) => {
    try {
      const { instrumentId } = req.params;
      const response = await this.service.history(instrumentId as string);
      return res.json(response);
    } catch (error: any) {
      console.error('History controller error:', error);
      return res.status(500).json({ error: 'Failed to retrieve strategy decision history' });
    }
  };

  health = async (_req: Request, res: Response) => {
    try {
      const response = await this.service.health();
      return res.json(response);
    } catch (error: any) {
      console.error('Health controller error:', error);
      return res.status(500).json({ error: 'Failed to retrieve module health' });
    }
  };
}
