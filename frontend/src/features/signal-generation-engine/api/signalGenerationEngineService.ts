import axios from 'axios';
import type { SignalQuery, SignalResult, SignalRunRequest, SignalRunResponse } from '../types';

const API_BASE = '/api/v1/signals';

export async function fetchTopSignals(query: SignalQuery = {}): Promise<SignalResult[]> {
  const response = await axios.get<{ signals: SignalResult[] }>(`${API_BASE}/top`, { params: query });
  return response.data.signals;
}

export async function fetchSignalScreener(query: SignalQuery = {}): Promise<SignalResult[]> {
  const response = await axios.get<{ signals: SignalResult[] }>(`${API_BASE}/screener`, { params: query });
  return response.data.signals;
}

export async function fetchInstrumentSignal(instrumentId: string): Promise<SignalResult> {
  const response = await axios.get<SignalResult>(`${API_BASE}/${instrumentId}`);
  return response.data;
}

export async function runSignals(request: SignalRunRequest = {}): Promise<SignalRunResponse> {
  const response = await axios.post<SignalRunResponse>(`${API_BASE}/run`, request);
  return response.data;
}

