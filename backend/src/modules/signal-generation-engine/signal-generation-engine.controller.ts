import type { Request, Response } from 'express';
import { SignalGenerationEngineService } from './signal-generation-engine.service';
import { parseRunRequest, parseSignalQuery, validateInstrumentId } from './signal-generation-engine.validation';

export class SignalGenerationEngineController {
  constructor(private readonly service = new SignalGenerationEngineService()) {}

  top = async (req: Request, res: Response) => {
    try {
      return res.json(await this.service.topSignals(parseSignalQuery(req.query)));
    } catch (error) {
      console.error('Signal top endpoint error:', error);
      return res.status(500).json({ error: 'Failed to load top signals' });
    }
  };

  /**
   * GET /signals/exit-candidates
   * Returns persisted signals whose lifecycleState is EXIT — instruments where
   * a previously-active signal has now weakened.  Useful for reviewing long
   * positions that may need attention.
   *
   * Supports all standard SignalQuery filters (region, sector, etc.).
   * lifecycleState is locked to EXIT; passing it as a query param has no effect.
   */
  exitCandidates = async (req: Request, res: Response) => {
    try {
      const query = parseSignalQuery(req.query);
      return res.json(await this.service.exitCandidates(query));
    } catch (error) {
      console.error('Signal exit-candidates endpoint error:', error);
      return res.status(500).json({ error: 'Failed to load exit candidates' });
    }
  };

  /**
   * GET /signals/lifecycle
   * Generic lifecycle-state–filtered signal list.  Pass ?lifecycleState=EXIT|ENTRY|ACTIVE|EXPIRED.
   */
  lifecycle = async (req: Request, res: Response) => {
    try {
      const query = parseSignalQuery(req.query);
      return res.json(await this.service.lifecycleSignals(query));
    } catch (error) {
      console.error('Signal lifecycle endpoint error:', error);
      return res.status(500).json({ error: 'Failed to load lifecycle signals' });
    }
  };

  latestForInstrument = async (req: Request, res: Response) => {
    const instrumentId = Array.isArray(req.params.instrumentId) ? req.params.instrumentId[0] : req.params.instrumentId;
    const validationError = validateInstrumentId(instrumentId);
    if (validationError) return res.status(400).json({ error: validationError });

    try {
      const result = await this.service.latestForInstrument(instrumentId);
      if (!result) return res.status(404).json({ error: 'Instrument not found or signal unavailable' });
      return res.json(result);
    } catch (error) {
      console.error('Signal instrument endpoint error:', error);
      return res.status(500).json({ error: 'Failed to load signal' });
    }
  };

  run = async (req: Request, res: Response) => {
    try {
      return res.json(await this.service.run(parseRunRequest(req.body)));
    } catch (error) {
      console.error('Signal run endpoint error:', error);
      return res.status(500).json({ error: 'Failed to run signal generation' });
    }
  };

  latestRun = async (req: Request, res: Response) => {
    try {
      return res.json(await this.service.latestRunAudit(parseSignalQuery(req.query)));
    } catch (error) {
      console.error('Signal latest run endpoint error:', error);
      return res.status(500).json({ error: 'Failed to load latest signal run audit' });
    }
  };

  screener = async (req: Request, res: Response) => {
    try {
      return res.json(await this.service.screener(parseSignalQuery(req.query)));
    } catch (error) {
      console.error('Signal screener endpoint error:', error);
      return res.status(500).json({ error: 'Failed to load signal screener' });
    }
  };

  health = async (_req: Request, res: Response) => {
    try {
      return res.json(await this.service.health());
    } catch (error) {
      console.error('Signal health endpoint error:', error);
      return res.status(500).json({ error: 'Failed to load signal health' });
    }
  };
}
