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
  score: number; // 0-100 (legacy)
  conviction?: number; // 0-100 (new conviction score)
  confidence: number; // 0-100
  rank: number;
  signals: SimplifiedSignal[];
  sector?: string;
  marketCap?: number;
  lastUpdated: string;
  // New fields from backend revamp
  alignment?: string; // e.g., "BULLISH/NEUTRAL/BEARISH"
  alignmentScore?: number; // 0-100 alignment score for guard filters
  insight?: string; // Human-readable insight
  confidenceLevel?: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW'; // For color coding
  // Phase 1: Decision Clarity
  decision?: 'BUY' | 'ACCUMULATE' | 'WAIT' | 'AVOID'; // Clear trading decision
  setupType?: 'PULLBACK' | 'BREAKOUT' | 'REVERSAL' | 'RANGE'; // Entry context
  volumeVisibility?: 'HIGH' | 'NORMAL' | 'LOW'; // Volume confirmation
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH'; // Risk assessment
  // Phase 2: Entry Quality Assessment
  entryQuality?: 'IDEAL' | 'OK' | 'LATE'; // Entry quality: IDEAL = Pullback + near support + volume, LATE = Extended breakout, OK = Mid-range
  // Phase 3: Advanced Metrics
  distanceToSupport?: 'NEAR' | 'MID' | 'FAR'; // Distance to nearest support/resistance
  trendStrength?: 'STRONG' | 'MODERATE' | 'WEAK'; // Strength of the current trend
  // Phase 4: Portfolio Relevance
  portfolioRelevance?: 'CORE' | 'SATELLITE' | 'AVOID' | 'SMALL'; // Position sizing guidance
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
  
  // Determine confidence level based on conviction/score
  const getConfidenceLevel = (score: number): 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' => {
    if (score >= 80) return 'VERY_HIGH';
    if (score >= 60) return 'HIGH';
    if (score >= 40) return 'MEDIUM';
    return 'LOW';
  };

  const convictionScore = backendOpportunity.conviction || backendOpportunity.score;
  const confidenceLevel = getConfidenceLevel(convictionScore);
  const rawChangePercent = backendOpportunity.changePercent ?? backendOpportunity.metadata?.change ?? 0;
  const normalizedChangePercent = Math.abs(rawChangePercent) < 1 ? rawChangePercent * 100 : rawChangePercent;
  const alignmentScore = backendOpportunity.alignmentScore ?? backendOpportunity.breakdown?.alignmentScore ?? 0;

  return {
    id: backendOpportunity.id || `simplified-${backendOpportunity.symbol}`,
    symbol: backendOpportunity.symbol,
    companyName: backendOpportunity.companyName || backendOpportunity.metadata?.companyName,
    price: backendOpportunity.price || backendOpportunity.metadata?.price || 0,
    changePct: normalizedChangePercent,
    changeAmount: calculateChangeAmount(
      backendOpportunity.price || backendOpportunity.metadata?.price || 0,
      normalizedChangePercent
    ),
    volume: backendOpportunity.volume || backendOpportunity.metadata?.volume || 0,
    score: backendOpportunity.score || 0, // legacy
    conviction: convictionScore,
    confidence: backendOpportunity.confidence || 0,
    rank: backendOpportunity.rank || 0,
    signals,
    sector: backendOpportunity.metadata?.sector,
    marketCap: backendOpportunity.metadata?.marketCap,
    lastUpdated: backendOpportunity.detectedAt || new Date().toISOString(),
    // New fields
    alignment: backendOpportunity.alignment,
    alignmentScore,
    insight: backendOpportunity.insight,
    confidenceLevel,
    // Phase 1: Decision Clarity
    decision: backendOpportunity.decision,
    setupType: backendOpportunity.setupType,
    volumeVisibility: backendOpportunity.volumeVisibility,
    riskLevel: backendOpportunity.riskLevel,
    // Phase 2: Entry Quality Assessment
    entryQuality: backendOpportunity.entryQuality,
    // Phase 3: Advanced Metrics
    distanceToSupport: backendOpportunity.distanceToSupport,
    trendStrength: backendOpportunity.trendStrength,
    // Phase 4: Portfolio Relevance
    portfolioRelevance: backendOpportunity.portfolioRelevance,
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
  const safeValue = value ?? 0;
  
  // Default translations
  const translations: Record<string, SignalTranslation> = {
    RSI: {
      type: 'RSI',
      condition: (val) => val < 30 || val > 70,
      name: (val) => val < 30 ? 'RSI Oversold' : val > 70 ? 'RSI Overbought' : 'RSI Neutral',
      description: (val) => `RSI value of ${(val ?? 0).toFixed(1)} indicates ${val < 30 ? 'oversold' : 'overbought'} conditions.`,
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
      direction: (val) => (val ?? 0) > 0 ? 'bullish' : 'bearish',
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
      description: (val) => `Price change of ${(val ?? 0).toFixed(1)}%.`,
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
    name: translation.name(safeValue, threshold),
    confidence: signal.confidence || 50,
    direction: translation.direction(safeValue, threshold),
    description: translation.description(safeValue, threshold),
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

// Helper to determine decision based on conviction and alignment
const getMockDecision = (conviction: number, alignment?: string): 'BUY' | 'ACCUMULATE' | 'WAIT' | 'AVOID' => {
  // Extract alignment score from alignment string
  let alignmentScore = 50; // default
  if (alignment) {
    const bullishCount = (alignment.match(/BULLISH/g) || []).length;
    alignmentScore = bullishCount * 30; // 0, 30, 60, 90
  }
  
  // Extract weekly trend from alignment string (format: "DAILY/WEEKLY/MONTHLY")
  let weeklyTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  if (alignment) {
    const parts = alignment.split('/');
    if (parts.length > 1) {
      const weeklyPart = parts[1];
      if (weeklyPart === 'BULLISH') weeklyTrend = 'BULLISH';
      else if (weeklyPart === 'BEARISH') weeklyTrend = 'BEARISH';
    }
  }
  
  // Apply tightened decision logic (same as backend)
  // BUY requires strong conviction, strong alignment, AND weekly bullish trend
  if (
    conviction >= 75 &&
    alignmentScore >= 80 &&
    weeklyTrend === "BULLISH"
  ) {
    return "BUY";
  }

  // AVOID when weekly trend is bearish (hard filter)
  if (weeklyTrend === "BEARISH") {
    return "AVOID";
  }

  if (conviction >= 75 && alignmentScore >= 70) {
    return "ACCUMULATE";
  }

  if (conviction >= 55 || alignmentScore >= 60) {
    return "WAIT";
  }

  // Everything else: AVOID
  return "AVOID";
};

// Helper to generate random setup type
const getMockSetupType = (trend?: string, changePct?: number): 'PULLBACK' | 'BREAKOUT' | 'REVERSAL' | 'RANGE' => {
  const setupTypes = ['PULLBACK', 'BREAKOUT', 'REVERSAL', 'RANGE'] as const;
  // Simple logic based on trend and change
  if (trend?.includes('BULLISH') && changePct && changePct < -2) {
    return 'PULLBACK';
  }
  if (Math.abs(changePct || 0) > 5) {
    return 'BREAKOUT';
  }
  if (trend?.includes('BEARISH') && changePct && changePct > 3) {
    return 'REVERSAL';
  }
  // Default random
  return setupTypes[Math.floor(Math.random() * setupTypes.length)];
};

// Helper to generate random volume visibility
const getMockVolumeVisibility = (volume: number): 'HIGH' | 'NORMAL' | 'LOW' => {
  const avgVolume = 25000000; // Mock average volume
  const ratio = volume / avgVolume;
  
  if (ratio > 1.5) return 'HIGH';
  if (ratio < 0.7) return 'LOW';
  return 'NORMAL';
};

// Helper to generate random risk level (depends on alignment and trend, NOT conviction)
const getMockRiskLevel = (
  alignment?: string
): 'LOW' | 'MEDIUM' | 'HIGH' => {
  // Parse alignment string to get trend info
  // Alignment format: "DAILY/WEEKLY/MONTHLY" e.g., "BULLISH/BULLISH/NEUTRAL"
  const parts = alignment?.split('/') || [];
  const weeklyTrend = parts.length > 1 ? parts[1] : 'NEUTRAL';
  
  // Calculate alignment score (simplified)
  let alignmentScore = 50; // Default
  const bullishCount = parts.filter(p => p === 'BULLISH').length;
  if (bullishCount === 3) alignmentScore = 90;
  else if (bullishCount === 2) alignmentScore = 70;
  else if (bullishCount === 1) alignmentScore = 40;
  else alignmentScore = 20;
  
  // Apply same logic as backend: Risk depends on trend + alignment
  if (alignmentScore >= 80 && weeklyTrend === "BULLISH") {
    return "LOW";
  }
  
  if (alignmentScore >= 50) {
    return "MEDIUM";
  }
  
  return "HIGH";
};

// Helper to generate mock entry quality
const getMockEntryQuality = (conviction: number, _alignment?: string): 'IDEAL' | 'OK' | 'LATE' => {
  // Simple mock logic for IDEAL/OK/LATE
  // For mock data, we'll randomly assign based on conviction
  const random = Math.random();
  
  if (conviction >= 85 && random > 0.7) {
    return "IDEAL"; // High conviction with some randomness
  } else if (conviction <= 50 || random < 0.3) {
    return "LATE"; // Low conviction or random chance for LATE
  } else {
    return "OK"; // Default
  }
};

// Helper to generate mock distance to support
const getMockDistanceToSupport = (changePct: number, alignment?: string): 'NEAR' | 'MID' | 'FAR' => {
  // If price is down recently, it's likely near support
  if (changePct < -3) {
    return "NEAR";
  } else if (changePct > 5) {
    return "FAR"; // Extended rally, far from support
  } else if (alignment?.includes('BEARISH')) {
    return "MID"; // Bearish trend, moderate distance
  } else {
    return "MID"; // Default
  }
};

// Helper to generate mock trend strength
const getMockTrendStrength = (alignment?: string, _conviction?: number): 'STRONG' | 'MODERATE' | 'WEAK' => {
  const bullishCount = alignment ? (alignment.match(/BULLISH/g) || []).length : 0;
  const bearishCount = alignment ? (alignment.match(/BEARISH/g) || []).length : 0;
  
  // Strong trend if all timeframes agree
  if (bullishCount === 3 || bearishCount === 3) {
    return "STRONG";
  }
  
  // Moderate trend if 2 out of 3 agree
  if (bullishCount === 2 || bearishCount === 2) {
    return "MODERATE";
  }
  
  // Weak trend if mixed or neutral
  return "WEAK";
};

// Helper to generate mock portfolio relevance
const getMockPortfolioRelevance = (
  decision?: 'BUY' | 'ACCUMULATE' | 'WAIT' | 'AVOID',
  conviction?: number,
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH',
  entryQuality?: 'IDEAL' | 'OK' | 'LATE'
): 'CORE' | 'SATELLITE' | 'AVOID' | 'SMALL' => {
  // AVOID decisions should not be in portfolio
  if (decision === 'AVOID') {
    return 'AVOID';
  }
  
  // WAIT decisions are small positions at best
  if (decision === 'WAIT') {
    return 'SMALL';
  }

  if (decision === 'ACCUMULATE') {
    return 'SATELLITE';
  }
  
  // BUY decisions with strong criteria become CORE positions
  if ((conviction || 0) >= 80 && riskLevel === 'LOW' && entryQuality === 'IDEAL') {
    return 'CORE';
  }
  
  // BUY decisions with good criteria become SATELLITE positions
  if ((conviction || 0) >= 70 && riskLevel !== 'HIGH' && entryQuality !== 'LATE') {
    return 'SATELLITE';
  }
  
  // Other BUY decisions are SMALL positions
  return 'SMALL';
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
    conviction: 85,
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
    // New fields
    alignment: 'BULLISH/BULLISH/NEUTRAL',
    insight: 'Strong positional trend with multi-timeframe support',
    confidenceLevel: 'VERY_HIGH',
    // Phase 1: Decision Clarity
    decision: 'BUY', // Default for high conviction
    setupType: 'PULLBACK', // Default setup type
    volumeVisibility: 'NORMAL', // Default volume visibility
    riskLevel: 'MEDIUM', // Default risk level
  };
  
  const result = { ...base, ...overrides };
  
  // Ensure decision is calculated if not overridden
  if (!overrides.decision) {
    result.decision = getMockDecision(result.conviction || result.score, result.alignment);
  }
  
  // Ensure setup type is calculated if not overridden
  if (!overrides.setupType) {
    result.setupType = getMockSetupType(result.alignment, result.changePct);
  }
  
  // Ensure volume visibility is calculated if not overridden
  if (!overrides.volumeVisibility) {
    result.volumeVisibility = getMockVolumeVisibility(result.volume);
  }
  
  // Ensure risk level is calculated if not overridden
  if (!overrides.riskLevel) {
    result.riskLevel = getMockRiskLevel(result.alignment);
  }

  // Ensure entry quality is calculated if not overridden
  if (!overrides.entryQuality) {
    result.entryQuality = getMockEntryQuality(result.conviction || result.score, result.alignment);
  }

  // Ensure distance to support is calculated if not overridden
  if (!overrides.distanceToSupport) {
    result.distanceToSupport = getMockDistanceToSupport(result.changePct, result.alignment);
  }

  // Ensure trend strength is calculated if not overridden
  if (!overrides.trendStrength) {
    result.trendStrength = getMockTrendStrength(result.alignment, result.conviction || result.score);
  }

  // Ensure portfolio relevance is calculated if not overridden
  if (!overrides.portfolioRelevance) {
    result.portfolioRelevance = getMockPortfolioRelevance(
      result.decision,
      result.conviction || result.score,
      result.riskLevel,
      result.entryQuality
    );
  }
  
  return result;
};

export const generateMockOpportunities = (count: number = 10): SimplifiedOpportunity[] => {
  const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'JPM', 'JNJ', 'V'];
  const sectors = ['Technology', 'Healthcare', 'Financial', 'Consumer', 'Industrial'];
  
  const alignments = [
    'BULLISH/BULLISH/BULLISH',
    'BULLISH/BULLISH/NEUTRAL',
    'BULLISH/BEARISH/BEARISH',
    'NEUTRAL/NEUTRAL/NEUTRAL',
    'BEARISH/BEARISH/BEARISH',
  ];
  
  const insights = [
    'Strong positional trend with multi-timeframe support',
    'Short-term bounce against larger downtrend (risky)',
    'Strong downtrend across all timeframes (avoid)',
    'Consolidation phase, waiting for breakout',
    'Mixed signals, low conviction setup',
  ];
  
  const confidenceLevels = ['VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW'] as const;

  return Array.from({ length: count }, (_, i) => {
    const baseScore = 50 + Math.random() * 50;
    const alignment = alignments[i % alignments.length];
    
    // Apply penalty for bearish alignments (matching backend logic)
    let conviction = Math.round(baseScore);
    const parts = alignment.split('/');
    const weeklyTrend = parts.length > 1 ? parts[1] : 'NEUTRAL';
    
    // Check if this would have bullish signals (RSI oversold, MACD bullish)
    // For mock data, we'll assume 50% chance of bullish signals
    const hasBullishSignals = Math.random() > 0.5;
    
    if (weeklyTrend === "BEARISH") {
      // Base penalty for bearish weekly trend
      conviction = Math.round(conviction * 0.6); // reduce by 40% for bearish weekly trend
      
      // Additional penalty for bullish signals in bearish trends (dead-cat bounces)
      if (hasBullishSignals) {
        conviction = Math.round(conviction * 0.7); // additional 30% penalty (total ~58% reduction)
      }
    }
    
    const confidenceIndex = Math.floor(conviction / 25);
    
    // Calculate decision based on conviction and alignment
    const decision = getMockDecision(conviction, alignment);
    
    const changePct = -5 + Math.random() * 10;
    const volume = 10000000 + Math.random() * 40000000;
    const setupType = getMockSetupType(alignment, changePct);
    const volumeVisibility = getMockVolumeVisibility(volume);
    
    return generateMockOpportunity({
      id: `mock-${i}`,
      symbol: symbols[i % symbols.length],
      companyName: `${symbols[i % symbols.length]} Company`,
      price: 100 + Math.random() * 200,
      changePct: changePct,
      changeAmount: -10 + Math.random() * 20,
      volume: volume,
      score: conviction, // Score should match conviction
      conviction: conviction,
      confidence: 60 + Math.random() * 40,
      rank: i + 1,
      sector: sectors[i % sectors.length],
      marketCap: 1000000000 + Math.random() * 9000000000,
      alignment: alignment,
      insight: insights[i % insights.length],
      confidenceLevel: confidenceLevels[Math.min(confidenceIndex, 3)],
      decision: decision,
      setupType: setupType,
      volumeVisibility: volumeVisibility,
    });
  });
};
