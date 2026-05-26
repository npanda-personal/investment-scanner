import type { RouteObject } from 'react-router-dom';
import SignalPositionLedgerPage from './components/SignalPositionLedgerPage';

export const signalPositionLedgerRoutes: RouteObject[] = [
  { path: '/signal-position-ledger', element: <SignalPositionLedgerPage /> },
];
