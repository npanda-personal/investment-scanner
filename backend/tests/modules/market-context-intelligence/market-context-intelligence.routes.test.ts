/// <reference types="@types/jest" />
import {
  createMarketContextIntelligenceRouter,
  createMarketIntelligenceContextReadRouter,
} from '../../../src/modules/market-context-intelligence';

describe('market context routes', () => {
  it('registers MVP endpoints', () => {
    const router = createMarketContextIntelligenceRouter({
      summary: jest.fn(),
      persistedSummary: jest.fn(),
      persistedBreadth: jest.fn(),
      capitalPosture: jest.fn(),
      marketPulse: jest.fn(),
      marketPulseHistory: jest.fn(),
      sectorSnapshots: jest.fn(),
      regime: jest.fn(),
      sectors: jest.fn(),
      breadth: jest.fn(),
      countries: jest.fn(),
      macro: jest.fn(),
      run: jest.fn(),
      fiiDiiActivity: jest.fn(),
      fiiDiiIngest: jest.fn(),
    } as any);
    const routes = router.stack.filter((layer: any) => layer.route).map((layer: any) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);

    expect(routes).toEqual([
      'GET /market-context/summary',
      'GET /market-context/persisted-summary',
      'GET /market-context/persisted-breadth',
      'GET /market-context/capital-posture',
      'GET /market-intelligence/market-pulse',
      'GET /market-intelligence/market-pulse/history',
      'GET /market-intelligence/sectors',
      'GET /market-context/regime',
      'GET /market-context/sectors',
      'GET /market-context/breadth',
      'GET /market-context/countries',
      'GET /market-context/macro',
      'POST /market-context/run',
      'GET /market-context/fii-dii',
      'POST /market-context/fii-dii/ingest',
    ]);
  });

  it('registers a read-only Market Intelligence context router for early unauthenticated snapshot mounts', () => {
    const router = createMarketIntelligenceContextReadRouter({
      marketPulse: jest.fn(),
      marketPulseHistory: jest.fn(),
      sectorSnapshots: jest.fn(),
    } as any);
    const routes = router.stack.filter((layer: any) => layer.route).map((layer: any) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);

    expect(router.stack.filter((layer: any) => !layer.route)).toHaveLength(0);
    expect(routes).toEqual([
      'GET /market-intelligence/market-pulse',
      'GET /market-intelligence/market-pulse/history',
      'GET /market-intelligence/sectors',
    ]);
  });
});
