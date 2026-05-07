import { Router } from 'express';
import { TradePlanRiskEngineController } from './trade-plan-risk-engine.controller';
import { requireAuth } from '../auth-identity';

export const createTradePlanRiskEngineRouter = (controller = new TradePlanRiskEngineController()): Router => {
  const router = Router();
  
  router.use(requireAuth);

  router.get('/health', controller.getHealth);
  router.get('/model', controller.getModelRules);
  router.get('/funnel', controller.getFunnelDiagnostics);
  router.get('/candidates', controller.listCandidates);
  router.get('/:instrumentId', controller.getLatestForInstrument);
  router.post('/generate', controller.generatePlan);
  router.post('/generate/batch', controller.batchGenerate);

  return router;
};

export const tradePlanRiskEngineRouter = createTradePlanRiskEngineRouter();
export default tradePlanRiskEngineRouter;
