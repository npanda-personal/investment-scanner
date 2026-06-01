/// <reference types="@types/jest" />
import { MarketIntelligenceController } from '../../../src/modules/market-intelligence';

function mockResponse() {
  return {
    setHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('MarketIntelligenceController Stock Interest read API', () => {
  it('returns the latest persisted Stock Interest snapshot without triggering refresh', async () => {
    const service = {
      latestSnapshot: jest.fn().mockResolvedValue({
        availability: 'READY',
        scope: { region: 'IN', assetType: 'STOCK' },
        snapshot: [{
          snapshotDate: '2026-06-01',
          dataThroughDate: '2026-05-29',
          generatedAt: '2026-06-01T06:00:00.000Z',
          category: 'TODAY_TOP_INTEREST',
          symbol: 'AAA',
          company: 'AAA Ltd',
          sector: 'Technology',
          score: 91,
          direction: 'bullish interest',
          reasonTags: ['persisted-order-first'],
          riskTags: [],
          freshness: 'FRESH',
          warnings: [],
        }],
        message: 'Persisted Stock Interest snapshot rows loaded.',
        warnings: [],
      }),
      refreshSnapshots: jest.fn(),
    };
    const controller = new MarketIntelligenceController(service as any);
    const res = mockResponse();

    await controller.stockInterest({ query: { region: 'in', assetType: 'stock' } } as any, res as any);

    expect(service.latestSnapshot).toHaveBeenCalledWith({ region: 'IN', assetType: 'STOCK' });
    expect(service.refreshSnapshots).not.toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      availability: 'READY',
      snapshot: [expect.objectContaining({ symbol: 'AAA', category: 'TODAY_TOP_INTEREST' })],
    }));
  });

  it('returns an empty persisted-only envelope when no Stock Interest snapshot exists', async () => {
    const service = {
      latestSnapshot: jest.fn().mockResolvedValue({
        availability: 'EMPTY',
        scope: { region: 'IN', assetType: 'STOCK' },
        snapshot: null,
        message: 'Stock Interest snapshot is not available for this scope.',
        warnings: ['Run STOCK_INTEREST_REFRESH after market data is imported.'],
      }),
    };
    const controller = new MarketIntelligenceController(service as any);
    const res = mockResponse();

    await controller.stockInterest({ query: {} } as any, res as any);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      availability: 'EMPTY',
      snapshot: null,
    }));
  });
});
