import type { RouteObject } from 'react-router-dom';
import SignalsDashboardPage from './components/SignalsDashboardPage';

export const signalGenerationEngineRoutes: RouteObject[] = [
  { path: 'signals', element: <SignalsDashboardPage /> },
];

