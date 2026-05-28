import axios from 'axios';
import { fetchMarketContextSummary } from '@/features/market-context-intelligence/api/marketContextIntelligenceService';
import type { MarketContextSummary } from '@/features/market-context-intelligence/types';
import type { TodayReviewResponse } from '@/features/today-trade-review/types';
import type { MarketMoverRange, MarketMoversSummary } from '../types';

export interface DailyOverviewScopeParams {
  region: string;
  assetType: string;
}

export async function fetchDailyOverviewTodayReview(params: DailyOverviewScopeParams): Promise<TodayReviewResponse> {
  const response = await axios.get<TodayReviewResponse>('/api/v1/today-review/latest', { params });
  return response.data;
}

export async function fetchDailyOverviewMarketContext(params: DailyOverviewScopeParams): Promise<MarketContextSummary> {
  return fetchMarketContextSummary({ region: params.region });
}

export async function fetchDailyOverviewMarketMovers(params: DailyOverviewScopeParams & { range?: MarketMoverRange }): Promise<MarketMoversSummary> {
  const response = await axios.get<MarketMoversSummary>('/api/v1/market-data/movers', {
    params: { ...params, limit: 20 },
  });
  return response.data;
}
