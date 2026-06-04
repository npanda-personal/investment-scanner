import type { Request, Response } from 'express';
import { TradeJournalService } from './trade-journal.service';
import { getParam, parseListFilters } from './trade-journal.validation';

const currentUserId = (req: Request): string => (req as any).user?.id || 'default-user';

export class TradeJournalController {
  constructor(private readonly service = new TradeJournalService()) {}

  create = async (req: Request, res: Response) => {
    try {
      const entry = await this.service.create(req.body, currentUserId(req));
      return res.status(201).json(entry);
    } catch (error) {
      return this.error(res, error, 'Failed to create trade journal entry', 400);
    }
  };

  list = async (req: Request, res: Response) => {
    try {
      const filters = parseListFilters(req.query as Record<string, unknown>);
      return res.json(await this.service.list(currentUserId(req), filters));
    } catch (error) {
      return this.error(res, error, 'Failed to list trade journal entries');
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const entry = await this.service.getById(getParam(req.params.id), currentUserId(req));
      if (!entry) return res.status(404).json({ error: 'Trade journal entry not found' });
      return res.json(entry);
    } catch (error) {
      return this.error(res, error, 'Failed to get trade journal entry');
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const entry = await this.service.update(getParam(req.params.id), req.body, currentUserId(req));
      return res.json(entry);
    } catch (error) {
      return this.error(res, error, 'Failed to update trade journal entry', 400);
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      await this.service.delete(getParam(req.params.id), currentUserId(req));
      return res.status(204).send();
    } catch (error) {
      return this.error(res, error, 'Failed to delete trade journal entry');
    }
  };

  postMortem = async (req: Request, res: Response) => {
    try {
      return res.json(await this.service.postMortem(currentUserId(req)));
    } catch (error) {
      return this.error(res, error, 'Failed to compute post-mortem summary');
    }
  };

  private error(res: Response, error: unknown, fallback: string, status = 500) {
    const message = error instanceof Error ? error.message : fallback;
    const responseStatus = message.endsWith('not found') ? 404 : status;
    console.error(fallback, error);
    return res.status(responseStatus).json({ error: message });
  }
}
