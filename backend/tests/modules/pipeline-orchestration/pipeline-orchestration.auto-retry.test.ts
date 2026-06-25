import {
  selectLatestIncompletePerScope,
  sweepIncompleteRunsAndRetry,
  type AutoRetryConfig,
  type AutoRetryDeps,
  type AutoRetryScope,
  type IncompleteRun,
  type RawRunRow,
} from '../../../src/modules/pipeline-orchestration/pipeline-orchestration.auto-retry';

const FIXED_NOW = new Date('2026-06-25T18:00:00.000Z');

const STOCK_RUN: IncompleteRun = {
  pipelineKey: 'market-intelligence',
  region: 'IN',
  assetType: 'STOCK',
  timeframe: '1d',
  runId: 'run-abandoned-1',
  status: 'ABANDONED',
  dataThroughDate: '2026-06-25',
};

function buildDeps(overrides: {
  config?: Partial<AutoRetryConfig>;
  incomplete?: IncompleteRun[];
  hasActiveRun?: boolean;
  retryAttempts?: number;
  retryStockImpl?: AutoRetryDeps['retryStockDag'];
  retryCryptoImpl?: AutoRetryDeps['retryCryptoDag'];
} = {}): AutoRetryDeps & {
  mocks: {
    listIncompleteRuns: jest.Mock;
    hasActiveRun: jest.Mock;
    getRetryAttempts: jest.Mock;
    recordRetryAttempt: jest.Mock;
    retryStockDag: jest.Mock;
    retryCryptoDag: jest.Mock;
    warn: jest.Mock;
    log: jest.Mock;
  };
} {
  const mocks = {
    listIncompleteRuns: jest.fn(async () => overrides.incomplete ?? [STOCK_RUN]),
    hasActiveRun: jest.fn(async () => overrides.hasActiveRun ?? false),
    getRetryAttempts: jest.fn(() => overrides.retryAttempts ?? 0),
    recordRetryAttempt: jest.fn(),
    retryStockDag: jest.fn(overrides.retryStockImpl ?? (async () => ({ runStatus: 'COMPLETED' }))),
    retryCryptoDag: jest.fn(overrides.retryCryptoImpl ?? (async () => ({ runStatus: 'COMPLETED' }))),
    warn: jest.fn(),
    log: jest.fn(),
  };
  const deps: AutoRetryDeps = {
    config: {
      enabled: true,
      maxAttemptsPerScope: 3,
      lookbackMs: 36 * 60 * 60 * 1000,
      ...overrides.config,
    },
    now: () => FIXED_NOW,
    listIncompleteRuns: mocks.listIncompleteRuns,
    hasActiveRun: mocks.hasActiveRun,
    getRetryAttempts: mocks.getRetryAttempts,
    recordRetryAttempt: mocks.recordRetryAttempt,
    retryStockDag: mocks.retryStockDag,
    retryCryptoDag: mocks.retryCryptoDag,
    log: mocks.log,
    warn: mocks.warn,
  };
  return Object.assign(deps, { mocks });
}

