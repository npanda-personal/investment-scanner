import type { Request, Response } from 'express';
import { SignalCalibrationEngineService } from './signal-calibration-engine.service';
import { parseCalibrationQuery, parseCalibrationRunRequest, requireInstrumentId } from './signal-calibration-engine.validation';

export class SignalCalibrationEngineController {
  constructor(private readonly service = new SignalCalibrationEngineService()) {}

  latestForInstrument = async (req: Request, res: Response) => {
    try {
      const result = await this.service.latestForInstrument(requireInstrumentId(req.params.instrumentId));
      if (!result) return res.status(404).json({ error: 'Signal calibration not available' });
      return res.json(result);
    } catch (error) { return this.error(res, error, 'Failed to load calibrated signal', 400); }
  };

  run = async (req: Request, res: Response) => {
    try { return res.status(201).json(await this.service.run(parseCalibrationRunRequest(req.body || {}))); }
    catch (error) { return this.error(res, error, 'Failed to run signal calibration', 400); }
  };

  top = async (req: Request, res: Response) => {
    try { return res.json(await this.service.top(parseCalibrationQuery(req.query))); }
    catch (error) { return this.error(res, error, 'Failed to load top calibrated signals'); }
  };

  compare = async (req: Request, res: Response) => {
    try {
      const region = typeof req.query.region === 'string' ? req.query.region : undefined;
      const assetType = typeof req.query.assetType === 'string' ? req.query.assetType : undefined;
      const horizon = typeof req.query.horizon === 'string' ? req.query.horizon : undefined;
      const result = await this.service.compare(requireInstrumentId(req.params.instrumentId), region, assetType, horizon);
      if (!result) return res.status(404).json({ error: 'Signal comparison not available' });
      return res.json(result);
    } catch (error) { return this.error(res, error, 'Failed to compare raw and calibrated signals', 400); }
  };

  model = async (_req: Request, res: Response) => res.json(this.service.model());

  health = async (_req: Request, res: Response) => {
    try { return res.json(await this.service.health()); }
    catch (error) { return this.error(res, error, 'Failed to load calibration health'); }
  };

  private error(res: Response, error: unknown, fallback: string, status = 500) {
    const message = error instanceof Error ? error.message : fallback;
    console.error(fallback, error);
    return res.status(status).json({ error: message });
  }
}
