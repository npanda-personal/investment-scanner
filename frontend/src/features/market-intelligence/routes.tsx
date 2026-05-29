import type { RouteObject } from 'react-router-dom';
import {
  BreadthParticipationPage,
  DerivativesContextPage,
  IndicesWorkspacePage,
  InstitutionalFlowPage,
  MarketMapPage,
  MarketPulsePage,
} from './components/MarketIntelligencePages';

export const marketIntelligenceRoutes: RouteObject[] = [
  { path: 'market-pulse', element: <MarketPulsePage /> },
  { path: 'indices', element: <IndicesWorkspacePage /> },
  { path: 'breadth', element: <BreadthParticipationPage /> },
  { path: 'institutional-flow', element: <InstitutionalFlowPage /> },
  { path: 'derivatives-context', element: <DerivativesContextPage /> },
  { path: 'market-map', element: <MarketMapPage /> },
];
