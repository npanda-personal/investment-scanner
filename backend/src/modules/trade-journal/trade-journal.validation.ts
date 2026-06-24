import type {
  CreateTradeJournalEntryRequest,
  TradeDecision,
  TradeDirection,
  OutcomeStatus,
  TradeJournalListFilters,
  TradeJournalSortField,
  UpdateTradeJournalEntryRequest,
} from './trade-journal.types';

const DIRECTIONS: TradeDirection[] = ['LONG', 'SHORT'];
const DECISIONS: TradeDecision[] = ['ACTED', 'SKIPPED', 'WATCHING'];
const OUTCOME_STATUSES: OutcomeStatus[] = ['OPEN', 'CLOSED', 'INVALIDATED'];
const SORT_FIELDS: TradeJournalSortField[] = [
  'reviewedAt',
  'symbol',
  'direction',
  'decision',
  'entryPrice',
  'conviction',
  'outcomeStatus',
  'realizedReturnPct',
];
const MAX_NOTES_LENGTH = 4000;
const MAX_THESIS_LENGTH = 4000;
const MAX_TAG_LENGTH = 40;
const MAX_TAGS = 20;
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 25;

export function validateCreateEntry(input: CreateTradeJournalEntryRequest): string[] {
  const errors: string[] = [];
  if (!input.symbol || input.symbol.trim().length === 0) errors.push('symbol is required');
  if (!input.direction || !DIRECTIONS.includes(input.direction)) errors.push(`direction must be one of: ${DIRECTIONS.join(', ')}`);
  if (!input.decision || !DECISIONS.includes(input.decision)) errors.push(`decision must be one of: ${DECISIONS.join(', ')}`);
  if (!input.reviewedAt || isNaN(Date.parse(input.reviewedAt))) errors.push('reviewedAt must be a valid ISO date string');
  if (input.conviction !== undefined && input.conviction !== null) {
    if (typeof input.conviction !== 'number' || input.conviction < 1 || input.conviction > 10) {
      errors.push('conviction must be a number between 1 and 10');
    }
  }
  if (input.outcomeStatus !== undefined && input.outcomeStatus !== null && !OUTCOME_STATUSES.includes(input.outcomeStatus)) {
    errors.push(`outcomeStatus must be one of: ${OUTCOME_STATUSES.join(', ')}`);
  }
  errors.push(...validatePriceFields(input));
  errors.push(...validateTextFields(input));
  errors.push(...validateTags(input.tags));
  return errors;
}

export function validateUpdateEntry(input: UpdateTradeJournalEntryRequest): string[] {
  const errors: string[] = [];
  if (input.symbol !== undefined && input.symbol.trim().length === 0) errors.push('symbol cannot be empty');
  if (input.direction !== undefined && !DIRECTIONS.includes(input.direction)) errors.push(`direction must be one of: ${DIRECTIONS.join(', ')}`);
  if (input.decision !== undefined && !DECISIONS.includes(input.decision)) errors.push(`decision must be one of: ${DECISIONS.join(', ')}`);
  if (input.reviewedAt !== undefined && isNaN(Date.parse(input.reviewedAt))) errors.push('reviewedAt must be a valid ISO date string');
  if (input.conviction !== undefined && input.conviction !== null) {
    if (typeof input.conviction !== 'number' || input.conviction < 1 || input.conviction > 10) {
      errors.push('conviction must be a number between 1 and 10');
    }
  }
  if (input.outcomeStatus !== undefined && input.outcomeStatus !== null && !OUTCOME_STATUSES.includes(input.outcomeStatus)) {
    errors.push(`outcomeStatus must be one of: ${OUTCOME_STATUSES.join(', ')}`);
  }
  if (input.exitAt !== undefined && input.exitAt !== null && isNaN(Date.parse(input.exitAt))) {
    errors.push('exitAt must be a valid ISO date string');
  }
  errors.push(...validatePriceFields(input));
  errors.push(...validateTextFields(input));
  errors.push(...validateTags(input.tags));
  return errors;
}

function validatePriceFields(input: Partial<CreateTradeJournalEntryRequest>): string[] {
  const errors: string[] = [];
  if (input.entryPrice !== undefined && input.entryPrice !== null && (typeof input.entryPrice !== 'number' || input.entryPrice < 0)) {
    errors.push('entryPrice must be a non-negative number');
  }
  if (input.stopPrice !== undefined && input.stopPrice !== null && (typeof input.stopPrice !== 'number' || input.stopPrice < 0)) {
    errors.push('stopPrice must be a non-negative number');
  }
  if (input.targetPrice !== undefined && input.targetPrice !== null && (typeof input.targetPrice !== 'number' || input.targetPrice < 0)) {
    errors.push('targetPrice must be a non-negative number');
  }
  if ('exitPrice' in input && input.exitPrice !== undefined && input.exitPrice !== null && (typeof input.exitPrice !== 'number' || input.exitPrice < 0)) {
    errors.push('exitPrice must be a non-negative number');
  }
  return errors;
}

function validateTextFields(input: Partial<CreateTradeJournalEntryRequest & UpdateTradeJournalEntryRequest>): string[] {
  const errors: string[] = [];
  if (input.thesis && input.thesis.length > MAX_THESIS_LENGTH) errors.push('thesis is too long (max 4000 characters)');
  if (input.notes && input.notes.length > MAX_NOTES_LENGTH) errors.push('notes are too long (max 4000 characters)');
  return errors;
}

function validateTags(tags?: string[]): string[] {
  if (tags === undefined) return [];
  if (!Array.isArray(tags)) return ['tags must be an array'];
  if (tags.length > MAX_TAGS) return [`tags cannot exceed ${MAX_TAGS}`];
  if (tags.some((tag) => typeof tag !== 'string' || tag.length > MAX_TAG_LENGTH)) return ['each tag must be a string of at most 40 characters'];
  return [];
}

export function parseListFilters(query: Record<string, unknown>): TradeJournalListFilters {
  const decision = DECISIONS.includes(query.decision as TradeDecision) ? (query.decision as TradeDecision) : undefined;
  const outcomeStatus = OUTCOME_STATUSES.includes(query.outcomeStatus as OutcomeStatus) ? (query.outcomeStatus as OutcomeStatus) : undefined;
  const symbol = typeof query.symbol === 'string' && query.symbol.trim() ? query.symbol.trim().toUpperCase() : undefined;
  const fromDate = typeof query.fromDate === 'string' && !isNaN(Date.parse(query.fromDate)) ? query.fromDate : undefined;
  const toDate = typeof query.toDate === 'string' && !isNaN(Date.parse(query.toDate)) ? query.toDate : undefined;
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(String(query.pageSize ?? String(DEFAULT_PAGE_SIZE)), 10) || DEFAULT_PAGE_SIZE));
  const sortBy = SORT_FIELDS.includes(query.sortBy as TradeJournalSortField) ? (query.sortBy as TradeJournalSortField) : undefined;
  const sortDirection = query.sortDirection === 'asc' || query.sortDirection === 'desc' ? query.sortDirection : undefined;
  return { decision, outcomeStatus, symbol, fromDate, toDate, page, pageSize, sortBy, sortDirection };
}

export function normalizeTags(tags?: string[]): string[] {
  return [...new Set((tags ?? []).map((t) => t.trim()).filter(Boolean))];
}

export function getParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] : value ?? '';
}
