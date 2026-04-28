export { watchlistManagementRoutes } from './routes';
export { AddToWatchlistDialog } from './components/AddToWatchlistDialog';
export { default as WatchlistManagementPage } from './components/WatchlistManagementPage';
export { useWatchlistManagement } from './hooks';
export {
  addWatchlistItem,
  createWatchlist,
  deleteWatchlist,
  fetchWatchlistDetail,
  fetchWatchlists,
  removeWatchlistItem,
  updateWatchlist,
  updateWatchlistItem,
} from './api/watchlistManagementService';
export type {
  AddWatchlistItemInput,
  CreateWatchlistInput,
  UpdateWatchlistItemInput,
  Watchlist,
  WatchlistDashboardItem,
  WatchlistDetail,
  WatchlistItem,
  WatchlistSortOption,
} from './types';
