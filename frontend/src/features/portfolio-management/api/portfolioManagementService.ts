import axios from 'axios';
import type {
  CreateHoldingInput,
  CreatePortfolioInput,
  CreateTransactionInput,
  Portfolio,
  PortfolioAllocation,
  PortfolioDetail,
  PortfolioHolding,
  PortfolioSummary,
  PortfolioTransaction,
  UpdateHoldingInput,
} from '../types';

const API_BASE = '/api/v1/portfolios';

export async function fetchPortfolios(): Promise<Portfolio[]> {
  const response = await axios.get<{ portfolios: Portfolio[] }>(API_BASE);
  return response.data.portfolios;
}

export async function createPortfolio(input: CreatePortfolioInput): Promise<Portfolio> {
  const response = await axios.post<Portfolio>(API_BASE, input);
  return response.data;
}

export async function fetchPortfolioDetail(id: string): Promise<PortfolioDetail> {
  const response = await axios.get<PortfolioDetail>(`${API_BASE}/${id}`);
  return response.data;
}

export async function deletePortfolio(id: string): Promise<void> {
  await axios.delete(`${API_BASE}/${id}`);
}

export async function addHolding(portfolioId: string, input: CreateHoldingInput): Promise<PortfolioHolding> {
  const response = await axios.post<PortfolioHolding>(`${API_BASE}/${portfolioId}/holdings`, input);
  return response.data;
}

export async function updateHolding(portfolioId: string, holdingId: string, input: UpdateHoldingInput): Promise<PortfolioHolding> {
  const response = await axios.patch<PortfolioHolding>(`${API_BASE}/${portfolioId}/holdings/${holdingId}`, input);
  return response.data;
}

export async function removeHolding(portfolioId: string, holdingId: string): Promise<void> {
  await axios.delete(`${API_BASE}/${portfolioId}/holdings/${holdingId}`);
}

export async function fetchPortfolioSummary(id: string): Promise<PortfolioSummary> {
  const response = await axios.get<PortfolioSummary>(`${API_BASE}/${id}/summary`);
  return response.data;
}

export async function fetchPortfolioAllocation(id: string): Promise<PortfolioAllocation> {
  const response = await axios.get<PortfolioAllocation>(`${API_BASE}/${id}/allocation`);
  return response.data;
}

export async function fetchPortfolioTransactions(id: string): Promise<PortfolioTransaction[]> {
  const response = await axios.get<{ transactions: PortfolioTransaction[] }>(`${API_BASE}/${id}/transactions`);
  return response.data.transactions;
}

export async function createTransaction(portfolioId: string, input: CreateTransactionInput): Promise<PortfolioTransaction> {
  const response = await axios.post<PortfolioTransaction>(`${API_BASE}/${portfolioId}/transactions`, input);
  return response.data;
}
