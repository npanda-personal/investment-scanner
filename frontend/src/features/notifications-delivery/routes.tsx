import type { RouteObject } from 'react-router-dom';
import { Navigate } from 'react-router-dom';

// Notification preferences live inline inside AccountPage — redirect the old
// standalone /notifications route so bookmarks and links still land somewhere useful.
export const notificationsDeliveryRoutes: RouteObject[] = [
  { path: 'notifications', element: <Navigate to="/account" replace /> },
];
