import axios from 'axios';
import {
  ScanSession,
  ScoredOpportunity,
  DashboardStats,
  ScanProgressResponse,
  SignalDefinition,
  ScanPreset,
  SessionConfig,
  TriggerScanRequest,
  DashboardData,
  ResultFilters,
} from '../types/real-time-scanner';

const API_BASE = '/api';
const REAL_TIME_SCANNER_BASE = `${API_BASE}/real-time-scanner`;

// Helper to get current user ID (in a real app, this would come from auth context)
const getCurrentUserId = (): string => {
  // TODO: Replace with actual user ID from auth context
  return 'test-user-id';
};

// Helper to handle API errors
const handleApiError = (error: any, context: string): never => {
  console.error(`Error in ${context}:`, error);
  if (error.response) {
    throw new Error(`${context}: ${error.response.data?.message || error.response.statusText}`);
  } else if (error.request) {
    throw new Error(`${context}: No response from server`);
  } else {
    throw new Error(`${context}: ${error.message}`);
  }
};

// Dashboard API
export const fetchDashboardData = async (): Promise<DashboardData> => {
  try {
    const userId = getCurrentUserId();
    const response = await axios.get(`${REAL_TIME_SCANNER_BASE}/dashboard`, {
      params: { userId },
    });
    return response.data;
  } catch (error) {
    handleApiError(error, 'fetchDashboardData');
    throw error;
  }
};

export const fetchDashboardStats = async (): Promise<DashboardStats> => {
  try {
    const userId = getCurrentUserId();
    const response = await axios.get(`${REAL_TIME_SCANNER_BASE}/dashboard/stats`, {
      params: { userId },
    });
    return response.data;
  } catch (error) {
    handleApiError(error, 'fetchDashboardStats');
    throw error;
  }
};

// Session Management API
export const startScanSession = async (config: SessionConfig): Promise<ScanSession> => {
  try {
    const userId = getCurrentUserId();
    const request: TriggerScanRequest = {
      scope: config.scope,
      signals: config.signals,
      rankingConfig: config.rankingConfig,
      name: config.name,
      description: config.description,
    };
    
    const response = await axios.post(`${REAL_TIME_SCANNER_BASE}/scan/start`, request, {
      params: { userId },
    });
    return response.data;
  } catch (error) {
    handleApiError(error, 'startScanSession');
    throw error;
  }
};

export const fetchScanSession = async (sessionId: string): Promise<ScanSession> => {
  try {
    const response = await axios.get(`${REAL_TIME_SCANNER_BASE}/scan/${sessionId}`);
    return response.data;
  } catch (error) {
    handleApiError(error, 'fetchScanSession');
    throw error;
  }
};

export const fetchSessionProgress = async (sessionId: string): Promise<ScanProgressResponse> => {
  try {
    const response = await axios.get(`${REAL_TIME_SCANNER_BASE}/scan/${sessionId}/progress`);
    return response.data;
  } catch (error) {
    handleApiError(error, 'fetchSessionProgress');
    throw error;
  }
};

export const fetchSessionResults = async (
  sessionId: string, 
  filters?: ResultFilters,
  page = 1,
  pageSize = 50
): Promise<{ opportunities: ScoredOpportunity[]; total: number }> => {
  try {
    const response = await axios.get(`${REAL_TIME_SCANNER_BASE}/scan/${sessionId}/results`, {
      params: { 
        ...filters,
        page,
        pageSize,
      },
    });
    return response.data;
  } catch (error) {
    handleApiError(error, 'fetchSessionResults');
    throw error;
  }
};

export const cancelScanSession = async (sessionId: string): Promise<void> => {
  try {
    await axios.post(`${REAL_TIME_SCANNER_BASE}/scan/${sessionId}/cancel`);
  } catch (error) {
    handleApiError(error, 'cancelScanSession');
    throw error;
  }
};

export const fetchActiveSessions = async (): Promise<ScanSession[]> => {
  try {
    const userId = getCurrentUserId();
    const response = await axios.get(`${REAL_TIME_SCANNER_BASE}/sessions`, {
      params: { userId, status: 'PROCESSING' },
    });
    return response.data;
  } catch (error) {
    handleApiError(error, 'fetchActiveSessions');
    throw error;
  }
};

