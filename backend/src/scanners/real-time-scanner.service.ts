/**
 * Real-Time Scanner Service
 * 
 * Orchestrates the real-time scanner components:
 * - Batch data fetching
 * - Signal detection
 * - Ranking engine
 * - Session storage
 * - Progress tracking
 */

import { PrismaClient } from '@prisma/client';
import { YahooFinanceIngestionService } from '../modules/market-data-foundation';
import { MarketDataBatchManager } from './batch-manager';
import { MarketDataService } from './market-data-service';
import { SignalDetector } from './signal-detector';
import { RankingEngine } from './ranking-engine';
import { SessionStorageService } from './session-storage';
import {
  ScanSession,
  ScoredOpportunity,
  TriggerScanRequest,
  ScanProgressResponse,
  ScannerDashboardResponse,
  SignalDefinition,
  ScanPreset,
  ScannerConfig,
  MarketDataRequest,
  EnhancedMarketData
} from '../types/scanner-extended';

export interface RealTimeScannerOptions {
  batchChunkSize?: number;
  batchDelayMs?: number;
  enableRedis?: boolean;
  maxConcurrentRequests?: number;
}

export class RealTimeScannerService {
  private prisma: PrismaClient;
  private yahooService: YahooFinanceIngestionService;
  private batchManager: MarketDataBatchManager;
  private marketDataService: MarketDataService;
  private signalDetector: SignalDetector;
  private rankingEngine: RankingEngine;
  private sessionStorage: SessionStorageService;
  private options: RealTimeScannerOptions;

  constructor(prisma?: PrismaClient, options: RealTimeScannerOptions = {}) {
    this.prisma = prisma || new PrismaClient();
    this.options = {
      batchChunkSize: 10,
      batchDelayMs: 1000,
      enableRedis: true,
      maxConcurrentRequests: 5,
      ...options
    };

    // Initialize components
    this.yahooService = new YahooFinanceIngestionService(this.prisma, this.options.batchDelayMs);
    this.batchManager = new MarketDataBatchManager();
    this.marketDataService = new MarketDataService(this.prisma, this.yahooService, this.batchManager);
    this.signalDetector = new SignalDetector(this.prisma);
    this.rankingEngine = new RankingEngine();
    this.sessionStorage = new SessionStorageService(this.prisma, {
      enableRedis: this.options.enableRedis,
    });
  }

  /**
   * Start a new scan session
   */
  async startScanSession(
    userId: string,
    request: TriggerScanRequest
  ): Promise<{ sessionId: string; totalSymbols: number }> {
    // Determine symbols to scan
    const symbols = await this.resolveScanSymbols(request.scope);
    if (symbols.length === 0) {
      throw new Error('No symbols to scan');
    }

    // Create session
    const session = await this.sessionStorage.createSession({
      userId,
      scopeType: request.scope.type,
      scopeData: {
        presetId: request.scope.presetId,
        watchlistId: request.scope.watchlistId,
        symbols: request.scope.symbols,
        filters: {},
      },
    });

    // Start scanning in background (non-blocking)
    this.scanInBackground(session.id, symbols, request.signals, request.rankingConfig)
      .catch(error => {
        console.error(`Background scan failed for session ${session.id}:`, error);
        this.sessionStorage.updateSession(session.id, {
          status: 'FAILED',
          completedAt: new Date(),
          metadata: {
            symbolsScanned: 0,
            durationMs: 0,
            signalsDetected: 0,
            apiCallsMade: 0,
            cacheHitRate: 0,
            errorCount: 1,
          },
        });
      });

    return {
      sessionId: session.id,
      totalSymbols: symbols.length,
    };
  }

  /**
   * Resolve symbols based on scan scope
   */
  private async resolveScanSymbols(scope: TriggerScanRequest['scope']): Promise<string[]> {
    switch (scope.type) {
      case 'PRESET':
        if (!scope.presetId) {
          throw new Error('Preset ID required for PRESET scope');
        }
        // Fetch preset from database
        const preset = await this.getScanPreset(scope.presetId);
        return preset?.symbols || [];
      
      case 'WATCHLIST':
        if (!scope.watchlistId) {
          throw new Error('Watchlist ID required for WATCHLIST scope');
        }
        // Fetch watchlist from database
        const watchlist = await this.prisma.watchlist.findUnique({
          where: { id: scope.watchlistId },
        });
        return watchlist?.symbols || [];
      
      case 'CUSTOM':
        if (!scope.symbols || scope.symbols.length === 0) {
          throw new Error('Symbols array required for CUSTOM scope');
        }
        return scope.symbols;
      
      default:
        throw new Error(`Unknown scope type: ${(scope as any).type}`);
    }
  }

