import type { Request, Response } from 'express';
import { SignalPositionLedgerService } from './signal-position-ledger.service';
import { parseSignalPositionLedgerActiveQuery } from './signal-position-ledger.validation';

export class SignalPositionLedgerController {
  constructor(private readonly service = new SignalPositionLedgerService()) {}

  activeRows = async (req: Request, res: Response) => {
    try {
      return res.json(await this.service.listActiveRows(parseSignalPositionLedgerActiveQuery(req.query)));
    } catch (error) {
      return this.error(res, error, 'Failed to load signal position ledger active rows', 400);
    }
  };

  closedRows = async (req: Request, res: Response) => {
    try {
      return res.json(await this.service.listClosedRows(parseSignalPositionLedgerActiveQuery(req.query)));
    } catch (error) {
      return this.error(res, error, 'Failed to load signal position ledger closed rows', 400);
    }
  };

  refreshActiveRows = async (req: Request, res: Response) => {
    try {
      return res.json(await this.service.refreshActiveRows(parseSignalPositionLedgerActiveQuery({ ...req.query, ...req.body }), { force: true }));
    } catch (error) {
      return this.error(res, error, 'Failed to refresh signal position ledger active rows', 400);
    }
  };

  health = async (_req: Request, res: Response) => {
    try {
      return res.json(await this.service.health());
    } catch (error) {
      return this.error(res, error, 'Failed to load signal position ledger health');
    }
  };

  private error(res: Response, error: unknown, fallback: string, status = 500) {
    const message = error instanceof Error ? error.message : fallback;
    return res.status(status).json({ error: message });
  }
}

