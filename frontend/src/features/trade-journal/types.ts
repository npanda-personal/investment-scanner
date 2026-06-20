export type TradeDirection = 'LONG' | 'SHORT';
export type TradeDecision = 'ACTED' | 'SKIPPED' | 'WATCHING';
export type OutcomeStatus = 'OPEN' | 'CLOSED' | 'INVALIDATED';

export interface TradeJournalEntry {
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

export interface CreateTradeJournalInput {
  symbol: string;
  direction: TradeDirection;
  decision: TradeDecision;
  reviewedAt: string;
  instrumentId?: string | null;
  sourceSignalId?: string | null;
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

export interface UpdateTradeJournalInput {
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

export interface TradeJournalListFilters {
  decision?: TradeDecision;
  outcomeStatus?: OutcomeStatus;
  symbol?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

export interface TradeJournalListResult {
  entries: TradeJournalEntry[];
  total: number;
  page: number;
  pageSize: number;
  source: string;
  generatedAt: string;
}

export interface PostMortemDecisionBreakdown {
  decision: TradeDecision;
  count: number;
}

export interface PostMortemOutcomeBreakdown {
  outcomeStatus: OutcomeStatus | 'NONE';
  count: number;
}

export interface PostMortemSummaryData {
  totalEntries: number;
  byDecision: PostMortemDecisionBreakdown[];
  byOutcome: PostMortemOutcomeBreakdown[];
  actedClosedCount: number;
  actedWinCount: number;
  actedWinRate: number | null;
  actedAvgReturnPct: number | null;
  missedAvoidedCount: number;
  missedAvoidedNote: string;
  source: string;
  generatedAt: string;
  dataNote: string;
}