  /**
   * Scan symbols in background
   */
  private async scanInBackground(
    sessionId: string,
    symbols: string[],
    signalTypes?: string[],
    _rankingConfig?: any  // Currently unused but kept for future extension
  ): Promise<void> {
    const startTime = Date.now();
    let symbolsScanned = 0;
    let signalsDetected = 0;
    let apiCallsMade = 0;
    let cacheHits = 0;
    let errors = 0;

    // Update session status
    await this.sessionStorage.updateSession(sessionId, {
      status: 'RUNNING',
    });

    const chunkSize = this.options.batchChunkSize!;
    const results: ScoredOpportunity[] = [];

    // Process symbols in chunks
    for (let i = 0; i < symbols.length; i += chunkSize) {
      const chunk = symbols.slice(i, i + chunkSize);
      // Note: chunk start time tracking removed as it was unused

      // Update progress using actual symbols scanned count
      await this.sessionStorage.updateProgress(sessionId, {
        completed: symbolsScanned,
        total: symbols.length,
        currentChunk: chunk,
        estimatedTimeRemaining: this.calculateETR(symbolsScanned, symbols.length, startTime),
      }, 'RUNNING');

      try {
        // Fetch market data for chunk
        const marketDataRequest: MarketDataRequest = {
          symbols: chunk,
          indicators: ['RSI', 'EMA', 'MACD', 'VOLUME'],
          periods: ['1d', '1w'],
          includeHistorical: true,
        };
        
        const marketDataResults = await this.marketDataService.fetchBatchData(marketDataRequest);
        apiCallsMade += chunk.length; // Simplified count
        cacheHits += marketDataResults.filter(data => data.metadata?.confidence > 0.8).length;

        // Process each symbol
        for (const data of marketDataResults) {
          if (!data) continue;

          symbolsScanned++;
          
          try {
            // Detect signals
            const signals = await this.signalDetector.detectAllSignals(data);
            const filteredSignals = signalTypes 
              ? signals.filter(s => signalTypes.includes(s.type))
              : signals;

            if (filteredSignals.length > 0) {
              signalsDetected += filteredSignals.length;

              // Score the opportunity using ranking engine
              const price = data.latestPrice?.close || 0;
              const volume = data.latestPrice?.volume || 0;
              // Note: changePercent calculation removed as it's calculated by the ranking engine
              
              // Create enhanced market data object for ranking
              const enhancedData: EnhancedMarketData = {
                symbol: data.symbol,
                latestPrice: {
                  open: price,
                  high: price,
                  low: price,
                  close: price,
                  volume: volume,
                  timestamp: new Date()
                },
                historicalPrices: [],
                indicators: data.indicators || {},
                signals: filteredSignals,
                metadata: {
                  lastUpdated: new Date(),
                  source: 'yahoo',
                  confidence: (data as any).confidence || 0.8,
                },
              };

              // Rank the opportunity using the ranking engine
              const scoredOpportunities = this.rankingEngine.rankOpportunities([enhancedData]);
              const scored = scoredOpportunities[0];

              results.push(scored);
            }
          } catch (error) {
            console.error(`Error processing symbol ${data.symbol}:`, error);
            errors++;
          }
        }

        // Add delay between chunks if needed
        if (i + chunkSize < symbols.length && this.options.batchDelayMs! > 0) {
          await new Promise(resolve => setTimeout(resolve, this.options.batchDelayMs!));
        }

      } catch (error) {
        console.error(`Error processing chunk ${i}-${i + chunkSize}:`, error);
        errors++;
      }
    }

    // Sort results by score
    const sortedResults = results.sort((a, b) => b.score - a.score);
    
    // Assign ranks
    sortedResults.forEach((result, index) => {
      result.rank = index + 1;
    });

    const durationMs = Date.now() - startTime;
    const cacheHitRate = apiCallsMade > 0 ? cacheHits / apiCallsMade : 0;

    // Update session with results
    await this.sessionStorage.updateSession(sessionId, {
      status: 'COMPLETED',
      completedAt: new Date(),
      results: sortedResults,
      metadata: {
        symbolsScanned,
        durationMs,
        signalsDetected,
        apiCallsMade,
        cacheHitRate,
        errorCount: errors,
      },
    });

    // Clear progress with COMPLETED status so frontend polling stops
    await this.sessionStorage.updateProgress(sessionId, {
      completed: symbols.length,
      total: symbols.length,
    }, 'COMPLETED');
  }

