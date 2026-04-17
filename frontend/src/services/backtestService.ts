import axios from 'axios';

const API_BASE = '/api';
const TEST_USER_ID = 'test-user-id';

export interface BacktestConfig {
  id: string;
  name: string;
  description: string | null;
  watchlistIds: string[];
  startDate: string;
  endDate: string;
  strategyConfig: any;
  positionSizing: any | null;
  stopLoss: number | null;
  takeProfit: number | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
  results?: BacktestResult[];
}

export interface BacktestResult {
  id: string;
  configId: string;
  startedAt: string;
  completedAt: string;
  status: string;
  error: string | null;
  sharpeRatio: number | null;
  maxDrawdown: number | null;
  winRate: number | null;
  profitFactor: number | null;
  totalReturn: number | null;
  totalTrades: number | null;
  equityCurve: any | null;
  tradeLedger: any | null;
  monthlyReturns: any | null;
  config?: BacktestConfig;
}

export interface CreateBacktestConfigRequest {
  name: string;
  description?: string;
  watchlistIds: string[];
  startDate: Date;
  endDate: Date;
  strategyConfig: any;
  positionSizing?: any;
  stopLoss?: number;
  takeProfit?: number;
}

export interface UpdateBacktestConfigRequest {
  name?: string;
  description?: string;
  watchlistIds?: string[];
  startDate?: Date;
  endDate?: Date;
  strategyConfig?: any;
  positionSizing?: any;
  stopLoss?: number | null;
  takeProfit?: number | null;
}

/**
 * Fetch all backtest configurations for the current user.
 */
export async function fetchBacktestConfigs(): Promise<BacktestConfig[]> {
  const response = await axios.get<BacktestConfig[]>(`${API_BASE}/backtest`, {
    headers: { 'x-user-id': TEST_USER_ID },
  });
  return response.data;
}

/**
 * Create a new backtest configuration.
 */
export async function createBacktestConfig(data: CreateBacktestConfigRequest): Promise<BacktestConfig> {
  const response = await axios.post<BacktestConfig>(`${API_BASE}/backtest`, data, {
    headers: { 'x-user-id': TEST_USER_ID },
  });
  return response.data;
}

/**
 * Fetch a specific backtest configuration by ID.
 */
export async function fetchBacktestConfig(id: string): Promise<BacktestConfig> {
  const response = await axios.get<BacktestConfig>(`${API_BASE}/backtest/${id}`, {
    headers: { 'x-user-id': TEST_USER_ID },
  });
  return response.data;
}

/**
 * Update a backtest configuration.
 */
export async function updateBacktestConfig(
  id: string,
  data: UpdateBacktestConfigRequest
): Promise<BacktestConfig> {
  const response = await axios.put<BacktestConfig>(`${API_BASE}/backtest/${id}`, data, {
    headers: { 'x-user-id': TEST_USER_ID },
  });
  return response.data;
}

/**
 * Delete a backtest configuration.
 */
export async function deleteBacktestConfig(id: string): Promise<void> {
  await axios.delete(`${API_BASE}/backtest/${id}`, {
    headers: { 'x-user-id': TEST_USER_ID },
  });
}

/**
 * Run a backtest for a configuration.
 */
export async function runBacktest(configId: string): Promise<BacktestResult> {
  const response = await axios.post<BacktestResult>(`${API_BASE}/backtest/${configId}/run`, {}, {
    headers: { 'x-user-id': TEST_USER_ID },
  });
  return response.data;
}

/**
 * Fetch backtest results for a configuration.
 */
export async function fetchBacktestResults(configId: string, limit = 10): Promise<BacktestResult[]> {
  const response = await axios.get<BacktestResult[]>(`${API_BASE}/backtest/${configId}/results`, {
    params: { limit },
    headers: { 'x-user-id': TEST_USER_ID },
  });
  return response.data;
}

/**
 * Fetch a specific backtest result by its ID.
 */
export async function fetchBacktestResult(resultId: string): Promise<BacktestResult> {
  const response = await axios.get<BacktestResult>(`${API_BASE}/backtest/results/${resultId}`, {
    headers: { 'x-user-id': TEST_USER_ID },
  });
  return response.data;
}