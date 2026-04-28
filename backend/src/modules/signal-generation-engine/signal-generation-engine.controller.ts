import type { Request, Response } from 'express';
import { SignalGenerationEngineService } from './signal-generation-engine.service';
import { parseRunRequest, parseSignalQuery, validateInstrumentId } from './signal-generation-engine.validation';

export class SignalGenerationEngineController {
  constructor(private readonly service = new SignalGenerationEngineService()) {}

  top = async (req: Request, res: Response) => {
    try {
      return res.json({ signals: await this.service.topSignals(parseSignalQuery(req.query)) });
    } catch (error) {
      console.error('Signal top endpoint error:', error);
      return res.status(500).json({ error: 'Failed to load top signals' });
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

