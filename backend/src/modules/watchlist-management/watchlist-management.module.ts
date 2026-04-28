import { WatchlistManagementController } from './watchlist-management.controller';
import { WatchlistManagementRepository } from './watchlist-management.repository';
import { watchlistManagementRouter } from './watchlist-management.router';
import { WatchlistManagementService } from './watchlist-management.service';

export const watchlistManagementModule = {
  name: 'watchlist-management',
  router: watchlistManagementRouter,
  controller: WatchlistManagementController,
  service: WatchlistManagementService,
  repository: WatchlistManagementRepository,
};
