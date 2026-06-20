import axios from 'axios';
import type { ScreenerFilters, ScreenerResult } from '../types';

const API_BASE = '/api/v1/market-data/screener';

export async function fetchScreener(filters: ScreenerFilters = {}, signal?: AbortSignal): Promise<ScreenerResult> {
  const params: Record<string, string | number | boolean> = {};
  if (filters.signalDirection) params.signalDirection = filters.signalDirection;
  if (filters.minScore != null) params.minScore = filters.minScore;
  if (filters.minRsPercentile != null) params.minRsPercentile = filters.minRsPercentile;
  if (filters.sector) params.sector = filters.sector;
  if (filters.capBand) params.capBand = filters.capBand;
  if (filters.minDeliveryPct != null) params.minDeliveryPct = filters.minDeliveryPct;
  if (filters.min52wPositionPct != null) params.min52wPositionPct = filters.min52wPositionPct;
  if (filters.excludeFnoBan != null) params.excludeFnoBan = filters.excludeFnoBan;
  if (filters.onlyDerivativesEligible != null) params.onlyDerivativesEligible = filters.onlyDerivativesEligible;
  if (filters.limit != null) params.limit = filters.limit;

  const response = await axios.get<ScreenerResult>(API_BASE, { params, signal });
  return response.data;
}
