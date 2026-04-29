import type { Request, Response } from 'express';
import { WatchlistManagementService } from './watchlist-management.service';
import { getParam, parseSortOption } from './watchlist-management.validation';

const currentUserId = (req: Request) => (req as any).user?.id || 'default-user';

export class WatchlistManagementController {
  constructor(private readonly service = new WatchlistManagementService()) {}

  listWatchlists = async (req: Request, res: Response) => {
    try {
      return res.json({ watchlists: await this.service.listWatchlists(currentUserId(req)) });
    } catch (error) {
      return this.error(res, error, 'Failed to list watchlists');
    }
  };

  createWatchlist = async (req: Request, res: Response) => {
    try {
      return res.status(201).json(await this.service.createWatchlist(req.body, currentUserId(req)));
    } catch (error) {
      return this.error(res, error, 'Failed to create watchlist', 400);
    }
  };

  getWatchlist = async (req: Request, res: Response) => {
    try {
      const result = await this.service.detail(getParam(req.params.id), parseSortOption(req.query.sort), currentUserId(req));
      if (!result) return res.status(404).json({ error: 'Watchlist not found' });
      return res.json(result);
    } catch (error) {
      return this.error(res, error, 'Failed to load watchlist');
    }
  };

  updateWatchlist = async (req: Request, res: Response) => {
    try {
      return res.json(await this.service.updateWatchlist(getParam(req.params.id), req.body, currentUserId(req)));
    } catch (error) {
      return this.error(res, error, 'Failed to update watchlist', 400);
    }
  };

  deleteWatchlist = async (req: Request, res: Response) => {
    try {
      await this.service.deleteWatchlist(getParam(req.params.id), currentUserId(req));
      return res.status(204).send();
    } catch (error) {
      return this.error(res, error, 'Failed to delete watchlist');
    }
  };

  addItem = async (req: Request, res: Response) => {
    try {
      return res.status(201).json(await this.service.addItem(getParam(req.params.id), req.body, currentUserId(req)));
    } catch (error) {
      return this.error(res, error, 'Failed to add watchlist item', 400);
    }
  };

  updateItem = async (req: Request, res: Response) => {
    try {
      return res.json(await this.service.updateItem(getParam(req.params.id), getParam(req.params.itemId), req.body));
    } catch (error) {
      return this.error(res, error, 'Failed to update watchlist item', 400);
    }
  };

  removeItem = async (req: Request, res: Response) => {
    try {
      await this.service.removeItem(getParam(req.params.id), getParam(req.params.itemId));
      return res.status(204).send();
    } catch (error) {
      return this.error(res, error, 'Failed to remove watchlist item');
    }
  };

  private error(res: Response, error: unknown, fallback: string, status = 500) {
    const message = error instanceof Error ? error.message : fallback;
    console.error(fallback, error);
    return res.status(status).json({ error: message });
  }
}
