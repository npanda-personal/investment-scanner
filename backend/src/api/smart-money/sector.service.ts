import { YahooFinanceIngestionService } from '../../data/ingestion/yahoo.service';

export interface SectorPerformance {
  sector: string;
  symbol: string;
  performance: number; // percentage change
  flow: number; // mock volume flow in millions
  color: string;
  marketCap: number; // in billions
  relativeStrength: number; // vs SPY
  trend: 'up' | 'down' | 'stable';
  volumeRatio?: number;
}

export interface SectorHeatMapData {
  sector: string;
  symbol: string;
  performance: number;
  color: string;
  intensity: number; // 0-1 for heat map intensity
}

export class SectorDataCalculationService {
  private yahooService: YahooFinanceIngestionService;
  
  // Sector ETFs as defined in requirements
  private readonly SECTOR_ETFS = [
    { sector: 'Technology', symbol: 'XLK', color: '#2196f3' },
    { sector: 'Healthcare', symbol: 'XLV', color: '#4caf50' },
    { sector: 'Financials', symbol: 'XLF', color: '#ff9800' },
    { sector: 'Energy', symbol: 'XLE', color: '#f44336' },
    { sector: 'Consumer Discretionary', symbol: 'XLY', color: '#9c27b0' },
    { sector: 'Industrials', symbol: 'XLI', color: '#3f51b5' },
    { sector: 'Utilities', symbol: 'XLU', color: '#00bcd4' },
    { sector: 'Materials', symbol: 'XLB', color: '#795548' },
    { sector: 'Real Estate', symbol: 'XLRE', color: '#607d8b' },
    { sector: 'Communication Services', symbol: 'XLC', color: '#e91e63' }
  ];

  // SPY as benchmark
  private readonly BENCHMARK_SYMBOL = 'SPY';

  constructor() {
    this.yahooService = new YahooFinanceIngestionService();
  }

  /**
   * Calculate sector performance data for all sector ETFs
   */
  async calculateSectorPerformance(timeframe: 'daily' | 'weekly' | 'monthly' = 'weekly'): Promise<SectorPerformance[]> {
    const sectorPerformance: SectorPerformance[] = [];
    
    // Get benchmark performance
    let benchmarkReturn = 0;
    try {
      benchmarkReturn = await this.calculateReturn(this.BENCHMARK_SYMBOL, timeframe);
    } catch (error) {
      console.warn(`Failed to fetch benchmark data for ${this.BENCHMARK_SYMBOL}:`, error);
    }
    
    for (const etf of this.SECTOR_ETFS) {
      try {
        const performance = await this.calculateReturn(etf.symbol, timeframe);
        const relativeStrength = benchmarkReturn !== 0 ? performance / benchmarkReturn : 1;
        
        // Generate realistic mock data for flow and market cap
        const flow = this.generateMockFlow(performance);
        const marketCap = this.generateMockMarketCap(etf.sector);
        const volumeRatio = await this.calculateVolumeRatio(etf.symbol);
        
        sectorPerformance.push({
          sector: etf.sector,
          symbol: etf.symbol,
          performance: Math.round(performance * 100) / 100, // Round to 2 decimal places
          flow,
          color: etf.color,
          marketCap,
          relativeStrength: Math.round(relativeStrength * 100) / 100,
          trend: performance > 0 ? 'up' : performance < 0 ? 'down' : 'stable',
          volumeRatio
        });
      } catch (error) {
        console.warn(`Failed to calculate performance for ${etf.symbol} (${etf.sector}):`, error);
        // Add fallback data
        sectorPerformance.push(this.createFallbackSectorData(etf));
      }
    }
    
    // Sort by performance (descending)
    return sectorPerformance.sort((a, b) => b.performance - a.performance);
  }

  /**
   * Calculate return for a symbol over the specified timeframe
   */
  private async calculateReturn(symbol: string, timeframe: 'daily' | 'weekly' | 'monthly'): Promise<number> {
    try {
      const historical = await this.yahooService.fetchHistorical(symbol);
      
      if (!historical || historical.length < 2) {
        return this.generateMockPerformance();
      }
      
      // Determine number of days based on timeframe
      let daysToLookBack = 1; // daily
      if (timeframe === 'weekly') daysToLookBack = 5;
      if (timeframe === 'monthly') daysToLookBack = 20;
      
      const endIndex = historical.length - 1;
      const startIndex = Math.max(0, endIndex - daysToLookBack);
      
      const startPrice = historical[startIndex].close;
      const endPrice = historical[endIndex].close;
      
      if (startPrice > 0) {
        return ((endPrice - startPrice) / startPrice) * 100;
      }
    } catch (error) {
      console.warn(`Failed to calculate return for ${symbol}:`, error);
    }
    
    return this.generateMockPerformance();
  }

