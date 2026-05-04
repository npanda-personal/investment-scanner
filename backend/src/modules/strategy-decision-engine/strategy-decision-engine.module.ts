import { StrategyDecisionEngineController } from './strategy-decision-engine.controller';
import { StrategyDecisionEngineRepository } from './strategy-decision-engine.repository';
import { StrategyDecisionEngineService } from './strategy-decision-engine.service';
import { strategyDecisionEngineRouter } from './strategy-decision-engine.router';

export const strategyDecisionEngineModule = {
  repository: new StrategyDecisionEngineRepository(),
  service: new StrategyDecisionEngineService(),
  controller: new StrategyDecisionEngineController(),
  router: strategyDecisionEngineRouter,
};
