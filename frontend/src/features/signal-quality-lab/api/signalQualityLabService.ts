import axios from 'axios';
import type { NoisySignalItem, QualityHorizon, QualityMetricGroup, QualitySummary, SignalHistoryItem, SignalOutcomeSet, SignalTypePerformance } from '../types';

const API_BASE = '/api/v1/signals';

const params = (horizon: QualityHorizon) => ({ horizon, limit: 500, minSampleSize: 0 });

export async function fetchSignalQualitySummary(horizon: QualityHorizon): Promise<QualitySummary> {
  const response = await axios.get<QualitySummary>(`${API_BASE}/quality/summary`, { params: params(horizon) });
  return response.data;
}

export async function fetchSignalQualityByType(horizon: QualityHorizon): Promise<SignalTypePerformance[]> {
  const response = await axios.get<{ items: SignalTypePerformance[] }>(`${API_BASE}/quality/by-type`, { params: params(horizon) });
  return response.data.items;
}

export async function fetchSignalQualityBySector(horizon: QualityHorizon): Promise<QualityMetricGroup[]> {
  const response = await axios.get<{ items: QualityMetricGroup[] }>(`${API_BASE}/quality/by-sector`, { params: params(horizon) });
  return response.data.items;
}

export async function fetchSignalQualityByRegime(horizon: QualityHorizon): Promise<QualityMetricGroup[]> {
  const response = await axios.get<{ items: QualityMetricGroup[] }>(`${API_BASE}/quality/by-regime`, { params: params(horizon) });
  return response.data.items;
}

export async function fetchNoisySignals(horizon: QualityHorizon): Promise<NoisySignalItem[]> {
  const response = await axios.get<{ items: NoisySignalItem[] }>(`${API_BASE}/quality/noisy`, { params: params(horizon) });
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

export async function recalculateSignalQuality(): Promise<{ persistedOutcomes: boolean; message: string; recalculatedAt: string }> {
  const response = await axios.post(`${API_BASE}/quality/recalculate`);
  return response.data;
}
