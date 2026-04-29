import type { RouteObject } from 'react-router-dom';
import SubscriptionBillingPage from './components/SubscriptionBillingPage';

export const subscriptionBillingRoutes: RouteObject[] = [
  { path: 'billing', element: <SubscriptionBillingPage /> },
];
