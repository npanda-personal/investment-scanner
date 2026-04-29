import express from 'express';
import { requireAuth } from '../auth-identity';
import { HistoricalContextSnapshotsController } from './historical-context-snapshots.controller';

export const createHistoricalContextSnapshotsRouter = (controller = new HistoricalContextSnapshotsController()) => {
  const router = express.Router();
  router.use(requireAuth);

  router.post('/context-snapshots/generate', controller.generate);
  router.get('/context-snapshots/summary', controller.summary);
  router.get('/context-snapshots/market', controller.market);
  router.get('/context-snapshots/sectors', controller.sectors);
  router.get('/context-snapshots/countries', controller.countries);
  router.get('/context-snapshots/smart-money', controller.smartMoney);
  router.get('/context-snapshots/coverage', controller.coverage);
  router.get('/context-snapshots/lookup', controller.lookup);

  return router;
};

export const historicalContextSnapshotsRouter = createHistoricalContextSnapshotsRouter();

export default historicalContextSnapshotsRouter;
