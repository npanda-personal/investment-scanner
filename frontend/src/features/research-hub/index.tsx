import React from 'react';
import type { RouteObject } from 'react-router-dom';

const ResearchOverviewPage = React.lazy(() => import('./components/ResearchOverviewPage'));

export const researchHubRoutes: RouteObject[] = [
  {
    path: '/research',
    element: <ResearchOverviewPage />,
  },
];

export * from './api/researchHubApi';
