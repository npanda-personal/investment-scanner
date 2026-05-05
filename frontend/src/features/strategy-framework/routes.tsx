import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

const StrategyFrameworkPage = lazy(() => import('./components/StrategyFrameworkPage'));

export const strategyFrameworkRoutes: RouteObject[] = [
  {
    path: '/strategies',
    element: <StrategyFrameworkPage />,
  },
];

export default strategyFrameworkRoutes;
