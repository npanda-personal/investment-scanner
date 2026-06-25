/**
 * Pipeline Orchestration Scheduler — Stale-Lease Reaper + Auto-Retry
 *
 * Runs, at server startup and on a periodic interval (default 30 min):
 *   1. reapStaleLeases — marks rows leaked by a crashed/interrupted process ABANDONED.
 *   2. auto-retry sweep — re-triggers any scope whose latest run is now terminal-
 *      incomplete (ABANDONED / FAILED), so an interrupted daily run self-heals
 *      instead of sitting failed until a human notices (closes the gap where the
 *      reaper marks ABANDONED but nothing re-runs). See pipeline-orchestration.auto-retry.ts.
 *
 * The reaper is safe to call concurrently: Prisma updateMany is row-level-atomic
 * and the WHERE guards prevent touching recently-active rows.
 * All failures are caught and logged — they never propagate or crash the process.
 */

import { pipelineOrchestrationModule } from './pipeline-orchestration.module';
import { sendPipelineRunAlert } from '../notifications-delivery/pipeline-alert';
import { PipelineAutoRetryRepository } from './pipeline-orchestration.auto-retry.repository';
import { sweepIncompleteRunsAndRetry, type AutoRetryConfig } from './pipeline-orchestration.auto-retry';

const REAPER_INTERVAL_MS = (() => {
  const configured = Number(process.env.PIPELINE_REAPER_INTERVAL_MS);
  return Number.isFinite(configured) && configured >= 60_000
    ? Math.floor(configured)
    : 30 * 60 * 1000; // 30 minutes default
})();

const DEFAULT_AUTO_RETRY_MAX_ATTEMPTS = 3;
const DEFAULT_AUTO_RETRY_LOOKBACK_MS = 36 * 60 * 60 * 1000; // 36h — a full trading day + overnight

const autoRetryRepository = new PipelineAutoRetryRepository();
// In-process guard: a sweep can await a multi-minute DAG, so a later reaper tick
// must not start a second overlapping sweep.
let isAutoRetrySweeping = false;

// In-process per-scope+date retry-attempt counts (the storm guard). Held in memory
// rather than derived from pipeline_runs because the runner upserts ONE row per
// scope+date (its idempotencyKey excludes trigger) — counting rows would never
// exceed 1 and the cap would be unreachable, so a persistently-failing scope would
// re-run a full DAG every reaper cycle forever. A process restart resets these,
// which is acceptable (a restart may have fixed the cause → a fresh bounded set of
// attempts is desirable).
const retryAttemptCounts = new Map<string, number>();

// Note: the attempt-count key includes dataThroughDate (the cap is per scope+date —
// a new trading day's run gets a fresh budget), whereas selectLatestIncompletePerScope
// groups by scope only (latest run regardless of date). The asymmetry is intentional.
function attemptKey(scope: { pipelineKey: string; region: string; assetType: string; timeframe: string }, dataThroughDate: string): string {
  return `${scope.pipelineKey}|${scope.region}|${scope.assetType}|${scope.timeframe}|${dataThroughDate}`;
}

// Keep the map from growing unbounded across days: drop entries for trading dates
// older than the lookback window (they can never be re-listed by the sweep anyway).
function pruneRetryAttemptCounts(oldestKeepDate: string): void {
  for (const key of retryAttemptCounts.keys()) {
    const keyDate = key.slice(key.lastIndexOf('|') + 1);
    if (keyDate < oldestKeepDate) retryAttemptCounts.delete(key);
  }
}

function readAutoRetryConfig(env = process.env): AutoRetryConfig {
  const maxAttempts = Number(env.PIPELINE_AUTO_RETRY_MAX_ATTEMPTS);
  const lookbackMs = Number(env.PIPELINE_AUTO_RETRY_LOOKBACK_MS);
  return {
    // Default ON: an interrupted daily run should self-heal without a human.
    enabled: (env.PIPELINE_AUTO_RETRY_ENABLED ?? 'true').toLowerCase() !== 'false',
    maxAttemptsPerScope: Number.isFinite(maxAttempts) && maxAttempts >= 1 ? Math.floor(maxAttempts) : DEFAULT_AUTO_RETRY_MAX_ATTEMPTS,
    lookbackMs: Number.isFinite(lookbackMs) && lookbackMs >= 60_000 ? Math.floor(lookbackMs) : DEFAULT_AUTO_RETRY_LOOKBACK_MS,
  };
}

