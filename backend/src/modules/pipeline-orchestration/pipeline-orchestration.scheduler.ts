/**
 * Pipeline Orchestration Scheduler — Stale-Lease Reaper
 *
 * Runs two wired invocations of reapStaleLeases:
 *   1. Once at server startup (catches any rows leaked by a previous process crash).
 *   2. Periodically on a configurable interval (default 30 min) so leaked leases
 *      from in-process crashes are cleaned up without a server restart.
 *
 * The reaper is safe to call concurrently: Prisma updateMany is row-level-atomic
 * and the WHERE guards prevent touching recently-active rows.
 * All failures are caught and logged — they never propagate or crash the process.
 */

import { pipelineOrchestrationModule } from './pipeline-orchestration.module';
import { sendPipelineRunAlert } from '../notifications-delivery/pipeline-alert';

const REAPER_INTERVAL_MS = (() => {
  const configured = Number(process.env.PIPELINE_REAPER_INTERVAL_MS);
  return Number.isFinite(configured) && configured >= 60_000
    ? Math.floor(configured)
    : 30 * 60 * 1000; // 30 minutes default
})();

export function startPipelineReaperScheduler(): void {
  function fireReaperAlerts(reaped: Array<{ region: string; assetType: string; dataThroughDate: string | null; pipelineRunId: string }>): void {
    for (const r of reaped) {
      sendPipelineRunAlert({
        status: 'ABANDONED',
        region: r.region,
        assetType: r.assetType,
        dataThroughDate: r.dataThroughDate,
        durationMs: null,
        stagesSummary: [],
        firstError: 'Reaped by stale-lease reaper — process may have crashed',
      }).catch(() => {});
    }
  }

  // 1. Run immediately at startup to clear any rows leaked by prior process crashes.
  setImmediate(() => {
    pipelineOrchestrationModule.service
      .reapStaleLeases()
      .then(({ stageRowsReaped, runRowsReaped, reaped }) => {
        if (stageRowsReaped > 0 || runRowsReaped > 0) {
          console.log(
            `[PipelineReaper] startup reap: ${stageRowsReaped} stage rows + ${runRowsReaped} run rows marked ABANDONED`
          );
          fireReaperAlerts(reaped);
        }
      })
      .catch((err: unknown) => {
        console.warn('[PipelineReaper] startup reap failed (non-fatal):', err);
      });
  });

  // 2. Periodic reap so leaks from in-process crashes are caught without restart.
  setInterval(() => {
    pipelineOrchestrationModule.service
      .reapStaleLeases()
      .then(({ stageRowsReaped, runRowsReaped, reaped }) => {
        if (stageRowsReaped > 0 || runRowsReaped > 0) {
          console.log(
            `[PipelineReaper] periodic reap: ${stageRowsReaped} stage rows + ${runRowsReaped} run rows marked ABANDONED`
          );
          fireReaperAlerts(reaped);
        }
      })
      .catch((err: unknown) => {
        console.warn('[PipelineReaper] periodic reap failed (non-fatal):', err);
      });
  }, REAPER_INTERVAL_MS).unref(); // .unref() so it doesn't keep the process alive in tests
}
