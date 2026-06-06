/**
 * Index Constituents types (NR-103).
 *
 * Supported indices: NIFTY_50, NIFTY_BANK.
 * Membership source: curated static lists hardcoded from NSE official data.
 * No weight data — omitted (not reliably free/persisted).
 */

export type SupportedIndex = 'NIFTY_50' | 'NIFTY_BANK';

export interface IndexConstituentRow {
  instrumentId: string | null; // null when symbol not found in catalog
  symbol: string;
  companyName: string | null;
  sector: string | null;
  marketCap: number | null;
  latestPrice: number | null;
  latestPriceTimestamp: string | null;
  change1D: number | null; // % change today (most recent close vs prior close)
  signalDirection: string | null;
  signalScore: number | null;
}

export interface IndexBreadthSummary {
  total: number;
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  noSignalCount: number;
  /** e.g. "32 of 50 members bullish" */
  headline: string;
}

export type IndexConstituentsAvailability = 'READY' | 'PARTIAL' | 'EMPTY' | 'INVALID_PARAMS' | 'ERROR';

export interface IndexConstituentsEnvelope {
  availability: IndexConstituentsAvailability;
  index: SupportedIndex | string;
  indexLabel: string;
  membershipSource: 'CURATED_STATIC';
  membershipAsOf: string; // e.g. "2026-01"
  constituents: IndexConstituentRow[];
  count: number;
  breadth: IndexBreadthSummary;
  message: string;
  warnings: string[];
}
