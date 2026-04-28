import type { RouteObject } from 'react-router-dom';
import BacktestingStrategyLabPage from './components/BacktestingStrategyLabPage';

export const backtestingStrategyLabRoutes: RouteObject[] = [
  { path: 'backtests', element: <BacktestingStrategyLabPage /> },
];
