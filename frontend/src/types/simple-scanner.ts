/**
 * Simplified Scanner TypeScript Interfaces
 * 
 * Minimal interfaces for the Smart Scanner UI
 */

// Core simplified interfaces
export interface SimplifiedOpportunity {
  id: string;
  symbol: string;
  companyName?: string;
  price: number;
  changePct: number;
  changeAmount: number;
  volume: number;
  score: number; // 0-100
  confidence: number; // 0-100
  rank: number;
  signals: SimplifiedSignal[];
  sector?: string;
  marketCap?: number;
  lastUpdated: string;
}

export interface SimplifiedSignal {
  type: SignalType;
  name: string; // Human-readable: "RSI Oversold", "MACD Bullish Crossover"
  confidence: number;
  direction: 'bullish' | 'bearish' | 'neutral';
  description: string; // "RSI below 30 indicates oversold condition"
}

export type SignalType = 
  | 'RSI' 
  | 'EMA' 
  | 'MACD' 
  | 'VOLUME' 
  | 'PRICE_CHANGE' 
  | 'BB' 
  | 'STOCH' 
  | 'ADX' 
  | 'ATR' 
  | 'OBV';

export type ScanType = 'momentum' | 'reversal' | 'trend';

export interface ScanProgress {
  sessionId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalSymbols: number;
  processedSymbols: number;
  opportunitiesFound: number;
  progressPercentage: number;
  estimatedTimeRemaining: number; // seconds
  startedAt: string;
}

// Scan configuration mapping
export const SCAN_CONFIG: Record<ScanType, SignalType[]> = {
  momentum: ["RSI", "EMA", "MACD", "VOLUME"],
  reversal: ["RSI"],
  trend: ["EMA"]
};

// Signal translation configuration
export interface SignalTranslation {
  type: SignalType;
  condition: (value: number, threshold?: number) => boolean;
  name: (value: number, threshold?: number) => string;
  description: (value: number, threshold?: number) => string;
  direction: (value: number, threshold?: number) => 'bullish' | 'bearish' | 'neutral';
}

// Helper to convert backend ScoredOpportunity to SimplifiedOpportunity
export const transformBackendToSimplified = (
  backendOpportunity: any // Using any to avoid dependency on real-time-scanner types
): SimplifiedOpportunity => {
  // Extract signals from backend format
  const signals: SimplifiedSignal[] = [];
  
  // If backend has signals array, transform them
  if (backendOpportunity.signals && Array.isArray(backendOpportunity.signals)) {
    backendOpportunity.signals.forEach((signal: any) => {
      const translated = translateSignal(signal);
      if (translated) {
        signals.push(translated);
      }
    });
  }
  
  return {
    id: backendOpportunity.id || `simplified-${backendOpportunity.symbol}`,
    symbol: backendOpportunity.symbol,
    price: backendOpportunity.metadata?.price || 0,
    changePct: backendOpportunity.metadata?.change || 0,
    changeAmount: calculateChangeAmount(
      backendOpportunity.metadata?.price || 0,
      backendOpportunity.metadata?.change || 0
    ),
    volume: backendOpportunity.metadata?.volume || 0,
    score: backendOpportunity.score || 0,
    confidence: backendOpportunity.confidence || 0,
    rank: backendOpportunity.rank || 0,
    signals,
    sector: backendOpportunity.metadata?.sector,
    marketCap: backendOpportunity.metadata?.marketCap,
    lastUpdated: backendOpportunity.detectedAt || new Date().toISOString(),
  };
};

// Calculate absolute change amount from percentage
const calculateChangeAmount = (price: number, changePct: number): number => {
  return (price * changePct) / 100;
};

