import type { RouteObject } from 'react-router-dom';
import WatchlistManagementPage from './components/WatchlistManagementPage';

export const watchlistManagementRoutes: RouteObject[] = [
  { path: 'watchlists', element: <WatchlistManagementPage /> },
  { path: 'watchlists/:id', element: <WatchlistManagementPage /> },
];
