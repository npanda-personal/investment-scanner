import type { RouteObject } from 'react-router-dom';
import { TodayHomePage } from './components/TodayHomePage';
import { TodayReviewCandidateDetailPage } from './components/TodayReviewCandidateDetailPage';
import { TodayReviewRunHistoryPage } from './components/TodayReviewRunHistoryPage';

export const todayTradeReviewRoutes: RouteObject[] = [
  // /today-review now renders the merged "Today" workspace (Daily Review / Shortlist / Overview tabs).
  { path: '/today-review', element: <TodayHomePage /> },
  { path: '/today-review/candidates/:candidateId', element: <TodayReviewCandidateDetailPage /> },
  { path: '/today-review/runs', element: <TodayReviewRunHistoryPage /> },
];
