import { Router } from 'express';
import { SignalPositionLedgerController } from './signal-position-ledger.controller';

export function createSignalPositionLedgerRouter(controller = new SignalPositionLedgerController()) {
  const router = Router();
  router.get('/signals/position-ledger/health', controller.health);
  // Trader-facing GET: serves ONLY persisted rows (no on-GET live enrichment).
  // If nothing is persisted yet the response is an explicit empty/"pending" state.
  // To populate / refresh, call POST /active/refresh or run the SIGNAL_POSITION_LEDGER pipeline stage.
  router.get('/signals/position-ledger/active', controller.persistedActiveRows);
  router.get('/signals/position-ledger/closed', controller.persistedClosedRows);
  // Legacy aliases kept for backward compatibility — same persisted-only handlers.
  router.get('/signals/position-ledger/persisted/active', controller.persistedActiveRows);
  router.get('/signals/position-ledger/persisted/closed', controller.persistedClosedRows);
  // Explicit refresh (live enrichment) — only available behind this POST.
  router.post('/signals/position-ledger/active/refresh', controller.refreshActiveRows);
  return router;
}

export const signalPositionLedgerRouter = createSignalPositionLedgerRouter();
export default signalPositionLedgerRouter;