/**
 * Reap-then-sweep: runs the auto-retry sweep AFTER a reap so freshly-crashed runs
 * are already ABANDONED and thus visible to the sweep as terminal-incomplete.
 * Best-effort and never throws.
 */
async function runAutoRetrySweep(): Promise<void> {
  if (isAutoRetrySweeping) return;
  const config = readAutoRetryConfig();
  if (!config.enabled) return;
  isAutoRetrySweeping = true;
  try {
    const service = pipelineOrchestrationModule.service;
    // Drop attempt counts for dates the sweep can no longer reach, so the map
    // stays bounded over a long-lived process.
    pruneRetryAttemptCounts(new Date(Date.now() - config.lookbackMs).toISOString().slice(0, 10));
    const result = await sweepIncompleteRunsAndRetry({
      config,
      now: () => new Date(),
      listIncompleteRuns: (since) => autoRetryRepository.listIncompleteRuns(since),
      hasActiveRun: (scope) => autoRetryRepository.hasActiveRun(scope),
      getRetryAttempts: (scope, dataThroughDate) => retryAttemptCounts.get(attemptKey(scope, dataThroughDate)) ?? 0,
      recordRetryAttempt: (scope, dataThroughDate) => {
        const key = attemptKey(scope, dataThroughDate);
        retryAttemptCounts.set(key, (retryAttemptCounts.get(key) ?? 0) + 1);
      },
      retryStockDag: (input) => service.executeDagPipeline({ ...input, trigger: 'retry', changedInstrumentIds: null }),
      retryCryptoDag: (input) => service.executeCryptoDagPipeline({ ...input, trigger: 'retry' }),
      log: (msg) => console.log(msg),
      warn: (msg) => console.warn(msg),
    });
    const notable = result.retried > 0 || result.outcomes.some((o) => o.action === 'SKIPPED_CAP' || o.action === 'ERROR');
    if (notable) {
      const summary = result.outcomes.map((o) => `${o.scope.region}:${o.scope.assetType}=${o.action}`).join(', ');
      console.log(`[PipelineAutoRetry] sweep: scanned ${result.scanned}, retried ${result.retried} — ${summary}`);
    }
  } catch (err) {
    console.warn('[PipelineAutoRetry] sweep failed (non-fatal):', err);
  } finally {
    isAutoRetrySweeping = false;
  }
}

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

  function reapThenSweep(phase: 'startup' | 'periodic'): void {
    pipelineOrchestrationModule.service
      .reapStaleLeases()
      .then(({ stageRowsReaped, runRowsReaped, reaped }) => {
        if (stageRowsReaped > 0 || runRowsReaped > 0) {
          console.log(
            `[PipelineReaper] ${phase} reap: ${stageRowsReaped} stage rows + ${runRowsReaped} run rows marked ABANDONED`
          );
          fireReaperAlerts(reaped);
        }
      })
      .catch((err: unknown) => {
        console.warn(`[PipelineReaper] ${phase} reap failed (non-fatal):`, err);
      })
      // Sweep AFTER the reap settles (success or failure) so just-reaped runs are
      // visible as terminal-incomplete and get re-triggered.
      .finally(() => {
        void runAutoRetrySweep();
      });
  }

  // 1. Run immediately at startup: clears rows leaked by a prior crash, then
  //    re-triggers any daily run left incomplete while the server was down.
  setImmediate(() => reapThenSweep('startup'));

  // 2. Periodic reap+sweep so in-process crashes are caught and healed without a restart.
  setInterval(() => reapThenSweep('periodic'), REAPER_INTERVAL_MS).unref(); // .unref() so it doesn't keep the process alive in tests
}
