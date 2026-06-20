import type { RouteObject } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import NavigationLayout from './NavigationLayout';
import HomePage from './HomePage';
import AdminHomePage from './AdminHomePage';
// CryptoMarketOverviewPage is kept (not deleted) but the route is redirected
// to "/" while the crypto scope is inactive under the IN equity focus.
import { marketIntelligenceRoutes } from '@/features/market-intelligence';
import { marketDataFoundationRoutes, marketScansRoutes, screenerRoutes } from '@/features/market-data-foundation';
import UnifiedStockPage, { InstrumentWorkspaceSymbolRedirect } from '@/features/market-data-foundation/components/UnifiedStockPage';
import { stockResearchWorkbenchRoutes } from '@/features/stock-research-workbench';
import { signalGenerationEngineRoutes } from '@/features/signal-generation-engine';
import { portfolioManagementRoutes } from '@/features/portfolio-management';
import { watchlistManagementRoutes } from '@/features/watchlist-management';
import { alertsMonitoringRoutes } from '@/features/alerts-monitoring';
import { marketContextIntelligenceRoutes } from '@/features/market-context-intelligence';
import { backtestingStrategyLabRoutes } from '@/features/backtesting-strategy-lab';
import { smartMoneyIntelligenceRoutes } from '@/features/smart-money-intelligence';
import { derivativesIntelligenceRoutes } from '@/features/derivatives-intelligence';
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
import { tradeJournalRoutes } from '@/features/trade-journal';
// DailyOverviewDashboardPage import removed — /daily-overview now redirects to /today-review
// (it is a duplicated tab in TodayReviewPage).

const userInstrumentRoutes: RouteObject[] = [
  { path: 'stocks', element: <Navigate to="/instrument-workspace" replace /> },
  { path: 'stocks/:id', element: <UnifiedStockPage /> },
  // Deep-link support: /instrument-workspace/:symbol resolves the symbol to a
  // catalog instrument and redirects to /stocks/:id. This makes URLs like
  // /instrument-workspace/RELIANCE shareable and bookmarkable.
  { path: 'instrument-workspace/:symbol', element: <InstrumentWorkspaceSymbolRedirect /> },
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

// Demo build (GitHub Pages, VITE_DEMO=1) is trader-only: admin/operator routes
// are NOT registered, and a catch-all redirects /admin (and any operator deep
// link) to home. Normal builds keep the full route tree unchanged.
const isDemo = import.meta.env.VITE_DEMO === '1';

const adminRoutes: RouteObject[] = isDemo
  ? []
  : [
      { path: 'admin', element: <AdminHomePage /> },
      ...prefixedAdminRoutes(operatorRoutes),
      ...operatorRoutes,
    ];

const demoCatchAll: RouteObject[] = isDemo
  ? [{ path: '*', element: <Navigate to="/" replace /> }]
  : [];

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
          ...marketScansRoutes,
          ...screenerRoutes,
          ...derivativesIntelligenceRoutes,
          ...researchHubRoutes,
          ...userInstrumentRoutes,
          ...stockResearchWorkbenchRoutes,
          ...portfolioManagementRoutes,
          ...watchlistManagementRoutes,
          ...alertsMonitoringRoutes,
          ...aiInvestmentCopilotRoutes,
          ...tradeJournalRoutes,
          ...notificationsDeliveryRoutes,
          // /daily-overview is a duplicated tab inside TodayReviewPage — redirect for deep-link compat.
          { path: 'daily-overview', element: <Navigate to="/today-review" replace /> },
          // /crypto route kept for URL stability; redirects to "/" while crypto scope is inactive.
          { path: 'crypto', element: <Navigate to="/" replace /> },
          ...protectedAuthIdentityRoutes,
          ...adminRoutes,
          ...demoCatchAll,
        ],
      },
    ],
  },
];