export const fetchRecentSessions = async (limit = 10): Promise<ScanSession[]> => {
  try {
    const userId = getCurrentUserId();
    const response = await axios.get(`${REAL_TIME_SCANNER_BASE}/sessions`, {
      params: { userId, limit, sort: 'updatedAt:desc' },
    });
    return response.data;
  } catch (error) {
    handleApiError(error, 'fetchRecentSessions');
    throw error;
  }
};

// Signal Definitions API
export const fetchSignalDefinitions = async (): Promise<SignalDefinition[]> => {
  try {
    const response = await axios.get(`${REAL_TIME_SCANNER_BASE}/signals`);
    return response.data;
  } catch (error) {
    handleApiError(error, 'fetchSignalDefinitions');
    throw error;
  }
};

// Presets API
export const fetchScanPresets = async (): Promise<ScanPreset[]> => {
  try {
    const response = await axios.get(`${REAL_TIME_SCANNER_BASE}/presets`);
    return response.data;
  } catch (error) {
    handleApiError(error, 'fetchScanPresets');
    throw error;
  }
};

export const fetchScanPreset = async (presetId: string): Promise<ScanPreset> => {
  try {
    const response = await axios.get(`${REAL_TIME_SCANNER_BASE}/presets/${presetId}`);
    return response.data;
  } catch (error) {
    handleApiError(error, 'fetchScanPreset');
    throw error;
  }
};

