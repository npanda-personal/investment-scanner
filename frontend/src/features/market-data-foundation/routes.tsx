import { Navigate, type RouteObject } from 'react-router-dom';
import MarketDataFoundationPage from './components/MarketDataFoundationPage';
import AddInstrumentPage from './components/AddInstrumentPage';
import UnifiedStockPage from './components/UnifiedStockPage';
import MarketScansPage from './components/MarketScansPage';
import ScreenerPage from './components/ScreenerPage';

export const marketDataFoundationRoutes: RouteObject[] = [
  { path: 'market-data-foundation', element: <MarketDataFoundationPage /> },
  { path: 'market-data-foundation/add', element: <AddInstrumentPage /> },
  { path: 'market-data-foundation/ingestion', element: <Navigate to="/market-data-foundation" replace /> },
  { path: 'market-data-foundation/:id', element: <UnifiedStockPage /> },
  { path: 'stocks', element: <Navigate to="/market-data-foundation" replace /> },
  { path: 'stocks/:id', element: <UnifiedStockPage /> },
];

/** User-facing route — lives in the main trader workflow nav. */
export const marketScansRoutes: RouteObject[] = [
  { path: 'market-scans', element: <MarketScansPage /> },
];

/** Multi-factor screener — core trader tool. */
export const screenerRoutes: RouteObject[] = [
  { path: 'screener', element: <ScreenerPage /> },
];
