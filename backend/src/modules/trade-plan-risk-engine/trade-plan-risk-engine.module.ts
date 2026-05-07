import { TradePlanRiskEngineController } from './trade-plan-risk-engine.controller';
import { TradePlanRiskEngineRepository } from './trade-plan-risk-engine.repository';
import { TradePlanRiskEngineService } from './trade-plan-risk-engine.service';
import { tradePlanRiskEngineRouter } from './trade-plan-risk-engine.router';

export const tradePlanRiskModule = {
  name: 'trade-plan-risk-engine',
  routePrefix: '/api/v1/trade-plans',
  repository: new TradePlanRiskEngineRepository(),
  service: new TradePlanRiskEngineService(),
  controller: new TradePlanRiskEngineController(),
  router: tradePlanRiskEngineRouter,
};
