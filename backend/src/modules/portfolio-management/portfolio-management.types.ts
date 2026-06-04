import type { MarketDataStatus } from '../market-data-foundation';
import type { SignalConfidence, SignalDirection } from '../signal-generation-engine';

export type PortfolioTransactionType = 'BUY' | 'SELL' | 'CASH_IN' | 'CASH_OUT';

export interface PortfolioDto {
  id: string;
  name: string;
  baseCurrency: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePortfolioRequest {
  name: string;
  baseCurrency: string;
  description?: string | null;
}

export interface UpdatePortfolioRequest {
  name?: string;
  baseCurrency?: string;
  description?: string | null;
}

export interface CreateHoldingRequest {
  instrumentId: string;
  quantity: number;
  averageCost: number;
  currency: string;
  notes?: string | null;
}

export interface UpdateHoldingRequest {
  quantity?: number;
  averageCost?: number;
  currency?: string;
  notes?: string | null;
}

export interface PortfolioHoldingDto {
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

export interface HoldingValuationDto extends PortfolioHoldingDto {
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

export interface PortfolioSummaryDto {
  portfolio: PortfolioDto;
  totalValue: number;
  totalInvested: number;
  totalUnrealizedPnL: number;
  totalUnrealizedPnLPercent: number | null;
  dailyPnL: number;
  dailyPnLPercent: number | null;
  numberOfHoldings: number;
  holdings: HoldingValuationDto[];
  source: string;
  dataStatus: MarketDataStatus;
  generatedAt: string;
}

export interface AllocationBucketDto {
  key: string;
  value: number;
  allocationPercent: number;
}

export interface PortfolioAllocationDto {
  portfolioId: string;
  byHolding: AllocationBucketDto[];
  bySector: AllocationBucketDto[];
  byCountry: AllocationBucketDto[];
  byCurrency: AllocationBucketDto[];
  generatedAt: string;
}

export interface CreateTransactionRequest {
  instrumentId?: string | null;
  type: PortfolioTransactionType;
  quantity?: number | null;
  price?: number | null;
  amount?: number | null;
  currency: string;
  transactionDate: string;
  notes?: string | null;
}

export interface PortfolioTransactionDto {
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

// ── Portfolio "what changed" diff ─────────────────────────────────────────────

export interface HoldingSignalFlip {
  holdingId: string;
  instrumentId: string;
  symbol: string;
  companyName: string | null;
  priorDirection: string;
  currentDirection: string;
  priorScore: number;
  currentScore: number;
  currentSignalDate: string;
  note: string;
}

export interface HoldingLossCrossing {
  holdingId: string;
  instrumentId: string;
  symbol: string;
  companyName: string | null;
  averageCost: number;
  currentPrice: number;
  unrealizedPnLPercent: number;
  thresholdPercent: number;
  note: string;
}

export interface PortfolioChangesDto {
  portfolioId: string;
  referenceNote: string;
  signalFlips: HoldingSignalFlip[];
  lossCrossings: HoldingLossCrossing[];
  marketGateChange: { from: string; to: string } | null;
  warnings: string[];
  generatedAt: string;
}

