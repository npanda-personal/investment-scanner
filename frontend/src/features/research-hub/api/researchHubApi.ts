import axios from 'axios';
import type { MarketGateResponse, StrategyDecisionDto } from '@/features/strategy-decision-engine';
import type { MarketRegimeSummary, SectorRotationItem, MarketBreadth } from '@/features/market-context-intelligence';

export interface ResearchOverview {
  marketGate: MarketGateResponse;
  marketRegime: MarketRegimeSummary;
  topSectors: SectorRotationItem[];
  weakSectors: SectorRotationItem[];
  breadth: MarketBreadth;
  topStrategyCandidates: StrategyDecisionDto[];
  topExits: StrategyDecisionDto[];
  updatedAt: string;
}

export const fetchResearchOverview = async (): Promise<ResearchOverview> => {
  const response = await axios.get<ResearchOverview>('/api/v1/research/overview');
  return response.data;
};