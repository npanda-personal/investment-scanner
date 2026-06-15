import axios from 'axios';

const API_BASE = '/api/v1/market-data/screener/conviction';

/**
 * High-conviction confluence types.
 *
 * Co-located with the service (rather than in the shared module `types.ts`, which is a
 * shrink-only god-file) since they are used only by the Conviction tab. Region/asset
 * scope is injected globally by the market-scope axios interceptor — the only explicit
 * filter is the F&O-eligible toggle.
 */
export interface ConvictionRow {
  instrumentId: string;
  symbol: string;
  companyName: string;
  signalDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | null;
  signalScore: number | null;
  sm1m: number | null;
  sm3m: number | null;
  sm6m: number | null;
}

export interface ConvictionResult {
  generatedAt: string;
  count: number;
  results: ConvictionRow[];
  warnings: string[];
}

export interface ConvictionFilters {
  onlyFnoEligible?: boolean;
}

export async function fetchConviction(filters: ConvictionFilters = {}): Promise<ConvictionResult> {
  const params: Record<string, string | number | boolean> = {};
  if (filters.onlyFnoEligible) params.onlyFnoEligible = true;

  const response = await axios.get<ConvictionResult>(API_BASE, { params });
  return response.data;
}
