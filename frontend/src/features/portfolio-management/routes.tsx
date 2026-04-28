import type { RouteObject } from 'react-router-dom';
import PortfolioManagementPage from './components/PortfolioManagementPage';

export const portfolioManagementRoutes: RouteObject[] = [
  { path: 'portfolios', element: <PortfolioManagementPage /> },
  { path: 'portfolios/:id', element: <PortfolioManagementPage /> },
];
