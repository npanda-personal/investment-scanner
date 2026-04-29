import type { RouteObject } from 'react-router-dom';
import HistoricalContextSnapshotsPage from './components/HistoricalContextSnapshotsPage';

export const historicalContextSnapshotsRoutes: RouteObject[] = [
  { path: 'context-snapshots', element: <HistoricalContextSnapshotsPage /> },
];
