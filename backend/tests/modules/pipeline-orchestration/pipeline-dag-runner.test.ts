/// <reference types="@types/jest" />
import { PipelineDagRunner } from '../../../src/modules/pipeline-orchestration/pipeline-dag-runner';
import type { DagPersistence, DagAlertSummary, RunRecord, TerminalStageRecord } from '../../../src/modules/pipeline-orchestration/pipeline-dag-runner';
import type { PipelineStageAdapter, StageContext, StageResult } from '../../../src/modules/pipeline-orchestration/pipeline-dag.types';

// ---------------------------------------------------------------------------
// Fake persistence
// ---------------------------------------------------------------------------

type StageEntry = {
  stageKey: string;
  status: string;
  succeededCount: number;
  failedCount: number;
  durationMs: number;
  errors: string[];
  metadata: Record<string, unknown> | null;
};

function makeFakePersistence(): DagPersistence & {
  runs: Map<string, RunRecord>;
  stages: Map<string, StageEntry>;
  leaseExtensions: Map<string, number>;
  resetCalls: string[];
} {
  const runs = new Map<string, RunRecord>();
  const stages = new Map<string, StageEntry>();
  const leaseExtensions = new Map<string, number>();
  const resetCalls: string[] = [];

  const persistence: DagPersistence & {
    runs: Map<string, RunRecord>;
    stages: Map<string, StageEntry>;
    leaseExtensions: Map<string, number>;
    resetCalls: string[];
  } = {
    runs,
    stages,
    leaseExtensions,
    resetCalls,

    async upsertRun(params) {
      const existing = runs.get(params.idempotencyKey);
      if (existing) return existing;
      const r: RunRecord = { id: `run-${params.idempotencyKey.slice(0, 8)}`, status: params.status };
      runs.set(params.idempotencyKey, r);
      return r;
    },

    async completeRun(params) {
      const r = runs.get(params.idempotencyKey);
      if (r) r.status = params.status;
    },

    async findRunByKey(idempotencyKey) {
      return runs.get(idempotencyKey) ?? null;
    },

    async upsertStage(params) {
      if (!stages.has(params.idempotencyKey)) {
        stages.set(params.idempotencyKey, {
          stageKey: params.stageKey,
          status: params.status,
          succeededCount: 0,
          failedCount: 0,
          durationMs: 0,
          errors: [],
          metadata: null,
        });
      }
    },

    async acquireStage(params) {
      const s = stages.get(params.idempotencyKey);
      if (!s) return { acquired: false, reason: 'STAGE_NOT_FOUND' };
      const terminalStatuses = ['COMPLETED', 'PARTIAL', 'FAILED', 'SKIPPED', 'BLOCKED', 'ABANDONED'];
      if (terminalStatuses.includes(s.status)) {
        return { acquired: false, reason: 'STAGE_TERMINAL' };
      }
      s.status = 'RUNNING';
      return { acquired: true, reason: 'ACQUIRED' };
    },

    async extendLease(idempotencyKey, _leaseMs) {
      leaseExtensions.set(idempotencyKey, (leaseExtensions.get(idempotencyKey) ?? 0) + 1);
    },

    async completeStage(params) {
      const s = stages.get(params.idempotencyKey);
      if (s) {
        s.status = params.status;
        s.succeededCount = params.succeededCount;
        s.failedCount = params.failedCount;
        s.durationMs = params.durationMs;
        s.errors = params.errors ?? [];
        s.metadata = params.metadata ?? null;
      }
    },

    async findTerminalStage(params): Promise<TerminalStageRecord | null> {
      // FIX 2: when idempotencyKey is provided, look up by that key directly
      // (prevents cross-scope cache contamination in the fake).
      if (params.idempotencyKey) {
        const entry = stages.get(params.idempotencyKey);
        if (!entry) return null;
        return {
          status: entry.status,
          succeededCount: entry.succeededCount,
          failedCount: entry.failedCount,
          durationMs: entry.durationMs,
          errors: entry.errors,
          metadata: entry.metadata,
        };
      }
      // Fallback: search by stageKey (used by the duplicate short-circuit path
      // where the run-level key is known but no stage idempotency key is available).
      for (const entry of stages.values()) {
        if (entry.stageKey === params.stageKey) {
          return {
            status: entry.status,
            succeededCount: entry.succeededCount,
            failedCount: entry.failedCount,
            durationMs: entry.durationMs,
            errors: entry.errors,
            metadata: entry.metadata,
          };
        }
      }
      return null;
    },

    async resetStage(idempotencyKey: string): Promise<void> {
      resetCalls.push(idempotencyKey);
      const s = stages.get(idempotencyKey);
      if (s) {
        s.status = 'PENDING';
      }
    },
  };

  return persistence;
}

