import type { RouteObject } from 'react-router-dom';
import MarketContextPage from './components/MarketContextPage';
import BreadthInternalsPage from './components/BreadthInternalsPage';

export const marketContextIntelligenceRoutes: RouteObject[] = [
  { path: 'market-context', element: <MarketContextPage /> },
  { path: 'breadth-internals', element: <BreadthInternalsPage /> },
];
