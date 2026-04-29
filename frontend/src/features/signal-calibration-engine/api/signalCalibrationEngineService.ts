import axios from 'axios';
import type { CalibrationComparison, CalibrationModelInfo, CalibrationRunResponse, SignalCalibrationResult } from '../types';

const API_BASE = '/api/v1/signals/calibration';

export async function fetchTopCalibratedSignals(params: { direction?: string; minScore?: number; limit?: number } = {}): Promise<SignalCalibrationResult[]> {
  const response = await axios.get<{ results: SignalCalibrationResult[] }>(`${API_BASE}/top`, { params });
  return response.data.results;
}

export async function runSignalCalibration(input: { instrumentId?: string; symbol?: string; limit?: number; batchSize?: number; offset?: number }): Promise<CalibrationRunResponse> {
  const response = await axios.post<CalibrationRunResponse>(`${API_BASE}/run`, input);
  return response.data;
}

export async function fetchCalibrationComparison(instrumentId: string): Promise<CalibrationComparison> {
  const response = await axios.get<CalibrationComparison>(`${API_BASE}/compare/${instrumentId}`);
  return response.data;
}

export async function fetchCalibrationModel(): Promise<CalibrationModelInfo> {
  const response = await axios.get<CalibrationModelInfo>(`${API_BASE}/model`);
  return response.data;
}

export async function fetchCalibrationHealth(): Promise<any> {
  const response = await axios.get(`${API_BASE}/health`);
  return response.data;
}
