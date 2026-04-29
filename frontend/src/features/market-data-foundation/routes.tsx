import { Navigate, type RouteObject } from 'react-router-dom';
import MarketDataFoundationPage from './components/MarketDataFoundationPage';
import AddInstrumentPage from './components/AddInstrumentPage';
import DataIngestion from './components/DataIngestion';
import UnifiedStockPage from './components/UnifiedStockPage';

export const marketDataFoundationRoutes: RouteObject[] = [
  { path: 'market-data-foundation', element: <MarketDataFoundationPage /> },
  { path: 'market-data-foundation/add', element: <AddInstrumentPage /> },
  { path: 'market-data-foundation/ingestion', element: <DataIngestion /> },
  { path: 'market-data-foundation/:id', element: <UnifiedStockPage /> },
  { path: 'stocks', element: <Navigate to="/market-data-foundation" replace /> },
  { path: 'stocks/:id', element: <UnifiedStockPage /> },
];
