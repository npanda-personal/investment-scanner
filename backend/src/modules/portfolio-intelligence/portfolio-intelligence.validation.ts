import type { PortfolioIntelligenceThresholds } from './portfolio-intelligence.types';

export const DEFAULT_PORTFOLIO_INTELLIGENCE_THRESHOLDS: PortfolioIntelligenceThresholds = {
  lossThreshold: -0.15,
  dailyDropThreshold: -0.05,
  topHoldingConcentration: 0.25,
  sectorConcentration: 0.5,
  countryConcentration: 0.8,
  minimumHoldings: 5,
  staleSignalDays: 7,
};

export function getPortfolioId(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] : value || '';
}

export function statusForHealthScore(score: number) {
  if (score >= 75) return 'HEALTHY';
  if (score >= 50) return 'WATCH';
  return 'AT_RISK';
}
