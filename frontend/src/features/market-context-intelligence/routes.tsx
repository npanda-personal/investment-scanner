import type { RouteObject } from 'react-router-dom';
import MarketContextPage from './components/MarketContextPage';

export const marketContextIntelligenceRoutes: RouteObject[] = [
  { path: 'market-context', element: <MarketContextPage /> },
];
