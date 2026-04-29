/// <reference types="@types/jest" />
import { createSignalCalibrationEngineRouter } from '../../../src/modules/signal-calibration-engine';

describe('signal calibration engine routes', () => {
  it('registers MVP endpoints', () => {
    const router = createSignalCalibrationEngineRouter({
      health: jest.fn(),
      model: jest.fn(),
      top: jest.fn(),
      run: jest.fn(),
      compare: jest.fn(),
      latestForInstrument: jest.fn(),
    } as any);
    const routes = router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);
    expect(routes).toEqual([
      'GET /signals/calibration/health',
      'GET /signals/calibration/model',
      'GET /signals/calibration/top',
      'POST /signals/calibration/run',
      'GET /signals/calibration/compare/:instrumentId',
      'GET /signals/calibration/:instrumentId',
    ]);
  });
});
