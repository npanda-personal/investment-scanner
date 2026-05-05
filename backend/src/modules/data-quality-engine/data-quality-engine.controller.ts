import type { Request, Response } from 'express';
import { DataQualityEngineService } from './data-quality-engine.service';
import { parseDataQualityEvaluateRequest, parseDataQualityQuery, requireInstrumentId } from './data-quality-engine.validation';

export class DataQualityEngineController {
  constructor(private readonly service = new DataQualityEngineService()) {}

  summary = async (req: Request, res: Response) => {
    try { return res.json(await this.service.summary(parseDataQualityQuery(req.query))); }
    catch (error) { return this.error(res, error, 'Failed to load data quality summary'); }
  };

  instruments = async (req: Request, res: Response) => {
    try { return res.json({ items: await this.service.list(parseDataQualityQuery(req.query)) }); }
    catch (error) { return this.error(res, error, 'Failed to list data quality evaluations'); }
  };

  instrument = async (req: Request, res: Response) => {
    try {
      const result = await this.service.diagnostics(requireInstrumentId(req.params.instrumentId));
      return result ? res.json(result) : res.status(404).json({ error: 'Instrument not found' });
    } catch (error) { return this.error(res, error, 'Failed to load data quality diagnostics'); }
  };

  evaluate = async (req: Request, res: Response) => {
    try { return res.status(202).json(await this.service.evaluate(parseDataQualityEvaluateRequest({ ...req.query, ...(req.body || {}) }))); }
    catch (error) { return this.error(res, error, 'Failed to evaluate data quality', 400); }
  };

  signalReadiness = async (req: Request, res: Response) => {
    try { return res.json({ items: await this.service.signalReadiness(parseDataQualityQuery(req.query)) }); }
    catch (error) { return this.error(res, error, 'Failed to load signal readiness'); }
  };

  liquidity = async (req: Request, res: Response) => {
    try { return res.json({ items: await this.service.liquidity(parseDataQualityQuery(req.query)) }); }
    catch (error) { return this.error(res, error, 'Failed to load liquidity evaluations'); }
  };

  private error(res: Response, error: unknown, fallback: string, status = 500) {
    const message = error instanceof Error ? error.message : fallback;
    return res.status(status).json({ error: message });
  }
}
