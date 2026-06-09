import axios from 'axios';
import type { TodayReviewCandidate, TodayReviewResponse, TodayReviewRunsResponse } from '../types';

const API_BASE = '/api/v1/today-review';

export const todayTradeReviewApi = {
  latest: async (params: { region: string; assetType: string; enrich?: boolean }) => {
    // enrich:false skips the backend's per-candidate 52w/smart-money read-time enrichment for
    // consumers that don't render those fields (e.g. the Daily Review Shortlist) — a fast read.
    const query = params.enrich === false
      ? { region: params.region, assetType: params.assetType, enrich: false }
      : { region: params.region, assetType: params.assetType };
    const response = await axios.get<TodayReviewResponse>(`${API_BASE}/latest`, { params: query });
    return response.data;
  },

  run: async (params: { region: string; assetType: string }) => {
    const response = await axios.post<TodayReviewResponse>(`${API_BASE}/run`, params);
    return response.data;
  },

  runs: async (params: { region: string; assetType: string; limit?: number; offset?: number }) => {
    const response = await axios.get<TodayReviewRunsResponse>(`${API_BASE}/runs`, { params });
    return response.data;
  },

  runById: async (id: string) => {
    const response = await axios.get<TodayReviewResponse>(`${API_BASE}/runs/${id}`);
    return response.data;
  },

  candidate: async (id: string) => {
    const response = await axios.get<TodayReviewCandidate>(`${API_BASE}/candidates/${id}`);
    return response.data;
  },
};
