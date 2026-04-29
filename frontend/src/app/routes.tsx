import type { RouteObject } from 'react-router-dom';
import NavigationLayout from './NavigationLayout';
import HomePage from './HomePage';
import { marketDataFoundationRoutes } from '@/features/market-data-foundation';
import { stockResearchWorkbenchRoutes } from '@/features/stock-research-workbench';
import { signalGenerationEngineRoutes } from '@/features/signal-generation-engine';
import { portfolioManagementRoutes } from '@/features/portfolio-management';
import { watchlistManagementRoutes } from '@/features/watchlist-management';
import { alertsMonitoringRoutes } from '@/features/alerts-monitoring';
import { marketContextIntelligenceRoutes } from '@/features/market-context-intelligence';
import { backtestingStrategyLabRoutes } from '@/features/backtesting-strategy-lab';
import { smartMoneyIntelligenceRoutes } from '@/features/smart-money-intelligence';
import { aiInvestmentCopilotRoutes } from '@/features/ai-investment-copilot';

export const appRoutes: RouteObject[] = [
  {
    path: '/',
    element: <NavigationLayout />,
    children: [
      { index: true, element: <HomePage /> },
      ...marketDataFoundationRoutes,
      ...stockResearchWorkbenchRoutes,
      ...signalGenerationEngineRoutes,
      ...portfolioManagementRoutes,
      ...watchlistManagementRoutes,
      ...alertsMonitoringRoutes,
      ...marketContextIntelligenceRoutes,
      ...backtestingStrategyLabRoutes,
      ...smartMoneyIntelligenceRoutes,
      ...aiInvestmentCopilotRoutes,
    ],
  },
];
