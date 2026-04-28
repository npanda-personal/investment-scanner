import type { RouteObject } from 'react-router-dom';
import AlertsMonitoringPage from './components/AlertsMonitoringPage';

export const alertsMonitoringRoutes: RouteObject[] = [
  { path: 'alerts', element: <AlertsMonitoringPage /> },
];
