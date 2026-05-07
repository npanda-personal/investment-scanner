import axios from 'axios';
import type { CalibrationComparison, CalibrationModelInfo, CalibrationRunResponse, PaginatedCalibrationResponse } from '../types';

const API_BASE = '/api/v1/signals/calibration';

export async function fetchTopCalibratedSignals(params: Record<string, any> = {}): Promise<PaginatedCalibrationResponse> {
  const response = await axios.get<PaginatedCalibrationResponse>(`${API_BASE}/top`, { params });
  return response.data;
}

export async function runSignalCalibration(input: Record<string, any>): Promise<CalibrationRunResponse> {
  const response = await axios.post<CalibrationRunResponse>(`${API_BASE}/run`, input);
  return response.data;
}

export async function fetchCalibrationComparison(instrumentId: string, region?: string, assetType?: string, horizon?: string): Promise<CalibrationComparison> {
  const response = await axios.get<CalibrationComparison>(`${API_BASE}/compare/${instrumentId}`, { params: { region, assetType, horizon } });
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