export const createScanPreset = async (preset: Omit<ScanPreset, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScanPreset> => {
  try {
    const userId = getCurrentUserId();
    const response = await axios.post(`${REAL_TIME_SCANNER_BASE}/presets`, {
      ...preset,
      userId,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, 'createScanPreset');
    throw error;
  }
};

export const updateScanPreset = async (presetId: string, updates: Partial<ScanPreset>): Promise<ScanPreset> => {
  try {
    const response = await axios.put(`${REAL_TIME_SCANNER_BASE}/presets/${presetId}`, updates);
    return response.data;
  } catch (error) {
    handleApiError(error, 'updateScanPreset');
    throw error;
  }
};

export const deleteScanPreset = async (presetId: string): Promise<void> => {
  try {
    await axios.delete(`${REAL_TIME_SCANNER_BASE}/presets/${presetId}`);
  } catch (error) {
    handleApiError(error, 'deleteScanPreset');
    throw error;
  }
};

// Quick Scan API
export const startQuickScan = async (symbols: string[], signalTypes?: string[]): Promise<ScanSession> => {
  try {
    const userId = getCurrentUserId();
    const request: TriggerScanRequest = {
      scope: {
        type: 'custom',
        symbols,
      },
      signals: signalTypes 
        ? signalTypes.map(type => ({ 
            id: `quick-${type}`, 
            type: type as any, 
            name: type, 
            description: `Quick ${type} scan`,
            enabled: true,
            parameters: {},
            weight: 100 / (signalTypes.length || 1),
          }))
        : [],
      rankingConfig: {
        signalWeight: 70,
        volumeWeight: 15,
        changeWeight: 10,
        recencyWeight: 5,
        confidenceThreshold: 60,
        maxResults: 20,
      },
      name: `Quick Scan - ${new Date().toLocaleTimeString()}`,
      description: 'Quick scan session',
    };
    
    const response = await axios.post(`${REAL_TIME_SCANNER_BASE}/scan/quick`, request, {
      params: { userId },
    });
    return response.data;
  } catch (error) {
    handleApiError(error, 'startQuickScan');
    throw error;
  }
};

// Export API
export const exportResultsToCSV = async (sessionId: string): Promise<Blob> => {
  try {
    const response = await axios.get(`${REAL_TIME_SCANNER_BASE}/scan/${sessionId}/export/csv`, {
      responseType: 'blob',
    });
    return response.data;
  } catch (error) {
    handleApiError(error, 'exportResultsToCSV');
    throw error;
  }
};

export const exportResultsToJSON = async (sessionId: string): Promise<any> => {
  try {
    const response = await axios.get(`${REAL_TIME_SCANNER_BASE}/scan/${sessionId}/export/json`);
    return response.data;
  } catch (error) {
    handleApiError(error, 'exportResultsToJSON');
    throw error;
  }
};

// Mock data for development (when backend is not available)
// In a real app, this would check environment variables
const isMockMode = false; // Use real API calls now that backend is available

// Import mock data generators from types
import { generateMockSession, generateMockOpportunity, generateMockProgress } from '../types/real-time-scanner';

export const mockFetchDashboardData = async (): Promise<DashboardData> => {
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
  
  // Generate mock sessions
  const recentSessions = Array.from({ length: 5 }, (_, i) => 
    generateMockSession({
      id: `session-${i}`,
      name: `Session ${i + 1}`,
      status: i === 0 ? 'PROCESSING' : i === 1 ? 'COMPLETED' : 'FAILED',
    })
  );
  
  // Generate mock opportunities
  const recentOpportunities = Array.from({ length: 8 }, (_, i) => 
    generateMockOpportunity({
      id: `opp-${i}`,
      symbol: `AAPL${i}`,
      score: 85 - i * 5,
      confidence: 75 + i * 3,
      rank: i + 1,
    })
  );
  
  return {
    stats: {
      activeSessions: 3,
      totalSessions: 42,
      opportunitiesFound: 156,
      avgScanTime: 127,
      successRate: 87,
      topSignals: [
        { type: 'RSI', count: 89, avgConfidence: 78 },
        { type: 'EMA', count: 67, avgConfidence: 72 },
        { type: 'VOLUME', count: 45, avgConfidence: 65 },
        { type: 'MACD', count: 32, avgConfidence: 81 },
      ],
    },
    recentSessions,
    recentOpportunities,
    topPresets: [
      {
        id: 'preset-1',
        name: 'Quick Technical Scan',
        description: 'Basic RSI and EMA signals for quick scanning',
        category: 'technical',
        scopeType: 'preset',
        scopeData: { presetId: 'preset-1' },
        signals: [
          { id: 'signal-1', type: 'RSI', name: 'RSI', description: 'Relative Strength Index', enabled: true, parameters: { period: 14 }, weight: 25, threshold: 30 },
          { id: 'signal-2', type: 'EMA', name: 'EMA Crossover', description: 'Exponential Moving Average Crossover', enabled: true, parameters: { shortPeriod: 9, longPeriod: 21 }, weight: 20 },
        ],
        rankingConfig: {
          signalWeight: 60,
          volumeWeight: 20,
          changeWeight: 15,
          recencyWeight: 5,
          confidenceThreshold: 60,
          maxResults: 50,
        },
        isDefault: true,
        usageCount: 142,
        successRate: 87,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'preset-2',
        name: 'Comprehensive Momentum',
        description: 'Full momentum analysis with volume confirmation',
        category: 'momentum',
        scopeType: 'preset',
        scopeData: { presetId: 'preset-2' },
        signals: [
          { id: 'signal-1', type: 'RSI', name: 'RSI', description: 'Relative Strength Index', enabled: true, parameters: { period: 14 }, weight: 20, threshold: 30 },
          { id: 'signal-2', type: 'EMA', name: 'EMA Crossover', description: 'Exponential Moving Average Crossover', enabled: true, parameters: { shortPeriod: 9, longPeriod: 21 }, weight: 20 },
          { id: 'signal-3', type: 'MACD', name: 'MACD', description: 'Moving Average Convergence Divergence', enabled: true, parameters: {}, weight: 20 },
          { id: 'signal-4', type: 'VOLUME', name: 'Volume Spike', description: 'Volume Spike Detection', enabled: true, parameters: { multiplier: 2.0 }, weight: 15, threshold: 2.0 },
          { id: 'signal-5', type: 'PRICE_CHANGE', name: 'Price Change', description: 'Price Change Percentage', enabled: true, parameters: { period: 1 }, weight: 25, threshold: 5.0 },
        ],
        rankingConfig: {
          signalWeight: 70,
          volumeWeight: 15,
          changeWeight: 10,
          recencyWeight: 5,
          confidenceThreshold: 65,
          maxResults: 100,
        },
        isDefault: false,
        usageCount: 89,
        successRate: 82,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ],
  };
};

export const mockFetchSignalDefinitions = async (): Promise<SignalDefinition[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return [
    { id: 'signal-1', type: 'RSI', name: 'RSI', description: 'Relative Strength Index', enabled: true, parameters: { period: 14 }, weight: 25, threshold: 30 },
    { id: 'signal-2', type: 'EMA', name: 'EMA Crossover', description: 'Exponential Moving Average Crossover', enabled: true, parameters: { shortPeriod: 9, longPeriod: 21 }, weight: 20 },
    { id: 'signal-3', type: 'MACD', name: 'MACD', description: 'Moving Average Convergence Divergence', enabled: true, parameters: {}, weight: 20 },
    { id: 'signal-4', type: 'VOLUME', name: 'Volume Spike', description: 'Volume Spike Detection', enabled: true, parameters: { multiplier: 2.0 }, weight: 15, threshold: 2.0 },
    { id: 'signal-5', type: 'PRICE_CHANGE', name: 'Price Change', description: 'Price Change Percentage', enabled: true, parameters: { period: 1 }, weight: 25, threshold: 5.0 },
  ];
};

export const mockFetchScanPresets = async (): Promise<ScanPreset[]> => {
  await new Promise(resolve => setTimeout(resolve, 400));
  
  return [
    { 
      id: 'preset-1', 
      name: 'Quick Technical Scan', 
      description: 'Basic RSI and EMA signals for quick scanning',
      category: 'technical',
      scopeType: 'preset',
      scopeData: { presetId: 'preset-1' },
      signals: [
        { id: 'signal-1', type: 'RSI', name: 'RSI', description: 'Relative Strength Index', enabled: true, parameters: { period: 14 }, weight: 25, threshold: 30 },
        { id: 'signal-2', type: 'EMA', name: 'EMA Crossover', description: 'Exponential Moving Average Crossover', enabled: true, parameters: { shortPeriod: 9, longPeriod: 21 }, weight: 20 },
      ],
      rankingConfig: {
        signalWeight: 60,
        volumeWeight: 20,
        changeWeight: 15,
        recencyWeight: 5,
        confidenceThreshold: 60,
        maxResults: 50,
      },
      isDefault: true,
      usageCount: 142,
      successRate: 87,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    { 
      id: 'preset-2', 
      name: 'Comprehensive Momentum', 
      description: 'Full momentum analysis with volume confirmation',
      category: 'momentum',
      scopeType: 'preset',
      scopeData: { presetId: 'preset-2' },
      signals: [
        { id: 'signal-1', type: 'RSI', name: 'RSI', description: 'Relative Strength Index', enabled: true, parameters: { period: 14 }, weight: 20, threshold: 30 },
        { id: 'signal-2', type: 'EMA', name: 'EMA Crossover', description: 'Exponential Moving Average Crossover', enabled: true, parameters: { shortPeriod: 9, longPeriod: 21 }, weight: 20 },
        { id: 'signal-3', type: 'MACD', name: 'MACD', description: 'Moving Average Convergence Divergence', enabled: true, parameters: {}, weight: 20 },
        { id: 'signal-4', type: 'VOLUME', name: 'Volume Spike', description: 'Volume Spike Detection', enabled: true, parameters: { multiplier: 2.0 }, weight: 15, threshold: 2.0 },
        { id: 'signal-5', type: 'PRICE_CHANGE', name: 'Price Change', description: 'Price Change Percentage', enabled: true, parameters: { period: 1 }, weight: 25, threshold: 5.0 },
      ],
      rankingConfig: {
        signalWeight: 70,
        volumeWeight: 15,
        changeWeight: 10,
        recencyWeight: 5,
        confidenceThreshold: 65,
        maxResults: 100,
      },
      isDefault: false,
      usageCount: 89,
      successRate: 82,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ];
};

// Mock implementations for other API functions
export const mockStartScanSession = async (config: SessionConfig): Promise<ScanSession> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  return generateMockSession({
    name: config.name,
    description: config.description,
    status: 'PROCESSING',
  });
};

export const mockFetchSessionProgress = async (sessionId: string): Promise<ScanProgressResponse> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return generateMockProgress({
    sessionId,
    progress: Math.min(100, Math.floor(Math.random() * 100)),
  });
};

export const mockFetchSessionResults = async (
  sessionId: string, 
  filters?: ResultFilters,
  page = 1,
  pageSize = 50
): Promise<{ opportunities: ScoredOpportunity[]; total: number }> => {
  await new Promise(resolve => setTimeout(resolve, 600));
  
  const opportunities = Array.from({ length: pageSize }, (_, i) => 
    generateMockOpportunity({
      id: `opp-${(page - 1) * pageSize + i}`,
      symbol: `SYM${(page - 1) * pageSize + i}`,
      score: 90 - i * 2,
      confidence: 80 + i * 1.5,
      rank: (page - 1) * pageSize + i + 1,
    })
  );
  
  return {
    opportunities,
    total: 125,
  };
};

// Export the main service functions with mock fallback
const realTimeScannerService = {
  // Dashboard
  fetchDashboardData: isMockMode ? mockFetchDashboardData : fetchDashboardData,
  fetchDashboardStats: isMockMode ? async (): Promise<DashboardStats> => {
    const data = await mockFetchDashboardData();
    return data.stats;
  } : fetchDashboardStats,
  
  // Session Management
  startScanSession: isMockMode ? mockStartScanSession : startScanSession,
  fetchScanSession: isMockMode ? async (sessionId: string) => generateMockSession({ id: sessionId }) : fetchScanSession,
  fetchSessionProgress: isMockMode ? mockFetchSessionProgress : fetchSessionProgress,
  fetchSessionResults: isMockMode ? mockFetchSessionResults : fetchSessionResults,
  cancelScanSession: isMockMode ? async (sessionId: string) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    console.log(`Mock: Cancelled session ${sessionId}`);
  } : cancelScanSession,
  fetchActiveSessions: isMockMode ? async (): Promise<ScanSession[]> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    return Array.from({ length: 3 }, (_, i) =>
      generateMockSession({
        id: `active-${i}`,
        name: `Active Session ${i + 1}`,
        status: 'PROCESSING',
      })
    );
  } : fetchActiveSessions,
  fetchRecentSessions: isMockMode ? async (limit = 10): Promise<ScanSession[]> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    return Array.from({ length: Math.min(limit, 5) }, (_, i) =>
      generateMockSession({
        id: `recent-${i}`,
        name: `Recent Session ${i + 1}`,
        status: i === 0 ? 'PROCESSING' : 'COMPLETED',
      })
    );
  } : fetchRecentSessions,
  
  // Signals
  fetchSignalDefinitions: isMockMode ? mockFetchSignalDefinitions : fetchSignalDefinitions,
  
  // Presets
  fetchScanPresets: isMockMode ? mockFetchScanPresets : fetchScanPresets,
  fetchScanPreset: isMockMode ? async (presetId: string) => {
    const presets = await mockFetchScanPresets();
    const preset = presets.find(p => p.id === presetId);
    if (!preset) throw new Error(`Preset ${presetId} not found`);
    return preset;
  } : fetchScanPreset,
  createScanPreset: isMockMode ? async (preset: Omit<ScanPreset, 'id' | 'createdAt' | 'updatedAt'>) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      ...preset,
      id: `preset-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } : createScanPreset,
  updateScanPreset: isMockMode ? async (presetId: string, updates: Partial<ScanPreset>) => {
    await new Promise(resolve => setTimeout(resolve, 400));
    const presets = await mockFetchScanPresets();
    const preset = presets.find(p => p.id === presetId);
    if (!preset) throw new Error(`Preset ${presetId} not found`);
    return {
      ...preset,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
  } : updateScanPreset,
  deleteScanPreset: isMockMode ? async (presetId: string) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    console.log(`Mock: Deleted preset ${presetId}`);
  } : deleteScanPreset,
  
  // Quick Scan
  startQuickScan: isMockMode ? async (symbols: string[], signalTypes?: string[]) => {
    await new Promise(resolve => setTimeout(resolve, 600));
    return generateMockSession({
      name: `Quick Scan - ${symbols.length} symbols`,
      description: `Quick scan of ${symbols.join(', ')}`,
      status: 'PROCESSING',
    });
  } : startQuickScan,
  
  // Export
  exportResultsToCSV: isMockMode ? async (sessionId: string) => {
    await new Promise(resolve => setTimeout(resolve, 800));
    return new Blob(['Mock CSV data'], { type: 'text/csv' });
  } : exportResultsToCSV,
  exportResultsToJSON: isMockMode ? async (sessionId: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { message: 'Mock JSON export', sessionId, timestamp: new Date().toISOString() };
  } : exportResultsToJSON,
};

export default realTimeScannerService;