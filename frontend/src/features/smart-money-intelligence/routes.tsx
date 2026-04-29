import type { RouteObject } from 'react-router-dom';
import SmartMoneyIntelligencePage from './components/SmartMoneyIntelligencePage';

export const smartMoneyIntelligenceRoutes: RouteObject[] = [
  { path: 'smart-money', element: <SmartMoneyIntelligencePage /> },
];
