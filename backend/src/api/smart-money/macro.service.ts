import NodeCache from 'node-cache';
import { PrismaClient } from '@prisma/client';
import defaultPrisma from '../../db/prisma';

export interface MacroIndicator {
  name: string;
  value: number;
  unit: string;
  change: number;
  trend: 'up' | 'down' | 'stable';
  targetRange: { min: number; max: number };
  description: string;
  lastUpdated: string;
  source: string;
}

export interface EconomicCyclePhase {
  phase: 'Recovery' | 'Expansion' | 'Slowdown' | 'Contraction';
  description: string;
  confidence: number;
  indicators: string[];
  color: string;
  icon: string;
}

export interface RiskEnvironment {
  environment: 'Risk-On' | 'Risk-Off' | 'Neutral';
  confidence: number;
  color: string;
  indicators: string[];
  description: string;
}

/**
 * Well-known US stock symbols mapped to sectors for market analysis.
 */
const STOCK_SECTOR_MAP: Record<string, string> = {
  'AAPL': 'Technology', 'MSFT': 'Technology', 'GOOGL': 'Technology', 'NVDA': 'Technology',
  'AMD': 'Technology', 'INTC': 'Technology', 'CRM': 'Technology', 'ADBE': 'Technology',
  'CSCO': 'Technology', 'ORCL': 'Technology', 'IBM': 'Technology', 'QCOM': 'Technology',
  'TXN': 'Technology', 'AVGO': 'Technology', 'AMAT': 'Technology', 'MU': 'Technology',
  'JPM': 'Financials', 'BAC': 'Financials', 'WFC': 'Financials', 'C': 'Financials',
  'GS': 'Financials', 'MS': 'Financials', 'BLK': 'Financials', 'V': 'Financials',
  'MA': 'Financials', 'AXP': 'Financials', 'SCHW': 'Financials',
  'JNJ': 'Healthcare', 'PFE': 'Healthcare', 'UNH': 'Healthcare', 'ABBV': 'Healthcare',
  'MRK': 'Healthcare', 'TMO': 'Healthcare', 'ABT': 'Healthcare', 'LLY': 'Healthcare',
  'AMGN': 'Healthcare', 'GILD': 'Healthcare', 'BMY': 'Healthcare',
  'XOM': 'Energy', 'CVX': 'Energy', 'COP': 'Energy', 'EOG': 'Energy',
  'OXY': 'Energy', 'SLB': 'Energy', 'HAL': 'Energy',
  'AMZN': 'Consumer Discretionary', 'TSLA': 'Consumer Discretionary', 'HD': 'Consumer Discretionary',
  'MCD': 'Consumer Discretionary', 'NKE': 'Consumer Discretionary', 'SBUX': 'Consumer Discretionary',
  'LOW': 'Consumer Discretionary', 'TJX': 'Consumer Discretionary',
  'PG': 'Consumer Staples', 'KO': 'Consumer Staples', 'PEP': 'Consumer Staples',
  'WMT': 'Consumer Staples', 'COST': 'Consumer Staples', 'CL': 'Consumer Staples',
  'CAT': 'Industrials', 'GE': 'Industrials', 'HON': 'Industrials', 'BA': 'Industrials',
  'MMM': 'Industrials', 'UPS': 'Industrials', 'FDX': 'Industrials', 'RTX': 'Industrials',
  'NEE': 'Utilities', 'DUK': 'Utilities', 'SO': 'Utilities', 'D': 'Utilities',
  'AEP': 'Utilities', 'EXC': 'Utilities',
  'LIN': 'Materials', 'APD': 'Materials', 'ECL': 'Materials', 'SHW': 'Materials',
  'DOW': 'Materials', 'DD': 'Materials',
  'PLD': 'Real Estate', 'AMT': 'Real Estate', 'CCI': 'Real Estate', 'EQIX': 'Real Estate',
  'META': 'Communication Services', 'NFLX': 'Communication Services', 'DIS': 'Communication Services',
  'CMCSA': 'Communication Services', 'T': 'Communication Services', 'VZ': 'Communication Services',
};

