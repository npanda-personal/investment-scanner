/**
 * Completion-gated auto-retry for incomplete daily pipeline runs.
 *
 * The stale-lease reaper marks a crashed/interrupted run ABANDONED, but nothing
 * re-runs it: the only existing re-trigger path (the market-data scheduler's
 * downstream catch-up) is gated on *upstream data change*. So once a trading day's
 * prices are finalized, an interrupted downstream run is never retried — the demo
 * publish and the signals/scan data both stay stale until a human notices.
 *
 * This sweep closes that gap. On each reaper cycle (server boot + periodic) it
 * looks at the most-recent run per scope within a recent window; if that run's
 * CURRENT state is terminal-incomplete (ABANDONED / FAILED), no run is active for
 * the scope, and the per-scope retry cap is not exhausted, it re-triggers the DAG
 * with trigger:'retry'. The DAG runner resumes — already-COMPLETED stages are
 * skipped — and on settlement fires the normal completion alert (which drives the
 * demo publish), so a finished retry self-heals both the data and the demo mirror.
 *
 * Storm guard: the per-scope+date attempt count is held in-process (injected via
 * get/recordRetryAttempt), NOT derived from pipeline_runs rows. The runner upserts
 * one run row per scope+date (its idempotencyKey excludes trigger), so counting
 * rows would never exceed 1 and the cap would be unreachable — a persistently
 * failing scope would re-run a full DAG every reaper cycle forever. An in-process
 * counter bounds that to maxAttemptsPerScope within a process; a restart resets it,
 * which is acceptable (and desirable — a restart may have fixed the cause).
 *
 * Pure orchestration: all persistence + DAG execution + attempt state is injected,
 * so the policy is unit-testable without a database or a running pipeline.
 * Best-effort — a per-scope failure is recorded and never aborts the sweep.
 */

export interface AutoRetryScope {
  pipelineKey: string;
  region: string;
  assetType: string;
  timeframe: string;
}

/** A pipeline_runs row, flattened for the pure latest-per-scope reduction. */
export interface RawRunRow extends AutoRetryScope {
  runId: string;
  status: string;
  dataThroughDate: string | null;
  startedAtMs: number;
}

/** The current (latest) run for a scope, when that run is terminal-incomplete. */
export interface IncompleteRun extends AutoRetryScope {
  runId: string;
  status: string;
  /** YYYY-MM-DD trading date the failed run targeted; null if it never recorded one. */
  dataThroughDate: string | null;
}

export interface AutoRetryConfig {
  enabled: boolean;
  /** Max retry triggers allowed per scope+trading-date within a process before giving up (storm guard). */
  maxAttemptsPerScope: number;
  /** Only resurrect runs started within this window — never reach back to ancient failures. */
  lookbackMs: number;
}

export type AutoRetryAction =
  | 'RETRIED'
  | 'SKIPPED_ACTIVE'
  | 'SKIPPED_CAP'
  | 'SKIPPED_NO_DATE'
  | 'ERROR';

export interface AutoRetryOutcome {
  scope: AutoRetryScope;
  runId: string;
  action: AutoRetryAction;
  detail?: string;
  retriggeredStatus?: string;
}

export interface AutoRetrySweepResult {
  scanned: number;
  retried: number;
  outcomes: AutoRetryOutcome[];
}

export interface AutoRetryDeps {
  config: AutoRetryConfig;
  now: () => Date;
  /** Latest run per scope started since the given instant, filtered to terminal-incomplete ones. */
  listIncompleteRuns: (sinceStartedAt: Date) => Promise<IncompleteRun[]>;
  /** True if a PENDING/RUNNING run already exists for the scope (don't double-trigger). */
  hasActiveRun: (scope: AutoRetryScope) => Promise<boolean>;
  /** In-process count of retry triggers already issued for the scope+trading-date this process. */
  getRetryAttempts: (scope: AutoRetryScope, dataThroughDate: string) => number;
  /** Increment the in-process retry-attempt count for the scope+trading-date. */
  recordRetryAttempt: (scope: AutoRetryScope, dataThroughDate: string) => void;
  retryStockDag: (input: {
    tradingDate: string;
    region: string;
    assetType: string;
    timeframe: string;
  }) => Promise<{ runStatus: string }>;
  retryCryptoDag: (input: { tradingDate: string }) => Promise<{ runStatus: string }>;
  log: (msg: string) => void;
  warn: (msg: string) => void;
}

