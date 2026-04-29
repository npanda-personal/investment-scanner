import axios from 'axios';
import type { DataQualityEvaluateResponse, DataQualityEvaluation, DataQualityFilters, DataQualitySummary } from '../types';

const API_BASE = '/api/v1/data-quality';

export async function fetchDataQualitySummary(): Promise<DataQualitySummary> {
  const response = await axios.get<DataQualitySummary>(`${API_BASE}/summary`);
  return response.data;
}

export async function fetchDataQualityEvaluations(filters: DataQualityFilters = {}): Promise<DataQualityEvaluation[]> {
  const response = await axios.get<{ items: DataQualityEvaluation[] }>(`${API_BASE}/instruments`, {
    params: { ...filters, limit: 100 },
  });
  return response.data.items;
}

export async function fetchDataQualityDiagnostics(instrumentId: string): Promise<DataQualityEvaluation> {
  const response = await axios.get<DataQualityEvaluation>(`${API_BASE}/instruments/${instrumentId}`);
  return response.data;
}

export async function evaluateDataQuality(input: { instrumentId?: string; symbol?: string; batchSize?: number; offset?: number }): Promise<DataQualityEvaluateResponse> {
  const response = await axios.post<DataQualityEvaluateResponse>(`${API_BASE}/evaluate`, input);
  return response.data;
}
