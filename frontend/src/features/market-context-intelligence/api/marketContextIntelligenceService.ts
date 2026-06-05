import axios from 'axios';
import type { CountryStrengthItem, MacroSnapshot, MarketBreadth, MarketContextSummary, MarketRegimeSummary, PersistedMarketBreadthResponse, SectorRotationItem } from '../types';
import type { CapitalPostureDto } from '../capitalPostureTypes';

export type { CapitalPostureDto };

const API_BASE = '/api/v1/market-context';

export interface PersistedMarketContextSummaryResponse {
  status: 'ready' | 'missing';
  scope: { region: string };
  summary: MarketContextSummary | null;
  asOf: string | null;
  materialized: false;
  message?: string;
}

export async function fetchMarketContextSummary(params: { region?: string } = {}): Promise<MarketContextSummary | null> {
  // The /summary endpoint wraps the payload: { status, summary: MarketContextSummary|null, ... }
  const response = await axios.get<PersistedMarketContextSummaryResponse>(`${API_BASE}/summary`, { params });
  return response.data.summary ?? null;
}
export async function fetchPersistedMarketContextSummary(params: { region?: string } = {}): Promise<PersistedMarketContextSummaryResponse> {
  const response = await axios.get<PersistedMarketContextSummaryResponse>(`${API_BASE}/persisted-summary`, { params });
  return response.data;
}
export async function fetchPersistedMarketBreadth(params: { region?: string } = {}): Promise<PersistedMarketBreadthResponse> {
  const response = await axios.get<PersistedMarketBreadthResponse>(`${API_BASE}/persisted-breadth`, { params });
  return response.data;
}
export async function fetchMarketRegime(): Promise<MarketRegimeSummary> {
  const response = await axios.get<MarketRegimeSummary>(`${API_BASE}/regime`);
  return response.data;
}
export async function fetchSectorRotation(): Promise<SectorRotationItem[]> {
  const response = await axios.get<SectorRotationItem[]>(`${API_BASE}/sectors`);
  return response.data;
}
export async function fetchMarketBreadth(): Promise<MarketBreadth> {
  const response = await axios.get<MarketBreadth>(`${API_BASE}/breadth`);
  return response.data;
}
export async function fetchCountryStrength(): Promise<CountryStrengthItem[]> {
  const response = await axios.get<CountryStrengthItem[]>(`${API_BASE}/countries`);
  return response.data;
}
export async function fetchMacroSnapshot(): Promise<MacroSnapshot> {
  const response = await axios.get<MacroSnapshot>(`${API_BASE}/macro`);
  return response.data;
}
export async function fetchCapitalPosture(params: { region?: string } = {}): Promise<CapitalPostureDto> {
  const response = await axios.get<CapitalPostureDto>(`${API_BASE}/capital-posture`, { params });
  return response.data;
}
