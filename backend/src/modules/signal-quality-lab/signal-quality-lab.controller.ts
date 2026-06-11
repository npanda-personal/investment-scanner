import type { Request, Response } from 'express';
import { SignalQualityLabService } from './signal-quality-lab.service';
import { parseQualityQuery, parseQualityRecalculateRequest, parseScorecardQuery, requireInstrumentId } from './signal-quality-lab.validation';

export class SignalQualityLabController {
  constructor(private readonly service = new SignalQualityLabService()) {}

  dashboard = async (req: Request, res: Response) => {
    try { return res.json(await this.service.dashboard(parseQualityQuery(req.query))); }
    catch (error) { return this.error(res, error, 'Failed to load signal quality dashboard'); }
  };

  summary = async (req: Request, res: Response) => {
    try { return res.json(await this.service.summary(parseQualityQuery(req.query))); }
    catch (error) { return this.error(res, error, 'Failed to load signal quality summary'); }
  };

  byType = async (req: Request, res: Response) => {
    try { const query = parseQualityQuery(req.query); const [items, summary] = await Promise.all([this.service.byType(query), this.service.summary(query)]); return res.json({ items, selectedHorizon: summary.selectedHorizon, evidenceUsability: summary.evidenceUsability, evaluationDiagnostics: summary.evaluationDiagnostics, horizonAvailability: summary.horizonAvailability, dataStatus: summary.dataStatus, recommendedAction: summary.recommendedAction }); }
    catch (error) { return this.error(res, error, 'Failed to load signal type quality'); }
  };

  bySector = async (req: Request, res: Response) => {
    try { const query = parseQualityQuery(req.query); const [items, summary] = await Promise.all([this.service.bySector(query), this.service.summary(query)]); return res.json({ items, selectedHorizon: summary.selectedHorizon, evidenceUsability: summary.evidenceUsability, evaluationDiagnostics: summary.evaluationDiagnostics, horizonAvailability: summary.horizonAvailability, dataStatus: summary.dataStatus, recommendedAction: summary.recommendedAction }); }
    catch (error) { return this.error(res, error, 'Failed to load sector signal quality'); }
  };

  byScoreBucket = async (req: Request, res: Response) => {
    try { const query = parseQualityQuery(req.query); const [items, summary] = await Promise.all([this.service.byScoreBucket(query), this.service.summary(query)]); return res.json({ items, selectedHorizon: summary.selectedHorizon, evidenceUsability: summary.evidenceUsability, evaluationDiagnostics: summary.evaluationDiagnostics, horizonAvailability: summary.horizonAvailability, dataStatus: summary.dataStatus, recommendedAction: summary.recommendedAction }); }
    catch (error) { return this.error(res, error, 'Failed to load score bucket signal quality'); }
  };

  byRegime = async (req: Request, res: Response) => {
    try { const query = parseQualityQuery(req.query); const [items, summary] = await Promise.all([this.service.byRegime(query), this.service.summary(query)]); return res.json({ items, selectedHorizon: summary.selectedHorizon, evidenceUsability: summary.evidenceUsability, evaluationDiagnostics: summary.evaluationDiagnostics, horizonAvailability: summary.horizonAvailability, dataStatus: summary.dataStatus, recommendedAction: summary.recommendedAction }); }
    catch (error) { return this.error(res, error, 'Failed to load regime signal quality'); }
  };

  byDataQuality = async (req: Request, res: Response) => {
    try { const query = parseQualityQuery(req.query); const [items, summary] = await Promise.all([this.service.byDataQuality(query), this.service.summary(query)]); return res.json({ items, selectedHorizon: summary.selectedHorizon, evidenceUsability: summary.evidenceUsability, evaluationDiagnostics: summary.evaluationDiagnostics, horizonAvailability: summary.horizonAvailability, dataStatus: summary.dataStatus, recommendedAction: summary.recommendedAction }); }
    catch (error) { return this.error(res, error, 'Failed to load data-quality signal quality'); }
  };

  noisy = async (req: Request, res: Response) => {
    try { const query = parseQualityQuery(req.query); const [items, summary] = await Promise.all([this.service.noisy(query), this.service.summary(query)]); return res.json({ items, selectedHorizon: summary.selectedHorizon, evidenceUsability: summary.evidenceUsability, evaluationDiagnostics: summary.evaluationDiagnostics, horizonAvailability: summary.horizonAvailability, dataStatus: summary.dataStatus, recommendedAction: summary.recommendedAction }); }
    catch (error) { return this.error(res, error, 'Failed to load noisy signals'); }
  };

  history = async (req: Request, res: Response) => {
    try { return res.json({ items: await this.service.history(requireInstrumentId(req.params.instrumentId), parseQualityQuery(req.query)) }); }
    catch (error) { return this.error(res, error, 'Failed to load signal history', 400); }
  };

  outcomes = async (req: Request, res: Response) => {
    try {
      const instrumentId = requireInstrumentId(req.params.instrumentId);
      const query = parseQualityQuery(req.query);
      const [items, aggregate] = await Promise.all([
        this.service.outcomes(instrumentId, query),
        this.service.instrumentOutcomeAggregate(instrumentId, query.horizon),
      ]);
      return res.json({ items, aggregate });
    }
    catch (error) { return this.error(res, error, 'Failed to load signal outcomes', 400); }
  };

  recalculate = async (req: Request, res: Response) => {
    try { return res.json(await this.service.recalculate(parseQualityRecalculateRequest({ ...req.query, ...(req.body || {}) }))); }
    catch (error) { return this.error(res, error, 'Failed to recalculate signal outcomes', 400); }
  };

  scorecard = async (req: Request, res: Response) => {
    try { return res.json(await this.service.scorecard(parseScorecardQuery(req.query))); }
    catch (error) { return this.error(res, error, 'Failed to load signal scorecard'); }
  };

  private error(res: Response, error: unknown, fallback: string, status = 500) {
    const message = error instanceof Error ? error.message : fallback;
    console.error(fallback, error);
    return res.status(status).json({ error: message });
  }
}
