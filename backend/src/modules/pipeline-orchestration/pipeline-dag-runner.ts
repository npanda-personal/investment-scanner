/*
 * Persistence interface mapping assumptions (for the Task 2.3 adapter wiring):
 *
 *  DagPersistence.upsertRun       → PipelineOrchestrationRepository.upsertRun
 *    field map: pipelineKey='dag-runner', triggerType=input.trigger,
 *               dataThroughDate=input.tradingDate, status='RUNNING'
 *
 *  DagPersistence.completeRun     → PipelineOrchestrationRepository.completeRun
 *    field map: idempotencyKey=runKey, status, durationMs, succeededCount,
 *               failedCount, metadata={stageKeys, fromStage, sourceFingerprint}
 *
 *  DagPersistence.findRunByKey    → PipelineOrchestrationRepository.db.pipelineRun.findUnique
 *    where: { idempotencyKey: runKey }; returns PipelineRunRecord | null
 *
 *  DagPersistence.upsertStage     → PipelineOrchestrationRepository.upsertStage
 *    field map: pipelineRunId, stageKey=adapter.key, stageOrder=adapter.stageOrder,
 *               idempotencyKey=stageKey, status='PENDING'
 *
 *  DagPersistence.acquireStage    → PipelineOrchestrationRepository.acquireStageLease
 *    field map: idempotencyKey=stageKey, leaseOwner=runKey, leaseMs
 *
 *  DagPersistence.extendLease     → PipelineOrchestrationRepository.extendStageLease(key, leaseMs)
 *
 *  DagPersistence.recordProgress  → PipelineOrchestrationRepository.recordStageProgress
 *    field map: idempotencyKey=stageKey, processedCount, totalCount, succeededCount?,
 *               failedCount?, leaseMs (extends lease — progress writes SUBSUME heartbeat
 *               lease extension; keep ctx.heartbeat for single-shot stages without counts)
 *
 *  DagPersistence.completeStage   → PipelineOrchestrationRepository.completeStage
 *    field map: idempotencyKey=stageKey, status, succeededCount, failedCount,
 *               totalCount?, processedCount?, skippedCount?, unchangedCount?,
 *               durationMs, errors, metadata={failedInstrumentIds (capped 500), ...}
 *
 *  DagPersistence.findTerminalStage → PipelineOrchestrationRepository.latestStages
 *    to locate a prior-run terminal stage for fromStage cache reuse
 *
 *  DagPersistence.resetStage        → PipelineOrchestrationRepository.db.pipelineStage.update
 *    where: { idempotencyKey: key }; sets status='PENDING', clears leaseOwner/leaseExpiresAt
 *    used by the runner when trigger==='retry' and the stage's terminal status is re-runnable
 */

import { createHash } from 'crypto';
import type {
  DagRunInput,
  DagRunnerConfig,
  DagRunResult,
  DagStageOutcome,
  DagStageStatus,
  PipelineStageAdapter,
  StageContext,
  StageResult,
} from './pipeline-dag.types';

// ---------------------------------------------------------------------------
// Persistence interface — only the methods the runner needs
// ---------------------------------------------------------------------------

export interface TerminalStageRecord {
  status: string;
  succeededCount: number;
  failedCount: number;
  durationMs: number | null;
  errors: string[];
  metadata: Record<string, unknown> | null;
}

export interface RunRecord {
  id: string;
  status: string;
}

export interface DagPersistence {
  upsertRun(params: {
    idempotencyKey: string;
    pipelineKey: string;
    triggerType: string;
    region: string;
    assetType: string;
    timeframe: string;
    dataThroughDate: string;
    sourceFingerprint?: string | null;
    status: string;
  }): Promise<RunRecord>;

  completeRun(params: {
    idempotencyKey: string;
    status: string;
    durationMs: number;
    succeededCount: number;
    failedCount: number;
    metadata?: Record<string, unknown> | null;
    errors?: string[];
  }): Promise<void>;

  findRunByKey(idempotencyKey: string): Promise<RunRecord | null>;

  upsertStage(params: {
    idempotencyKey: string;
    pipelineRunId: string;
    stageKey: string;
    stageOrder: number;
    region: string;
    assetType: string;
    timeframe: string;
    dataThroughDate: string;
    status: string;
  }): Promise<void>;