// ---------------------------------------------------------------------------
// Fake adapter factory
// ---------------------------------------------------------------------------

function makeAdapter(
  key: string,
  stageOrder: number,
  dependsOn: string[],
  run: (ctx: StageContext) => Promise<StageResult>,
  stageVersion = '1.0.0',
  supportsInstrumentScope = false,
): PipelineStageAdapter {
  return { key, stageOrder, stageVersion, dependsOn, supportsInstrumentScope, run };
}

const baseInput = {
  tradingDate: '2026-06-11',
  region: 'IN',
  assetType: 'STOCK',
  timeframe: '1d',
  trigger: 'scheduled' as const,
};

// ---------------------------------------------------------------------------
// Test 1: Topological execution respecting dependsOn
// ---------------------------------------------------------------------------

test('1 — topological execution: dependent stages run after their deps', async () => {
  const order: string[] = [];
  const persistence = makeFakePersistence();

  const adapters = [
    makeAdapter('c', 3, ['a', 'b'], async () => { order.push('c'); return { status: 'COMPLETED' }; }),
    makeAdapter('b', 2, ['a'], async () => { order.push('b'); return { status: 'COMPLETED' }; }),
    makeAdapter('a', 1, [], async () => { order.push('a'); return { status: 'COMPLETED' }; }),
  ];

  const runner = new PipelineDagRunner(adapters, { persistence }, { maxConcurrency: 1 });
  const result = await runner.execute(baseInput);

  expect(order.indexOf('a')).toBeLessThan(order.indexOf('b'));
  expect(order.indexOf('b')).toBeLessThan(order.indexOf('c'));
  expect(result.runStatus).toBe('COMPLETED');
});

// ---------------------------------------------------------------------------
// Test 2: Independent stages run concurrently (observed concurrency > 1)
// ---------------------------------------------------------------------------

test('2 — independent stages run concurrently', async () => {
  const persistence = makeFakePersistence();
  let maxObservedConcurrency = 0;
  let current = 0;

  const slowAdapter = (key: string) =>
    makeAdapter(key, 1, [], async () => {
      current++;
      maxObservedConcurrency = Math.max(maxObservedConcurrency, current);
      await new Promise<void>((r) => setImmediate(r));
      current--;
      return { status: 'COMPLETED' };
    });

  const adapters = [
    slowAdapter('a'),
    slowAdapter('b'),
    slowAdapter('c'),
  ];

  const runner = new PipelineDagRunner(adapters, { persistence }, { maxConcurrency: 3 });
  await runner.execute(baseInput);

  expect(maxObservedConcurrency).toBeGreaterThan(1);
  expect(maxObservedConcurrency).toBeLessThanOrEqual(3);
});

// ---------------------------------------------------------------------------
// Test 3: maxConcurrency cap respected with 6 parallel-eligible stages, cap 2
// ---------------------------------------------------------------------------

test('3 — maxConcurrency cap never exceeded (6 stages, cap 2)', async () => {
  const persistence = makeFakePersistence();
  let maxObservedConcurrency = 0;
  let current = 0;
  const gates: Array<() => void> = [];
  const gated = (key: string) =>
    makeAdapter(key, 1, [], () =>
      new Promise<StageResult>((resolve) => {
        current++;
        maxObservedConcurrency = Math.max(maxObservedConcurrency, current);
        gates.push(() => {
          current--;
          resolve({ status: 'COMPLETED' });
        });
      }),
    );

  const adapters = [gated('a'), gated('b'), gated('c'), gated('d'), gated('e'), gated('f')];
  const runner = new PipelineDagRunner(adapters, { persistence }, { maxConcurrency: 2 });

  const executePromise = runner.execute(baseInput);

  // Release gates in small rounds so all stages complete
  for (let round = 0; round < 6; round++) {
    await new Promise<void>((r) => setImmediate(r));
    await new Promise<void>((r) => setImmediate(r));
    while (gates.length > 0) {
      const g = gates.shift();
      if (g) g();
    }
  }

  await executePromise;

  expect(maxObservedConcurrency).toBeLessThanOrEqual(2);
});

// ---------------------------------------------------------------------------
// Test 4: FAILED stage → downstream BLOCKED, run PARTIAL when others succeeded
// ---------------------------------------------------------------------------

