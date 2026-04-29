import axios from 'axios';
import type { SectorSmartMoneySummary, SmartMoneyHealth, SmartMoneyRange, SmartMoneyStockSummary } from '../types';

const API_BASE = '/api/v1/smart-money';

export async function fetchSmartMoneyHealth(): Promise<SmartMoneyHealth> {
  const response = await axios.get<SmartMoneyHealth>(`${API_BASE}/health`);
  return response.data;
}

export async function fetchSmartMoneyTop(limit = 10, range: SmartMoneyRange = '3M'): Promise<SmartMoneyStockSummary[]> {
  const response = await axios.get<SmartMoneyStockSummary[]>(`${API_BASE}/top`, { params: { limit, range } });
  return response.data;
}

export async function fetchSmartMoneyDistribution(limit = 10, range: SmartMoneyRange = '3M'): Promise<SmartMoneyStockSummary[]> {
  const response = await axios.get<SmartMoneyStockSummary[]>(`${API_BASE}/distribution`, { params: { limit, range } });
  return response.data;
}

export async function fetchSmartMoneySectors(range: SmartMoneyRange = '3M'): Promise<SectorSmartMoneySummary[]> {
  const response = await axios.get<SectorSmartMoneySummary[]>(`${API_BASE}/sectors`, { params: { range } });
  return response.data;
}

export async function fetchSmartMoneyStock(instrumentId: string, range: SmartMoneyRange = '3M'): Promise<SmartMoneyStockSummary> {
  const response = await axios.get<SmartMoneyStockSummary>(`${API_BASE}/stocks/${instrumentId}`, { params: { range } });
  return response.data;
}
