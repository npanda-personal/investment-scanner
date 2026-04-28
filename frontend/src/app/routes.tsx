import { Navigate, type RouteObject } from 'react-router-dom';
import NavigationLayout from '@/components/Layout/NavigationLayout';
import DashboardPage from '@/pages/DashboardPage';
import MacroPage from '@/pages/MacroPage';
import SectorPage from '@/pages/SectorPage';
import SettingsPage from '@/pages/SettingsPage';
import SmartMoneyPage from '@/pages/SmartMoneyPage';
import Backtester from '@/features/backtester';
import { Scanner, SimplifiedScannerDashboard } from '@/features/scanner';
import MarketDataFoundationPage from '@/features/market-data-foundation';
import WatchlistManager from '@/features/watchlists';

export const appRoutes: RouteObject[] = [
  {
    path: '/',
    element: <NavigationLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'smart-money', element: <SmartMoneyPage /> },
      { path: 'sector', element: <SectorPage /> },
      { path: 'macro', element: <MacroPage /> },
      { path: 'market-data-foundation', element: <MarketDataFoundationPage /> },
      { path: 'stocks', element: <Navigate to="/market-data-foundation" replace /> },
      { path: 'watchlists', element: <WatchlistManager /> },
      { path: 'scanner', element: <Scanner /> },
      { path: 'smart-scanner', element: <SimplifiedScannerDashboard /> },
      { path: 'backtester', element: <Backtester /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
];
