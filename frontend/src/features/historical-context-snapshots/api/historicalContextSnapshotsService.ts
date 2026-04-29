import axios from 'axios';
import type {
  CountryContextSnapshot,
  MarketContextSnapshot,
  SectorContextSnapshot,
  SnapshotCoverage,
  SnapshotGenerateSummary,
  SnapshotLookupResult,
} from '../types';

const API_BASE = '/api/v1/context-snapshots';

export async function fetchSnapshotCoverage(): Promise<SnapshotCoverage> {
  const response = await axios.get<SnapshotCoverage>(`${API_BASE}/coverage`);
  return response.data;
}

export async function generateSnapshots(input: { snapshotDate?: string; limit?: number }): Promise<SnapshotGenerateSummary> {
  const response = await axios.post<SnapshotGenerateSummary>(`${API_BASE}/generate`, input);
  return response.data;
}

export async function fetchMarketSnapshots(): Promise<MarketContextSnapshot[]> {
  const response = await axios.get<{ items: MarketContextSnapshot[] }>(`${API_BASE}/market`, { params: { limit: 25 } });
  return response.data.items;
}

export async function fetchSectorSnapshots(): Promise<SectorContextSnapshot[]> {
  const response = await axios.get<{ items: SectorContextSnapshot[] }>(`${API_BASE}/sectors`, { params: { limit: 25 } });
  return response.data.items;
}

export async function fetchCountrySnapshots(): Promise<CountryContextSnapshot[]> {
  const response = await axios.get<{ items: CountryContextSnapshot[] }>(`${API_BASE}/countries`, { params: { limit: 25 } });
  return response.data.items;
}

export async function lookupSnapshots(params: { date: string; instrumentId?: string; sector?: string; country?: string }): Promise<SnapshotLookupResult> {
  const response = await axios.get<SnapshotLookupResult>(`${API_BASE}/lookup`, { params });
  return response.data;
}
