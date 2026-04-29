/// <reference types="@types/jest" />
import { createDataQualityEngineRouter } from '../../../src/modules/data-quality-engine';

describe('data quality engine routes', () => {
  it('registers MVP endpoints', () => {
    const router = createDataQualityEngineRouter({
      summary: jest.fn(),
      instruments: jest.fn(),
      instrument: jest.fn(),
      evaluate: jest.fn(),
      signalReadiness: jest.fn(),
      liquidity: jest.fn(),
    } as any);
    const routes = router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);
    expect(routes).toEqual([
      'GET /data-quality/summary',
      'GET /data-quality/instruments',
      'GET /data-quality/signal-readiness',
      'GET /data-quality/liquidity',
      'GET /data-quality/instruments/:instrumentId',
      'POST /data-quality/evaluate',
    ]);
  });
});
