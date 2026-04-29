import type { Request, Response } from 'express';
import { SignalQualityLabService } from './signal-quality-lab.service';
import { parseQualityQuery, parseQualityRecalculateRequest, requireInstrumentId } from './signal-quality-lab.validation';

export class SignalQualityLabController {
  constructor(private readonly service = new SignalQualityLabService()) {}

  summary = async (req: Request, res: Response) => {
    try { return res.json(await this.service.summary(parseQualityQuery(req.query))); }
    catch (error) { return this.error(res, error, 'Failed to load signal quality summary'); }
  };

  byType = async (req: Request, res: Response) => {
    try { return res.json({ items: await this.service.byType(parseQualityQuery(req.query)) }); }
    catch (error) { return this.error(res, error, 'Failed to load signal type quality'); }
  };

  bySector = async (req: Request, res: Response) => {
    try { return res.json({ items: await this.service.bySector(parseQualityQuery(req.query)) }); }
    catch (error) { return this.error(res, error, 'Failed to load sector signal quality'); }
  };

  byScoreBucket = async (req: Request, res: Response) => {
    try { return res.json({ items: await this.service.byScoreBucket(parseQualityQuery(req.query)) }); }
    catch (error) { return this.error(res, error, 'Failed to load score bucket signal quality'); }
  };

  byRegime = async (req: Request, res: Response) => {
    try { return res.json({ items: await this.service.byRegime(parseQualityQuery(req.query)), dataStatus: 'MISSING' }); }
    catch (error) { return this.error(res, error, 'Failed to load regime signal quality'); }
  };

  noisy = async (req: Request, res: Response) => {
    try { return res.json({ items: await this.service.noisy(parseQualityQuery(req.query)) }); }
    catch (error) { return this.error(res, error, 'Failed to load noisy signals'); }
  };

  history = async (req: Request, res: Response) => {
    try { return res.json({ items: await this.service.history(requireInstrumentId(req.params.instrumentId), parseQualityQuery(req.query)) }); }
    catch (error) { return this.error(res, error, 'Failed to load signal history', 400); }
  };

  outcomes = async (req: Request, res: Response) => {
    try { return res.json({ items: await this.service.outcomes(requireInstrumentId(req.params.instrumentId), parseQualityQuery(req.query)) }); }
    catch (error) { return this.error(res, error, 'Failed to load signal outcomes', 400); }
  };

  recalculate = async (req: Request, res: Response) => {
    try { return res.json(await this.service.recalculate(parseQualityRecalculateRequest({ ...req.query, ...(req.body || {}) }))); }
    catch (error) { return this.error(res, error, 'Failed to recalculate signal outcomes', 400); }
  };

  private error(res: Response, error: unknown, fallback: string, status = 500) {
    const message = error instanceof Error ? error.message : fallback;
    console.error(fallback, error);
    return res.status(status).json({ error: message });
  }
}