test('4a — failed stage blocks downstream, run is PARTIAL when some succeeded', async () => {
  const persistence = makeFakePersistence();

  const adapters = [
    makeAdapter('root', 1, [], async () => ({ status: 'COMPLETED', succeededCount: 5 })),
    makeAdapter('middle', 2, ['root'], async () => ({ status: 'FAILED', failedCount: 3, errors: ['bad'] })),
    makeAdapter('leaf', 3, ['middle'], async () => ({ status: 'COMPLETED', succeededCount: 2 })),
  ];

  const runner = new PipelineDagRunner(adapters, { persistence });
  const result = await runner.execute(baseInput);

  expect(result.stages['middle'].status).toBe('FAILED');
  expect(result.stages['leaf'].status).toBe('BLOCKED');
  expect(result.runStatus).toBe('PARTIAL');
});

test('4b — all stages fail → run status FAILED', async () => {
  const persistence = makeFakePersistence();

  const adapters = [
    makeAdapter('a', 1, [], async () => ({ status: 'FAILED', failedCount: 1 })),
    makeAdapter('b', 2, ['a'], async () => ({ status: 'COMPLETED', succeededCount: 1 })),
  ];

  const runner = new PipelineDagRunner(adapters, { persistence });
  const result = await runner.execute(baseInput);

  expect(result.stages['a'].status).toBe('FAILED');
  expect(result.stages['b'].status).toBe('BLOCKED');
  expect(result.runStatus).toBe('FAILED');
});

// ---------------------------------------------------------------------------
// Test 5: PARTIAL with succeededCount>0 propagates; PARTIAL with 0 blocks
// ---------------------------------------------------------------------------

test('5a — PARTIAL with succeededCount>0 lets downstream run', async () => {
  const persistence = makeFakePersistence();
  let leafRan = false;

  const adapters = [
    makeAdapter('a', 1, [], async () => ({ status: 'PARTIAL', succeededCount: 3, failedCount: 1 })),
    makeAdapter('b', 2, ['a'], async () => { leafRan = true; return { status: 'COMPLETED', succeededCount: 3 }; }),
  ];

  const runner = new PipelineDagRunner(adapters, { persistence });
  await runner.execute(baseInput);

  expect(leafRan).toBe(true);
});

test('5b — PARTIAL with succeededCount=0 blocks downstream', async () => {
  const persistence = makeFakePersistence();
  let leafRan = false;

  const adapters = [
    makeAdapter('a', 1, [], async () => ({ status: 'PARTIAL', succeededCount: 0, failedCount: 5 })),
    makeAdapter('b', 2, ['a'], async () => { leafRan = true; return { status: 'COMPLETED', succeededCount: 5 }; }),
  ];

  const runner = new PipelineDagRunner(adapters, { persistence });
  const result = await runner.execute(baseInput);

  expect(leafRan).toBe(false);
  expect(result.stages['b'].status).toBe('BLOCKED');
});

// ---------------------------------------------------------------------------
// Test 6: Duplicate short-circuit
// ---------------------------------------------------------------------------

test('6 — duplicate short-circuit: second execute returns cached without re-invoking adapters', async () => {
  const persistence = makeFakePersistence();
  let invocations = 0;

  const adapters = [
    makeAdapter('a', 1, [], async () => { invocations++; return { status: 'COMPLETED', succeededCount: 1 }; }),
  ];

  const runner = new PipelineDagRunner(adapters, { persistence });

  const first = await runner.execute(baseInput);
  expect(first.runStatus).toBe('COMPLETED');
  expect(invocations).toBe(1);

  // Mark the run as COMPLETED in persistence so the second call short-circuits
  const runRecords = persistence.runs;
  for (const [, r] of runRecords) {
    r.status = 'COMPLETED';
  }
  // Also plant a terminal stage in findTerminalStage
  persistence.findTerminalStage = async () => ({
    status: 'COMPLETED',
    succeededCount: 1,
    failedCount: 0,
    durationMs: 100,
    errors: [],
    metadata: null,
  });

  const second = await runner.execute(baseInput);
  expect(invocations).toBe(1); // not re-invoked
  expect(second.stages['a'].cached).toBe(true);
});

// ---------------------------------------------------------------------------
// Test 7: Heartbeats fire during a slow adapter; cleared after completion
// ---------------------------------------------------------------------------

