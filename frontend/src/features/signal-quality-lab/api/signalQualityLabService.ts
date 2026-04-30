import axios from 'axios';
import type {
  NoisySignalItem,
  QualityHorizon,
  QualityFilters,
  QualityMetricGroup,
  QualityRecalculateRequest,
  QualityRecalculateResponse,
  QualitySummary,
  SignalHistoryItem,
  SignalOutcomeSet,
  SignalTypePerformance,
} from '../types';

const API_BASE = '/api/v1/signals';

const params = (horizon: QualityHorizon, filters: QualityFilters = {}) => ({ horizon, limit: 150, minSampleSize: 0, ...filters });

export async function fetchSignalQualitySummary(horizon: QualityHorizon, filters: QualityFilters = {}): Promise<QualitySummary> {
  const response = await axios.get<QualitySummary>(`${API_BASE}/quality/summary`, { params: params(horizon, filters) });
  return response.data;
}

export async function fetchSignalQualityByType(horizon: QualityHorizon, filters: QualityFilters = {}): Promise<SignalTypePerformance[]> {
  const response = await axios.get<{ items: SignalTypePerformance[] }>(`${API_BASE}/quality/by-type`, { params: params(horizon, filters) });
  return response.data.items;
}

export async function fetchSignalQualityBySector(horizon: QualityHorizon, filters: QualityFilters = {}): Promise<QualityMetricGroup[]> {
  const response = await axios.get<{ items: QualityMetricGroup[] }>(`${API_BASE}/quality/by-sector`, { params: params(horizon, filters) });
  return response.data.items;
}

export async function fetchSignalQualityByRegime(horizon: QualityHorizon, filters: QualityFilters = {}): Promise<QualityMetricGroup[]> {
  const response = await axios.get<{ items: QualityMetricGroup[] }>(`${API_BASE}/quality/by-regime`, { params: params(horizon, filters) });
  return response.data.items;
}

export async function fetchSignalQualityByDataQuality(horizon: QualityHorizon, filters: QualityFilters = {}): Promise<QualityMetricGroup[]> {
  const response = await axios.get<{ items: QualityMetricGroup[] }>(`${API_BASE}/quality/by-data-quality`, { params: params(horizon, filters) });
  return response.data.items;
}

export async function fetchNoisySignals(horizon: QualityHorizon, filters: QualityFilters = {}): Promise<NoisySignalItem[]> {
  const response = await axios.get<{ items: NoisySignalItem[] }>(`${API_BASE}/quality/noisy`, { params: params(horizon, filters) });
  return response.data.items;
}

export async function fetchSignalHistory(instrumentId: string): Promise<SignalHistoryItem[]> {
  const response = await axios.get<{ items: SignalHistoryItem[] }>(`${API_BASE}/${instrumentId}/history`, { params: { limit: 100 } });
  return response.data.items;
}

export async function fetchSignalOutcomes(instrumentId: string): Promise<SignalOutcomeSet[]> {
  const response = await axios.get<{ items: SignalOutcomeSet[] }>(`${API_BASE}/${instrumentId}/outcomes`, { params: { limit: 100 } });
  return response.data.items;
}

export async function recalculateSignalQuality(input: QualityRecalculateRequest = {}): Promise<QualityRecalculateResponse> {
  const response = await axios.post<QualityRecalculateResponse>(`${API_BASE}/quality/recalculate`, input);
  return response.data;
}
