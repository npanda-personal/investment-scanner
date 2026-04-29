import type { RouteObject } from 'react-router-dom';
import NotificationsDeliveryPage from './components/NotificationsDeliveryPage';

export const notificationsDeliveryRoutes: RouteObject[] = [
  { path: 'notifications', element: <NotificationsDeliveryPage /> },
];
