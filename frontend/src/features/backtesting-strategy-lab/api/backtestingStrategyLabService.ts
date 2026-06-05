import axios from 'axios';
import type { BacktestRun, BacktestStrategy, BacktestStrategyConfig } from '../types';

const API_BASE = '/api/v1/backtests';

export async function fetchBacktestStrategies(): Promise<BacktestStrategy[]> {
  const response = await axios.get<BacktestStrategy[]>(`${API_BASE}/strategies`);
  return response.data;
}

export async function createBacktestStrategy(input: { name: string; description?: string | null; config: BacktestStrategyConfig }): Promise<BacktestStrategy> {
  const response = await axios.post<BacktestStrategy>(`${API_BASE}/strategies`, input);
  return response.data;
}

export async function deleteBacktestStrategy(id: string): Promise<void> {
  await axios.delete(`${API_BASE}/strategies/${id}`);
}

export async function runBacktest(input: { strategyId?: string | null; config?: BacktestStrategyConfig }, signal?: AbortSignal): Promise<BacktestRun> {
  const response = await axios.post<BacktestRun>(`${API_BASE}/run`, input, { signal });
  return response.data;
}

export async function runBacktestStrategy(id: string): Promise<BacktestRun> {
  const response = await axios.post<BacktestRun>(`${API_BASE}/strategies/${id}/run`);
  return response.data;
}

export async function fetchBacktestRuns(params: { region?: string; assetType?: string; limit?: number; offset?: number } = {}): Promise<BacktestRun[]> {
  const response = await axios.get<BacktestRun[]>(`${API_BASE}/runs`, { params });
  return response.data;
}

export async function deleteBacktestRun(id: string): Promise<void> {
  await axios.delete(`${API_BASE}/runs/${id}`);
}
