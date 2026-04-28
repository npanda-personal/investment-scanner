import type { RouteObject } from 'react-router-dom';
import NavigationLayout from './NavigationLayout';
import HomePage from './HomePage';
import { marketDataFoundationRoutes } from '@/features/market-data-foundation';
import { stockResearchWorkbenchRoutes } from '@/features/stock-research-workbench';
import { signalGenerationEngineRoutes } from '@/features/signal-generation-engine';

export const appRoutes: RouteObject[] = [
  {
    path: '/',
    element: <NavigationLayout />,
    children: [
      { index: true, element: <HomePage /> },
      ...marketDataFoundationRoutes,
      ...stockResearchWorkbenchRoutes,
      ...signalGenerationEngineRoutes,
    ],
  },
];
