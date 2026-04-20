import { PrismaClient } from '@prisma/client';
import defaultPrisma from '../db/prisma';
import { YahooFinanceIngestionService } from '../data/ingestion/yahoo.service';
import { MarketDataBatchManager } from './batch-manager';
import { ConditionEvaluator } from './evaluator';
import {
  MarketDataRequest,
  EnhancedMarketData,
  Signal,
  MarketData as ExtendedMarketData
} from '../types/scanner-extended';

/**
 * Service for fetching and enhancing market data for scanner
 */
export class MarketDataService {
  private prisma: PrismaClient;
  private batchManager: MarketDataBatchManager;
  private conditionEvaluator: ConditionEvaluator;
  private cache: Map<string, { data: EnhancedMarketData; timestamp: number }> = new Map();
  private cacheTtl: number = 5 * 60 * 1000; // 5 minutes

  constructor(
    prisma?: PrismaClient,
    _yahooService?: YahooFinanceIngestionService, // Parameter kept for API compatibility but unused
    batchManager?: MarketDataBatchManager
  ) {
    this.prisma = prisma || defaultPrisma;
    this.batchManager = batchManager || new MarketDataBatchManager();
    this.conditionEvaluator = new ConditionEvaluator(this.prisma);
  }

  /**
   * Fetch market data for multiple symbols in batch
   */
  async fetchBatchData(request: MarketDataRequest): Promise<EnhancedMarketData[]> {
    const { symbols, indicators, periods: _periods, includeHistorical } = request;
    
    // Check cache first
    const cachedResults: EnhancedMarketData[] = [];
    const symbolsToFetch: string[] = [];
    
    for (const symbol of symbols) {
      const cached = this.getFromCache(symbol);
      if (cached) {
        cachedResults.push(cached);
      } else {
        symbolsToFetch.push(symbol);
      }
    }

    // If all data is cached, return cached results
    if (symbolsToFetch.length === 0) {
      return cachedResults;
    }

    // Fetch remaining symbols in batch
    const batchResult = await this.batchManager.executeBatch({
      symbols: symbolsToFetch,
      requestFn: async (chunkSymbols: string[]) => {
        return this.fetchSymbolsData(chunkSymbols, includeHistorical);
      },
      chunkSize: this.batchManager.getConfig().chunkSize,
      delayBetweenChunks: this.batchManager.getConfig().delayBetweenChunks
    });

    // Enhance data with indicators and signals
    const enhancedData: EnhancedMarketData[] = [];
    
    for (const data of batchResult.data) {
      const enhanced = await this.enhanceMarketData(data, indicators);
      enhancedData.push(enhanced);
      
      // Cache the enhanced data
      this.setInCache(data.symbol, enhanced);
    }

    // Combine cached and newly fetched data
    return [...cachedResults, ...enhancedData];
  }

  /**
   * Fetch basic market data for symbols
   */
  private async fetchSymbolsData(
    symbols: string[], 
    includeHistorical: boolean
  ): Promise<ExtendedMarketData[]> {
    const results: ExtendedMarketData[] = [];
    
    for (const symbol of symbols) {
      try {
        const marketData = await this.conditionEvaluator.fetchMarketData(symbol);
        results.push(marketData);
      } catch (error) {
        console.error(`Failed to fetch data for ${symbol}:`, error);
        // Return minimal data structure for failed symbols
        results.push({
          symbol,
          latestPrice: undefined,
          historicalPrices: includeHistorical ? [] : undefined
        });
      }
    }
    
    return results;
  }

  /**
   * Enhance market data with indicators and signals
   */
  async enhanceMarketData(
    data: ExtendedMarketData,
    indicators: string[]
  ): Promise<EnhancedMarketData> {
    const calculatedIndicators: Record<string, number> = {};
    const signals: Signal[] = [];

    // Calculate requested indicators
    for (const indicator of indicators) {
      try {
        const value = await this.calculateIndicator(data, indicator);
        if (value !== null) {
          calculatedIndicators[indicator] = value;
        }
      } catch (error) {
        console.error(`Failed to calculate indicator ${indicator} for ${data.symbol}:`, error);
      }
    }

    // Detect signals based on indicators
    if (indicators.length > 0) {
      const detectedSignals = await this.detectSignals(data, calculatedIndicators);
      signals.push(...detectedSignals);
    }

    return {
      ...data,
      indicators: calculatedIndicators,
      signals,
      metadata: {
        lastUpdated: new Date(),
        source: 'yahoo',
        confidence: this.calculateDataConfidence(data, calculatedIndicators)
      }
    };
  }