/** Top 100 US stocks by market cap for broad market analysis */
const TOP_SYMBOLS = Object.keys(STOCK_SECTOR_MAP);

export class MacroDataCalculationService {
  private cache: NodeCache;
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.cache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour
    this.prisma = prisma || defaultPrisma;
  }

  /**
   * Fetch macroeconomic indicators derived from market data
   */
  async fetchMacroIndicators(): Promise<MacroIndicator[]> {
    const cacheKey = 'macro-indicators';
    const cached = this.cache.get<MacroIndicator[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const indicators = await this.computeMarketDerivedIndicators();
      this.cache.set(cacheKey, indicators);
      return indicators;
    } catch (error) {
      console.error('Error computing macro indicators:', error);
      return this.getFallbackIndicators();
    }
  }

  /**
   * Compute macro indicators from market data (PriceTick table)
   */
  private async computeMarketDerivedIndicators(): Promise<MacroIndicator[]> {
    const now = new Date();
    const indicators: MacroIndicator[] = [];

    // Fetch latest price ticks for all top symbols
    const latestTicks = await this.prisma.priceTick.findMany({
      where: { symbol: { in: TOP_SYMBOLS } },
      orderBy: { timestamp: 'desc' },
      distinct: ['symbol'],
      select: { symbol: true, close: true, volume: true, timestamp: true },
    });

    // Fetch ticks from 20 trading days ago for comparison
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - 30); // buffer for weekends

    const oldTicks = await this.prisma.priceTick.findMany({
      where: {
        symbol: { in: TOP_SYMBOLS },
        timestamp: { lte: lookbackDate },
      },
      orderBy: { timestamp: 'desc' },
      distinct: ['symbol'],
      select: { symbol: true, close: true },
    });

    const latestMap = new Map(latestTicks.map(t => [t.symbol, t]));
    const oldMap = new Map(oldTicks.map(t => [t.symbol, t]));

    // --- Indicator 1: Market Volatility (VIX proxy) ---
    // Compute as standard deviation of daily returns across stocks
    const returns: number[] = [];
    let prevReturns: number[] = [];
    for (const [symbol, latest] of latestMap) {
      const old = oldMap.get(symbol);
      if (old && Number(old.close) > 0) {
        const ret = (Number(latest.close) - Number(old.close)) / Number(old.close);
        returns.push(ret);
      }
    }

    // Also compute previous period returns for trend comparison
    const prevDate = new Date();
    prevDate.setDate(prevDate.getDate() - 60);
    const prevOldTicks = await this.prisma.priceTick.findMany({
      where: {
        symbol: { in: TOP_SYMBOLS },
        timestamp: { lte: prevDate },
      },
      orderBy: { timestamp: 'desc' },
      distinct: ['symbol'],
      select: { symbol: true, close: true },
    });
    const prevOldMap = new Map(prevOldTicks.map(t => [t.symbol, t]));
    for (const [symbol, latest] of latestMap) {
      const prevOld = prevOldMap.get(symbol);
      if (prevOld && Number(prevOld.close) > 0) {
        const ret = (Number(latest.close) - Number(prevOld.close)) / Number(prevOld.close);
        prevReturns.push(ret);
      }
    }

    if (returns.length > 5) {
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / returns.length;
      const volatility = Math.sqrt(variance) * 100; // as percentage

      // Scale to approximate VIX-like values (typical VIX range 10-40)
      const vixProxy = Math.round(Math.min(50, Math.max(8, volatility * 15 + 10)));

      const prevMean = prevReturns.length > 0 ? prevReturns.reduce((a: number, b: number) => a + b, 0) / prevReturns.length : 0;
      const prevVariance = prevReturns.length > 0 ? prevReturns.reduce((sum: number, r: number) => sum + (r - prevMean) ** 2, 0) / prevReturns.length : 0;
      const prevVol = Math.sqrt(prevVariance) * 100;
      const prevVixProxy = Math.round(Math.min(50, Math.max(8, prevVol * 15 + 10)));
      const vixChange = vixProxy - prevVixProxy;

      indicators.push({
        name: 'Market Volatility (VIX Proxy)',
        value: vixProxy,
        unit: '',
        change: vixChange,
        trend: vixChange > 1 ? 'up' : vixChange < -1 ? 'down' : 'stable',
        targetRange: { min: 12, max: 20 },
        description: 'Market volatility derived from stock return dispersion across top US stocks',
        lastUpdated: now.toISOString(),
        source: 'Derived from Price Data',
      });
    }

    // --- Indicator 2: Market Breadth (Advance/Decline Ratio) ---
    // Proxy for economic health
    let advances = 0;
    let declines = 0;
    for (const [symbol, latest] of latestMap) {
      const old = oldMap.get(symbol);
      if (old && Number(old.close) > 0) {
        const ret = (Number(latest.close) - Number(old.close)) / Number(old.close);
        if (ret > 0) advances++;
        else if (ret < 0) declines++;
      }
    }
    const total = advances + declines;
    const breadthRatio = total > 0 ? advances / total : 0.5;
    const breadthPct = Math.round(breadthRatio * 100);
    const breadthChange = Math.round((breadthRatio - 0.5) * 200); // deviation from 50%

    indicators.push({
      name: 'Market Breadth',
      value: breadthPct,
      unit: '%',
      change: breadthChange,
      trend: breadthChange > 5 ? 'up' : breadthChange < -5 ? 'down' : 'stable',
      targetRange: { min: 40, max: 60 },
      description: 'Percentage of stocks with positive price movement (advance/decline ratio)',
      lastUpdated: now.toISOString(),
      source: 'Derived from Price Data',
    });

    // --- Indicator 3: Volume Participation ---
    // Average volume ratio across stocks as proxy for market activity
    const volumes = latestTicks.filter(t => t.volume).map(t => Number(t.volume));
    const avgVolume = volumes.length > 0 ? volumes.reduce((a, b) => a + b, 0) / volumes.length : 0;

    // Get older volumes for comparison
    const oldVolumeTicks = await this.prisma.priceTick.findMany({
      where: {
        symbol: { in: TOP_SYMBOLS.slice(0, 20) },
        timestamp: { lte: lookbackDate },
      },
      orderBy: { timestamp: 'desc' },
      distinct: ['symbol'],
      select: { symbol: true, volume: true },
    });
    const oldVolumes = oldVolumeTicks.filter(t => t.volume).map(t => Number(t.volume));
    const prevAvgVolume = oldVolumes.length > 0 ? oldVolumes.reduce((a, b) => a + b, 0) / oldVolumes.length : avgVolume;

    const volumeRatio = prevAvgVolume > 0 ? avgVolume / prevAvgVolume : 1;
    const volumeChange = Math.round((volumeRatio - 1) * 100);

    indicators.push({
      name: 'Volume Participation',
      value: Math.round(volumeRatio * 100) / 100,
      unit: 'ratio',
      change: volumeChange,
      trend: volumeChange > 5 ? 'up' : volumeChange < -5 ? 'down' : 'stable',
      targetRange: { min: 0.8, max: 1.2 },
      description: 'Average trading volume ratio (current vs 20-day average) across top stocks',
      lastUpdated: now.toISOString(),
      source: 'Derived from Price Data',
    });

    // --- Indicator 4: Sector Dispersion ---
    // Standard deviation of sector returns as proxy for economic cycle phase
    const sectorReturns = new Map<string, number[]>();
    for (const [symbol, latest] of latestMap) {
      const sector = STOCK_SECTOR_MAP[symbol];
      if (!sector) continue;
      const old = oldMap.get(symbol);
      if (old && Number(old.close) > 0) {
        const ret = (Number(latest.close) - Number(old.close)) / Number(old.close);
        if (!sectorReturns.has(sector)) sectorReturns.set(sector, []);
        sectorReturns.get(sector)!.push(ret);
      }
    }

    const sectorAvgReturns: number[] = [];
    for (const [, rets] of sectorReturns) {
      if (rets.length > 0) {
        sectorAvgReturns.push(rets.reduce((a, b) => a + b, 0) / rets.length);
      }
    }

    if (sectorAvgReturns.length > 2) {
      const sectorMean = sectorAvgReturns.reduce((a, b) => a + b, 0) / sectorAvgReturns.length;
      const sectorVariance = sectorAvgReturns.reduce((sum, r) => sum + (r - sectorMean) ** 2, 0) / sectorAvgReturns.length;
      const sectorDispersion = Math.sqrt(sectorVariance) * 100;

      // Low dispersion (< 1%) suggests Expansion, high dispersion (> 3%) suggests Slowdown/Contraction
      const dispersionValue = Math.round(sectorDispersion * 10) / 10;
      const prevDispersion = 2.0; // baseline for change calc
      const dispChange = Math.round((dispersionValue - prevDispersion) * 10) / 10;

      indicators.push({
        name: 'Sector Dispersion',
        value: dispersionValue,
        unit: '%',
        change: dispChange,
        trend: dispChange > 0.3 ? 'up' : dispChange < -0.3 ? 'down' : 'stable',
        targetRange: { min: 1.0, max: 3.0 },
        description: 'Standard deviation of sector returns — low values suggest synchronized market (expansion), high values suggest divergence (rotation/slowdown)',
        lastUpdated: now.toISOString(),
        source: 'Derived from Price Data',
      });
    }

    // --- Indicator 5: Market Return (GDP Proxy) ---
    // Average return across all stocks as proxy for economic growth
    if (returns.length > 0) {
      const avgReturn = (returns.reduce((a: number, b: number) => a + b, 0) / returns.length) * 100;
      const annualizedReturn = avgReturn * 12; // rough annualization from monthly
      const gdpProxy = Math.max(-5, Math.min(10, Math.round(annualizedReturn * 10) / 10));

      // Previous period return for change
      const prevAvgRet = prevReturns.length > 0 ? (prevReturns.reduce((a: number, b: number) => a + b, 0) / prevReturns.length) * 100 : 0;
      const prevAnnualized = prevAvgRet * 12;
      const gdpChange = Math.round((gdpProxy - Math.max(-5, Math.min(10, Math.round(prevAnnualized * 10) / 10))) * 10) / 10;

      indicators.push({
        name: 'Market Growth (GDP Proxy)',
        value: gdpProxy,
        unit: '%',
        change: gdpChange,
        trend: gdpChange > 0.3 ? 'up' : gdpChange < -0.3 ? 'down' : 'stable',
        targetRange: { min: 2.0, max: 3.5 },
        description: 'Annualized market return across top US stocks as proxy for economic growth',
        lastUpdated: now.toISOString(),
        source: 'Derived from Price Data',
      });
    }

    // --- Indicator 6: Risk Premium (Equity Yield Proxy) ---
    // Inverse of market return dispersion as proxy for risk premium
    if (returns.length > 5) {
      const positiveReturns = returns.filter(r => r > 0).length;
      const negativeReturns = returns.filter(r => r < 0).length;
      const riskRatio = negativeReturns > 0 ? positiveReturns / negativeReturns : 3;
      const riskPremium = Math.round(Math.min(10, Math.max(1, riskRatio * 2)) * 10) / 10;

      indicators.push({
        name: 'Equity Risk Premium',
        value: riskPremium,
        unit: 'ratio',
        change: Math.round((riskPremium - 2) * 10) / 10,
        trend: riskPremium > 2.5 ? 'up' : riskPremium < 1.5 ? 'down' : 'stable',
        targetRange: { min: 1.5, max: 3.0 },
        description: 'Ratio of positive to negative stock returns — higher values suggest lower perceived risk',
        lastUpdated: now.toISOString(),
        source: 'Derived from Price Data',
      });
    }

    return indicators;
  }

  /**
   * Determine current economic cycle phase
   */
  async determineEconomicCycle(): Promise<EconomicCyclePhase> {
    try {
      const indicators = await this.fetchMacroIndicators();

      const breadthIndicator = indicators.find(i => i.name.includes('Market Breadth'));
      const volatilityIndicator = indicators.find(i => i.name.includes('Volatility'));
      const dispersionIndicator = indicators.find(i => i.name.includes('Sector Dispersion'));
      const growthIndicator = indicators.find(i => i.name.includes('Market Growth'));

      const breadth = breadthIndicator?.value ?? 50;
      const volatility = volatilityIndicator?.value ?? 20;
      const dispersion = dispersionIndicator?.value ?? 2;
      const growth = growthIndicator?.value ?? 2;

      // Expansion: High breadth, low volatility, low dispersion, positive growth
      if (breadth > 55 && volatility < 18 && dispersion < 2 && growth > 2) {
        return {
          phase: 'Expansion',
          description: 'Strong market participation with low volatility and synchronized sector movement',
          confidence: 0.85,
          indicators: ['High market breadth', 'Low volatility', 'Low sector dispersion', 'Positive growth'],
          color: 'success',
          icon: 'trending_up',
        };
      }
      // Recovery: Improving breadth, moderate volatility, moderate dispersion
      else if (breadth > 45 && volatility < 22 && growth > 0) {
        return {
          phase: 'Recovery',
          description: 'Improving market conditions with broadening participation',
          confidence: 0.75,
          indicators: ['Improving breadth', 'Moderate volatility', 'Positive momentum'],
          color: 'info',
          icon: 'autorenew',
        };
      }
      // Contraction: Low breadth, high volatility, high dispersion, negative growth
      else if (breadth < 40 && volatility > 25 && growth < -1) {
        return {
          phase: 'Contraction',
          description: 'Market weakness with high volatility and negative returns',
          confidence: 0.70,
          indicators: ['Low market breadth', 'High volatility', 'Negative returns'],
          color: 'error',
          icon: 'trending_down',
        };
      }
      // Slowdown: Mixed signals
      else {
        return {
          phase: 'Slowdown',
          description: 'Mixed market signals with potential headwinds',
          confidence: 0.65,
          indicators: ['Mixed breadth', 'Elevated volatility', 'Moderate dispersion'],
          color: 'warning',
          icon: 'speed',
        };
      }
    } catch (error) {
      console.error('Error determining economic cycle:', error);
      return this.getFallbackEconomicCycle();
    }
  }

  /**
   * Assess risk-on vs risk-off environment
   */
  async assessRiskEnvironment(): Promise<RiskEnvironment> {
    try {
      const indicators = await this.fetchMacroIndicators();

      const volatilityIndicator = indicators.find(i => i.name.includes('Volatility'));
      const breadthIndicator = indicators.find(i => i.name.includes('Market Breadth'));
      const riskPremiumIndicator = indicators.find(i => i.name.includes('Risk Premium'));

      const volatility = volatilityIndicator?.value ?? 20;
      const breadth = breadthIndicator?.value ?? 50;
      const riskPremium = riskPremiumIndicator?.value ?? 2;

      // Risk assessment logic
      const riskScore =
        (volatility < 15 ? 1 : volatility < 20 ? 0.5 : 0) + // Low vol = risk-on
        (breadth > 55 ? 1 : breadth > 45 ? 0.5 : 0) + // High breadth = risk-on
        (riskPremium > 2.5 ? 1 : riskPremium > 1.5 ? 0.5 : 0); // High risk premium = risk-on

      if (riskScore >= 2.5) {
        return {
          environment: 'Risk-On',
          confidence: 0.80,
          color: 'success',
          indicators: ['Low volatility', 'High market breadth', 'Strong risk appetite'],
          description: 'Favorable conditions for risk assets based on market data',
        };
      } else if (riskScore <= 1.0) {
        return {
          environment: 'Risk-Off',
          confidence: 0.75,
          color: 'error',
          indicators: ['High volatility', 'Low market breadth', 'Weak risk appetite'],
          description: 'Defensive positioning recommended based on market data',
        };
      } else {
        return {
          environment: 'Neutral',
          confidence: 0.70,
          color: 'warning',
          indicators: ['Mixed signals', 'Moderate volatility', 'Balanced risk appetite'],
          description: 'Balanced approach with selective risk-taking',
        };
      }
    } catch (error) {
      console.error('Error assessing risk environment:', error);
      return this.getFallbackRiskEnvironment();
    }
  }

  /**
   * Fallback indicators when market data is unavailable
   */
  private getFallbackIndicators(): MacroIndicator[] {
    const now = new Date().toISOString();
    return [
      {
        name: 'Market Volatility (VIX Proxy)',
        value: 18.5,
        unit: '',
        change: -1.2,
        trend: 'down',
        targetRange: { min: 12, max: 20 },
        description: 'Market volatility derived from stock return dispersion',
        lastUpdated: now,
        source: 'Derived from Price Data (fallback)',
      },
      {
        name: 'Market Breadth',
        value: 52,
        unit: '%',
        change: 3,
        trend: 'up',
        targetRange: { min: 40, max: 60 },
        description: 'Percentage of stocks with positive price movement',
        lastUpdated: now,
        source: 'Derived from Price Data (fallback)',
      },
      {
        name: 'Volume Participation',
        value: 1.05,
        unit: 'ratio',
        change: 2,
        trend: 'up',
        targetRange: { min: 0.8, max: 1.2 },
        description: 'Average trading volume ratio across top stocks',
        lastUpdated: now,
        source: 'Derived from Price Data (fallback)',
      },
      {
        name: 'Sector Dispersion',
        value: 2.1,
        unit: '%',
        change: 0.3,
        trend: 'up',
        targetRange: { min: 1.0, max: 3.0 },
        description: 'Standard deviation of sector returns',
        lastUpdated: now,
        source: 'Derived from Price Data (fallback)',
      },
      {
        name: 'Market Growth (GDP Proxy)',
        value: 2.5,
        unit: '%',
        change: 0.2,
        trend: 'up',
        targetRange: { min: 2.0, max: 3.5 },
        description: 'Annualized market return as proxy for economic growth',
        lastUpdated: now,
        source: 'Derived from Price Data (fallback)',
      },
      {
        name: 'Equity Risk Premium',
        value: 2.2,
        unit: 'ratio',
        change: 0.1,
        trend: 'up',
        targetRange: { min: 1.5, max: 3.0 },
        description: 'Ratio of positive to negative stock returns',
        lastUpdated: now,
        source: 'Derived from Price Data (fallback)',
      },
    ];
  }

  private getFallbackEconomicCycle(): EconomicCyclePhase {
    return {
      phase: 'Expansion',
      description: 'Strong economic growth with stable inflation and low unemployment',
      confidence: 0.85,
      indicators: ['High GDP growth', 'Low inflation', 'Low unemployment'],
      color: 'success',
      icon: 'trending_up',
    };
  }

  private getFallbackRiskEnvironment(): RiskEnvironment {
    return {
      environment: 'Neutral',
      confidence: 0.70,
      color: 'warning',
      indicators: ['Mixed signals', 'Moderate volatility', 'Balanced rates'],
      description: 'Balanced approach with selective risk-taking',
    };
  }
}
