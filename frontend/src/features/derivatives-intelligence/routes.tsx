import type { RouteObject } from 'react-router-dom';
import DerivativesIntelligencePage from './components/DerivativesIntelligencePage';

export const derivativesIntelligenceRoutes: RouteObject[] = [
  { path: 'derivatives', element: <DerivativesIntelligencePage /> },
];