describe('sweepIncompleteRunsAndRetry', () => {
  it('does nothing when disabled (no scan, no retries)', async () => {
    const deps = buildDeps({ config: { enabled: false } });
    const result = await sweepIncompleteRunsAndRetry(deps);
    expect(result).toEqual({ scanned: 0, retried: 0, outcomes: [] });
    expect(deps.mocks.listIncompleteRuns).not.toHaveBeenCalled();
    expect(deps.mocks.retryStockDag).not.toHaveBeenCalled();
  });

  it('scans within the configured lookback window', async () => {
    const deps = buildDeps({ config: { lookbackMs: 10_000 }, incomplete: [] });
    await sweepIncompleteRunsAndRetry(deps);
    expect(deps.mocks.listIncompleteRuns).toHaveBeenCalledWith(new Date(FIXED_NOW.getTime() - 10_000));
  });

  it('re-triggers a terminal-incomplete stock run via the stock DAG and records the attempt', async () => {
    const deps = buildDeps();
    const result = await sweepIncompleteRunsAndRetry(deps);
    expect(deps.mocks.retryStockDag).toHaveBeenCalledWith({
      tradingDate: '2026-06-25',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
    });
    expect(deps.mocks.recordRetryAttempt).toHaveBeenCalledTimes(1);
    expect(deps.mocks.retryCryptoDag).not.toHaveBeenCalled();
    expect(result).toMatchObject({ scanned: 1, retried: 1 });
    expect(result.outcomes[0]).toMatchObject({ action: 'RETRIED', retriggeredStatus: 'COMPLETED' });
  });

  it('routes CRYPTO scopes to the crypto DAG', async () => {
    const cryptoRun: IncompleteRun = { ...STOCK_RUN, region: 'GLOBAL', assetType: 'CRYPTO', runId: 'run-crypto-1' };
    const deps = buildDeps({ incomplete: [cryptoRun] });
    await sweepIncompleteRunsAndRetry(deps);
    expect(deps.mocks.retryCryptoDag).toHaveBeenCalledWith({ tradingDate: '2026-06-25' });
    expect(deps.mocks.retryStockDag).not.toHaveBeenCalled();
  });

  it('skips when a run is already active for the scope (without counting an attempt)', async () => {
    const deps = buildDeps({ hasActiveRun: true });
    const result = await sweepIncompleteRunsAndRetry(deps);
    expect(deps.mocks.retryStockDag).not.toHaveBeenCalled();
    expect(deps.mocks.recordRetryAttempt).not.toHaveBeenCalled();
    expect(result.retried).toBe(0);
    expect(result.outcomes[0].action).toBe('SKIPPED_ACTIVE');
  });

  it('respects the per-scope retry cap and warns (storm guard)', async () => {
    const deps = buildDeps({ retryAttempts: 3, config: { maxAttemptsPerScope: 3 } });
    const result = await sweepIncompleteRunsAndRetry(deps);
    expect(deps.mocks.retryStockDag).not.toHaveBeenCalled();
    expect(deps.mocks.recordRetryAttempt).not.toHaveBeenCalled();
    expect(result.outcomes[0].action).toBe('SKIPPED_CAP');
    expect(deps.mocks.warn).toHaveBeenCalledTimes(1);
  });

  it('skips a run with no dataThroughDate to retarget', async () => {
    const deps = buildDeps({ incomplete: [{ ...STOCK_RUN, dataThroughDate: null }] });
    const result = await sweepIncompleteRunsAndRetry(deps);
    expect(deps.mocks.retryStockDag).not.toHaveBeenCalled();
    expect(result.outcomes[0].action).toBe('SKIPPED_NO_DATE');
  });

  it('counts an attempt even when the DAG throws, and continues to the next scope', async () => {
    const runA = { ...STOCK_RUN, runId: 'run-a' };
    const runB = { ...STOCK_RUN, region: 'US', runId: 'run-b' };
    const deps = buildDeps({
      incomplete: [runA, runB],
      retryStockImpl: jest.fn()
        .mockRejectedValueOnce(new Error('eligible-universe resolver returned empty instrument list'))
        .mockResolvedValueOnce({ runStatus: 'PARTIAL' }),
    });
    const result = await sweepIncompleteRunsAndRetry(deps);
    expect(result.scanned).toBe(2);
    expect(result.retried).toBe(1); // runB still retried after runA errored
    expect(result.outcomes.map((o) => o.action)).toEqual(['ERROR', 'RETRIED']);
    expect(deps.mocks.recordRetryAttempt).toHaveBeenCalledTimes(2); // both attempts counted (incl. the thrower)
    expect(deps.mocks.warn).toHaveBeenCalled();
  });

  // Integration-style: a REAL in-process counter (not a mock) proves the cap is
  // actually honored across repeated sweeps of a persistently-failing scope — the
  // exact storm scenario a row-counting guard could not bound.
  it('bounds a persistently-failing scope to maxAttemptsPerScope across repeated sweeps', async () => {
    const counts = new Map<string, number>();
    const key = (s: AutoRetryScope, d: string) => `${s.pipelineKey}|${s.region}|${s.assetType}|${s.timeframe}|${d}`;
    const retryStockDag = jest.fn(async () => ({ runStatus: 'FAILED' })); // never recovers
    const baseDeps: AutoRetryDeps = {
      config: { enabled: true, maxAttemptsPerScope: 3, lookbackMs: 36 * 60 * 60 * 1000 },
      now: () => FIXED_NOW,
      listIncompleteRuns: async () => [STOCK_RUN], // always still incomplete
      hasActiveRun: async () => false,
      getRetryAttempts: (s, d) => counts.get(key(s, d)) ?? 0,
      recordRetryAttempt: (s, d) => counts.set(key(s, d), (counts.get(key(s, d)) ?? 0) + 1),
      retryStockDag,
      retryCryptoDag: jest.fn(async () => ({ runStatus: 'FAILED' })),
      log: jest.fn(),
      warn: jest.fn(),
    };

    const actions: string[] = [];
    for (let i = 0; i < 5; i += 1) {
      const r = await sweepIncompleteRunsAndRetry(baseDeps);
      actions.push(r.outcomes[0].action);
    }

    expect(retryStockDag).toHaveBeenCalledTimes(3); // capped, not 5
    expect(actions).toEqual(['RETRIED', 'RETRIED', 'RETRIED', 'SKIPPED_CAP', 'SKIPPED_CAP']);
  });
});

