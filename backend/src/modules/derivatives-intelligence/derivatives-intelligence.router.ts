import express from 'express';
import { DerivativesIntelligenceController } from './derivatives-intelligence.controller';

export const createDerivativesIntelligenceRouter = (
  controller = new DerivativesIntelligenceController(),
) => {
  const router = express.Router();
  // Phase 1: Futures OI buildup
  router.get('/derivatives/oi-buildup', controller.oiBuildup);
  router.get('/derivatives/fo-bhavcopy/meta', controller.foBhavcopyMeta);
  router.post('/derivatives/fo-bhavcopy/ingest', controller.foBhavcopyIngest);
  // Phase 2: Option metrics (PCR, max-pain, support/resistance)
  router.get('/derivatives/option-metrics', controller.optionMetrics);
  router.get('/derivatives/pcr', controller.pcr);
  // Phase 3: Participant-wise OI (FII derivatives positioning)
  router.get('/derivatives/participant-oi', controller.participantOi);
  router.post('/derivatives/participant-oi/ingest', controller.participantOiIngest);
  return router;
};

export const derivativesIntelligenceRouter = createDerivativesIntelligenceRouter();
export default derivativesIntelligenceRouter;
