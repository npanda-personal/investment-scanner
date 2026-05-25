/// <reference types="@types/jest" />
import { PipelineCommandError, PipelineOrchestrationController } from '../../../src/modules/pipeline-orchestration';

describe('PipelineOrchestrationController', () => {
  it('returns a no-store read-only pipeline status snapshot', async () => {
    const snapshot = {
      scope: { region: 'IN', assetType: 'STOCK', timeframe: '1d', pipelineKey: 'market-intelligence' },
      generatedAt: '2026-05-25T00:00:00.000Z',
      activeRun: null,
      lastRun: null,
      stages: [],
    };
    const service = { status: jest.fn().mockResolvedValue(snapshot) };
    const controller = new PipelineOrchestrationController(service as any);
    const req = { query: { region: 'in' } };
    const res = {
      setHeader: jest.fn(),
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await controller.status(req as any, res as any);

    expect(service.status).toHaveBeenCalledWith(expect.objectContaining({
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
    }));
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(res.json).toHaveBeenCalledWith(snapshot);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 400 for malformed query input', async () => {
    const service = { status: jest.fn() };
    const controller = new PipelineOrchestrationController(service as any);
    const req = { query: { limit: '500' } };
    const res = {
      setHeader: jest.fn(),
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await controller.status(req as any, res as any);

    expect(service.status).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'limit must be an integer between 1 and 100' });
  });

  it('returns command catalog from read-only endpoint', async () => {
    const catalog = {
      scope: { region: 'IN', assetType: 'STOCK', timeframe: '1d', pipelineKey: 'market-intelligence' },
      generatedAt: '2026-05-25T04:00:00.000Z',
      commands: [],
    };
    const service = { commandCatalog: jest.fn().mockReturnValue(catalog) };
    const controller = new PipelineOrchestrationController(service as any);
    const req = { query: { region: 'in', assetType: 'stock' } };
    const res = {
      setHeader: jest.fn(),
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await controller.commandCatalog(req as any, res as any);

    expect(service.commandCatalog).toHaveBeenCalledWith({
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
    });
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(res.json).toHaveBeenCalledWith(catalog);
  });

  it('executes pipeline command and uses default local-manual-operator user id', async () => {
    const response = { status: 'COMPLETED', commandKey: 'DATA_QUALITY_EVALUATE_SCOPE' };
    const service = { executeCommand: jest.fn().mockResolvedValue(response) };
    const controller = new PipelineOrchestrationController(service as any);
    const req = {
      body: {
        commandKey: 'DATA_QUALITY_EVALUATE_SCOPE',
        runMode: 'single_batch',
        idempotencyKey: 'abc-1',
      },
      query: {},
    };
    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await controller.executeCommand(req as any, res as any);

    expect(service.executeCommand).toHaveBeenCalledWith(expect.objectContaining({
      commandKey: 'DATA_QUALITY_EVALUATE_SCOPE',
      runMode: 'single_batch',
      idempotencyKey: 'abc-1',
    }), { requestedByUserId: 'local-manual-operator' });
    expect(res.json).toHaveBeenCalledWith(response);
  });

  it('returns command payload for service-level command errors', async () => {
    const service = {
      executeCommand: jest.fn().mockRejectedValue(new PipelineCommandError(422, 'blocked', { status: 'BLOCKED' } as any)),
    };
    const controller = new PipelineOrchestrationController(service as any);
    const req = {
      body: {
        commandKey: 'PIPELINE_RUN_ALL',
        runMode: 'single_batch',
      },
      query: {},
    };
    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await controller.executeCommand(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({ status: 'BLOCKED' });
  });
});