  /**
   * Get scan progress
   */
  async getScanProgress(sessionId: string): Promise<ScanProgressResponse | null> {
    return this.sessionStorage.getProgress(sessionId);
  }

  /**
   * Get scan results
   */
  async getScanResults(sessionId: string): Promise<ScoredOpportunity[] | null> {
    return this.sessionStorage.getResults(sessionId);
  }

  /**
   * Get session details
   */
  async getSession(sessionId: string): Promise<ScanSession | null> {
    return this.sessionStorage.getSession(sessionId);
  }

  /**
   * Get user's recent scan sessions
   */
  async getUserSessions(userId: string, limit: number = 10): Promise<ScanSession[]> {
    return this.sessionStorage.getUserSessions(userId, limit);
  }

  /**
   * Get scanner dashboard data
   */
  async getDashboardData(userId: string): Promise<ScannerDashboardResponse> {
    const recentScans = await this.getUserSessions(userId, 5);
    
    // Get top opportunities from recent completed scans
    const topOpportunities: ScoredOpportunity[] = [];
    const signalStats: Record<string, number> = {};

    for (const session of recentScans) {
      if (session.status === 'COMPLETED' && session.results) {
        // Take top 3 from each session
        const topFromSession = session.results.slice(0, 3);
        topOpportunities.push(...topFromSession);

        // Count signal types
        for (const opportunity of session.results) {
          for (const signal of opportunity.signals) {
            signalStats[signal.type] = (signalStats[signal.type] || 0) + 1;
          }
        }
      }
    }

    // Sort top opportunities by score and take top 10
    const sortedTopOpportunities = topOpportunities
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return {
      recentScans,
      topOpportunities: sortedTopOpportunities,
      signalStats,
      lastUpdated: new Date(),
    };
  }

  /**
   * Get signal definitions
   */
  async getSignalDefinitions(): Promise<SignalDefinition[]> {
    try {
      // Try to fetch from database
      if ((this.prisma as any).signalDefinition) {
        const dbDefinitions = await (this.prisma as any).signalDefinition.findMany({
          where: { isActive: true },
        });
        return dbDefinitions.map((def: any) => ({
          id: def.id,
          type: def.type,
          name: def.name,
          code: def.code,
          description: def.description,
          parameters: def.parameters,
          weight: def.weight,
          isActive: def.isActive,
          category: def.category,
          confidence: def.confidence,
        }));
      }
    } catch (error) {
      console.error('Error fetching signal definitions:', error);
    }

    // Return default signal definitions
    return [
      {
        id: 'rsi_oversold',
        type: 'RSI',
        name: 'RSI Oversold',
        code: 'RSI < 30',
        description: 'Relative Strength Index below 30 indicates oversold conditions',
        parameters: { period: 14, threshold: 30 },
        weight: 0.8,
        isActive: true,
        category: 'MOMENTUM',
        confidence: 0.7,
      },
      {
        id: 'rsi_overbought',
        type: 'RSI',
        name: 'RSI Overbought',
        code: 'RSI > 70',
        description: 'Relative Strength Index above 70 indicates overbought conditions',
        parameters: { period: 14, threshold: 70 },
        weight: 0.8,
        isActive: true,
        category: 'MOMENTUM',
        confidence: 0.7,
      },
      {
        id: 'ema_crossover_bullish',
        type: 'EMA',
        name: 'EMA Bullish Crossover',
        code: 'EMA(9) > EMA(21)',
        description: 'Short-term EMA crosses above long-term EMA',
        parameters: { shortPeriod: 9, longPeriod: 21 },
        weight: 0.9,
        isActive: true,
        category: 'TREND',
        confidence: 0.8,
      },
      {
        id: 'volume_spike',
        type: 'VOLUME',
        name: 'Volume Spike',
        code: 'Volume > 2x Average',
        description: 'Trading volume exceeds 2x the 20-day average',
        parameters: { lookbackPeriod: 20, multiplier: 2 },
        weight: 0.6,
        isActive: true,
        category: 'VOLUME',
        confidence: 0.6,
      },
    ];
  }