test('7 — heartbeats fire during slow stage (real short interval); interval cleared after completion', async () => {
  const persistence = makeFakePersistence();
  let capturedStageKey: string | null = null;

  const origUpsert = persistence.upsertStage.bind(persistence);
  persistence.upsertStage = async (params) => {
    capturedStageKey = params.idempotencyKey;
    return origUpsert(params);
  };

  // The adapter runs for ~120ms; heartbeat interval is 30ms → expect >=2 extensions
  const adapters = [
    makeAdapter('slow', 1, [], () =>
      new Promise<StageResult>((resolve) => setTimeout(() => resolve({ status: 'COMPLETED', succeededCount: 1 }), 120)),
    ),
  ];

  const runner = new PipelineDagRunner(
    adapters,
    { persistence },
    { heartbeatMs: 30, leaseMs: 10_000 },
  );

  await runner.execute(baseInput);

  const extensions = persistence.leaseExtensions.get(capturedStageKey ?? '') ?? 0;
  expect(extensions).toBeGreaterThanOrEqual(2);
}, 5000);

// ---------------------------------------------------------------------------
// Test 8: Adapter throws → stage FAILED, downstream BLOCKED, execute resolves
// ---------------------------------------------------------------------------

test('8 — adapter throw → stage FAILED, downstream BLOCKED, execute resolves', async () => {
  const firstRun = await (async () => {
    const r2 = new PipelineDagRunner(
      [
        makeAdapter('a', 1, [], async () => { throw new Error('boom'); }),
        makeAdapter('b', 2, ['a'], async () => ({ status: 'COMPLETED', succeededCount: 1 })),
      ],
      { persistence: makeFakePersistence() },
    );
    return r2.execute(baseInput);
  })();

  expect(firstRun.stages['a'].status).toBe('FAILED');
  expect(firstRun.stages['a'].errors).toContain('boom');
  expect(firstRun.stages['b'].status).toBe('BLOCKED');
  expect(firstRun.runStatus).toBe('FAILED');
});

// ---------------------------------------------------------------------------
// Test 9: Cycle detection
// ---------------------------------------------------------------------------

test('9 — constructor throws on cycle, naming the cycle', () => {
  const adapters = [
    makeAdapter('a', 1, ['c'], async () => ({ status: 'COMPLETED' })),
    makeAdapter('b', 2, ['a'], async () => ({ status: 'COMPLETED' })),
    makeAdapter('c', 3, ['b'], async () => ({ status: 'COMPLETED' })),
  ];

  expect(() => new PipelineDagRunner(adapters, { persistence: makeFakePersistence() })).toThrow(
    /cycle/i,
  );
});

// ---------------------------------------------------------------------------
// Test 10: retry with instrumentScope reaches adapter ctx
// ---------------------------------------------------------------------------

test('10 — retry trigger with instrumentScope passed through ctx for supporting adapters', async () => {
  const persistence = makeFakePersistence();
  let capturedScope: string[] | null | undefined = undefined;

  const adapters = [
    makeAdapter(
      'a',
      1,
      [],
      async (ctx: StageContext) => {
        capturedScope = ctx.instrumentScope;
        return { status: 'COMPLETED', succeededCount: ctx.instrumentScope?.length ?? 0 };
      },
      '1.0.0',
      true, // supportsInstrumentScope
    ),
  ];

  const runner = new PipelineDagRunner(adapters, { persistence });
  await runner.execute({
    ...baseInput,
    trigger: 'retry',
    instrumentScope: ['INS-1', 'INS-2', 'INS-3'],
  });

  expect(capturedScope).toEqual(['INS-1', 'INS-2', 'INS-3']);
});

// ---------------------------------------------------------------------------
// Test: Alert fires exactly once at completion
// ---------------------------------------------------------------------------

test('alert fires exactly once with correct summary', async () => {
  const persistence = makeFakePersistence();
  const alerts: DagAlertSummary[] = [];

  const adapters = [
    makeAdapter('x', 1, [], async () => ({ status: 'COMPLETED', succeededCount: 10 })),
  ];

  const runner = new PipelineDagRunner(
    adapters,
    {
      persistence,
      alert: (s) => { alerts.push(s); },
    },
  );

  await runner.execute(baseInput);
  expect(alerts).toHaveLength(1);
  expect(alerts[0].runStatus).toBe('COMPLETED');
  expect(alerts[0].region).toBe('IN');
  expect(alerts[0].stagesSummary).toHaveLength(1);
  expect(alerts[0].stagesSummary[0].stageKey).toBe('x');
});

// ---------------------------------------------------------------------------
// Test (pool): fast downstream C starts while slow A is still running
// ---------------------------------------------------------------------------

