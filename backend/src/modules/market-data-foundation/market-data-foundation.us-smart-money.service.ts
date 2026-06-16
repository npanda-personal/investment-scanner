/**
 * US "smart money" read service — persisted-read composition over the SEC
 * Form 4 (insider) + 13F (institutional) landing tables.
 *
 * Composes the three persisted-read repository getters into a single
 * trader-facing panel payload (so the frontend makes one call), and enriches
 * the 13F holding with a human period label ("Mar–May 2026") derived from the
 * sortable period key. NEVER ingests or fetches from SEC — read-only.
 *
 * Research-support only: observed regulatory-filing data, not advice.
 */

import {
  getInsiderTradesForSymbol,
  getLatestInstitutionalHolding,
  getUsSmartMoneySummary,
  type UsInsiderTrade,
  type UsInstitutionalHolding,
  type UsSmartMoneySummary,
} from './ingestion/us/market-data-foundation.us-institutional.repository';
import { parse13fPeriod } from './ingestion/us/market-data-foundation.sec-13f.periods';

export interface UsInstitutionalHoldingView extends UsInstitutionalHolding {
  /** Human-readable 13F filing window, e.g. "Mar–May 2026". */
  periodLabel: string;
}

export interface UsSmartMoneyPanel {
  symbol: string;
  summary: UsSmartMoneySummary;
  /** Recent insider (Form 4) transactions, newest first. */
  insiderTrades: UsInsiderTrade[];
  /** Latest 13F institutional aggregate (the largest CUSIP line for the symbol), or null. */
  institutional: UsInstitutionalHoldingView | null;
  /** False when neither filing source has data for this symbol (drives the empty state). */
  hasData: boolean;
}

export class UsSmartMoneyService {
  async getPanel(symbol: string, insiderLimit = 50): Promise<UsSmartMoneyPanel> {
    const sym = symbol.trim().toUpperCase();
    const [summary, insiderTrades, holding] = await Promise.all([
      getUsSmartMoneySummary(sym),
      getInsiderTradesForSymbol(sym, insiderLimit),
      getLatestInstitutionalHolding(sym),
    ]);
    const institutional: UsInstitutionalHoldingView | null = holding
      ? { ...holding, periodLabel: parse13fPeriod(holding.quarter)?.label ?? holding.quarter }
      : null;
    return {
      symbol: sym,
      summary,
      insiderTrades,
      institutional,
      hasData: insiderTrades.length > 0 || institutional !== null,
    };
  }
}

export const usSmartMoneyService = new UsSmartMoneyService();