  /**
   * Calculate a specific indicator value
   */
  private async calculateIndicator(
    data: ExtendedMarketData,
    indicator: string
  ): Promise<number | null> {
    // This is a simplified implementation
    // In a real implementation, this would use the technicalindicators library
    // or the existing ConditionEvaluator
    
    if (!data.latestPrice || !data.historicalPrices || data.historicalPrices.length === 0) {
      return null;
    }

    try {
      // For now, return placeholder values based on indicator type
      switch (indicator.toUpperCase()) {
        case 'RSI':
          return 50 + Math.random() * 40 - 20; // Random RSI between 30-70
        case 'EMA_9':
          return data.latestPrice.close * (0.99 + Math.random() * 0.02);
        case 'EMA_21':
          return data.latestPrice.close * (0.98 + Math.random() * 0.04);
        case 'MACD':
          return (Math.random() - 0.5) * 2;
        case 'VOLUME_AVG':
          return data.latestPrice.volume ? data.latestPrice.volume / 1000000 : 0;
        default:
          return null;
      }
    } catch (error) {
      console.error(`Error calculating indicator ${indicator}:`, error);
      return null;
    }
  }

  /**
   * Detect signals based on market data and indicators
   */
  private async detectSignals(
    data: ExtendedMarketData,
    indicators: Record<string, number>
  ): Promise<Signal[]> {
    const signals: Signal[] = [];
    const now = new Date();

    // RSI signals
    if (indicators.RSI !== undefined) {
      if (indicators.RSI < 30) {
        signals.push({
          type: 'RSI',
          name: 'RSI_OVERSOLD',
          direction: 'BULLISH',
          strength: Math.max(0, 1 - (indicators.RSI / 30)),
          timestamp: now,
          metadata: { rsiValue: indicators.RSI, threshold: 30 }
        });
      }
      if (indicators.RSI > 70) {
        signals.push({
          type: 'RSI',
          name: 'RSI_OVERBOUGHT',
          direction: 'BEARISH',
          strength: Math.max(0, (indicators.RSI - 70) / 30),
          timestamp: now,
          metadata: { rsiValue: indicators.RSI, threshold: 70 }
        });
      }
    }

    // EMA crossover signals
    if (indicators.EMA_9 !== undefined && indicators.EMA_21 !== undefined) {
      if (indicators.EMA_9 > indicators.EMA_21) {
        signals.push({
          type: 'EMA',
          name: 'EMA_CROSSOVER_BULLISH',
          direction: 'BULLISH',
          strength: 0.7,
          timestamp: now,
          metadata: { ema9: indicators.EMA_9, ema21: indicators.EMA_21 }
        });
      } else {
        signals.push({
          type: 'EMA',
          name: 'EMA_CROSSOVER_BEARISH',
          direction: 'BEARISH',
          strength: 0.7,
          timestamp: now,
          metadata: { ema9: indicators.EMA_9, ema21: indicators.EMA_21 }
        });
      }
    }

    // Volume spike detection
    if (data.latestPrice?.volume && indicators.VOLUME_AVG) {
      const volumeRatio = data.latestPrice.volume / indicators.VOLUME_AVG;
      if (volumeRatio > 2) {
        signals.push({
          type: 'VOLUME',
          name: 'VOLUME_SPIKE',
          direction: 'BULLISH',
          strength: Math.min(1, volumeRatio / 5),
          timestamp: now,
          metadata: { volume: data.latestPrice.volume, avgVolume: indicators.VOLUME_AVG, ratio: volumeRatio }
        });
      }
    }

    return signals;
  }

  /**
   * Calculate confidence score for data quality
   */
  private calculateDataConfidence(
    data: ExtendedMarketData,
    indicators: Record<string, number>
  ): number {
    let confidence = 1.0;

    // Penalize missing latest price
    if (!data.latestPrice) {
      confidence *= 0.3;
    }

    // Penalize missing historical data
    if (!data.historicalPrices || data.historicalPrices.length < 20) {
      confidence *= 0.7;
    }

    // Penalize missing indicator calculations
    const indicatorCount = Object.keys(indicators).length;
    if (indicatorCount === 0) {
      confidence *= 0.5;
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * Get data from cache
   */
  private getFromCache(symbol: string): EnhancedMarketData | null {
    const cached = this.cache.get(symbol);
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.timestamp > this.cacheTtl) {
      this.cache.delete(symbol);
      return null;
    }
    
    return cached.data;
  }

  /**
   * Set data in cache
   */
  private setInCache(symbol: string, data: EnhancedMarketData): void {
    this.cache.set(symbol, { data, timestamp: Date.now() });
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    const now = Date.now();
    for (const [symbol, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.cacheTtl) {
        this.cache.delete(symbol);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    // Simple implementation - would need tracking for accurate hit rate
    return {
      size: this.cache.size,
      hitRate: 0.5 // Placeholder
    };
  }

  /**
   * Update cache TTL
   */
  setCacheTtl(ttlMs: number): void {
    this.cacheTtl = ttlMs;
  }

  /**
   * Get available indicators
   */
  getAvailableIndicators(): string[] {
    return [
      'RSI',
      'EMA_9',
      'EMA_21',
      'EMA_50',
      'MACD',
      'BB_UPPER',
      'BB_MIDDLE',
      'BB_LOWER',
      'VOLUME_AVG',
      'ATR',
      'STOCH_K',
      'STOCH_D'
    ];
  }
}