describe('selectLatestIncompletePerScope', () => {
  const row = (over: Partial<RawRunRow>): RawRunRow => ({
    runId: 'r',
    pipelineKey: 'market-intelligence',
    region: 'IN',
    assetType: 'STOCK',
    timeframe: '1d',
    status: 'ABANDONED',
    dataThroughDate: '2026-06-25',
    startedAtMs: 1000,
    ...over,
  });

  it('keeps a scope whose latest run is ABANDONED or FAILED', () => {
    const out = selectLatestIncompletePerScope([
      row({ runId: 'a', status: 'FAILED', startedAtMs: 10 }),
      row({ runId: 'b', region: 'US', status: 'ABANDONED', startedAtMs: 20 }),
    ]);
    expect(out.map((r) => r.runId).sort()).toEqual(['a', 'b']);
  });

  it('drops a scope whose latest run superseded an older failure (COMPLETED/PARTIAL/RUNNING wins)', () => {
    for (const winner of ['COMPLETED', 'PARTIAL', 'RUNNING']) {
      const out = selectLatestIncompletePerScope([
        row({ runId: 'old-fail', status: 'ABANDONED', startedAtMs: 10 }),
        row({ runId: 'new-ok', status: winner, startedAtMs: 99 }),
      ]);
      expect(out).toEqual([]); // latest is non-incomplete → scope excluded
    }
  });

  it('uses startedAt (not array order) to pick the latest per scope', () => {
    const out = selectLatestIncompletePerScope([
      row({ runId: 'newer-ok', status: 'COMPLETED', startedAtMs: 50 }),
      row({ runId: 'older-fail', status: 'FAILED', startedAtMs: 10 }),
    ]);
    expect(out).toEqual([]); // newest is COMPLETED even though it appears first
  });

  it('treats different timeframes/asset-types/regions as distinct scopes', () => {
    const out = selectLatestIncompletePerScope([
      row({ runId: 'in-1d', timeframe: '1d', status: 'FAILED' }),
      row({ runId: 'in-1w', timeframe: '1w', status: 'FAILED' }),
    ]);
    expect(out).toHaveLength(2);
  });
});
