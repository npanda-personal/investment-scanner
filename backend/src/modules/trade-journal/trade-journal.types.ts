// Research-support module. Records the human's own trade decisions and realized outcomes so the
// question "has MY process worked?" is answerable from persisted history — not from signal backtests.
// This module DOES NOT issue buy/sell recommendations.

export type TradeDirection = 'LONG' | 'SHORT';
export type TradeDecision = 'ACTED' | 'SKIPPED' | 'WATCHING';
export type OutcomeStatus = 'OPEN' | 'CLOSED' | 'INVALIDATED';

export interface TradeJournalEntryDto {
  id: string;
  userId: string;
  instrumentId: string | null;
  symbol: string;
  sourceSignalId: string | null;
  direction: TradeDirection;
  decision: TradeDecision;
  reviewedAt: string;
  entryPrice: number | null;
  stopPrice: number | null;
  targetPrice: number | null;
  thesis: string | null;
  conviction: number | null;
  outcomeStatus: OutcomeStatus | null;
  exitPrice: number | null;
  exitAt: string | null;
  realizedReturnPct: number | null;
  notes: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTradeJournalEntryRequest {
  instrumentId?: string | null;
  symbol: string;
  sourceSignalId?: string | null;
  direction: TradeDirection;
  decision: TradeDecision;
  reviewedAt: string;
  entryPrice?: number | null;
  stopPrice?: number | null;
  targetPrice?: number | null;
  thesis?: string | null;
  conviction?: number | null;
  outcomeStatus?: OutcomeStatus | null;
  exitPrice?: number | null;
  exitAt?: string | null;
  notes?: string | null;
  tags?: string[];
}

export interface UpdateTradeJournalEntryRequest {
  symbol?: string;
  direction?: TradeDirection;
  decision?: TradeDecision;
  reviewedAt?: string;
  entryPrice?: number | null;
  stopPrice?: number | null;
  targetPrice?: number | null;
  thesis?: string | null;
  conviction?: number | null;
  outcomeStatus?: OutcomeStatus | null;
  exitPrice?: number | null;
  exitAt?: string | null;
  notes?: string | null;
  tags?: string[];
}

export type TradeJournalSortField =
  | 'reviewedAt'
  | 'symbol'
  | 'direction'
  | 'decision'
  | 'entryPrice'
  | 'conviction'
  | 'outcomeStatus'
  | 'realizedReturnPct';

export interface TradeJournalListFilters {
  decision?: TradeDecision;
  outcomeStatus?: OutcomeStatus;
  symbol?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
  sortBy?: TradeJournalSortField;
  sortDirection?: 'asc' | 'desc';
}

export interface TradeJournalListResult {
  entries: TradeJournalEntryDto[];
  total: number;
  page: number;
  pageSize: number;
  source: string;
  generatedAt: string;
}

// Post-mortem: all metrics computed from persisted journal rows only.
// No on-GET recomputation of signal logic.
export interface PostMortemDecisionBreakdown {
  decision: TradeDecision;
  count: number;
}

export interface PostMortemOutcomeBreakdown {
  outcomeStatus: OutcomeStatus | 'NONE';
  count: number;
}

export interface PostMortemDto {
  // Sample-size-labelled counts
  totalEntries: number;
  byDecision: PostMortemDecisionBreakdown[];
  byOutcome: PostMortemOutcomeBreakdown[];

  // Acted entries (decision = ACTED) with closed outcome
  actedClosedCount: number;
  actedWinCount: number; // realizedReturnPct > 0
  actedWinRate: number | null; // actedWinCount / actedClosedCount; null if sample < 1
  actedAvgReturnPct: number | null; // avg of realizedReturnPct for ACTED+CLOSED; null if sample < 1

  // Missed/avoided reflection: SKIPPED or WATCHING entries that have a sourceSignalId
  // The "what would have happened" awareness note — directionally informative only.
  missedAvoidedCount: number;
  missedAvoidedNote: string;

  source: string;
  generatedAt: string;
  dataNote: string; // always surfaced — labels sample sizes and research-support intent
}
