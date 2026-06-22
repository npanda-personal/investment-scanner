import { PipelineOrchestrationService } from '../../../src/modules/pipeline-orchestration/pipeline-orchestration.service';

const makeRequest = (overrides: Record<string, unknown> = {}) => ({
  commandKey: 'PIPELINE_CANCEL_ACTIVE' as const,
  region: 'IN',
  assetType: 'STOCK',
  timeframe: '1d',
  pipelineKey: 'market-intelligence',
  runMode: 'single_batch' as const,
  batchSize: 100,
  offset: 0,
  idempotencyKey: `test-${Date.now()}`,
  force: false as const,
  ...overrides,
});

const makeContext = () => ({ requestedByUserId: 'test-user' });

jest.mock('../../../src/modules/pipeline-orchestration/pipeline-orchestration.force-cancel', () => ({
  executeForceCancelCommand: jest.fn().mockResolvedValue({
    commandId: 'PIPELINE_CANCEL_ACTIVE:IN:STOCK:test-key',
    commandKey: 'PIPELINE_CANCEL_ACTIVE',
    stageKey: 'PIPELINE',
    status: 'COMPLETED',
    scope: { region: 'IN', assetType: 'STOCK', timeframe: '1d', pipelineKey: 'market-intelligence' },
    runMode: 'single_batch',
    pipelineRunId: null,
    stageRunId: null,
    idempotencyKey: 'PIPELINE_CANCEL_ACTIVE:IN:STOCK:test-key',
    lease: { acquired: true, reason: 'ACQUIRED', leaseOwner: null, leaseExpiresAt: null },
    batch: { batchSize: 100, offset: 0, nextOffset: null, hasMore: false },
    counts: { totalCount: 1, processedCount: 1, succeededCount: 1, partialCount: 0, failedCount: 0, skippedCount: 0, unchangedCount: 0 },
    warnings: [],
    errors: [],
    statusUrl: '/api/v1/pipeline/status?region=IN&assetType=STOCK&timeframe=1d&pipelineKey=market-intelligence&limit=100',
    startedAt: null,
    completedAt: new Date().toISOString(),
  }),
}));

jest.mock('../../../src/modules/pipeline-orchestration/pipeline-orchestration.repository');
jest.mock('../../../src/modules/pipeline-orchestration/pipeline-dag-registry', () => ({ buildPipelineDagAdapters: jest.fn().mockReturnValue([]) }));
jest.mock('../../../src/modules/pipeline-orchestration/pipeline-dag-stages-crypto', () => ({ buildCryptoPipelineDagAdapters: jest.fn().mockReturnValue([]) }));

describe('PIPELINE_CANCEL_ACTIVE command', () => {
  let service: PipelineOrchestrationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PipelineOrchestrationService();
  });

  it('dispatches to executeForceCancelCommand and returns COMPLETED status', async () => {
    const { executeForceCancelCommand } = jest.requireMock('../../../src/modules/pipeline-orchestration/pipeline-orchestration.force-cancel');
    const response = await service.executeCommand(makeRequest(), makeContext());
    expect(executeForceCancelCommand).toHaveBeenCalledTimes(1);
    expect(response.status).toBe('COMPLETED');
    expect(response.commandKey).toBe('PIPELINE_CANCEL_ACTIVE');
  });

  it('appears in commandCatalog as ENABLED', () => {
    const catalog = service.commandCatalog(
      { region: 'IN', assetType: 'STOCK', timeframe: '1d', pipelineKey: 'market-intelligence' },
      new Date(),
    );
    const entry = catalog.commands.find((c) => c.commandKey === 'PIPELINE_CANCEL_ACTIVE');
    expect(entry).toBeDefined();
    expect(entry?.availability).toBe('ENABLED');
  });
});
