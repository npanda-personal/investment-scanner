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
import { subscriptionBillingRoutes } from '@/features/subscription-billing';
import { protectedAuthIdentityRoutes, ProtectedRoute, publicAuthIdentityRoutes } from '@/features/auth-identity';
import { notificationsDeliveryRoutes } from '@/features/notifications-delivery';
import { signalQualityLabRoutes } from '@/features/signal-quality-lab';
import { historicalContextSnapshotsRoutes } from '@/features/historical-context-snapshots';
import { signalCalibrationEngineRoutes } from '@/features/signal-calibration-engine';
import { dataQualityEngineRoutes } from '@/features/data-quality-engine';
import { strategyDecisionEngineRoutes } from '@/features/strategy-decision-engine';
import { researchHubRoutes } from '@/features/research-hub';

export const appRoutes: RouteObject[] = [
  ...publicAuthIdentityRoutes,
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <NavigationLayout />,
        children: [
          { index: true, element: <HomePage /> },
          ...researchHubRoutes,
          ...marketDataFoundationRoutes,
          ...stockResearchWorkbenchRoutes,
          ...signalGenerationEngineRoutes,
          ...signalQualityLabRoutes,
          ...signalCalibrationEngineRoutes,
          ...dataQualityEngineRoutes,
          ...strategyDecisionEngineRoutes,
          ...historicalContextSnapshotsRoutes,
          ...portfolioManagementRoutes,
          ...watchlistManagementRoutes,
          ...alertsMonitoringRoutes,
          ...marketContextIntelligenceRoutes,
          ...backtestingStrategyLabRoutes,
          ...smartMoneyIntelligenceRoutes,
          ...aiInvestmentCopilotRoutes,
          ...subscriptionBillingRoutes,
          ...notificationsDeliveryRoutes,
          ...protectedAuthIdentityRoutes,
        ],
      },
    ],
  },
];