/**
 * Pure reduction: from a set of run rows, keep only those scopes whose LATEST run
 * (by startedAt) is terminal-incomplete (ABANDONED / FAILED). A newer
 * COMPLETED/PARTIAL/RUNNING run for the same scope supersedes an older failure and
 * is dropped — we only resurrect scopes whose latest attempt actually failed.
 */
export function selectLatestIncompletePerScope(rows: RawRunRow[]): IncompleteRun[] {
  const INCOMPLETE_TERMINAL = new Set(['ABANDONED', 'FAILED']);
  const latestPerScope = new Map<string, RawRunRow>();
  for (const row of rows) {
    const key = `${row.pipelineKey}|${row.region}|${row.assetType}|${row.timeframe}`;
    const seen = latestPerScope.get(key);
    if (!seen || row.startedAtMs > seen.startedAtMs) latestPerScope.set(key, row);
  }
  const incomplete: IncompleteRun[] = [];
  for (const row of latestPerScope.values()) {
    if (!INCOMPLETE_TERMINAL.has(row.status)) continue;
    incomplete.push({
      pipelineKey: row.pipelineKey,
      region: row.region,
      assetType: row.assetType,
      timeframe: row.timeframe,
      runId: row.runId,
      status: row.status,
      dataThroughDate: row.dataThroughDate,
    });
  }
  return incomplete;
}

export async function sweepIncompleteRunsAndRetry(deps: AutoRetryDeps): Promise<AutoRetrySweepResult> {
  const result: AutoRetrySweepResult = { scanned: 0, retried: 0, outcomes: [] };
  if (!deps.config.enabled) return result;

  const since = new Date(deps.now().getTime() - deps.config.lookbackMs);
  const incomplete = await deps.listIncompleteRuns(since);
  result.scanned = incomplete.length;

  for (const run of incomplete) {
    const scope: AutoRetryScope = {
      pipelineKey: run.pipelineKey,
      region: run.region,
      assetType: run.assetType,
      timeframe: run.timeframe,
    };
    const label = `${run.region}:${run.assetType}:${run.timeframe} (run ${run.runId}, ${run.status})`;
    try {
      if (!run.dataThroughDate) {
        result.outcomes.push({ scope, runId: run.runId, action: 'SKIPPED_NO_DATE', detail: 'run recorded no dataThroughDate to retarget' });
        continue;
      }
      if (await deps.hasActiveRun(scope)) {
        result.outcomes.push({ scope, runId: run.runId, action: 'SKIPPED_ACTIVE', detail: 'a run is already active for this scope' });
        continue;
      }
      const attempts = deps.getRetryAttempts(scope, run.dataThroughDate);
      if (attempts >= deps.config.maxAttemptsPerScope) {
        deps.warn(
          `[PipelineAutoRetry] ${label}: retry cap reached (${attempts}/${deps.config.maxAttemptsPerScope}) for ${run.dataThroughDate} — NOT retrying, manual intervention needed`,
        );
        result.outcomes.push({ scope, runId: run.runId, action: 'SKIPPED_CAP', detail: `${attempts}/${deps.config.maxAttemptsPerScope} retries already attempted for ${run.dataThroughDate}` });
        continue;
      }

      // Count the attempt BEFORE triggering, so a scope whose DAG throws every cycle
      // still walks toward the cap instead of storming.
      deps.recordRetryAttempt(scope, run.dataThroughDate);
      deps.log(`[PipelineAutoRetry] ${label}: re-triggering DAG (attempt ${attempts + 1}/${deps.config.maxAttemptsPerScope}, data through ${run.dataThroughDate})`);
      const dag = run.assetType === 'CRYPTO'
        ? await deps.retryCryptoDag({ tradingDate: run.dataThroughDate })
        : await deps.retryStockDag({ tradingDate: run.dataThroughDate, region: run.region, assetType: run.assetType, timeframe: run.timeframe });
      result.retried += 1;
      result.outcomes.push({ scope, runId: run.runId, action: 'RETRIED', retriggeredStatus: dag?.runStatus, detail: `data through ${run.dataThroughDate}` });
      deps.log(`[PipelineAutoRetry] ${label}: retry settled ${dag?.runStatus ?? 'UNKNOWN'}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      deps.warn(`[PipelineAutoRetry] ${label}: retry failed (non-fatal): ${msg}`);
      result.outcomes.push({ scope, runId: run.runId, action: 'ERROR', detail: msg });
    }
  }

  return result;
}
