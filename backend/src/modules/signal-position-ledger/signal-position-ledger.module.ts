import { SignalPositionLedgerController } from './signal-position-ledger.controller';
import { SignalPositionLedgerRepository } from './signal-position-ledger.repository';
import { createSignalPositionLedgerRouter } from './signal-position-ledger.router';
import { SignalPositionLedgerService } from './signal-position-ledger.service';

const repository = new SignalPositionLedgerRepository();
const service = new SignalPositionLedgerService(repository);
const controller = new SignalPositionLedgerController(service);

export const signalPositionLedgerModule = {
  repository,
  service,
  controller,
  router: createSignalPositionLedgerRouter(controller),
};