  /**
   * Calculate volume ratio (current volume vs 20-day average)
   */
  private async calculateVolumeRatio(symbol: string): Promise<number> {
    try {
      const historical = await this.yahooService.fetchHistorical(symbol);
      
      if (!historical || historical.length < 20) {
        return 1.0; // Default ratio
      }
      
      const recentHistory = historical.slice(-20);
      const avgVolume20d = recentHistory.reduce((sum: number, day) => sum + (day.volume || 0), 0) / 20;
      const currentVolume = historical[historical.length - 1].volume || 0;
      
      return avgVolume20d > 0 ? currentVolume / avgVolume20d : 1.0;
    } catch (error) {
      console.warn(`Failed to calculate volume ratio for ${symbol}:`, error);
      return 1.0;
    }
  }

  /**
   * Generate heat map data for sector visualization
   */
  async generateHeatMapData(): Promise<SectorHeatMapData[]> {
    const sectorPerformance = await this.calculateSectorPerformance('daily');
    
    return sectorPerformance.map(sector => {
      // Calculate intensity based on performance (normalize to 0-1 range)
      const maxPerformance = Math.max(...sectorPerformance.map(s => Math.abs(s.performance)));
      const intensity = maxPerformance > 0 ? Math.abs(sector.performance) / maxPerformance : 0.5;
      
      return {
        sector: sector.sector,
        symbol: sector.symbol,
        performance: sector.performance,
        color: sector.color,
        intensity: Math.min(1, Math.max(0, intensity))
      };
    });
  }

  /**
   * Get top and bottom performing sectors
   */
  async getTopBottomPerformers(): Promise<{
    topPerformers: SectorPerformance[];
    bottomPerformers: SectorPerformance[];
  }> {
    const sectorPerformance = await this.calculateSectorPerformance('weekly');
    
    // Sort by performance
    const sorted = [...sectorPerformance].sort((a, b) => b.performance - a.performance);
    
    const topPerformers = sorted.slice(0, 3);
    const bottomPerformers = sorted.slice(-3).reverse(); // Worst first
    
    return { topPerformers, bottomPerformers };
  }

  /**
   * Generate mock flow data based on performance
   */
  private generateMockFlow(performance: number): number {
    // Positive performance tends to have positive flow, negative performance negative flow
    const baseFlow = performance * 10; // $10M flow per 1% performance
    const randomVariation = (Math.random() * 100 - 50); // ±$50M random variation
    return Math.round(baseFlow + randomVariation);
  }

  /**
   * Generate mock market cap based on sector
   */
  private generateMockMarketCap(sector: string): number {
    // Rough market cap estimates for sector ETFs in billions
    const marketCaps: Record<string, number> = {
      'Technology': 1250,
      'Healthcare': 890,
      'Financials': 760,
      'Energy': 420,
      'Consumer Discretionary': 680,
      'Industrials': 540,
      'Utilities': 320,
      'Materials': 280,
      'Real Estate': 210,
      'Communication Services': 580
    };
    
    const baseCap = marketCaps[sector] || 500;
    const variation = (Math.random() * 0.2 - 0.1); // ±10% variation
    return Math.round(baseCap * (1 + variation));
  }

  /**
   * Generate mock performance when real data fails
   */
  private generateMockPerformance(): number {
    // Random performance between -5% and +10%
    return Math.round((Math.random() * 15 - 5) * 100) / 100;
  }

  /**
   * Create fallback sector data when real calculation fails
   */
  private createFallbackSectorData(etf: { sector: string; symbol: string; color: string }): SectorPerformance {
    const performance = this.generateMockPerformance();
    
    return {
      sector: etf.sector,
      symbol: etf.symbol,
      performance,
      flow: this.generateMockFlow(performance),
      color: etf.color,
      marketCap: this.generateMockMarketCap(etf.sector),
      relativeStrength: 1.0,
      trend: performance > 0 ? 'up' : performance < 0 ? 'down' : 'stable',
      volumeRatio: 1.0
    };
  }

  /**
   * Fix BRK.B issue by replacing it with BRK-A or removing from list
   * This is called from the smart money service
   */
  fixBRKBSymbol(symbols: string[]): string[] {
    return symbols.map(symbol => {
      if (symbol === 'BRK.B') {
        console.log('Replacing BRK.B with BRK-A due to Yahoo Finance data issues');
        return 'BRK-A'; // Alternative symbol
      }
      return symbol;
    });
  }
}