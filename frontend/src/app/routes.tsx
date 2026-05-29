import type { RouteObject } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import NavigationLayout from './NavigationLayout';
import HomePage from './HomePage';
import { marketIntelligenceRoutes } from '@/features/market-intelligence';
import { marketDataFoundationRoutes } from '@/features/market-data-foundation';
import UnifiedStockPage from '@/features/market-data-foundation/components/UnifiedStockPage';
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
import { strategyFrameworkRoutes } from '@/features/strategy-framework';
import { tradePlanRiskEngineRoutes } from '@/features/trade-plan-risk-engine';
import { todayTradeReviewRoutes } from '@/features/today-trade-review';
import { pipelineOpsRoutes } from '@/features/pipeline-ops';
import { signalPositionLedgerRoutes } from '@/features/signal-position-ledger';

const userInstrumentRoutes: RouteObject[] = [
  { path: 'stocks', element: <Navigate to="/market-map" replace /> },
  { path: 'stocks/:id', element: <UnifiedStockPage /> },
];

const marketDataOperatorRoutes = marketDataFoundationRoutes.filter((route) => !String(route.path).startsWith('stocks'));

const operatorRoutes: RouteObject[] = [
  ...marketDataOperatorRoutes,
  ...pipelineOpsRoutes,
  ...signalGenerationEngineRoutes,
  ...signalQualityLabRoutes,
  ...signalCalibrationEngineRoutes,
  ...dataQualityEngineRoutes,
  ...strategyDecisionEngineRoutes,
  ...strategyFrameworkRoutes,
  ...historicalContextSnapshotsRoutes,
  ...marketContextIntelligenceRoutes,
  ...backtestingStrategyLabRoutes,
  ...smartMoneyIntelligenceRoutes,
  ...tradePlanRiskEngineRoutes,
  ...signalPositionLedgerRoutes,
  ...subscriptionBillingRoutes,
];

function prefixedAdminRoutes(routes: RouteObject[]): RouteObject[] {
  return routes.map((route) => {
    const next = {
      ...route,
      path: route.path ? `admin/${route.path.replace(/^\//, '')}` : route.path,
    } as RouteObject;
    if ('children' in next && next.children) {
      next.children = prefixedAdminRoutes(next.children);
    }
    return next;
  });
}

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
          ...marketIntelligenceRoutes,
          ...todayTradeReviewRoutes,
          ...researchHubRoutes,
          ...userInstrumentRoutes,
          ...stockResearchWorkbenchRoutes,
          ...portfolioManagementRoutes,
          ...watchlistManagementRoutes,
          ...alertsMonitoringRoutes,
          ...aiInvestmentCopilotRoutes,
          ...notificationsDeliveryRoutes,
          ...protectedAuthIdentityRoutes,
          ...prefixedAdminRoutes(operatorRoutes),
          ...operatorRoutes,
        ],
      },
    ],
  },
];
