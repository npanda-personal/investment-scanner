import type { RouteObject } from 'react-router-dom';
import SignalQualityLabPage from './components/SignalQualityLabPage';

export const signalQualityLabRoutes: RouteObject[] = [
  { path: 'signals/quality', element: <SignalQualityLabPage /> },
];
