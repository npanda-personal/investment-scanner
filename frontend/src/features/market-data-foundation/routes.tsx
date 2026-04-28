import { Navigate, type RouteObject } from 'react-router-dom';
import MarketDataFoundationPage from './components/MarketDataFoundationPage';

export const marketDataFoundationRoutes: RouteObject[] = [
  { path: 'market-data-foundation', element: <MarketDataFoundationPage /> },
  { path: 'stocks', element: <Navigate to="/market-data-foundation" replace /> },
];
