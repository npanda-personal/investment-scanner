import axios from 'axios';
import type {
  MarketScanSummary52w,
  MarketScanSummaryDeliverySpike,
  MarketScanSummaryVolumeSpike,
} from '../types';

const API_BASE = '/api/v1/market-data/scans';

export interface MarketScan52wParams {
  region?: string;
  assetType?: string;
  proximityPct?: number;
  limit?: number;
}

export interface MarketScanSpikeParams {
  region?: string;
  assetType?: string;
  lookbackBars?: number;
  minSpikeRatio?: number;
  limit?: number;
}

export async function fetchMarketScan52wHigh(params: MarketScan52wParams = {}): Promise<MarketScanSummary52w> {
  const response = await axios.get<MarketScanSummary52w>(`${API_BASE}/52w-high`, { params });
  return response.data;
}

export async function fetchMarketScan52wLow(params: MarketScan52wParams = {}): Promise<MarketScanSummary52w> {
  const response = await axios.get<MarketScanSummary52w>(`${API_BASE}/52w-low`, { params });
  return response.data;
}

export async function fetchMarketScanDeliverySpike(params: MarketScanSpikeParams = {}): Promise<MarketScanSummaryDeliverySpike> {
  const response = await axios.get<MarketScanSummaryDeliverySpike>(`${API_BASE}/delivery-spike`, { params });
  return response.data;
}

export async function fetchMarketScanVolumeSpike(params: MarketScanSpikeParams = {}): Promise<MarketScanSummaryVolumeSpike> {
  const response = await axios.get<MarketScanSummaryVolumeSpike>(`${API_BASE}/volume-spike`, { params });
  return response.data;
}
