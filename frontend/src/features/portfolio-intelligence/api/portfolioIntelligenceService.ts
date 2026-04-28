import axios from 'axios';
import type { PortfolioIntelligenceResponse, RedFlag, ReviewItem } from '../types';

const API_BASE = '/api/v1/portfolios';

export async function fetchPortfolioIntelligence(portfolioId: string): Promise<PortfolioIntelligenceResponse> {
  const response = await axios.get<PortfolioIntelligenceResponse>(`${API_BASE}/${portfolioId}/intelligence`);
  return response.data;
}

export async function fetchPortfolioRedFlags(portfolioId: string): Promise<RedFlag[]> {
  const response = await axios.get<{ redFlags: RedFlag[] }>(`${API_BASE}/${portfolioId}/red-flags`);
  return response.data.redFlags;
}

export async function fetchPortfolioReview(portfolioId: string): Promise<ReviewItem[]> {
  const response = await axios.get<{ review: ReviewItem[] }>(`${API_BASE}/${portfolioId}/review`);
  return response.data.review;
}
