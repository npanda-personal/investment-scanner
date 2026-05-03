/// <reference types="@types/jest" />
import { createSignalQualityLabRouter } from '../../../src/modules/signal-quality-lab';

describe('signal quality lab routes', () => {
  it('registers MVP endpoints', () => {
    const router = createSignalQualityLabRouter({
      dashboard: jest.fn(),
      summary: jest.fn(),
      byType: jest.fn(),
      bySector: jest.fn(),
      byScoreBucket: jest.fn(),
      byRegime: jest.fn(),
      byDataQuality: jest.fn(),
      noisy: jest.fn(),
      history: jest.fn(),
      outcomes: jest.fn(),
      recalculate: jest.fn(),
    } as any);
    const routes = router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);
    expect(routes).toEqual([
      'GET /signals/quality/dashboard',
      'GET /signals/quality/summary',
      'GET /signals/quality/by-type',
      'GET /signals/quality/by-sector',
      'GET /signals/quality/by-score',
      'GET /signals/quality/by-regime',
      'GET /signals/quality/by-data-quality',
      'GET /signals/quality/noisy',
      'GET /signals/:instrumentId/history',
      'GET /signals/:instrumentId/outcomes',
      'POST /signals/quality/recalculate',
    ]);
  });
});
