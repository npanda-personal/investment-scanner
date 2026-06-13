import type { Request, Response } from 'express';
import { DataQualityEngineService } from './data-quality-engine.service';
import { parseDataQualityEvaluateRequest, parseDataQualityQuery, requireInstrumentId } from './data-quality-engine.validation';

type RouteHandler = (req: Request, res: Response) => Promise<unknown>;

export class DataQualityEngineController {
  constructor(private readonly service = new DataQualityEngineService()) {}

  /**
   * Wrap a route handler with uniform error translation so each endpoint stays a
   * one-liner. Success status codes are set inside the handler; on a thrown
   * error we reply with the error message (or `fallback`) and `errorStatus`.
   */
  private asyncHandler(fn: RouteHandler, fallback: string, errorStatus = 500) {
    return async (req: Request, res: Response) => {
      try {
        await fn(req, res);
      } catch (error) {
        const message = error instanceof Error ? error.message : fallback;
        res.status(errorStatus).json({ error: message });
      }
    };
  }

  summary = this.asyncHandler(
    async (req, res) => res.json(await this.service.summary(parseDataQualityQuery(req.query))),
    'Failed to load data quality summary',
  );

  instruments = this.asyncHandler(
    async (req, res) => res.json(await this.service.list(parseDataQualityQuery(req.query))),
    'Failed to list data quality evaluations',
  );

  instrument = this.asyncHandler(async (req, res) => {
    const result = await this.service.diagnostics(requireInstrumentId(req.params.instrumentId));
    return result ? res.json(result) : res.status(404).json({ error: 'Instrument not found' });
  }, 'Failed to load data quality diagnostics');

  evaluate = this.asyncHandler(
    async (req, res) => res.status(202).json(await this.service.evaluate(parseDataQualityEvaluateRequest({ ...req.query, ...(req.body || {}) }))),
    'Failed to evaluate data quality',
    400,
  );

  signalReadiness = this.asyncHandler(
    async (req, res) => res.json(await this.service.signalReadiness(parseDataQualityQuery(req.query))),
    'Failed to load signal readiness',
  );

  liquidity = this.asyncHandler(
    async (req, res) => res.json(await this.service.liquidity(parseDataQualityQuery(req.query))),
    'Failed to load liquidity evaluations',
  );
}
