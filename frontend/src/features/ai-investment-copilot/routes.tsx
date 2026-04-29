import type { RouteObject } from 'react-router-dom';
import AiInvestmentCopilotPage from './components/AiInvestmentCopilotPage';

export const aiInvestmentCopilotRoutes: RouteObject[] = [
  { path: 'copilot', element: <AiInvestmentCopilotPage /> },
];
