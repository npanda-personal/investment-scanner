import express from 'express';
import { requireAuth } from '../auth-identity';
import { TradeJournalController } from './trade-journal.controller';

export const createTradeJournalRouter = (
  controller = new TradeJournalController()
) => {
  const router = express.Router();
  router.use(requireAuth);

  // post-mortem must be registered BEFORE /:id so it is not swallowed by the param route
  router.get('/trade-journal/post-mortem', controller.postMortem);

  router.post('/trade-journal', controller.create);
  router.get('/trade-journal', controller.list);
  router.get('/trade-journal/:id', controller.getById);
  router.patch('/trade-journal/:id', controller.update);
  router.delete('/trade-journal/:id', controller.delete);

  return router;
};

export const tradeJournalRouter = createTradeJournalRouter();

export default tradeJournalRouter;