  /**
   * Get scan presets
   */
  async getScanPresets(): Promise<ScanPreset[]> {
    try {
      // Try to fetch from database
      if ((this.prisma as any).scanPreset) {
        const dbPresets = await (this.prisma as any).scanPreset.findMany({
          where: { isActive: true },
        });
        return dbPresets.map((preset: any) => ({
          id: preset.id,
          name: preset.name,
          code: preset.code,
          description: preset.description,
          symbols: preset.symbols,
          isActive: preset.isActive,
          category: preset.category,
          region: preset.region,
        }));
      }
    } catch (error) {
      console.error('Error fetching scan presets:', error);
    }

    // Return default presets
    return [
      {
        id: 'top_100',
        name: 'Top 100 US Stocks',
        code: 'TOP_100',
        description: 'Top 100 US stocks by market capitalization',
        symbols: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'BRK.B', 'JPM', 'V'],
        isActive: true,
        category: 'MARKET_CAP',
        region: 'US',
      },
      {
        id: 'tech_sector',
        name: 'Technology Sector',
        code: 'TECH',
        description: 'Major technology companies',
        symbols: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'ADBE', 'CRM', 'INTC'],
        isActive: true,
        category: 'SECTOR',
        region: 'US',
      },
    ];
  }

  /**
   * Get scanner configuration
   */
  async getScannerConfig(): Promise<ScannerConfig[]> {
    try {
      // Try to fetch from database
      if ((this.prisma as any).scannerConfig) {
        const dbConfigs = await (this.prisma as any).scannerConfig.findMany();
        return dbConfigs.map((config: any) => ({
          id: config.id,
          key: config.key,
          value: config.value,
          description: config.description,
          category: config.category,
          isUserConfigurable: config.isUserConfigurable,
        }));
      }
    } catch (error) {
      console.error('Error fetching scanner config:', error);
    }

    // Return default configuration
    return [
      {
        id: 'batch_chunk_size',
        key: 'batch_chunk_size',
        value: 10,
        description: 'Number of symbols to process in each batch',
        category: 'PERFORMANCE',
        isUserConfigurable: true,
      },
      {
        id: 'batch_delay_ms',
        key: 'batch_delay_ms',
        value: 1000,
        description: 'Delay between batch requests in milliseconds',
        category: 'PERFORMANCE',
        isUserConfigurable: true,
      },
      {
        id: 'enable_redis',
        key: 'enable_redis',
        value: true,
        description: 'Enable Redis for session storage and caching',
        category: 'PERFORMANCE',
        isUserConfigurable: false,
      },
      {
        id: 'max_concurrent_requests',
        key: 'max_concurrent_requests',
        value: 5,
        description: 'Maximum number of concurrent API requests',
        category: 'RATE_LIMIT',
        isUserConfigurable: true,
      },
    ];
  }

  /**
   * Get a specific scan preset
   */
  private async getScanPreset(presetId: string): Promise<ScanPreset | null> {
    try {
      if ((this.prisma as any).scanPreset) {
        const preset = await (this.prisma as any).scanPreset.findUnique({
          where: { id: presetId },
        });
        if (preset) {
          return {
            id: preset.id,
            name: preset.name,
            code: preset.code,
            description: preset.description,
            symbols: preset.symbols,
            isActive: preset.isActive,
            category: preset.category,
            region: preset.region,
          };
        }
      }
    } catch (error) {
      console.error('Error fetching scan preset:', error);
    }
    return null;
  }

  /**
   * Calculate estimated time remaining
   */
  private calculateETR(completed: number, total: number, startTime: number): number {
    if (completed === 0) return 0;
    
    const elapsedMs = Date.now() - startTime;
    const timePerItem = elapsedMs / completed;
    const remainingItems = total - completed;
    
    return Math.round((timePerItem * remainingItems) / 1000); // Convert to seconds
  }

}
