/**
 * US "smart money" API client — persisted-read SEC Form 4 (insider) + 13F
 * (institutional) panel for a symbol. Backend: market-data-foundation module.
 *
 * Research-support only: observed regulatory-filing data, not advice.
 */

import axios from 'axios';

const API_BASE = '/api';

export interface UsInsiderTrade {
  symbol: string;
  insiderName: string;
  insiderTitle: string | null;
  /** SEC transaction code; P = open-market purchase, S = open-market sale. */
  transactionCode: string;
  transactionDate: string;
  shares: number | null;
  pricePerShare: number | null;
  value: number | null;
  accession: string | null;
  source: string;
}

export interface UsTopHolder {
  manager: string;
  value: number;
}

export interface UsInstitutionalHolding {
  symbol: string | null;
  cusip: string;
  quarter: string;
  periodLabel: string;
  totalValue: number;
  totalShares: number;
  holderCount: number;
  topHolders: UsTopHolder[];
  source: string;
}

export interface UsSmartMoneySummary {
  symbol: string;
  netInsiderBuys: number;
  netInsiderSells: number;
  lastInsiderDate: string | null;
  institutionalHolderCount: number | null;
  institutionalValue: number | null;
  source: string;
  explanation: string;
}

export interface UsShortPressure {
  symbol: string;
  /** Latest session's short-sale volume share (%), or null when total volume was 0. */
  shortVolumePct: number | null;
  /** ISO date (YYYY-MM-DD) of the latest session. */
  tradingDate: string;
  /** Trailing up-to-5-session average short volume % (nulls skipped). */
  avg5dPct: number | null;
  /** Number of sessions backing the 5-day average. */
  sessionsInAvg: number;
  source: string;
}

export interface UsSmartMoneyPanel {
  symbol: string;
  summary: UsSmartMoneySummary;
  insiderTrades: UsInsiderTrade[];
  institutional: UsInstitutionalHolding | null;
  /**
   * Latest FINRA Reg SHO daily short-sale volume share (a short-pressure proxy,
   * NOT short interest), or null when none persisted. Research support only.
   */
  shortPressure: UsShortPressure | null;
  hasData: boolean;
}

export async function fetchUsSmartMoneyPanel(
  symbol: string,
  limit = 25,
): Promise<UsSmartMoneyPanel> {
  const response = await axios.get<UsSmartMoneyPanel>(
    `${API_BASE}/v1/market-data/us-smart-money/${encodeURIComponent(symbol)}`,
    { params: { limit } },
  );
  return response.data;
}