// Signal translation function
export const translateSignal = (signal: any): SimplifiedSignal | null => {
  if (!signal || !signal.type) return null;
  
  const { type, value, threshold = 0, parameters = {} } = signal;
  
  // Default translations
  const translations: Record<string, SignalTranslation> = {
    RSI: {
      type: 'RSI',
      condition: (val) => val < 30 || val > 70,
      name: (val) => val < 30 ? 'RSI Oversold' : val > 70 ? 'RSI Overbought' : 'RSI Neutral',
      description: (val) => `RSI value of ${val.toFixed(1)} indicates ${val < 30 ? 'oversold' : 'overbought'} conditions.`,
      direction: (val) => val < 30 ? 'bullish' : val > 70 ? 'bearish' : 'neutral',
    },
    EMA: {
      type: 'EMA',
      condition: () => true,
      name: () => {
        const { period1, period2 } = parameters;
        if (period1 && period2) {
          return `EMA ${period1}/${period2} Crossover`;
        }
        return 'EMA Signal';
      },
      description: () => 'EMA crossover suggests trend change.',
      direction: (val) => val > 0 ? 'bullish' : 'bearish',
    },
    MACD: {
      type: 'MACD',
      condition: (val) => Math.abs(val) > 0.1,
      name: (val) => val > 0 ? 'MACD Bullish' : 'MACD Bearish',
      description: (val) => `MACD histogram shows ${val > 0 ? 'bullish' : 'bearish'} momentum.`,
      direction: (val) => val > 0 ? 'bullish' : 'bearish',
    },
    VOLUME: {
      type: 'VOLUME',
      condition: (val, thresh = 1.5) => val > thresh,
      name: (val, thresh = 1.5) => val > thresh ? 'Volume Spike' : 'Normal Volume',
      description: (val, thresh = 1.5) => `Volume ${val > thresh ? 'above' : 'below'} average.`,
      direction: () => 'neutral',
    },
    PRICE_CHANGE: {
      type: 'PRICE_CHANGE',
      condition: (val) => Math.abs(val) > 2,
      name: (val) => val > 0 ? 'Price Up' : 'Price Down',
      description: (val) => `Price change of ${val.toFixed(1)}%.`,
      direction: (val) => val > 0 ? 'bullish' : 'bearish',
    },
  };
  
  const translation = translations[type];
  if (!translation) {
    // Default fallback
    return {
      type: type as SignalType,
      name: type,
      confidence: signal.confidence || 50,
      direction: 'neutral',
      description: `Technical signal detected: ${type}`,
    };
  }
  
  return {
    type: translation.type,
    name: translation.name(value, threshold),
    confidence: signal.confidence || 50,
    direction: translation.direction(value, threshold),
    description: translation.description(value, threshold),
  };
};

// Generate insight banner text
export const generateInsightText = (opportunities: SimplifiedOpportunity[]): string => {
  const strongOpportunities = opportunities.filter(opp => opp.score > 70).length;
  
  if (strongOpportunities === 0) {
    return "No strong opportunities found";
  } else if (strongOpportunities === 1) {
    return "🔥 1 strong opportunity found";
  } else {
    return `🔥 ${strongOpportunities} strong opportunities found`;
  }
};

// Mock data for development
export const generateMockOpportunity = (overrides: Partial<SimplifiedOpportunity> = {}): SimplifiedOpportunity => {
  const base: SimplifiedOpportunity = {
    id: `mock-${Math.random().toString(36).substr(2, 9)}`,
    symbol: 'AAPL',
    companyName: 'Apple Inc.',
    price: 175.25,
    changePct: 1.5,
    changeAmount: 2.63,
    volume: 45000000,
    score: 85,
    confidence: 78,
    rank: 1,
    signals: [
      {
        type: 'RSI',
        name: 'RSI Oversold',
        confidence: 82,
        direction: 'bullish',
        description: 'RSI value of 28 indicates oversold conditions.'
      },
      {
        type: 'MACD',
        name: 'MACD Bullish',
        confidence: 75,
        direction: 'bullish',
        description: 'MACD histogram shows bullish momentum.'
      }
    ],
    sector: 'Technology',
    marketCap: 2750000000000,
    lastUpdated: new Date().toISOString(),
  };
  
  return { ...base, ...overrides };
};

export const generateMockOpportunities = (count: number = 10): SimplifiedOpportunity[] => {
  const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'JPM', 'JNJ', 'V'];
  const sectors = ['Technology', 'Healthcare', 'Financial', 'Consumer', 'Industrial'];
  
  return Array.from({ length: count }, (_, i) => generateMockOpportunity({
    id: `mock-${i}`,
    symbol: symbols[i % symbols.length],
    companyName: `${symbols[i % symbols.length]} Company`,
    price: 100 + Math.random() * 200,
    changePct: -5 + Math.random() * 10,
    changeAmount: -10 + Math.random() * 20,
    volume: 10000000 + Math.random() * 40000000,
    score: 50 + Math.random() * 50,
    confidence: 60 + Math.random() * 40,
    rank: i + 1,
    sector: sectors[i % sectors.length],
    marketCap: 1000000000 + Math.random() * 9000000000,
  }));
};