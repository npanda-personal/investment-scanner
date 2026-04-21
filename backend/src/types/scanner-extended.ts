// Extended types for real-time scanner module
// This file extends the existing scanner types

// Re-export MarketData interface from evaluator
export interface MarketData {
  symbol: string;
  latestPrice?: {
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
    timestamp: Date;
  };
  historicalPrices?: Array<{
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
    timestamp: Date;
  }>;
}

export interface Signal {
  type: 'RSI' | 'EMA' | 'MACD' | 'VOLUME' | 'PRICE_CHANGE' | 'CROSSOVER';
  name: string; // e.g., 'RSI_OVERSOLD', 'EMA_CROSSOVER_BULLISH'
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  strength: number; // 0-1 confidence score
  timestamp: Date;
  metadata: Record<string, any>;
}

export interface CrossoverDetection {
  previousValue: number;
  currentValue: number;
  threshold: number;
  crossedAbove: boolean;
  crossedBelow: boolean;
}

export interface RankingConfig {
  signalWeights: Record<string, number>; // Signal type → weight
  volumeWeight: number;
  priceChangeWeight: number;
  recencyBias: number; // Favor recent signals
}

export interface ScoredOpportunity {
  symbol: string;
  price: number;
  changePercent: number;
  volume: number;
  signals: Signal[];
  score: number;
  breakdown: {
    alignmentScore: number;
    momentumScore: number;
    volumeScore: number;
  };
  rank: number;
  // New fields for enhanced insights
  alignment?: string; // e.g., "BULLISH/NEUTRAL/BEARISH"
  insight?: string; // Human-readable insight
  indicators?: Record<string, number>; // Daily timeframe indicators
  // Phase 1: Decision Clarity
  decision?: 'BUY' | 'WATCH' | 'AVOID'; // Clear trading decision
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

export interface ScanSession {
  id: string;
  userId: string;
  scopeType: 'PRESET' | 'WATCHLIST' | 'CUSTOM';
  scopeData: {
    presetId?: string;
    watchlistId?: string;
    symbols?: string[];
    filters?: {
      region?: string;
      marketCapMin?: number;
      marketCapMax?: number;
      sector?: string;
    };
  };
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  startedAt: Date;
  completedAt?: Date;
  results?: ScoredOpportunity[];
  metadata?: {
    symbolsScanned: number;
    durationMs: number;
    signalsDetected: number;
    apiCallsMade: number;
    cacheHitRate: number;
    errorCount: number;
  };
}

export interface SignalDefinition {
  id: string;
  type: 'RSI' | 'EMA' | 'MACD' | 'VOLUME' | 'PRICE_CHANGE' | 'CROSSOVER';
  name: string;
  code: string;
  description?: string;
  parameters: Record<string, any>;
  weight: number;
  isActive: boolean;
  category: 'MOMENTUM' | 'TREND' | 'VOLUME' | 'VOLATILITY';
  confidence: number;
}

export interface ScanPreset {
  id: string;
  name: string;
  code: string;
  description?: string;
  symbols: string[];
  isActive: boolean;
  category?: 'INDEX' | 'SECTOR' | 'MARKET_CAP';
  region?: 'US' | 'EU' | 'ASIA' | 'GLOBAL';
}

export interface ScannerConfig {
  id: string;
  key: string;
  value: any;
  description?: string;
  category: 'PERFORMANCE' | 'RATE_LIMIT' | 'SIGNAL' | 'UI';
  isUserConfigurable: boolean;
}

export interface BatchRequest<T> {
  symbols: string[];
  requestFn: (symbols: string[]) => Promise<T[]>;
  chunkSize: number;
  delayBetweenChunks: number;
}

export interface MarketDataRequest {
  symbols: string[];
  indicators: string[];
  periods: string[];
  includeHistorical: boolean;
}

export interface TimeframeData {
  indicators: Record<string, number>;
  latestPrice?: {
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
    timestamp: Date;
  };
  historicalPrices?: Array<{
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
    timestamp: Date;
  }>;
}

export interface EnhancedMarketData extends MarketData {
  // For backward compatibility, keep indicators as daily timeframe
  indicators: Record<string, number>;
  // New multi-timeframe structure
  timeframes?: {
    daily: TimeframeData;
    weekly: TimeframeData;
    monthly: TimeframeData;
  };
  signals: Signal[];
  metadata: {
    lastUpdated: Date;
    source: string;
    confidence: number;
  };
}

export interface TriggerScanRequest {
  scope: {
    type: 'PRESET' | 'WATCHLIST' | 'CUSTOM';
    presetId?: string; // e.g., 'TOP_100', 'SP500'
    watchlistId?: string;
    symbols?: string[];
  };
  signals?: string[]; // Specific signals to detect (empty = all)
  rankingConfig?: Partial<RankingConfig>;
}

export interface ScanProgressResponse {
  sessionId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
  estimatedTimeRemaining?: number; // in seconds
  currentChunk?: string[]; // Symbols being processed
}

export interface ScannerDashboardResponse {
  recentScans: ScanSession[];
  topOpportunities: ScoredOpportunity[];
  signalStats: Record<string, number>;
  lastUpdated: Date;
}

// WebSocket events (for future implementation)
export interface ScannerWebSocketEvents {
  'scan:started': { sessionId: string; totalSymbols: number };
  'scan:progress': { sessionId: string; completed: number; total: number };
  'scan:chunkComplete': { sessionId: string; symbols: string[]; signalsFound: number };
  'scan:completed': { sessionId: string; results: ScoredOpportunity[] };
  'scan:error': { sessionId: string; error: string };
}