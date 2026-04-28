import { Navigate, type RouteObject } from 'react-router-dom';
import MarketDataFoundationPage from './components/MarketDataFoundationPage';
import AddInstrumentPage from './components/AddInstrumentPage';
import InstrumentDetailPage from './components/InstrumentDetailPage';
import DataIngestion from './components/DataIngestion';

export const marketDataFoundationRoutes: RouteObject[] = [
  { path: 'market-data-foundation', element: <MarketDataFoundationPage /> },
  { path: 'market-data-foundation/add', element: <AddInstrumentPage /> },
  { path: 'market-data-foundation/ingestion', element: <DataIngestion /> },
  { path: 'market-data-foundation/:id', element: <InstrumentDetailPage /> },
  { path: 'stocks', element: <Navigate to="/market-data-foundation" replace /> },
];
