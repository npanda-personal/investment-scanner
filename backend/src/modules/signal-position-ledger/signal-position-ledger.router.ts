import { Router } from 'express';
import { SignalPositionLedgerController } from './signal-position-ledger.controller';

export function createSignalPositionLedgerRouter(controller = new SignalPositionLedgerController()) {
  const router = Router();
  router.get('/signals/position-ledger/health', controller.health);
  router.get('/signals/position-ledger/active', controller.activeRows);
  router.get('/signals/position-ledger/closed', controller.closedRows);
  router.get('/signals/position-ledger/persisted/active', controller.persistedActiveRows);
  router.get('/signals/position-ledger/persisted/closed', controller.persistedClosedRows);
  router.post('/signals/position-ledger/active/refresh', controller.refreshActiveRows);
  return router;
}

export const signalPositionLedgerRouter = createSignalPositionLedgerRouter();
export default signalPositionLedgerRouter;

