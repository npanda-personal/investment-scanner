import { RouteObject } from 'react-router-dom';
import { TradePlanDashboard } from './components/TradePlanDashboard';
import { TradePlanDetail } from './components/TradePlanDetail';

export const tradePlanRiskEngineRoutes: RouteObject[] = [
  { path: '/trade-plans', element: <TradePlanDashboard /> },
  { path: '/trade-plans/:instrumentId', element: <TradePlanDetail /> },
];
