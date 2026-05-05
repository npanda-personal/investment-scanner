import axios from 'axios';
import type { StrategyBacktestResponse, StrategyDefinition, StrategyEvaluateResponse, StrategyPerformanceSummary, StrategyTimeframe } from '../types';

const API_BASE = '/api/v1/strategies';

export async function fetchStrategies(params: { region?: string; assetType?: string; status?: string } = {}): Promise<StrategyDefinition[]> {
  const response = await axios.get<StrategyDefinition[]>(API_BASE, { params });
  return response.data;
}

export async function fetchStrategy(code: string, params: { region?: string; assetType?: string } = {}): Promise<StrategyDefinition> {
  const response = await axios.get<StrategyDefinition>(`${API_BASE}/${code}`, { params });
  return response.data;
}

export async function fetchStrategyPerformance(code: string, params: { timeframe?: StrategyTimeframe; region?: string; assetType?: string } = {}): Promise<StrategyPerformanceSummary[]> {
  const response = await axios.get<StrategyPerformanceSummary[]>(`${API_BASE}/${code}/performance`, { params });
  return response.data;
}

export async function fetchStrategyRankings(params: { timeframe?: StrategyTimeframe; region?: string; assetType?: string } = {}): Promise<StrategyPerformanceSummary[]> {
  const response = await axios.get<StrategyPerformanceSummary[]>(`${API_BASE}/rankings`, { params });
  return response.data;
}

export async function runRegisteredStrategyBacktest(code: string, input: { timeframe: StrategyTimeframe; region: string; assetType: string; initialCapital: number; maxPositions: number; transactionCostPercent: number }): Promise<StrategyBacktestResponse> {
  const response = await axios.post<StrategyBacktestResponse>(`${API_BASE}/${code}/backtest`, input);
  return response.data;
}

export async function evaluateStrategy(input: { strategyCode?: string; instrumentId?: string; symbol?: string; region: string; assetType: string }): Promise<StrategyEvaluateResponse> {
  const response = await axios.post<StrategyEvaluateResponse>(`${API_BASE}/evaluate`, input);
  return response.data;
}
