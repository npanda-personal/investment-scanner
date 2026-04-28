export { watchlistManagementModule } from './watchlist-management.module';
export {
  createWatchlistManagementRouter,
  default as watchlistManagementRouter,
  watchlistManagementRouter as watchlistManagementRouterInstance,
} from './watchlist-management.router';
export { WatchlistManagementController } from './watchlist-management.controller';
export { WatchlistManagementRepository } from './watchlist-management.repository';
export { WatchlistManagementService } from './watchlist-management.service';
export {
  getParam,
  normalizeTags,
  parseSortOption,
  validateWatchlistInput,
  validateWatchlistItemInput,
} from './watchlist-management.validation';
export type {
  AddWatchlistItemRequest,
  CreateWatchlistRequest,
  UpdateWatchlistItemRequest,
  UpdateWatchlistRequest,
  WatchlistDashboardItemDto,
  WatchlistDetailDto,
  WatchlistDto,
  WatchlistItemDto,
  WatchlistSortOption,
} from './watchlist-management.types';
