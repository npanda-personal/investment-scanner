/**
 * Real-Time Scanner TypeScript Interfaces
 * 
 * These interfaces define the data structures for the new real-time scanner UX
 * as specified in the design documents at plans/ux-design/scanner/
 */

// ==================== Core Data Types ====================

export interface ScanSession {
  id: string;
  userId: string;
  name: string;
  description?: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  scopeType: 'preset' | 'watchlist' | 'custom' | 'database';
  scopeData: {
    presetId?: string;
    watchlistId?: string;
    symbols?: string[];
    filters?: Record<string, any>;
  };
  signals: SignalDefinition[];
  rankingConfig: RankingConfig;
  totalSymbols: number;
  symbolsProcessed: number;
  opportunitiesFound: number;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface ScoredOpportunity {
  id: string;
  sessionId: string;
  symbol: string;
  score: number;
  confidence: number; // 0-100
  signals: Signal[];
  metadata: {
    price: number;
    change: number;
    volume: number;
    marketCap?: number;
    sector?: string;
    industry?: string;
  };
  detectedAt: string;
  rank: number;
}

export interface Signal {
  type: SignalType;
  name: string;
  description: string;
  confidence: number; // 0-100
  parameters: Record<string, any>;
  value: number;
  threshold: number;
  direction: 'bullish' | 'bearish' | 'neutral';
  timestamp: string;
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

export interface SignalDefinition {
  id: string;
  type: SignalType;
  name: string;
  description: string;
  enabled: boolean;
  parameters: Record<string, any>;
  weight: number; // 0-100 for ranking
  threshold?: number;
}

export interface RankingConfig {
  signalWeight: number; // 0-100
  volumeWeight: number; // 0-100
  changeWeight: number; // 0-100
  recencyWeight: number; // 0-100
  confidenceThreshold: number; // 0-100
  maxResults: number;
}

export interface ScanPreset {
  id: string;
  name: string;
  description: string;
  category: string;
  scopeType: 'preset' | 'watchlist' | 'custom' | 'database';
  scopeData: {
    presetId?: string;
    watchlistId?: string;
    symbols?: string[];
    filters?: Record<string, any>;
  };
  signals: SignalDefinition[];
  rankingConfig: RankingConfig;
  isDefault: boolean;
  usageCount: number;
  successRate?: number;
  createdAt: string;
  updatedAt: string;
}

// ==================== API Response Types ====================

export interface DashboardStats {
  activeSessions: number;
  totalSessions: number;
  opportunitiesFound: number;
  avgScanTime: number; // seconds
  successRate: number; // percentage
  topSignals: Array<{
    type: SignalType;
    count: number;
    avgConfidence: number;
  }>;
}

export interface ScanProgressResponse {
  sessionId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  progress: number; // 0-100
  symbolsProcessed: number;
  totalSymbols: number;
  opportunitiesFound: number;
  processingRate: number; // symbols per second
  estimatedCompletion?: string;
  chunks: ChunkStatus[];
  startedAt: string;
  updatedAt: string;
}

export interface ChunkStatus {
  index: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  symbols: string[];
  processed: number;
  total: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface DashboardData {
  stats: DashboardStats;
  recentSessions: ScanSession[];
  recentOpportunities: ScoredOpportunity[];
  topPresets: ScanPreset[];
}

// ==================== Request Types ====================

export interface TriggerScanRequest {
  scope: {
    type: 'preset' | 'watchlist' | 'custom' | 'database';
    presetId?: string;
    watchlistId?: string;
    symbols?: string[];
    filters?: Record<string, any>;
  };
  signals: SignalDefinition[];
  rankingConfig: RankingConfig;
  name?: string;
  description?: string;
}

export interface SessionConfig {
  scope: {
    type: 'preset' | 'watchlist' | 'custom' | 'database';
    presetId?: string;
    watchlistId?: string;
    symbols?: string[];
    filters?: Record<string, any>;
  };
  signals: SignalDefinition[];
  rankingConfig: RankingConfig;
  name: string;
  description?: string;
}

export interface ResultFilters {
  confidenceMin: number;
  confidenceMax: number;
  signalTypes: SignalType[];
  sectors: string[];
  marketCapMin?: number;
  marketCapMax?: number;
  changeMin?: number;
  changeMax?: number;
}

export interface SortConfig {
  field: 'score' | 'confidence' | 'price' | 'change' | 'volume' | 'detectedAt';
  direction: 'asc' | 'desc';
}

// ==================== Component Prop Types ====================

export interface ScannerDashboardProps {
  userId?: string;
  onSessionSelect?: (sessionId: string) => void;
  onQuickScan?: () => void;
  refreshInterval?: number;
}

export interface SessionCreationWizardProps {
  userId: string;
  onSuccess?: (sessionId: string) => void;
  onCancel?: () => void;
  initialPresetId?: string;
}

export interface SessionMonitorProps {
  sessionId: string;
  userId: string;
  onSessionComplete?: (results: ScoredOpportunity[]) => void;
  onSessionCancel?: () => void;
}

export interface ResultsViewProps {
  sessionId: string;
  userId: string;
  initialFilters?: ResultFilters;
  onOpportunitySelect?: (opportunity: ScoredOpportunity) => void;
}

export interface SignalVisualizationProps {
  signals: Signal[];
  opportunity: ScoredOpportunity;
  showConfidence?: boolean;
  interactive?: boolean;
  onSignalClick?: (signal: Signal) => void;
}

export interface ProgressTrackingProps {
  progress: ScanProgressResponse;
  showChunkDetails?: boolean;
  showTimeEstimate?: boolean;
  showMetrics?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'linear' | 'circular' | 'stepper';
}

export interface RankingConfigurationProps {
  initialWeights: RankingConfig;
  onChange: (weights: RankingConfig) => void;
  showPresets?: boolean;
}

export interface BatchScanVisualizationProps {
  chunks: ChunkStatus[];
  totalSymbols: number;
  processingRate: number;
  onChunkClick?: (chunkIndex: number) => void;
}

export interface ScannerPresetManagerProps {
  userId: string;
  onPresetSelect?: (preset: ScanPreset) => void;
  onPresetSave?: (preset: ScanPreset) => void;
}

export interface RealTimeMetricsPanelProps {
  sessionId?: string;
  refreshInterval?: number;
  compact?: boolean;
}

// ==================== Context Types ====================

export interface ScannerContextType {
  activeSessions: ScanSession[];
  dashboardStats: DashboardStats;
  userPreferences: ScannerPreferences;
  addSession: (session: ScanSession) => void;
  updateSessionProgress: (sessionId: string, progress: ScanProgressResponse) => void;
  removeSession: (sessionId: string) => void;
}

export interface ScannerPreferences {
  defaultRefreshInterval: number;
  defaultSignalWeights: RankingConfig;
  favoritePresets: string[];
  autoStartMonitoring: boolean;
  notificationsEnabled: boolean;
}

// ==================== Utility Types ====================

export interface EnhancedMarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  sector?: string;
  industry?: string;
  timestamp: string;
  indicators: Record<string, number>;
}

export interface SystemMetrics {
  processingRate: number;
  memoryUsage: number;
  cpuUtilization: number;
  cacheHitRate: number;
  errorRate: number;
  queueLength: number;
  timestamp: string;
}

export interface MetricsHistory {
  timestamp: string;
  metrics: SystemMetrics;
}

// ==================== Mock Data Generators ====================

export function generateMockSession(overrides?: Partial<ScanSession>): ScanSession {
  return {
    id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId: 'test-user-id',
    name: overrides?.name || 'S&P 500 Technical Scan',
    description: 'Scanning S&P 500 for RSI oversold and EMA crossover signals',
    status: overrides?.status || 'PROCESSING',
    scopeType: 'preset',
    scopeData: {
      presetId: 'sp500-preset',
      filters: {},
    },
    signals: [
      { id: '1', type: 'RSI', name: 'RSI Oversold', description: 'RSI below 30', enabled: true, parameters: { period: 14 }, weight: 40 },
      { id: '2', type: 'EMA', name: 'EMA Crossover', description: 'EMA 9 crossing above EMA 21', enabled: true, parameters: { fast: 9, slow: 21 }, weight: 35 },
      { id: '3', type: 'VOLUME', name: 'Volume Spike', description: 'Volume > 150% of average', enabled: true, parameters: { multiplier: 1.5 }, weight: 25 },
    ],
    rankingConfig: {
      signalWeight: 60,
      volumeWeight: 20,
      changeWeight: 15,
      recencyWeight: 5,
      confidenceThreshold: 70,
      maxResults: 50,
    },
    totalSymbols: 505,
    symbolsProcessed: 243,
    opportunitiesFound: 12,
    startedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function generateMockOpportunity(overrides?: Partial<ScoredOpportunity>): ScoredOpportunity {
  return {
    id: `opp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    sessionId: `session-${Date.now()}`,
    symbol: overrides?.symbol || 'AAPL',
    score: overrides?.score || 87.5,
    confidence: overrides?.confidence || 82,
    signals: [
      {
        type: 'RSI',
        name: 'RSI Oversold',
        description: 'RSI below 30',
        confidence: 85,
        parameters: { period: 14 },
        value: 28.5,
        threshold: 30,
        direction: 'bullish',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      },
      {
        type: 'EMA',
        name: 'EMA Crossover',
        description: 'EMA 9 crossing above EMA 21',
        confidence: 79,
        parameters: { fast: 9, slow: 21 },
        value: 1.2,
        threshold: 0,
        direction: 'bullish',
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      },
    ],
    metadata: {
      price: 175.42,
      change: 2.34,
      volume: 12500000,
      marketCap: 2750000000000,
      sector: 'Technology',
      industry: 'Consumer Electronics',
    },
    detectedAt: new Date().toISOString(),
    rank: overrides?.rank || 1,
    ...overrides,
  };
}

export function generateMockProgress(overrides?: Partial<ScanProgressResponse>): ScanProgressResponse {
  return {
    sessionId: `session-${Date.now()}`,
    status: 'PROCESSING',
    progress: 48,
    symbolsProcessed: 243,
    totalSymbols: 505,
    opportunitiesFound: 12,
    processingRate: 8.1,
    estimatedCompletion: new Date(Date.now() + 32 * 60 * 1000).toISOString(),
    chunks: [
      { index: 0, status: 'COMPLETED', symbols: ['AAPL', 'MSFT', 'GOOGL'], processed: 50, total: 50, startedAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(), completedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
      { index: 1, status: 'COMPLETED', symbols: ['AMZN', 'TSLA', 'NVDA'], processed: 50, total: 50, startedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), completedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString() },
      { index: 2, status: 'PROCESSING', symbols: ['META', 'JPM', 'V'], processed: 32, total: 50, startedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString() },
      { index: 3, status: 'PENDING', symbols: ['WMT', 'PG', 'JNJ'], processed: 0, total: 50 },
      { index: 4, status: 'PENDING', symbols: ['XOM', 'CVX', 'BAC'], processed: 0, total: 50 },
    ],
    startedAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}