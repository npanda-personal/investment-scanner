import type { Router } from 'express';
import {
  marketDataFoundationRouter,
  marketDataV1Router,
} from '../modules/market-data-foundation';
import { stockResearchWorkbenchRouter } from '../modules/stock-research-workbench';
import { signalGenerationEngineRouter } from '../modules/signal-generation-engine';
import { portfolioManagementRouter } from '../modules/portfolio-management';
import { portfolioIntelligenceRouter } from '../modules/portfolio-intelligence';
import { watchlistManagementRouter } from '../modules/watchlist-management';
import { alertsMonitoringRouter } from '../modules/alerts-monitoring';
import { marketContextIntelligenceRouter } from '../modules/market-context-intelligence';
import { backtestingStrategyLabRouter } from '../modules/backtesting-strategy-lab';
import { smartMoneyIntelligenceRouter } from '../modules/smart-money-intelligence';
import { aiInvestmentCopilotRouter } from '../modules/ai-investment-copilot';
import { subscriptionBillingRouter } from '../modules/subscription-billing';
import { authIdentityRouter } from '../modules/auth-identity';
import { notificationsDeliveryRouter } from '../modules/notifications-delivery';
import { signalQualityLabRouter } from '../modules/signal-quality-lab';
import { historicalContextSnapshotsRouter } from '../modules/historical-context-snapshots';
import { signalCalibrationEngineRouter } from '../modules/signal-calibration-engine';
import { dataQualityEngineRouter } from '../modules/data-quality-engine';
import { strategyDecisionEngineRouter } from '../modules/strategy-decision-engine';
import { researchHubRouter } from '../modules/research-hub';
import { strategyFrameworkRouter } from '../modules/strategy-framework';
import { tradePlanRiskModule } from '../modules/trade-plan-risk-engine';
import { todayTradeReviewRouter } from '../modules/today-trade-review';
import { pipelineOrchestrationRouter } from '../modules/pipeline-orchestration';
import { signalPositionLedgerRouter } from '../modules/signal-position-ledger';

export interface ApiModule {
  path: string;
  router: Router;
}

export const apiModules: ApiModule[] = [
  { path: '/api/v1', router: marketDataV1Router },
  { path: '/api/v1', router: authIdentityRouter },
  { path: '/api/v1', router: stockResearchWorkbenchRouter },
  { path: '/api/v1', router: signalGenerationEngineRouter },
  { path: '/api/v1', router: strategyFrameworkRouter },
  { path: '/api/v1', router: pipelineOrchestrationRouter },
  { path: '/api/v1', router: portfolioManagementRouter },
  { path: '/api/v1', router: portfolioIntelligenceRouter },
  { path: '/api/v1', router: watchlistManagementRouter },
  { path: '/api/v1', router: alertsMonitoringRouter },
  { path: '/api/v1', router: marketContextIntelligenceRouter },
  { path: '/api/v1', router: backtestingStrategyLabRouter },
  { path: '/api/v1', router: smartMoneyIntelligenceRouter },
  { path: '/api/v1', router: aiInvestmentCopilotRouter },
  { path: '/api/v1', router: subscriptionBillingRouter },
  { path: '/api/v1', router: notificationsDeliveryRouter },
  { path: '/api/v1', router: signalQualityLabRouter },
  { path: '/api/v1', router: historicalContextSnapshotsRouter },
  { path: '/api/v1', router: signalCalibrationEngineRouter },
  { path: '/api/v1', router: dataQualityEngineRouter },
  { path: '/api/v1/strategy', router: strategyDecisionEngineRouter },
  { path: '/api/v1/research', router: researchHubRouter },
  { path: '/api/v1', router: todayTradeReviewRouter },
  { path: '/api/v1', router: signalPositionLedgerRouter },
  { path: tradePlanRiskModule.routePrefix, router: tradePlanRiskModule.router },
  { path: '/api/market-data-foundation', router: marketDataFoundationRouter },
];

export const registerApiModules = (router: Router, modules: ApiModule[] = apiModules): Router => {
  modules.forEach((module) => {
    router.use(module.path, module.router);
  });

  return router;
};
