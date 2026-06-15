import type { DagAlertSummary } from '../../../src/modules/pipeline-orchestration/pipeline-dag-runner';

/**
 * Gating tests for the post-pipeline demo publish trigger. We mock child_process
 * so nothing is actually spawned — we only assert WHEN a publish is launched.
 */
function makeFakeChild() {
  return {
    stdout: { on: jest.fn() },
    stderr: { on: jest.fn() },
    on: jest.fn(),
    kill: jest.fn(),
  };
}

function summary(over: Partial<DagAlertSummary> = {}): DagAlertSummary {
  return {
    runStatus: 'COMPLETED',
    region: 'IN',
    assetType: 'STOCK',
    dataThroughDate: '2026-06-15',
    durationMs: 1,
    stagesSummary: [],
    ...over,
  };
}

describe('triggerDemoPublishIfEnabled', () => {
  const OLD_ENV = process.env;
  let spawnMock: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    process.env = { ...OLD_ENV };
    delete process.env.DEMO_AUTO_PUBLISH;
    spawnMock = jest.fn(() => makeFakeChild());
    jest.doMock('child_process', () => ({ spawn: spawnMock }));
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  function load() {
    // re-require under the active mock + fresh module state (isPublishing).
    return require('../../../src/modules/pipeline-orchestration/demo-publish.trigger')
      .triggerDemoPublishIfEnabled as (s: DagAlertSummary) => void;
  }

  it('does nothing when DEMO_AUTO_PUBLISH is not "true"', () => {
    load()(summary());
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it('does nothing for a non-IN/STOCK scope', () => {
    process.env.DEMO_AUTO_PUBLISH = 'true';
    load()(summary({ region: 'US' }));
    load()(summary({ assetType: 'CRYPTO', region: 'GLOBAL' }));
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it('does nothing when the run did not succeed', () => {
    process.env.DEMO_AUTO_PUBLISH = 'true';
    load()(summary({ runStatus: 'FAILED' }));
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it('publishes for a successful IN/STOCK run when enabled', () => {
    process.env.DEMO_AUTO_PUBLISH = 'true';
    load()(summary({ runStatus: 'COMPLETED' }));
    expect(spawnMock).toHaveBeenCalledTimes(1);
  });

  it('also publishes on PARTIAL (data present)', () => {
    process.env.DEMO_AUTO_PUBLISH = 'true';
    load()(summary({ runStatus: 'PARTIAL' }));
    expect(spawnMock).toHaveBeenCalledTimes(1);
  });

  it('does not stack publishes while one is in flight', () => {
    process.env.DEMO_AUTO_PUBLISH = 'true';
    const trigger = load(); // same module instance -> shared in-flight guard
    trigger(summary());
    trigger(summary()); // child never "closes", so guard is still set
    expect(spawnMock).toHaveBeenCalledTimes(1);
  });
});
