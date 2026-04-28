import type { Request, Response } from 'express';
import { PortfolioManagementService } from './portfolio-management.service';
import { getParam } from './portfolio-management.validation';

export class PortfolioManagementController {
  constructor(private readonly service = new PortfolioManagementService()) {}

  listPortfolios = async (_req: Request, res: Response) => {
    try {
      return res.json({ portfolios: await this.service.listPortfolios() });
    } catch (error) {
      return this.error(res, error, 'Failed to list portfolios');
    }
  };

  createPortfolio = async (req: Request, res: Response) => {
    try {
      return res.status(201).json(await this.service.createPortfolio(req.body));
    } catch (error) {
      return this.error(res, error, 'Failed to create portfolio', 400);
    }
  };

  getPortfolio = async (req: Request, res: Response) => {
    try {
      const result = await this.service.getPortfolioDetail(getParam(req.params.id));
      if (!result) return res.status(404).json({ error: 'Portfolio not found' });
      return res.json(result);
    } catch (error) {
      return this.error(res, error, 'Failed to load portfolio');
    }
  };

  updatePortfolio = async (req: Request, res: Response) => {
    try {
      return res.json(await this.service.updatePortfolio(getParam(req.params.id), req.body));
    } catch (error) {
      return this.error(res, error, 'Failed to update portfolio', 400);
    }
  };

  deletePortfolio = async (req: Request, res: Response) => {
    try {
      await this.service.deletePortfolio(getParam(req.params.id));
      return res.status(204).send();
    } catch (error) {
      return this.error(res, error, 'Failed to delete portfolio');
    }
  };

  addHolding = async (req: Request, res: Response) => {
    try {
      return res.status(201).json(await this.service.addHolding(getParam(req.params.id), req.body));
    } catch (error) {
      return this.error(res, error, 'Failed to add holding', 400);
    }
  };

  updateHolding = async (req: Request, res: Response) => {
    try {
      return res.json(await this.service.updateHolding(getParam(req.params.id), getParam(req.params.holdingId), req.body));
    } catch (error) {
      return this.error(res, error, 'Failed to update holding', 400);
    }
  };

  removeHolding = async (req: Request, res: Response) => {
    try {
      await this.service.removeHolding(getParam(req.params.id), getParam(req.params.holdingId));
      return res.status(204).send();
    } catch (error) {
      return this.error(res, error, 'Failed to remove holding');
    }
  };

  summary = async (req: Request, res: Response) => {
    try {
      const result = await this.service.summary(getParam(req.params.id));
      if (!result) return res.status(404).json({ error: 'Portfolio not found' });
      return res.json(result);
    } catch (error) {
      return this.error(res, error, 'Failed to load portfolio summary');
    }
  };

  allocation = async (req: Request, res: Response) => {
    try {
      const result = await this.service.allocation(getParam(req.params.id));
      if (!result) return res.status(404).json({ error: 'Portfolio not found' });
      return res.json(result);
    } catch (error) {
      return this.error(res, error, 'Failed to load portfolio allocation');
    }
  };

  listTransactions = async (req: Request, res: Response) => {
    try {
      return res.json({ transactions: await this.service.listTransactions(getParam(req.params.id)) });
    } catch (error) {
      return this.error(res, error, 'Failed to list transactions');
    }
  };

  createTransaction = async (req: Request, res: Response) => {
    try {
      return res.status(201).json(await this.service.createTransaction(getParam(req.params.id), req.body));
    } catch (error) {
      return this.error(res, error, 'Failed to create transaction', 400);
    }
  };

  private error(res: Response, error: unknown, fallback: string, status = 500) {
    const message = error instanceof Error ? error.message : fallback;
    console.error(fallback, error);
    return res.status(status).json({ error: message });
  }
}

