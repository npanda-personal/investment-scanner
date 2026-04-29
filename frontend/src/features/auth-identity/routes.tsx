import type { RouteObject } from 'react-router-dom';
import AccountPage from './components/AccountPage';
import LoginPage from './components/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import SignupPage from './components/SignupPage';

export const publicAuthIdentityRoutes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
];

export const protectedAuthIdentityRoutes: RouteObject[] = [
  { path: 'account', element: <AccountPage /> },
];

export { ProtectedRoute };
