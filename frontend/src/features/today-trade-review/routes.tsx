import type { RouteObject } from 'react-router-dom';
import { TodayReviewPage } from './components/TodayReviewPage';
import { TodayReviewCandidateDetailPage } from './components/TodayReviewCandidateDetailPage';

export const todayTradeReviewRoutes: RouteObject[] = [
  { path: '/today-review', element: <TodayReviewPage /> },
  { path: '/today-review/candidates/:candidateId', element: <TodayReviewCandidateDetailPage /> },
];
