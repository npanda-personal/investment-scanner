export type SmartMoneyStatus = 'ACCUMULATION' | 'NEUTRAL' | 'DISTRIBUTION' | 'INSUFFICIENT_DATA';
export type SmartMoneyConfidence = 'LOW' | 'MEDIUM' | 'HIGH';
export type SmartMoneyDataStatus = 'COMPLETE' | 'PARTIAL' | 'MISSING' | 'ERROR';
export type SmartMoneyRange = '1M' | '3M' | '6M';
export type SectorSmartMoneyStatus = 'ACCUMULATING' | 'NEUTRAL' | 'DISTRIBUTING';

export interface SmartMoneySignal {
  type: string;
  label: string;
  direction: 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL';
  strength: number;
  details: string;
}

export interface InsiderOwnershipSummary {
  insiderBuyCount: number | null;
  insiderSellCount: number | null;
  netInsiderActivity: number | null;
  institutionalOwnershipPercent: number | null;
  ownershipDataStatus: SmartMoneyDataStatus;
  source: string;
  explanation: string;
}

export interface SmartMoneyStockSummary {
  instrumentId: string;
  symbol: string;
  companyName: string | null;
  sector: string | null;
  smartMoneyScore: number;
  status: SmartMoneyStatus;
  confidence: SmartMoneyConfidence;
  explanation: string;
  updatedAt: string;
  dataStatus: SmartMoneyDataStatus;
  source: string;
  range: SmartMoneyRange;
  latestClose: number | null;
  latestVolume: number | null;
  averageVolume20: number | null;
  dailyChangePercent: number | null;
  signals: SmartMoneySignal[];
  insiderOwnership: InsiderOwnershipSummary;
  researchUrl: string;
}

export interface SectorSmartMoneySummary {
  sector: string;
  averageSmartMoneyScore: number;
  accumulationCount: number;
  distributionCount: number;
  unusualVolumeCount: number;
  instrumentCount: number;
  sectorStatus: SectorSmartMoneyStatus;
  dataStatus: SmartMoneyDataStatus;
  updatedAt: string;
}

export interface PaginatedSmartMoneyListResponse {
  results: SmartMoneyStockSummary[];
  total: number;
}

export interface SmartMoneyHealth {
  status: 'ok';
  module: 'smart-money-intelligence';
  source: string;
  dataStatus: SmartMoneyDataStatus;
  updatedAt: string;
  notes: string[];
}
