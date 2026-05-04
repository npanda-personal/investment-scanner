import axios from 'axios';
import type { MarketGateResponse } from '@/features/strategy-decision-engine';
import type { SignalResult } from '@/features/signal-generation-engine';
import type { SmartMoneyStockSummary } from '@/features/smart-money-intelligence';
import type { StrategyDecisionDto } from '@/features/strategy-decision-engine';

export interface ResearchOverview {
  marketGate: MarketGateResponse;
  marketRegime: {
    regime: string;
    score: number;
    explanation: string;
  };
  topSignals: SignalResult[];
  topSmartMoney: SmartMoneyStockSummary[];
  topStrategyCandidates: StrategyDecisionDto[];
  updatedAt: string;
}

export const fetchResearchOverview = async (): Promise<ResearchOverview> => {
  const response = await axios.get<ResearchOverview>('/api/v1/research/overview');
  return response.data;
};
