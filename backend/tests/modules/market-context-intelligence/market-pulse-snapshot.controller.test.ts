/// <reference types="@types/jest" />
import { MarketContextIntelligenceController } from '../../../src/modules/market-context-intelligence';

function mockResponse() {
  return {
    setHeader: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('Market Pulse snapshot controller', () => {
  it('returns the latest persisted Market Pulse snapshot from the read API', async () => {
    const marketPulseService = {
      latestSnapshot: jest.fn().mockResolvedValue({
        availability: 'READY',
        scope: { region: 'IN', assetType: 'STOCK' },
        snapshot: {
          snapshotDate: '2026-06-01',
          dataThroughDate: '2026-05-29',
          generatedAt: '2026-06-01T06:00:00.000Z',
          status: 'FRESH',
          marketHealthScore: 82,
          marketHealthLabel: 'HEALTHY',
          topIndices: [],
          strongSectors: [],
          weakSectors: [],
          breadthSummary: 'Breadth is constructive.',
          deliverySummary: 'Delivery participation is available.',
          candidateCount: 4,
          warnings: [],
        },
        message: 'Persisted Market Pulse snapshot loaded.',
        warnings: [],
      }),
      refreshSnapshot: jest.fn(),
    };
    const controller = new MarketContextIntelligenceController({} as any, marketPulseService as any);
    const req = { query: { region: 'IN', assetType: 'STOCK' } } as any;
    const res = mockResponse() as any;

    await controller.marketPulse(req, res);

    expect(marketPulseService.latestSnapshot).toHaveBeenCalledWith({ region: 'IN', assetType: 'STOCK', timeframe: '1d' });
    expect(marketPulseService.refreshSnapshot).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      availability: 'READY',
      snapshot: expect.objectContaining({ marketHealthLabel: 'HEALTHY' }),
    }));
  });

  it('returns a clean empty response when no persisted snapshot exists', async () => {
    const marketPulseService = {
      latestSnapshot: jest.fn().mockResolvedValue({
        availability: 'EMPTY',
        scope: { region: 'IN', assetType: 'STOCK' },
        snapshot: null,
        message: 'Market Pulse snapshot is not available for this scope.',
        warnings: ['Run MARKET_PULSE_REFRESH after market data is imported.'],
      }),
      refreshSnapshot: jest.fn(),
    };
    const controller = new MarketContextIntelligenceController({} as any, marketPulseService as any);
    const req = { query: { region: 'IN', assetType: 'STOCK' } } as any;
    const res = mockResponse() as any;

    await controller.marketPulse(req, res);

    expect(res.status).not.toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      availability: 'EMPTY',
      snapshot: null,
    }));
  });
});
