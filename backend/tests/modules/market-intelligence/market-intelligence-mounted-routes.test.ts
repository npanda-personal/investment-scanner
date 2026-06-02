/// <reference types="@types/jest" />
import type { Server } from 'http';

const mockLatestSectorIntelligenceSnapshot = jest.fn();
const mockRefreshSectorSnapshots = jest.fn();
const mockLatestMarketPulse = jest.fn();
const mockMarketPulseHistory = jest.fn();
const mockRefreshMarketPulse = jest.fn();
const mockLatestEarnings = jest.fn();
const mockRefreshEarnings = jest.fn();
const mockLatestStockInterest = jest.fn();
const mockRefreshStockInterest = jest.fn();

jest.mock('../../../src/modules/market-context-intelligence/market-context-intelligence.service', () => ({
  MarketContextIntelligenceService: jest.fn().mockImplementation(() => ({
    summary: jest.fn(),
    latestPersistedSummary: jest.fn(),
    latestPersistedBreadth: jest.fn(),
    latestSectorIntelligenceSnapshot: mockLatestSectorIntelligenceSnapshot,
    refreshSectorSnapshots: mockRefreshSectorSnapshots,
    run: jest.fn(),
    regime: jest.fn(),
    sectors: jest.fn(),
    breadth: jest.fn(),
    countries: jest.fn(),
    macro: jest.fn(),
  })),
}));

jest.mock('../../../src/modules/market-context-intelligence/market-pulse-snapshot.service', () => ({
  MarketPulseSnapshotService: jest.fn().mockImplementation(() => ({
    latestSnapshot: mockLatestMarketPulse,
    snapshotHistory: mockMarketPulseHistory,
    refreshSnapshot: mockRefreshMarketPulse,
  })),
}));

jest.mock('../../../src/modules/earnings-intelligence/earnings-intelligence.service', () => ({
  EarningsIntelligenceService: jest.fn().mockImplementation(() => ({
    latest: mockLatestEarnings,
    refreshSnapshots: mockRefreshEarnings,
  })),
}));

jest.mock('../../../src/modules/market-intelligence/stock-interest-snapshot.service', () => ({
  StockInterestSnapshotService: jest.fn().mockImplementation(() => ({
    latestSnapshot: mockLatestStockInterest,
    refreshSnapshots: mockRefreshStockInterest,
  })),
}));

async function withAppServer(assertions: (baseUrl: string) => Promise<void>) {
  const { createApp } = require('../../../src/app') as typeof import('../../../src/app');
  const app = createApp();
  const server = await new Promise<Server>((resolve) => {
    const started = app.listen(0, '127.0.0.1', () => resolve(started));
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test server did not bind to a TCP port.');
  try {
    await assertions(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
}

async function getJson(baseUrl: string, path: string): Promise<{ status: number; body: Record<string, any> }> {
  const response = await fetch(`${baseUrl}${path}`);
  return {
    status: response.status,
    body: await response.json() as Record<string, any>,
  };
}

describe('mounted Market Intelligence read routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLatestSectorIntelligenceSnapshot.mockResolvedValue({
      status: 'ready',
      scope: { region: 'IN', assetType: 'STOCK' },
      snapshotDate: '2026-06-01',
      dataThroughDate: '2026-06-01',
      generatedAt: '2026-06-01T06:00:00.000Z',
      materialized: true,
      warnings: [],
      sectors: [],
    });
    mockLatestMarketPulse.mockResolvedValue({
      availability: 'READY',
      scope: { region: 'IN', assetType: 'STOCK', timeframe: '1d' },
      snapshot: { status: 'FRESH', marketHealthScore: 60 },
      message: 'Persisted Market Pulse snapshot loaded.',
      warnings: [],
    });
    mockMarketPulseHistory.mockResolvedValue({
      availability: 'READY',
      scope: { region: 'IN', assetType: 'STOCK', timeframe: '1d' },
      snapshots: [],
      message: 'Persisted Market Pulse history loaded.',
      warnings: [],
    });
    mockLatestEarnings.mockResolvedValue({
      scope: { region: 'IN', assetType: 'STOCK' },
      snapshotDate: '2026-06-01',
      dataThroughDate: '2026-06-01',
      generatedAt: '2026-06-01T06:00:00.000Z',
      freshness: 'FRESH',
      categories: {},
      items: [],
      warnings: [],
    });
    mockLatestStockInterest.mockResolvedValue({
      availability: 'READY',
      scope: { region: 'IN', assetType: 'STOCK' },
      snapshot: [],
      message: 'Persisted Stock Interest snapshot rows loaded.',
      warnings: [],
    });
  });

  it('exposes all read-only Market Intelligence snapshot routes through the real mounted app without authentication', async () => {
    await withAppServer(async (baseUrl) => {
      const paths = [
        '/api/v1/market-intelligence/sectors?region=IN&assetType=STOCK',
        '/api/v1/market-intelligence/market-pulse?region=IN&assetType=STOCK&timeframe=1d',
        '/api/v1/market-intelligence/market-pulse/history?region=IN&assetType=STOCK&timeframe=1d',
        '/api/v1/market-intelligence/earnings?region=IN&assetType=STOCK',
        '/api/v1/market-intelligence/stock-interest?region=IN&assetType=STOCK',
      ];

      const responses = await Promise.all(paths.map((path) => getJson(baseUrl, path)));

      expect(responses.map((response) => response.status)).toEqual([200, 200, 200, 200, 200]);
      expect(responses[0].body.status).toBe('ready');
      expect(responses[1].body.availability).toBe('READY');
      expect(responses[2].body.availability).toBe('READY');
      expect(responses[4].body.availability).toBe('READY');
    });
  });

  it('does not run refresh or mutation services from Market Intelligence GET routes', async () => {
    await withAppServer(async (baseUrl) => {
      await getJson(baseUrl, '/api/v1/market-intelligence/sectors?region=IN&assetType=STOCK');
      await getJson(baseUrl, '/api/v1/market-intelligence/market-pulse?region=IN&assetType=STOCK&timeframe=1d');
      await getJson(baseUrl, '/api/v1/market-intelligence/market-pulse/history?region=IN&assetType=STOCK&timeframe=1d');
      await getJson(baseUrl, '/api/v1/market-intelligence/earnings?region=IN&assetType=STOCK');
      await getJson(baseUrl, '/api/v1/market-intelligence/stock-interest?region=IN&assetType=STOCK');

      expect(mockRefreshSectorSnapshots).not.toHaveBeenCalled();
      expect(mockRefreshMarketPulse).not.toHaveBeenCalled();
      expect(mockRefreshEarnings).not.toHaveBeenCalled();
      expect(mockRefreshStockInterest).not.toHaveBeenCalled();
    });
  });
});
