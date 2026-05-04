import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

const StrategyDecisionDashboard = lazy(() => import('./components/StrategyDecisionDashboard'));

export const strategyDecisionEngineRoutes: RouteObject[] = [
  {
    path: '/strategy',
    element: <StrategyDecisionDashboard />,
  },
];

export default strategyDecisionEngineRoutes;
