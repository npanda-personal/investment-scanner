/// <reference types="@types/jest" />
import { EarningsIntelligenceController } from '../../../src/modules/earnings-intelligence';

describe('EarningsIntelligenceController', () => {
  it('returns latest persisted earnings snapshot with no-store cache policy', async () => {
    const payload = {
      scope: { region: 'IN', assetType: 'STOCK' },
      snapshotDate: '2026-06-01',
      dataThroughDate: '2026-05-31',
      generatedAt: '2026-06-01T06:00:00.000Z',
      freshness: 'FRESH',
      categories: {},
      items: [],
      warnings: [],
    };
    const service = { latest: jest.fn().mockResolvedValue(payload) };
    const controller = new EarningsIntelligenceController(service as any);
    const req = { query: { region: 'in', assetType: 'stock', category: 'RESULT_WINNERS' } };
    const res = {
      setHeader: jest.fn(),
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await controller.latest(req as any, res as any);

    expect(service.latest).toHaveBeenCalledWith(expect.objectContaining({
      region: 'IN',
      assetType: 'STOCK',
      category: 'RESULT_WINNERS',
    }));
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(res.json).toHaveBeenCalledWith(payload);
  });

  it('returns 400 for invalid category query', async () => {
    const service = { latest: jest.fn() };
    const controller = new EarningsIntelligenceController(service as any);
    const req = { query: { category: 'BAD' } };
    const res = {
      setHeader: jest.fn(),
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await controller.latest(req as any, res as any);

    expect(service.latest).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: expect.stringContaining('category must be one of') });
  });
});

