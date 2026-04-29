import express from 'express';
import { requireAuth } from '../auth-identity';
import { WatchlistManagementController } from './watchlist-management.controller';

export const createWatchlistManagementRouter = (
  controller = new WatchlistManagementController()
) => {
  const router = express.Router();
  router.use(requireAuth);

  router.get('/watchlists', controller.listWatchlists);
  router.post('/watchlists', controller.createWatchlist);
  router.get('/watchlists/:id', controller.getWatchlist);
  router.patch('/watchlists/:id', controller.updateWatchlist);
  router.delete('/watchlists/:id', controller.deleteWatchlist);
  router.post('/watchlists/:id/items', controller.addItem);
  router.patch('/watchlists/:id/items/:itemId', controller.updateItem);
  router.delete('/watchlists/:id/items/:itemId', controller.removeItem);

  return router;
};

export const watchlistManagementRouter = createWatchlistManagementRouter();

export default watchlistManagementRouter;
