import axios from 'axios';

const API_BASE = '/api';

export interface SectorPerformance {
  sector: string;
  performance: number;
  flow: number;
  color: string;
  marketCap?: number;
}

export interface SmartMoneyIndicator {
  indicator: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  unit?: string;
  description?: string;
}

export interface EconomicCyclePhase {
  phase: string;
  description: string;
  leadingSectors: string[];
  color: string;
  currentPhase: boolean;
  durationMonths: number;
}

export interface ActionableInsight {
  id: number;
  title: string;
  description: string;
  type: 'positive' | 'neutral' | 'warning' | 'negative';
  confidence: number;
  sectors: string[];
  timestamp: string;
}

export interface RelativeStrengthData {
  sector: string;
  values: Array<{
    month: string;
    value: number;
  }>;
  currentStrength: number;
  trend: 'up' | 'down';
}

export interface MacroIndicator {
  name: string;
  value: number;
  unit: string;
  change: number;
  trend: 'up' | 'down' | 'stable';
  targetRange: {
    min: number;
    max: number;
  };
  description: string;
}

export interface SectorPerformanceResponse {
  success: boolean;
  data: SectorPerformance[];
  timeframe: string;
  lastUpdated: string;
}

export interface SmartMoneyIndicatorsResponse {
  success: boolean;
  data: SmartMoneyIndicator[];
  lastUpdated: string;
}

export interface EconomicCycleResponse {
  success: boolean;
  data: EconomicCyclePhase[];
  currentPhase: string;
  lastUpdated: string;
}

export interface InsightsResponse {
  success: boolean;
  data: ActionableInsight[];
  count: number;
  lastUpdated: string;
}

export interface RelativeStrengthResponse {
  success: boolean;
  data: RelativeStrengthData[];
  benchmark: string;
  lastUpdated: string;
}

export interface MacroIndicatorsResponse {
  success: boolean;
  data: MacroIndicator[];
  lastUpdated: string;
}

/**
 * Fetch sector performance data
 */
export const fetchSectorPerformance = async (
  timeframe: string = 'weekly',
  limit: number = 20
): Promise<SectorPerformanceResponse> => {
  try {
    const response = await axios.get(`${API_BASE}/smart-money/sector-performance`, {
      params: { timeframe, limit },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching sector performance:', error);
    throw error;
  }
};

/**
 * Fetch smart money indicators
 */
export const fetchSmartMoneyIndicators = async (): Promise<SmartMoneyIndicatorsResponse> => {
  try {
    const response = await axios.get(`${API_BASE}/smart-money/indicators`);
    return response.data;
  } catch (error) {
    console.error('Error fetching smart money indicators:', error);
    throw error;
  }
};

/**
 * Fetch economic cycle data
 */
export const fetchEconomicCycle = async (): Promise<EconomicCycleResponse> => {
  try {
    const response = await axios.get(`${API_BASE}/smart-money/economic-cycle`);
    return response.data;
  } catch (error) {
    console.error('Error fetching economic cycle data:', error);
    throw error;
  }
};

/**
 * Fetch actionable insights
 */
export const fetchActionableInsights = async (): Promise<InsightsResponse> => {
  try {
    const response = await axios.get(`${API_BASE}/smart-money/insights`);
    return response.data;
  } catch (error) {
    console.error('Error fetching actionable insights:', error);
    throw error;
  }
};

/**
 * Fetch relative strength data for sectors
 */
export const fetchRelativeStrength = async (
  sectors: string[] = ['Technology', 'Healthcare', 'Financials']
): Promise<RelativeStrengthResponse> => {
  try {
    const response = await axios.get(`${API_BASE}/smart-money/relative-strength`, {
      params: { sectors: sectors.join(',') },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching relative strength data:', error);
    throw error;
  }
};

/**
 * Fetch macroeconomic indicators
 */
export const fetchMacroIndicators = async (): Promise<MacroIndicatorsResponse> => {
  try {
    const response = await axios.get(`${API_BASE}/smart-money/macro-indicators`);
    return response.data;
  } catch (error) {
    console.error('Error fetching macroeconomic indicators:', error);
    throw error;
  }
};

/**
 * Get color for performance value
 */
export const getPerformanceColor = (performance: number): string => {
  if (performance >= 5) return '#4caf50'; // Green for strong positive
  if (performance >= 0) return '#8bc34a'; // Light green for positive
  if (performance >= -5) return '#ff9800'; // Orange for mild negative
  return '#f44336'; // Red for strong negative
};

/**
 * Get trend icon based on trend direction
 */
export const getTrendIcon = (trend: 'up' | 'down' | 'stable'): string => {
  switch (trend) {
    case 'up': return '📈';
    case 'down': return '📉';
    case 'stable': return '➡️';
    default: return '➡️';
  }
};

/**
 * Format large numbers with suffixes (K, M, B)
 */
export const formatLargeNumber = (num: number): string => {
  if (num >= 1000000000) {
    return `$${(num / 1000000000).toFixed(1)}B`;
  }
  if (num >= 1000000) {
    return `$${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `$${(num / 1000).toFixed(1)}K`;
  }
  return `$${num.toFixed(0)}`;
};

/**
 * Get confidence level text based on confidence score
 */
export const getConfidenceLevel = (confidence: number): string => {
  if (confidence >= 0.9) return 'Very High';
  if (confidence >= 0.7) return 'High';
  if (confidence >= 0.5) return 'Medium';
  return 'Low';
};

export default {
  fetchSectorPerformance,
  fetchSmartMoneyIndicators,
  fetchEconomicCycle,
  fetchActionableInsights,
  fetchRelativeStrength,
  fetchMacroIndicators,
  getPerformanceColor,
  getTrendIcon,
  formatLargeNumber,
  getConfidenceLevel,
};