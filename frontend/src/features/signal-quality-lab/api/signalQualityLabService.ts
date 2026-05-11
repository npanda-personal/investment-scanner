import axios from 'axios';
import type {
  NoisySignalItem,
  QualityHorizon,
  QualityFilters,
  QualityMetricGroup,
  QualityRecalculateRequest,
  QualityRecalculateResponse,
  QualitySummary,
  SignalHistoryItem,
  SignalOutcomeSet,
  SignalTypePerformance,
} from '../types';

const API_BASE = '/api/v1/signals';
export const SIGNAL_QUALITY_DASHBOARD_TIMEOUT_MS = 20_000;

const params = (horizon: QualityHorizon, filters: QualityFilters = {}, scope: { region?: string; assetType?: string } = {}) => ({ horizon, limit: 5000, minSampleSize: 0, region: scope.region, assetType: scope.assetType, ...filters });

export async function fetchSignalQualityDashboard(
  horizon: QualityHorizon,
  filters: QualityFilters = {},
  scope: { region?: string; assetType?: string } = {},
  options: { signal?: AbortSignal; timeoutMs?: number } = {}
) {
  const response = await axios.get<{ summary: QualitySummary; byType: SignalTypePerformance[]; bySector: QualityMetricGroup[]; byRegime: QualityMetricGroup[]; byDataQuality: QualityMetricGroup[]; noisy: NoisySignalItem[] }>(`${API_BASE}/quality/dashboard`, {
    params: params(horizon, filters, scope),
    signal: options.signal,
    timeout: options.timeoutMs ?? SIGNAL_QUALITY_DASHBOARD_TIMEOUT_MS,
  });
  return response.data;
}

export async function fetchSignalQualitySummary(horizon: QualityHorizon, filters: QualityFilters = {}): Promise<QualitySummary> {
  const response = await axios.get<QualitySummary>(`${API_BASE}/quality/summary`, { params: params(horizon, filters) });
  return response.data;
}

export async function fetchSignalQualityByType(horizon: QualityHorizon, filters: QualityFilters = {}): Promise<SignalTypePerformance[]> {
  const response = await axios.get<{ items: SignalTypePerformance[] }>(`${API_BASE}/quality/by-type`, { params: params(horizon, filters) });
  return response.data.items;
}

export async function fetchSignalQualityBySector(horizon: QualityHorizon, filters: QualityFilters = {}): Promise<QualityMetricGroup[]> {
  const response = await axios.get<{ items: QualityMetricGroup[] }>(`${API_BASE}/quality/by-sector`, { params: params(horizon, filters) });
  return response.data.items;
}

export async function fetchSignalQualityByRegime(horizon: QualityHorizon, filters: QualityFilters = {}): Promise<QualityMetricGroup[]> {
  const response = await axios.get<{ items: QualityMetricGroup[] }>(`${API_BASE}/quality/by-regime`, { params: params(horizon, filters) });
  return response.data.items;
}

export async function fetchSignalQualityByDataQuality(horizon: QualityHorizon, filters: QualityFilters = {}): Promise<QualityMetricGroup[]> {
  const response = await axios.get<{ items: QualityMetricGroup[] }>(`${API_BASE}/quality/by-data-quality`, { params: params(horizon, filters) });
  return response.data.items;
}

export async function fetchNoisySignals(horizon: QualityHorizon, filters: QualityFilters = {}): Promise<NoisySignalItem[]> {
  const response = await axios.get<{ items: NoisySignalItem[] }>(`${API_BASE}/quality/noisy`, { params: params(horizon, filters) });
  return response.data.items;
}

export async function fetchSignalHistory(
  instrumentId: string,
  horizon: QualityHorizon,
  filters: QualityFilters = {},
  scope: { region?: string; assetType?: string } = {}
): Promise<SignalHistoryItem[]> {
  const response = await axios.get<{ items: SignalHistoryItem[] }>(`${API_BASE}/${instrumentId}/history`, { params: { ...params(horizon, filters, scope), limit: 100 } });
  return response.data.items;
}

export async function fetchSignalOutcomes(
  instrumentId: string,
  horizon: QualityHorizon,
  filters: QualityFilters = {},
  scope: { region?: string; assetType?: string } = {}
): Promise<SignalOutcomeSet[]> {
  const response = await axios.get<{ items: SignalOutcomeSet[] }>(`${API_BASE}/${instrumentId}/outcomes`, { params: { ...params(horizon, filters, scope), limit: 100 } });
  return response.data.items;
}

export async function recalculateSignalQuality(input: QualityRecalculateRequest = {}): Promise<QualityRecalculateResponse> {
  const response = await axios.post<QualityRecalculateResponse>(`${API_BASE}/quality/recalculate`, input);
  const evaluatedCount = response.data.evaluatedCount ?? response.data.evaluatedInBatch ?? 0;
  const missingPriceHistoryCount = response.data.missingPriceHistoryCount ?? response.data.missingPriceHistoryInBatch ?? 0;
  return {
    ...response.data,
    insertedCount: response.data.insertedCount ?? response.data.inserted ?? 0,
    updatedCount: response.data.updatedCount ?? response.data.updated ?? 0,
    skippedCount: response.data.skippedCount ?? response.data.skipped ?? 0,
    failedCount: response.data.failedCount ?? 0,
    evaluatedCount,
    unevaluatedCount: response.data.unevaluatedCount ?? response.data.unevaluatedInBatch ?? Math.max(0, (response.data.processedCount ?? 0) - evaluatedCount - missingPriceHistoryCount),
    missingPriceHistoryCount,
  };
}
