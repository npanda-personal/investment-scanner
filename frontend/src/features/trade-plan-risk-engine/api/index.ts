import axios from 'axios';
import { TradePlanResultDto, GenerateTradePlanRequest, BatchGenerateTradePlanRequest } from '../types';

export const TradePlanApi = {
  async getHealth() {
    const res = await axios.get('/api/v1/trade-plans/health');
    return res.data;
  },
  
  async getModelRules() {
    const res = await axios.get('/api/v1/trade-plans/model');
    return res.data;
  },

  async listCandidates(params?: Record<string, string | number>) {
    const res = await axios.get<{ results: TradePlanResultDto[]; total: number }>('/api/v1/trade-plans/candidates', { params });
    return res.data;
  },

  async getLatestForInstrument(instrumentId: string, strategyCode?: string) {
    try {
      const res = await axios.get<TradePlanResultDto>(`/api/v1/trade-plans/${instrumentId}`, {
        params: { strategyCode }
      });
      return res.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw new Error(error.response?.data?.error || 'Failed to fetch latest plan');
    }
  },

  async generatePlan(request: GenerateTradePlanRequest) {
    try {
      const res = await axios.post<TradePlanResultDto>('/api/v1/trade-plans/generate', request);
      return res.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to generate plan');
    }
  },

  async batchGenerate(request: BatchGenerateTradePlanRequest) {
    try {
      const res = await axios.post<{ count: number; generatedCount: number; failedCount: number; plans: TradePlanResultDto[] }>('/api/v1/trade-plans/generate/batch', request);
      return res.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to batch generate plans');
    }
  },
};
