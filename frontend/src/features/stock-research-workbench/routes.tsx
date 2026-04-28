import type { RouteObject } from 'react-router-dom';
import StockResearchWorkbenchPage from './components/StockResearchWorkbenchPage';

export const stockResearchWorkbenchRoutes: RouteObject[] = [
  { path: 'research/stocks/:id', element: <StockResearchWorkbenchPage /> },
];
