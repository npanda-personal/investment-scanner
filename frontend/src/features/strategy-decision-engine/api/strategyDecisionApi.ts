import axios from 'axios';
import type {
  MarketGateResponse,
  StrategyCandidatesResponse,
  StrategyDecisionDto,
  StrategyEvaluateRequest,
  StrategyEvaluateResponse,
  StrategyModel,
  StrategyQuery,
} from '../types';

const API_BASE = '/api/v1/strategy';

export const fetchMarketGate = async (): Promise<MarketGateResponse> => {
  const response = await axios.get<MarketGateResponse>(`${API_BASE}/market-gate`);
  return response.data;
};

export const evaluateStrategy = async (request: StrategyEvaluateRequest): Promise<StrategyEvaluateResponse> => {
  const response = await axios.post<StrategyEvaluateResponse>(`${API_BASE}/evaluate`, request);
  return response.data;
};

export const fetchCandidates = async (query: StrategyQuery): Promise<StrategyCandidatesResponse> => {
  const response = await axios.get<StrategyCandidatesResponse>(`${API_BASE}/candidates`, { params: query });
  return response.data;
};

export const fetchExits = async (portfolioId?: string): Promise<StrategyDecisionDto[]> => {
  const response = await axios.get<StrategyDecisionDto[]>(`${API_BASE}/exits`, { params: { portfolioId } });
  return response.data;
};

export const fetchWatchlistDecisions = async (watchlistId: string): Promise<StrategyDecisionDto[]> => {
  const response = await axios.get<StrategyDecisionDto[]>(`${API_BASE}/watchlist/${watchlistId}`);
  return response.data;
};

export const fetchPortfolioDecisions = async (portfolioId: string): Promise<StrategyDecisionDto[]> => {
  const response = await axios.get<StrategyDecisionDto[]>(`${API_BASE}/portfolio/${portfolioId}`);
  return response.data;
};

export const fetchModel = async (): Promise<StrategyModel> => {
  const response = await axios.get<StrategyModel>(`${API_BASE}/model`);
  return response.data;
};

export const fetchLatestDecision = async (instrumentId: string): Promise<StrategyDecisionDto | null> => {
  const response = await axios.get<StrategyDecisionDto>(`${API_BASE}/${instrumentId}`);
  return response.data;
};

export const fetchHistory = async (instrumentId: string): Promise<StrategyDecisionDto[]> => {
  const response = await axios.get<StrategyDecisionDto[]>(`${API_BASE}/history/${instrumentId}`);
  return response.data;
};

export const fetchHealth = async () => {
  const response = await axios.get(`${API_BASE}/health`);
  return response.data;
};
