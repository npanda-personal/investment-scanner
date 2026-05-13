/// <reference types="@types/jest" />
import { SignalCalibrationEngineController, createSignalCalibrationEngineRouter } from '../../../src/modules/signal-calibration-engine';

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

  it('returns health calibration evidence through the health API handler', async () => {
    const payload = {
      status: 'ok',
      module: 'signal-calibration-engine',
      calibrationModelVersion: 'signal-calibration-v2',
      calibratedSignals: 0,
      latestGeneratedAt: null,
      dataStatus: 'MISSING',
      gaps: ['No calibrated signal results persisted yet.'],
      calibrationEvidence: {
        horizon: '20D',
        evidenceStatus: 'INSUFFICIENT',
        overallEvaluatedSamples: 0,
        groupEvaluatedSamples: 0,
        minimumOverallSamples: 50,
        minimumGroupSamples: 20,
        requiredOverallSamples: 50,
        requiredGroupSamples: 20,
        horizonAvailability: { '20D': { eligible: 0, evaluated: 0, insufficientFuturePrice: 0 } },
        dataStatus: 'MISSING',
        evidenceReasons: ['No calibrated signal results persisted yet.'],
        evidenceWarnings: ['No calibrated signal results persisted yet.'],
        warnings: ['No calibrated signal results persisted yet.'],
      },
      calibrationReadiness: {
        status: 'UNAVAILABLE',
        confidenceTier: 'INSUFFICIENT_SAMPLE',
        calibrationApplied: false,
        adjustmentCapApplied: 0,
        downstreamInfluence: 'NONE',
        authoritativeScore: 'NO_SCORE',
        reasons: ['No calibrated signal results persisted yet.'],
        blockers: ['No calibrated signal results persisted yet.'],
      },
    };
    const controller = new SignalCalibrationEngineController({ health: jest.fn().mockResolvedValue(payload) } as any);
    const json = jest.fn();

    await controller.health({} as any, { json } as any);

    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      calibrationEvidence: expect.objectContaining({
        horizon: '20D',
        evidenceStatus: 'INSUFFICIENT',
        overallEvaluatedSamples: 0,
        groupEvaluatedSamples: 0,
        requiredOverallSamples: 50,
        requiredGroupSamples: 20,
      }),
      calibrationReadiness: expect.objectContaining({
        status: 'UNAVAILABLE',
        downstreamInfluence: 'NONE',
      }),
    }));
  });
});
