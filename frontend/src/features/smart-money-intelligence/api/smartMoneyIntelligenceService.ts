import axios from 'axios';
import type { PaginatedSmartMoneyListResponse, SectorSmartMoneySummary, SmartMoneyHealth, SmartMoneyRange, SmartMoneyRunResponse, SmartMoneyStockSummary } from '../types';

const API_BASE = '/api/v1/smart-money';

export async function fetchSmartMoneyHealth(): Promise<SmartMoneyHealth> {
  const response = await axios.get<SmartMoneyHealth>(`${API_BASE}/health`);
  return response.data;
}

export async function fetchSmartMoneyTop(limit = 10, offset = 0, range: SmartMoneyRange = '3M', sector?: string, region?: string, assetType?: string): Promise<PaginatedSmartMoneyListResponse> {
  const response = await axios.get<PaginatedSmartMoneyListResponse>(`${API_BASE}/top`, { params: { limit, offset, range, sector, region, assetType } });
  return response.data;
}

export async function fetchSmartMoneyDistribution(limit = 10, offset = 0, range: SmartMoneyRange = '3M', sector?: string, region?: string, assetType?: string): Promise<PaginatedSmartMoneyListResponse> {
  const response = await axios.get<PaginatedSmartMoneyListResponse>(`${API_BASE}/distribution`, { params: { limit, offset, range, sector, region, assetType } });
  return response.data;
}

export async function fetchSmartMoneySectors(range: SmartMoneyRange = '3M', region?: string, assetType?: string): Promise<SectorSmartMoneySummary[]> {
  const response = await axios.get<SectorSmartMoneySummary[]>(`${API_BASE}/sectors`, { params: { range, region, assetType } });
  return response.data;
}

export async function runSmartMoneySnapshots(params: { batchSize?: number; offset?: number; region?: string; assetType?: string } = {}): Promise<SmartMoneyRunResponse> {
  const response = await axios.post<SmartMoneyRunResponse>(`${API_BASE}/run`, params);
  return response.data;
}

export async function fetchSmartMoneyStock(instrumentId: string, range: SmartMoneyRange = '3M'): Promise<SmartMoneyStockSummary> {
  const response = await axios.get<SmartMoneyStockSummary>(`${API_BASE}/stocks/${instrumentId}`, { params: { range } });
  return response.data;
}
