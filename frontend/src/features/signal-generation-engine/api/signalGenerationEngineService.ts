import axios from 'axios';
import type { PaginatedSignalResponse, SignalGenerationRunAudit, SignalQuery, SignalResult, SignalRunRequest, SignalRunResponse } from '../types';

const API_BASE = '/api/v1/signals';

export async function fetchTopSignals(query: SignalQuery = {}): Promise<PaginatedSignalResponse> {
  const response = await axios.get<PaginatedSignalResponse>(`${API_BASE}/top`, { params: query });
  return response.data;
}

export async function fetchSignalScreener(query: SignalQuery = {}): Promise<PaginatedSignalResponse> {
  const response = await axios.get<PaginatedSignalResponse>(`${API_BASE}/screener`, { params: query });
  return response.data;
}

export async function fetchInstrumentSignal(instrumentId: string): Promise<SignalResult> {
  const response = await axios.get<SignalResult>(`${API_BASE}/${instrumentId}`);
  return response.data;
}

export async function runSignals(request: SignalRunRequest = {}): Promise<SignalRunResponse> {
  const response = await axios.post<SignalRunResponse>(`${API_BASE}/run`, request);
  return response.data;
}

export async function fetchLatestSignalRun(query: Pick<SignalQuery, 'region' | 'assetType' | 'modelVersion'> = {}): Promise<SignalGenerationRunAudit | null> {
  const response = await axios.get<SignalGenerationRunAudit | null>(`${API_BASE}/runs/latest`, { params: query });
  return response.data;
}
