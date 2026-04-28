export type PortfolioTransactionType = 'BUY' | 'SELL' | 'CASH_IN' | 'CASH_OUT';
export type SignalDirection = 'BULLISH' | 'NEUTRAL' | 'BEARISH';
export type SignalConfidence = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Portfolio {
  id: string;
  name: string;
  baseCurrency: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioHolding {
  id: string;
  portfolioId: string;
  instrumentId: string;
  symbol: string;
  companyName: string | null;
  quantity: number;
  averageCost: number;
  currency: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HoldingValuation extends PortfolioHolding {
  currentPrice: number | null;
  marketValue: number;
  investedAmount: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number | null;
  dailyChange: number | null;
  dailyChangePercent: number | null;
  allocationPercent: number;
  sector: string | null;
  country: string | null;
  signal: {
    score: number;
    direction: SignalDirection;
    confidence: SignalConfidence;
    generatedAt: string;
  } | null;
}

export interface PortfolioDetail {
  portfolio: Portfolio;
  holdings: PortfolioHolding[];
}

export interface PortfolioSummary {
  portfolio: Portfolio;
  totalValue: number;
  totalInvested: number;
  totalUnrealizedPnL: number;
  totalUnrealizedPnLPercent: number | null;
  dailyPnL: number;
  dailyPnLPercent: number | null;
  numberOfHoldings: number;
  holdings: HoldingValuation[];
  source: string;
  dataStatus: 'COMPLETE' | 'PARTIAL' | 'DELAYED' | 'MISSING' | 'ERROR';
  generatedAt: string;
}

export interface AllocationBucket {
  key: string;
  value: number;
  allocationPercent: number;
}

export interface PortfolioAllocation {
  portfolioId: string;
  byHolding: AllocationBucket[];
  bySector: AllocationBucket[];
  byCountry: AllocationBucket[];
  byCurrency: AllocationBucket[];
  generatedAt: string;
}

export interface PortfolioTransaction {
  id: string;
  portfolioId: string;
  instrumentId: string | null;
  type: PortfolioTransactionType;
  quantity: number | null;
  price: number | null;
  amount: number | null;
  currency: string;
  transactionDate: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePortfolioInput {
  name: string;
  baseCurrency: string;
  description?: string | null;
}

export interface CreateHoldingInput {
  instrumentId: string;
  quantity: number;
  averageCost: number;
  currency: string;
  notes?: string | null;
}

export interface UpdateHoldingInput {
  quantity?: number;
  averageCost?: number;
  currency?: string;
  notes?: string | null;
}

export interface CreateTransactionInput {
  instrumentId?: string | null;
  type: PortfolioTransactionType;
  quantity?: number | null;
  price?: number | null;
  amount?: number | null;
  currency: string;
  transactionDate: string;
  notes?: string | null;
}
