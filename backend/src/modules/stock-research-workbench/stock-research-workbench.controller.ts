import type { Request, Response } from 'express';
import { StockResearchWorkbenchService } from './stock-research-workbench.service';
import { normalizeResearchRange, validateInstrumentId } from './stock-research-workbench.validation';

export class StockResearchWorkbenchController {
  constructor(private readonly service = new StockResearchWorkbenchService()) {}

  private instrumentId(req: Request) {
    return Array.isArray(req.params.instrumentId) ? req.params.instrumentId[0] : req.params.instrumentId;
  }

  workbench = async (req: Request, res: Response) => {
    const instrumentId = this.instrumentId(req);
    const validationError = validateInstrumentId(instrumentId);
    if (validationError) return res.status(400).json({ error: validationError });

    try {
      const result = await this.service.workbench(instrumentId, normalizeResearchRange(req.query.range));
      if (!result) return res.status(404).json({ error: 'Instrument not found' });
      return res.json(result);
    } catch (error) {
      console.error('Stock research workbench error:', error);
      return res.status(500).json({ error: 'Failed to load stock research workbench' });
    }
  };

  overview = async (req: Request, res: Response) => {
    try {
      const result = await this.service.overview(this.instrumentId(req));
      if (!result) return res.status(404).json({ error: 'Instrument not found' });
      return res.json(result);
    } catch (error) {
      console.error('Stock research overview error:', error);
      return res.status(500).json({ error: 'Failed to load stock overview' });
    }
  };

  performance = async (req: Request, res: Response) => {
    try {
      const result = await this.service.performance(this.instrumentId(req), normalizeResearchRange(req.query.range));
      if (!result) return res.status(404).json({ error: 'Instrument not found' });
      return res.json(result);
    } catch (error) {
      console.error('Stock research performance error:', error);
      return res.status(500).json({ error: 'Failed to load stock performance' });
    }
  };

  peers = async (req: Request, res: Response) => {
    try {
      const result = await this.service.peers(this.instrumentId(req));
      if (!result) return res.status(404).json({ error: 'Instrument not found' });
      return res.json({ peers: result });
    } catch (error) {
      console.error('Stock research peers error:', error);
      return res.status(500).json({ error: 'Failed to load stock peers' });
    }
  };

  relativeStrength = async (req: Request, res: Response) => {
    try {
      const result = await this.service.relativeStrength(this.instrumentId(req), normalizeResearchRange(req.query.range));
      if (!result) return res.status(404).json({ error: 'Instrument not found' });
      return res.json(result);
    } catch (error) {
      console.error('Stock research relative strength error:', error);
      return res.status(500).json({ error: 'Failed to load relative strength' });
    }
  };
}
