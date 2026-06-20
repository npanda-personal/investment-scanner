import type { RouteObject } from 'react-router-dom';
import TradeJournalPage from './components/TradeJournalPage';

export const tradeJournalRoutes: RouteObject[] = [
  { path: 'journal', element: <TradeJournalPage /> },
];
