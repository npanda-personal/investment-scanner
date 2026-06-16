/**
 * US "smart money" HTTP controller — persisted-read SEC Form 4 + 13F panel.
 *
 * Thin HTTP layer over UsSmartMoneyService; one endpoint returns the combined
 * insider + institutional panel for a symbol. Symbol-keyed and region-agnostic:
 * non-US symbols simply have no rows (empty panel, hasData=false) — the UI gates
 * visibility on the US `hasSecSmartMoney` capability.
 */

import { Request, Response } from 'express';
import { UsSmartMoneyService } from './market-data-foundation.us-smart-money.service';

const MAX_INSIDER_ROWS = 200;

function parseInsiderLimit(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 50;
  return Math.min(Math.floor(n), MAX_INSIDER_ROWS);
}

export class MarketDataFoundationUsSmartMoneyController {
  constructor(private readonly service = new UsSmartMoneyService()) {}

  getPanel = async (req: Request, res: Response) => {
    try {
      const symbol = String(req.params.symbol || '').trim();
      if (!symbol) return res.status(400).json({ error: 'symbol is required' });
      const panel = await this.service.getPanel(symbol, parseInsiderLimit(req.query.limit));
      return res.json(panel);
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Failed to load US smart-money panel' });
    }
  };
}
