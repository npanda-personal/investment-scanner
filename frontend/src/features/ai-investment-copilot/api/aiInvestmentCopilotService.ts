import axios from 'axios';
import type { CopilotSummaryResponse } from '../types';

const API_BASE = '/api/v1/copilot';

export async function fetchMarketBrief(params: { region?: string } = {}): Promise<CopilotSummaryResponse> {
  const response = await axios.get<CopilotSummaryResponse>(`${API_BASE}/market-brief`, { params });
  return response.data;
}

export async function fetchAlertDigest(): Promise<CopilotSummaryResponse> {
  const response = await axios.get<CopilotSummaryResponse>(`${API_BASE}/alert-digest`);
  return response.data;
}

export async function fetchStockSummary(instrumentId: string): Promise<CopilotSummaryResponse> {
  const response = await axios.post<CopilotSummaryResponse>(`${API_BASE}/stock-summary`, { instrumentId });
  return response.data;
}

export async function fetchPortfolioSummary(portfolioId: string): Promise<CopilotSummaryResponse> {
  const response = await axios.post<CopilotSummaryResponse>(`${API_BASE}/portfolio-summary`, { portfolioId });
  return response.data;
}

export async function fetchWatchlistSummary(watchlistId: string): Promise<CopilotSummaryResponse> {
  const response = await axios.post<CopilotSummaryResponse>(`${API_BASE}/watchlist-summary`, { watchlistId });
  return response.data;
}
