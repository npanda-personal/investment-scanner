import { Navigate, type RouteObject } from 'react-router-dom';
import MarketDataFoundationPage from './components/MarketDataFoundationPage';
import AddInstrumentPage from './components/AddInstrumentPage';
import UnifiedStockPage from './components/UnifiedStockPage';
import { DiscoverWorkspacePage } from './components/DiscoverWorkspacePage';

export const marketDataFoundationRoutes: RouteObject[] = [
  { path: 'market-data-foundation', element: <MarketDataFoundationPage /> },
  { path: 'market-data-foundation/add', element: <AddInstrumentPage /> },
  { path: 'market-data-foundation/ingestion', element: <Navigate to="/market-data-foundation" replace /> },
  { path: 'market-data-foundation/:id', element: <UnifiedStockPage /> },
  { path: 'stocks', element: <Navigate to="/market-data-foundation" replace /> },
  { path: 'stocks/:id', element: <UnifiedStockPage /> },
];

// /market-scans is now a tab inside the Discover workspace (/screener).
// Redirect for deep-link / bookmark compat.
export const marketScansRoutes: RouteObject[] = [
  { path: 'market-scans', element: <Navigate to="/screener" replace /> },
];

/** Discover workspace — merged Screener / Market Scans / Stock Interest / Index Constituents. */
export const screenerRoutes: RouteObject[] = [
  { path: 'screener', element: <DiscoverWorkspacePage /> },
];