  acquireStage(params: {
    idempotencyKey: string;
    leaseOwner: string;
    leaseMs: number;
  }): Promise<{ acquired: boolean; reason: string }>;

  extendLease(idempotencyKey: string, leaseMs: number): Promise<void>;

  recordProgress(params: {
    idempotencyKey: string;
    processedCount: number;
    totalCount: number;
    succeededCount?: number;
    failedCount?: number;
    leaseMs: number;
  }): Promise<void>;

  completeStage(params: {
    idempotencyKey: string;
    status: string;
    succeededCount: number;
    failedCount: number;
    totalCount?: number;
    processedCount?: number;
    skippedCount?: number;
    unchangedCount?: number;
    durationMs: number;
    errors?: string[];
    warnings?: string[];
    metadata?: Record<string, unknown> | null;
  }): Promise<void>;

  findTerminalStage(params: {
    stageKey: string;
    region: string;
    assetType: string;
    timeframe: string;
    tradingDate: string;
    // FIX 2: optional idempotency key — when provided the persistence layer
    // must match it exactly so a scoped-retry record cannot be confused with
    // a full-universe record and vice versa.
    idempotencyKey?: string;
  }): Promise<TerminalStageRecord | null>;

  resetStage(idempotencyKey: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Alert summary
// ---------------------------------------------------------------------------

export interface DagAlertSummary {
  runStatus: string;
  region: string;
  assetType: string;
  dataThroughDate: string;
  durationMs: number;
  stagesSummary: Array<{
    stageKey: string;
    status: DagStageStatus;
    succeededCount: number;
    failedCount: number;
  }>;
  firstError?: string | null;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const TERMINAL_SUCCESS: ReadonlySet<string> = new Set(['COMPLETED', 'PARTIAL', 'SKIPPED']);
const TERMINAL_ALL: ReadonlySet<string> = new Set([
  'COMPLETED',
  'PARTIAL',
  'FAILED',
  'SKIPPED',
  'BLOCKED',
  'ABANDONED',
]);

function sha256hex(parts: string[]): string {
  return createHash('sha256').update(parts.join('\x00')).digest('hex');
}

function runIdempotencyKey(
  input: DagRunInput,
  stageKeys: Array<{ key: string; version: string }>,
): string {
  const sortedStages = [...stageKeys].sort((a, b) => a.key.localeCompare(b.key));
  const stagesFingerprint = sortedStages.map((s) => `${s.key}@${s.version}`).join(',');
  return sha256hex([
    'dag-run-v1',
    input.tradingDate,
    input.region,
    input.assetType,
    input.timeframe,
    stagesFingerprint,
    input.sourceFingerprint ?? '',
  ]);
}

function stageIdempotencyKey(
  stageKey: string,
  stageVersion: string,
  input: DagRunInput,
  scopeFingerprint: string,
): string {
  return sha256hex([
    'dag-stage-v1',
    stageKey,
    stageVersion,
    input.tradingDate,
    input.region,
    input.assetType,
    input.timeframe,
    scopeFingerprint,
  ]);
}

function scopeFingerprint(instrumentScope: string[] | null | undefined): string {
  if (!instrumentScope || instrumentScope.length === 0) return '';
  return [...instrumentScope].sort().join(',');
}

function detectCycle(adapters: PipelineStageAdapter[]): string | null {
  const adjMap = new Map<string, string[]>();
  for (const a of adapters) {
    adjMap.set(a.key, [...a.dependsOn]);
  }
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const stackPath: string[] = [];

  function dfs(node: string): boolean {
    if (inStack.has(node)) return true;
    if (visited.has(node)) return false;
    visited.add(node);
    inStack.add(node);
    stackPath.push(node);
    for (const dep of adjMap.get(node) ?? []) {
      if (dfs(dep)) return true;
    }
    stackPath.pop();
    inStack.delete(node);
    return false;
  }

  for (const a of adapters) {
    if (dfs(a.key)) {
      const cycleStart = stackPath[stackPath.length - 1];
      const idx = stackPath.indexOf(cycleStart);
      return stackPath.slice(idx).join(' → ') + ' → ' + cycleStart;
    }
  }
  return null;
}

function topoSort(adapters: PipelineStageAdapter[]): PipelineStageAdapter[] {
  const byKey = new Map(adapters.map((a) => [a.key, a]));
  const result: PipelineStageAdapter[] = [];
  const visited = new Set<string>();

  function visit(key: string): void {
    if (visited.has(key)) return;
    visited.add(key);
    const a = byKey.get(key)!;
    for (const dep of a.dependsOn) {
      visit(dep);
    }
    result.push(a);
  }

  for (const a of adapters) {
    visit(a.key);
  }
  return result;
}

function aggregateRunStatus(
  outcomes: Map<string, DagStageOutcome>,
): 'COMPLETED' | 'PARTIAL' | 'FAILED' {
  let anyFailed = false;
  let anyPartial = false;
  let anySucceeded = false;

  for (const o of outcomes.values()) {
    if (o.status === 'COMPLETED' || (o.status === 'PARTIAL' && o.succeededCount > 0)) {
      anySucceeded = true;
    }
    if (o.status === 'FAILED' || o.status === 'BLOCKED') anyFailed = true;
    if (o.status === 'PARTIAL') anyPartial = true;
  }

  if (!anyFailed && !anyPartial) return 'COMPLETED';
  if (!anySucceeded) return 'FAILED';
  return 'PARTIAL';
}

// ---------------------------------------------------------------------------
// PipelineDagRunner
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: DagRunnerConfig = {
  maxConcurrency: 3,
  leaseMs: 600_000,
  heartbeatMs: 240_000,
};

export class PipelineDagRunner {
  private readonly adapters: PipelineStageAdapter[];
  private readonly topoOrder: PipelineStageAdapter[];
  private readonly persistence: DagPersistence;
  private readonly alertFn?: (summary: DagAlertSummary) => Promise<void> | void;
  private readonly nowFn: () => Date;
  private readonly config: DagRunnerConfig;

  constructor(
    adapters: PipelineStageAdapter[],
    deps: {
      persistence: DagPersistence;
      alert?: (summary: DagAlertSummary) => Promise<void> | void;
      now?: () => Date;
    },
    config?: Partial<DagRunnerConfig>,
  ) {
    // Validate unique keys
    const keys = adapters.map((a) => a.key);
    const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
    if (dupes.length > 0) {
      throw new Error(`PipelineDagRunner: duplicate stage keys: ${dupes.join(', ')}`);
    }

    // Validate all dependsOn refer to known keys
    const keySet = new Set(keys);
    for (const a of adapters) {
      for (const dep of a.dependsOn) {
        if (!keySet.has(dep)) {
          throw new Error(
            `PipelineDagRunner: stage "${a.key}" depends on unknown stage "${dep}"`,
          );
        }
      }
    }

    // Detect cycles
    const cycle = detectCycle(adapters);
    if (cycle) {
      throw new Error(`PipelineDagRunner: cycle detected in DAG: ${cycle}`);
    }

    this.adapters = adapters;
    this.topoOrder = topoSort(adapters);
    this.persistence = deps.persistence;
    this.alertFn = deps.alert;
    this.nowFn = deps.now ?? (() => new Date());
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async execute(input: DagRunInput): Promise<DagRunResult> {
    const runStartMs = this.nowFn().getTime();
    const stageKeys = this.adapters.map((a) => ({ key: a.key, version: a.stageVersion }));
    const runKey = runIdempotencyKey(input, stageKeys);

    // Duplicate short-circuit: if an existing COMPLETED run for the same key exists,
    // return all stages as cached without re-invoking any adapter.
    const existingRun = await this.persistence.findRunByKey(runKey);
    if (existingRun && existingRun.status === 'COMPLETED') {
      const outcomes = new Map<string, DagStageOutcome>();
      for (const adapter of this.adapters) {
        const stKey = stageIdempotencyKey(
          adapter.key,
          adapter.stageVersion,
          input,
          scopeFingerprint(input.instrumentScope),
        );
        const found = await this.safeFind(stKey, input, adapter);
        outcomes.set(adapter.key, {
          status: found?.status as DagStageStatus ?? 'COMPLETED',
          succeededCount: found?.succeededCount ?? 0,
          failedCount: found?.failedCount ?? 0,
          durationMs: found?.durationMs ?? 0,
          cached: true,
          errors: found?.errors,
        });
      }
      const durationMs = this.nowFn().getTime() - runStartMs;
      return {
        runStatus: 'COMPLETED',
        stages: Object.fromEntries(outcomes),
        durationMs,
      };
    }

    // Upsert the run record
    let runRecord: RunRecord;
    try {
      runRecord = await this.persistence.upsertRun({
        idempotencyKey: runKey,
        pipelineKey: 'dag-runner',
        triggerType: input.trigger,
        region: input.region,
        assetType: input.assetType,
        timeframe: input.timeframe,
        dataThroughDate: input.tradingDate,
        sourceFingerprint: input.sourceFingerprint ?? null,
        status: 'RUNNING',
      });
    } catch (err) {
      console.error('[DagRunner] Failed to upsert run record:', err instanceof Error ? err.message : String(err));
      // We still proceed — the run may partially succeed and we can report it
      runRecord = { id: `transient-${runKey}`, status: 'RUNNING' };
    }

    const pipelineRunId = runRecord.id;

    // Determine stages that can be short-circuited from a prior run (fromStage)
    const priorTerminalKeys = new Set<string>();
    if (input.fromStage) {
      const fromIdx = this.topoOrder.findIndex((a) => a.key === input.fromStage);
      if (fromIdx > 0) {
        // FIX 2: use the CURRENT run's scope fingerprint, not '' (empty string),
        // so a scoped fromStage lookup finds the correct prior-run stage record
        // rather than a full-universe record with a different idempotency key.
        const currentScopeFp = scopeFingerprint(input.instrumentScope);
        for (const prior of this.topoOrder.slice(0, fromIdx)) {
          const priorRecord = await this.safeFind(
            stageIdempotencyKey(prior.key, prior.stageVersion, input, currentScopeFp),
            input,
            prior,
          );
          if (priorRecord && TERMINAL_SUCCESS.has(priorRecord.status)) {
            priorTerminalKeys.add(prior.key);
          }
        }
      }
    }

    const outcomes = new Map<string, DagStageOutcome>();
    const scopeFp = scopeFingerprint(input.instrumentScope);

    // Scheduling loop
    const running = new Set<string>();
    const settled = new Set<string>();

    const isTerminal = (key: string): boolean => settled.has(key);
    const isBlocker = (key: string): boolean => {
      const o = outcomes.get(key);
      if (!o) return false;
      return (
        o.status === 'FAILED' ||
        o.status === 'BLOCKED' ||
        (o.status === 'PARTIAL' && o.succeededCount === 0)
      );
    };

    const markBlocked = (adapterKey: string, blockedBy: string[]): void => {
      if (!settled.has(adapterKey)) {
        outcomes.set(adapterKey, {
          status: 'BLOCKED',
          succeededCount: 0,
          failedCount: 0,
          durationMs: 0,
          cached: false,
          errors: [`blocked by: ${blockedBy.join(', ')}`],
        });
        settled.add(adapterKey);
      }
    };

    // Statuses that a retry should re-run (not skip). SKIPPED is included:
    // an operator retry means "re-run whatever did not fully succeed", and a
    // legitimately-empty stage re-running is a harmless no-op, while a
    // wrongly-skipped stage staying cached forever is unrecoverable.
    const RETRY_RERUN: ReadonlySet<string> = new Set([
      'FAILED',
      'BLOCKED',
      'ABANDONED',
      'PARTIAL',
      'SKIPPED',
    ]);

    const runStage = async (adapter: PipelineStageAdapter): Promise<void> => {
      running.add(adapter.key);

      // Cached from prior run
      if (priorTerminalKeys.has(adapter.key)) {
        // FIX 2: use current scope fingerprint here too — must match the key
        // we looked up when building priorTerminalKeys above.
        const priorRecord = await this.safeFind(
          stageIdempotencyKey(adapter.key, adapter.stageVersion, input, scopeFp),
          input,
          adapter,
        );
        outcomes.set(adapter.key, {
          status: (priorRecord?.status as DagStageStatus) ?? 'COMPLETED',
          succeededCount: priorRecord?.succeededCount ?? 0,
          failedCount: priorRecord?.failedCount ?? 0,
          durationMs: priorRecord?.durationMs ?? 0,
          cached: true,
          errors: priorRecord?.errors,
        });
        running.delete(adapter.key);
        settled.add(adapter.key);
        return;
      }

      const stKey = stageIdempotencyKey(adapter.key, adapter.stageVersion, input, scopeFp);
      const stageStartMs = this.nowFn().getTime();

      // Upsert stage record
      try {
        await this.persistence.upsertStage({
          idempotencyKey: stKey,
          pipelineRunId,
          stageKey: adapter.key,
          stageOrder: adapter.stageOrder,
          region: input.region,
          assetType: input.assetType,
          timeframe: input.timeframe,
          dataThroughDate: input.tradingDate,
          status: 'PENDING',
        });
      } catch (err) {
        console.error(`[DagRunner] upsertStage failed for ${adapter.key}:`, err instanceof Error ? err.message : String(err));
      }

      // Acquire stage lease — if terminal and found, decide whether to cache or re-run.
      // FIX 2: On retry, if the terminal status is in RETRY_RERUN, reset the stage
      // and acquire again so the adapter is re-invoked.
      let leaseResult: { acquired: boolean; reason: string };
      try {
        leaseResult = await this.persistence.acquireStage({
          idempotencyKey: stKey,
          leaseOwner: runKey,
          leaseMs: this.config.leaseMs,
        });
      } catch (err) {
        console.error(`[DagRunner] acquireStage failed for ${adapter.key}:`, err instanceof Error ? err.message : String(err));
        leaseResult = { acquired: true, reason: 'PERSISTENCE_ERROR_BYPASS' };
      }

      if (!leaseResult.acquired && leaseResult.reason === 'STAGE_TERMINAL') {
        const foundRecord = await this.safeFind(stKey, input, adapter);

        // On retry, re-runnable terminal statuses are reset so the adapter executes again.
        if (
          input.trigger === 'retry' &&
          foundRecord &&
          RETRY_RERUN.has(foundRecord.status)
        ) {
          try {
            await this.persistence.resetStage(stKey);
          } catch (err) {
            console.error(`[DagRunner] resetStage failed for ${adapter.key}:`, err instanceof Error ? err.message : String(err));
          }
          // Re-acquire after reset — stage is now PENDING, so this should succeed
          try {
            leaseResult = await this.persistence.acquireStage({
              idempotencyKey: stKey,
              leaseOwner: runKey,
              leaseMs: this.config.leaseMs,
            });
          } catch (err) {
            console.error(`[DagRunner] re-acquireStage failed for ${adapter.key}:`, err instanceof Error ? err.message : String(err));
            leaseResult = { acquired: true, reason: 'PERSISTENCE_ERROR_BYPASS' };
          }
          // Fall through to adapter execution below
        } else if (foundRecord && TERMINAL_ALL.has(foundRecord.status)) {
          // Cache the terminal result — no re-run needed
          outcomes.set(adapter.key, {
            status: foundRecord.status as DagStageStatus,
            succeededCount: foundRecord.succeededCount,
            failedCount: foundRecord.failedCount,
            durationMs: foundRecord.durationMs ?? 0,
            cached: true,
            errors: foundRecord.errors,
          });
          running.delete(adapter.key);
          settled.add(adapter.key);
          return;
        }
      }

      // Heartbeat interval
      let heartbeatInterval: ReturnType<typeof setInterval> | null = setInterval(() => {
        this.persistence.extendLease(stKey, this.config.leaseMs).catch((err) => {
          console.error(`[DagRunner] extendLease failed for ${adapter.key}:`, err instanceof Error ? err.message : String(err));
        });
      }, this.config.heartbeatMs);

      const clearHeartbeat = (): void => {
        if (heartbeatInterval !== null) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
      };

      let stageResult: StageResult;
      try {
        const ctx: StageContext = {
          tradingDate: input.tradingDate,
          region: input.region,
          assetType: input.assetType,
          timeframe: input.timeframe,
          trigger: input.trigger,
          // FIX 1: pass instrumentScope for ALL trigger types (scheduled/manual/retry),
          // not only retry. Stripping it for scheduled/manual caused every
          // scope-supporting adapter to receive null and return SKIPPED (proc=0).
          instrumentScope: adapter.supportsInstrumentScope
            ? (input.instrumentScope ?? null)
            : null,
          heartbeat: () => {
            this.persistence.extendLease(stKey, this.config.leaseMs).catch((err) => {
              console.error(`[DagRunner] heartbeat extendLease failed for ${adapter.key}:`, err instanceof Error ? err.message : String(err));
            });
          },
          // progress: fire-and-forget live count update + lease extension.
          // Calling ctx.progress() subsumes a heartbeat — no need to also call
          // ctx.heartbeat() in the same batch iteration when counts are available.
          progress: (update) => {
            this.persistence.recordProgress({
              idempotencyKey: stKey,
              processedCount: update.processed,
              totalCount: update.total,
              succeededCount: update.succeeded,
              failedCount: update.failed,
              leaseMs: this.config.leaseMs,
            }).catch((err) => {
              console.error(`[DagRunner] recordProgress failed for ${adapter.key}:`, err instanceof Error ? err.message : String(err));
            });
          },
          log: (msg: string) => {
            console.log(`[DagRunner:${adapter.key}] ${msg}`);
          },
        };

        stageResult = await adapter.run(ctx);
      } catch (err) {
        clearHeartbeat();
        const errMsg = err instanceof Error ? err.message : String(err);
        const durationMs = this.nowFn().getTime() - stageStartMs;

        try {
          await this.persistence.completeStage({
            idempotencyKey: stKey,
            status: 'FAILED',
            succeededCount: 0,
            failedCount: 0,
            durationMs,
            errors: [errMsg],
          });
        } catch (persistErr) {
          console.error(`[DagRunner] completeStage(FAILED) failed for ${adapter.key}:`, persistErr instanceof Error ? persistErr.message : String(persistErr));
        }

        outcomes.set(adapter.key, {
          status: 'FAILED',
          succeededCount: 0,
          failedCount: 0,
          durationMs,
          cached: false,
          errors: [errMsg],
        });
        running.delete(adapter.key);
        settled.add(adapter.key);
        return;
      }

      clearHeartbeat();
      const durationMs = this.nowFn().getTime() - stageStartMs;
      const succeededCount = stageResult.succeededCount ?? 0;
      const failedCount = stageResult.failedCount ?? 0;
      const failedIds = stageResult.failedInstrumentIds?.slice(0, 500) ?? undefined;

      // Derive totalCount / processedCount with sane fallbacks so terminal rows
      // always render a meaningful Progress column in the UI.
      // Priority: explicit field > sum of succeeded+failed > undefined (column stays blank).
      const resultTotalCount = stageResult.totalCount
        ?? stageResult.processedCount
        ?? (succeededCount + failedCount > 0 ? succeededCount + failedCount : undefined);
      const resultProcessedCount = stageResult.processedCount
        ?? (succeededCount + failedCount > 0 ? succeededCount + failedCount : undefined);

      try {
        await this.persistence.completeStage({
          idempotencyKey: stKey,
          status: stageResult.status,
          succeededCount,
          failedCount,
          totalCount: resultTotalCount,
          processedCount: resultProcessedCount,
          skippedCount: stageResult.skippedCount,
          unchangedCount: stageResult.unchangedCount,
          durationMs,
          errors: stageResult.errors,
          warnings: stageResult.warnings,
          metadata: {
            ...(stageResult.metadata ?? {}),
            ...(failedIds ? { failedInstrumentIds: failedIds } : {}),
          },
        });
      } catch (persistErr) {
        console.error(`[DagRunner] completeStage failed for ${adapter.key}:`, persistErr instanceof Error ? persistErr.message : String(persistErr));
      }

      outcomes.set(adapter.key, {
        status: stageResult.status as DagStageStatus,
        succeededCount,
        failedCount,
        durationMs,
        cached: false,
        ...(failedIds ? { failedInstrumentIds: failedIds } : {}),
        errors: stageResult.errors,
      });
      running.delete(adapter.key);
      settled.add(adapter.key);
    };

    // Main scheduling loop — true pool: launch up to maxConcurrency stages, await
    // Promise.race whenever the pool is full or there is no ready work, and
    // re-evaluate the ready set after EVERY single stage settles.
    //
    // inFlight maps adapterKey → the Promise<void> returned by runStage (which
    // never rejects — runStage settles internally).
    const inFlight = new Map<string, Promise<void>>();

    const collectReady = (): PipelineStageAdapter[] => {
      const ready: PipelineStageAdapter[] = [];
      for (const adapter of this.topoOrder) {
        if (settled.has(adapter.key) || running.has(adapter.key)) continue;

        const blockers = adapter.dependsOn.filter(isBlocker);
        if (blockers.length > 0) {
          markBlocked(adapter.key, blockers);
          continue;
        }

        if (adapter.dependsOn.every(isTerminal)) {
          ready.push(adapter);
        }
      }
      return ready;
    };

    while (settled.size < this.topoOrder.length) {
      // Fill available slots
      let ready = collectReady();
      while (ready.length > 0 && inFlight.size < this.config.maxConcurrency) {
        const adapter = ready.shift()!;
        const p = runStage(adapter).then(() => {
          inFlight.delete(adapter.key);
        });
        inFlight.set(adapter.key, p);
        // Slice off any newly-blocked stages before trying next
        ready = ready.filter((a) => !settled.has(a.key));
      }

      if (inFlight.size === 0) {
        // Nothing running and nothing ready — stall sweep
        if (settled.size < this.topoOrder.length) {
          for (const adapter of this.topoOrder) {
            if (!settled.has(adapter.key)) {
              markBlocked(
                adapter.key,
                adapter.dependsOn.filter(
                  (d) => !TERMINAL_SUCCESS.has(outcomes.get(d)?.status ?? ''),
                ),
              );
            }
          }
        }
        break;
      }

      // Wait for exactly one in-flight stage to settle, then re-evaluate
      await Promise.race(inFlight.values());
    }

    // Aggregate run result
    const runStatus = aggregateRunStatus(outcomes);
    const totalDurationMs = this.nowFn().getTime() - runStartMs;

    const stagesSummary = [...outcomes.entries()].map(([key, o]) => ({
      stageKey: key,
      status: o.status,
      succeededCount: o.succeededCount,
      failedCount: o.failedCount,
    }));

    const allErrors = [...outcomes.values()]
      .flatMap((o) => o.errors ?? [])
      .filter(Boolean);

    try {
      await this.persistence.completeRun({
        idempotencyKey: runKey,
        status: runStatus,
        durationMs: totalDurationMs,
        succeededCount: stagesSummary.reduce((s, x) => s + x.succeededCount, 0),
        failedCount: stagesSummary.reduce((s, x) => s + x.failedCount, 0),
        errors: allErrors.length > 0 ? allErrors.slice(0, 20) : undefined,
        metadata: {
          fromStage: input.fromStage ?? null,
          sourceFingerprint: input.sourceFingerprint ?? null,
        },
      });
    } catch (err) {
      console.error('[DagRunner] completeRun failed:', err instanceof Error ? err.message : String(err));
    }

    // Fire alert exactly once
    if (this.alertFn) {
      try {
        await this.alertFn({
          runStatus,
          region: input.region,
          assetType: input.assetType,
          dataThroughDate: input.tradingDate,
          durationMs: totalDurationMs,
          stagesSummary,
          firstError: allErrors[0] ?? null,
        });
      } catch (err) {
        console.error('[DagRunner] alert hook failed:', err instanceof Error ? err.message : String(err));
      }
    }

    return {
      runStatus,
      stages: Object.fromEntries(outcomes),
      durationMs: totalDurationMs,
    };
  }

  private async safeFind(
    stKey: string,
    _input: DagRunInput,
    adapter: PipelineStageAdapter,
  ): Promise<TerminalStageRecord | null> {
    try {
      // FIX 2: pass the stage idempotency key so persistence can match it
      // exactly — prevents cross-scope cache contamination where a scoped
      // retry lookup would reuse a full-universe terminal record (same
      // stageKey+date, different scopeFingerprint).
      return await this.persistence.findTerminalStage({
        stageKey: adapter.key,
        region: _input.region,
        assetType: _input.assetType,
        timeframe: _input.timeframe,
        tradingDate: _input.tradingDate,
        idempotencyKey: stKey,
      });
    } catch (err) {
      console.error(`[DagRunner] findTerminalStage failed for ${adapter.key}:`, err instanceof Error ? err.message : String(err));
      return null;
    }
  }
}
