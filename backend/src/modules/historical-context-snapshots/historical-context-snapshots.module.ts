import { HistoricalContextSnapshotsController } from './historical-context-snapshots.controller';
import { createHistoricalContextSnapshotsRouter } from './historical-context-snapshots.router';
import { HistoricalContextSnapshotsService } from './historical-context-snapshots.service';

const service = new HistoricalContextSnapshotsService();
const controller = new HistoricalContextSnapshotsController(service);

export const historicalContextSnapshotsModule = {
  service,
  controller,
  router: createHistoricalContextSnapshotsRouter(controller),
};