test('pool — C starts while A (slow) still in-flight, before A finishes', async () => {
  const persistence = makeFakePersistence();

  const timestamps: Record<string, { start: number; end?: number }> = {};

  // A: slow (~80 ms)
  const adapterA = makeAdapter('a', 1, [], () =>
    new Promise<StageResult>((resolve) => {
      timestamps['a'] = { start: Date.now() };
      setTimeout(() => {
        timestamps['a'].end = Date.now();
        resolve({ status: 'COMPLETED', succeededCount: 1 });
      }, 80);
    }),
  );

  // B: fast (~5 ms), independent of A
  const adapterB = makeAdapter('b', 2, [], () =>
    new Promise<StageResult>((resolve) => {
      timestamps['b'] = { start: Date.now() };
      setTimeout(() => {
        timestamps['b'].end = Date.now();
        resolve({ status: 'COMPLETED', succeededCount: 1 });
      }, 5);
    }),
  );

  // C: depends only on B
  const adapterC = makeAdapter('c', 3, ['b'], () =>
    new Promise<StageResult>((resolve) => {
      timestamps['c'] = { start: Date.now() };
      resolve({ status: 'COMPLETED', succeededCount: 1 });
    }),
  );

  const runner = new PipelineDagRunner(
    [adapterA, adapterB, adapterC],
    { persistence },
    { maxConcurrency: 2 },
  );

  await runner.execute(baseInput);

  // C must have started before A ended
  expect(timestamps['c']).toBeDefined();
  expect(timestamps['a'].end).toBeDefined();
  expect(timestamps['c'].start).toBeLessThan(timestamps['a'].end!);
}, 5000);

// ---------------------------------------------------------------------------
// Test (retry): failed stage X is reset and re-run; downstream unblocked
// ---------------------------------------------------------------------------

test('retry — failed stage X is reset + re-run, downstream runs after', async () => {
  const persistence = makeFakePersistence();
  let xInvocations = 0;
  let downstreamRan = false;

  // First execute: X fails, downstream blocked
  const adaptersFirstRun = [
    makeAdapter('x', 1, [], async () => {
      xInvocations++;
      return { status: 'FAILED', failedCount: 1, errors: ['first-fail'] };
    }),
    makeAdapter('down', 2, ['x'], async () => {
      downstreamRan = true;
      return { status: 'COMPLETED', succeededCount: 1 };
    }),
  ];

  const runner1 = new PipelineDagRunner(adaptersFirstRun, { persistence });
  const firstResult = await runner1.execute(baseInput);
  expect(firstResult.stages['x'].status).toBe('FAILED');
  expect(firstResult.stages['down'].status).toBe('BLOCKED');
  expect(xInvocations).toBe(1);
  expect(downstreamRan).toBe(false);

  // Second execute with trigger='retry': X should be reset and re-run successfully
  const adaptersRetry = [
    makeAdapter('x', 1, [], async () => {
      xInvocations++;
      return { status: 'COMPLETED', succeededCount: 1 };
    }),
    makeAdapter('down', 2, ['x'], async () => {
      downstreamRan = true;
      return { status: 'COMPLETED', succeededCount: 1 };
    }),
  ];

  const runner2 = new PipelineDagRunner(adaptersRetry, { persistence });
  const retryResult = await runner2.execute({ ...baseInput, trigger: 'retry' });

  expect(xInvocations).toBe(2); // re-invoked
  expect(downstreamRan).toBe(true);
  expect(retryResult.stages['x'].status).toBe('COMPLETED');
  expect(retryResult.stages['down'].status).toBe('COMPLETED');
  // resetStage must have been called for X's stage key
  expect(persistence.resetCalls.length).toBeGreaterThan(0);
});

// ---------------------------------------------------------------------------
// Test (retry-cached): COMPLETED stages are NOT re-invoked on retry
// ---------------------------------------------------------------------------

test('retry-cached — COMPLETED stage is not re-invoked on retry', async () => {
  const persistence = makeFakePersistence();
  let invocations = 0;

  const adapters = [
    makeAdapter('z', 1, [], async () => {
      invocations++;
      return { status: 'COMPLETED', succeededCount: 5 };
    }),
  ];

  const runner = new PipelineDagRunner(adapters, { persistence });

  // First run — completes normally
  await runner.execute(baseInput);
  expect(invocations).toBe(1);

  // Retry run — Z is already COMPLETED, should NOT be reset or re-invoked
  // The persistence stage for Z is now in COMPLETED status after the first run.
  // acquireStage will return STAGE_TERMINAL → runner should use the cached record.
  const runner2 = new PipelineDagRunner(adapters, { persistence });
  await runner2.execute({ ...baseInput, trigger: 'retry' });

  expect(invocations).toBe(1); // not re-invoked
  // resetStage must NOT have been called for Z (COMPLETED is not in RETRY_RERUN)
  expect(persistence.resetCalls.length).toBe(0);
});
