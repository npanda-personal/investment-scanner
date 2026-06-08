import axios from 'axios';

const API_BASE = '/api/v1/derivatives';

export type OiBuildupLabel =
  | 'LONG_BUILDUP'
  | 'SHORT_BUILDUP'
  | 'SHORT_COVERING'
  | 'LONG_UNWINDING'
  | 'NEUTRAL';

export interface OiBuildupRow {
  underlying: string;
  instrumentType: 'FUTSTK' | 'FUTIDX';
  totalOi: number;
  oiChange: number;
  oiChangePct: number | null;
  price: number | null;
  priceChangePct: number | null;
  buildupLabel: OiBuildupLabel;
  derivativesEligible: boolean;
}

export interface OiBuildupResponse {
  status: 'ready' | 'missing' | 'error';
  tradingDate: string | null;
  fetchedAt: string;
  rows: OiBuildupRow[];
  message?: string;
}

export async function fetchOiBuildup(
  params: { eligibleOnly?: boolean; limit?: number } = {},
): Promise<OiBuildupResponse> {
  const response = await axios.get<OiBuildupResponse>(`${API_BASE}/oi-buildup`, { params });
  return response.data;
}

// ---------------------------------------------------------------------------
// Phase 2: Option metrics — PCR, max-pain, support/resistance
// ---------------------------------------------------------------------------

export interface OptionMetricsRow {
  underlying: string;
  expiryDate: string;
  isMarketAggregate: boolean;
  pcrOi: number | null;
  totalCallOi: number;
  totalPutOi: number;
  maxCallOiStrike: number | null;   // resistance
  maxPutOiStrike: number | null;    // support
  maxPainStrike: number | null;
}

export interface OptionMetricsResponse {
  status: 'ready' | 'missing' | 'error';
  tradingDate: string | null;
  fetchedAt: string;
  marketPcr: number | null;
  rows: OptionMetricsRow[];
  message?: string;
}

export async function fetchOptionMetrics(
  params: { underlying?: string; limit?: number } = {},
): Promise<OptionMetricsResponse> {
  const response = await axios.get<OptionMetricsResponse>(`${API_BASE}/option-metrics`, { params });
  return response.data;
}

export async function fetchPcr(): Promise<OptionMetricsResponse> {
  const response = await axios.get<OptionMetricsResponse>(`${API_BASE}/pcr`);
  return response.data;
}

// ---------------------------------------------------------------------------
// Phase 3: Participant-wise OI (FII derivatives positioning)
// ---------------------------------------------------------------------------

export interface ParticipantOiRow {
  participant: string;
  futureIndexLong: number;
  futureIndexShort: number;
  futureStockLong: number;
  futureStockShort: number;
  optionIndexCallLong: number;
  optionIndexPutLong: number;
  optionIndexCallShort: number;
  optionIndexPutShort: number;
  optionStockCallLong: number;
  optionStockPutLong: number;
  optionStockCallShort: number;
  optionStockPutShort: number;
  totalLong: number;
  totalShort: number;
  netIndexFutures: number;
  netStockFutures: number;
}

export interface ParticipantOiResponse {
  status: 'ready' | 'missing' | 'error';
  source: string;
  tradingDate: string | null;
  fetchedAt: string;
  rows: ParticipantOiRow[];
  message?: string;
}

export async function fetchParticipantOi(): Promise<ParticipantOiResponse> {
  const response = await axios.get<ParticipantOiResponse>(`${API_BASE}/participant-oi`);
  return response.data;
}
