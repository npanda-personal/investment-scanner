import type { RouteObject } from 'react-router-dom';
import NavigationLayout from './NavigationLayout';
import HomePage from './HomePage';
import { marketDataFoundationRoutes } from '@/features/market-data-foundation';
import { stockResearchWorkbenchRoutes } from '@/features/stock-research-workbench';
import { signalGenerationEngineRoutes } from '@/features/signal-generation-engine';
import { portfolioManagementRoutes } from '@/features/portfolio-management';
import { watchlistManagementRoutes } from '@/features/watchlist-management';

export const appRoutes: RouteObject[] = [
  {
    path: '/',
    element: <NavigationLayout />,
    children: [
      { index: true, element: <HomePage /> },
      ...marketDataFoundationRoutes,
      ...stockResearchWorkbenchRoutes,
      ...signalGenerationEngineRoutes,
      ...portfolioManagementRoutes,
      ...watchlistManagementRoutes,
    ],
  },
];
