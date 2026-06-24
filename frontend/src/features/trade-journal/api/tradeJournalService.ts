import axios from 'axios';
import type {
  CreateTradeJournalInput,
  PostMortemSummaryData,
  TradeJournalEntry,
  TradeJournalListFilters,
  TradeJournalListResult,
  UpdateTradeJournalInput,
} from '../types';

const API_BASE = '/api/v1/trade-journal';

export async function fetchTradeJournalEntries(filters?: TradeJournalListFilters): Promise<TradeJournalListResult> {
  const params = new URLSearchParams();
  if (filters?.decision) params.set('decision', filters.decision);
  if (filters?.outcomeStatus) params.set('outcomeStatus', filters.outcomeStatus);
  if (filters?.symbol) params.set('symbol', filters.symbol);
  if (filters?.fromDate) params.set('fromDate', filters.fromDate);
  if (filters?.toDate) params.set('toDate', filters.toDate);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.pageSize) params.set('pageSize', String(filters.pageSize));
  if (filters?.sortBy) params.set('sortBy', filters.sortBy);
  if (filters?.sortDirection) params.set('sortDirection', filters.sortDirection);
  const response = await axios.get<TradeJournalListResult>(API_BASE, { params });
  return response.data;
}

export async function fetchTradeJournalEntry(id: string): Promise<TradeJournalEntry> {
  const response = await axios.get<TradeJournalEntry>(`${API_BASE}/${id}`);
  return response.data;
}

export async function createTradeJournalEntry(input: CreateTradeJournalInput): Promise<TradeJournalEntry> {
  const response = await axios.post<TradeJournalEntry>(API_BASE, input);
  return response.data;
}

export async function updateTradeJournalEntry(id: string, input: UpdateTradeJournalInput): Promise<TradeJournalEntry> {
  const response = await axios.patch<TradeJournalEntry>(`${API_BASE}/${id}`, input);
  return response.data;
}

export async function deleteTradeJournalEntry(id: string): Promise<void> {
  await axios.delete(`${API_BASE}/${id}`);
}

export async function fetchPostMortem(): Promise<PostMortemSummaryData> {
  const response = await axios.get<PostMortemSummaryData>(`${API_BASE}/post-mortem`);
  return response.data;
}
