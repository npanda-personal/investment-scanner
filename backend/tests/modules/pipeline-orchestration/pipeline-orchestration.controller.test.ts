/// <reference types="@types/jest" />
import { PipelineOrchestrationController } from '../../../src/modules/pipeline-orchestration';

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
});
