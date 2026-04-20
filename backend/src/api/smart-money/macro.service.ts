import NodeCache from 'node-cache';

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

export class MacroDataCalculationService {
  private cache: NodeCache;
  
  // FRED Series IDs for key economic indicators (commented out until FRED API key is available)
  // private readonly FRED_SERIES = {
  //   GDP: 'GDP', // Real Gross Domestic Product
  //   CPI: 'CPIAUCSL', // Consumer Price Index for All Urban Consumers
  //   UNEMPLOYMENT: 'UNRATE', // Unemployment Rate
  //   FED_FUNDS: 'FEDFUNDS', // Federal Funds Effective Rate
  //   TREASURY_10Y: 'DGS10', // 10-Year Treasury Constant Maturity Rate
  //   VIX: 'VIXCLS', // CBOE Volatility Index
  //   INDUSTRIAL_PRODUCTION: 'INDPRO', // Industrial Production Index
  //   RETAIL_SALES: 'RSAFS', // Advance Retail Sales
  //   HOUSING_STARTS: 'HOUST', // Housing Starts
  //   CONSUMER_SENTIMENT: 'UMCSENT', // University of Michigan Consumer Sentiment
  // };

  // private readonly FRED_API_BASE = 'https://api.stlouisfed.org/fred';

  constructor() {
    this.cache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour
  }

  /**
   * Fetch macroeconomic indicators from FRED API
   */
  async fetchMacroIndicators(): Promise<MacroIndicator[]> {
    const cacheKey = 'macro-indicators';
    const cached = this.cache.get<MacroIndicator[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // For now, return fallback data since we need a FRED API key
      // In production, you would:
      // 1. Get a FRED API key from https://research.stlouisfed.org/docs/api/api_key.html
      // 2. Add it to .env as FRED_API_KEY
      // 3. Uncomment the HTTP request code below
      
      const indicators = this.getFallbackIndicators();
      this.cache.set(cacheKey, indicators);
      return indicators;

    } catch (error) {
      console.error('Error fetching FRED data:', error);
      return this.getFallbackIndicators();
    }
  }

  /**
   * Determine current economic cycle phase
   */
  async determineEconomicCycle(): Promise<EconomicCyclePhase> {
    try {
      const indicators = await this.fetchMacroIndicators();
      
      // Extract key metrics
      const gdpIndicator = indicators.find(i => i.name.includes('GDP'));
      const inflationIndicator = indicators.find(i => i.name.includes('Inflation'));
      const unemploymentIndicator = indicators.find(i => i.name.includes('Unemployment'));
      
      if (!gdpIndicator || !inflationIndicator || !unemploymentIndicator) {
        return this.getFallbackEconomicCycle();
      }

      const gdp = gdpIndicator.value;
      const inflation = inflationIndicator.value;
      const unemployment = unemploymentIndicator.value;

      // Simple economic cycle determination logic
      if (gdp > 3.0 && inflation < 2.5 && unemployment < 4.0) {
        return {
          phase: 'Expansion',
          description: 'Strong economic growth with stable inflation and low unemployment',
          confidence: 0.85,
          indicators: ['High GDP growth', 'Low inflation', 'Low unemployment'],
          color: 'success',
          icon: 'trending_up',
        };
      } else if (gdp > 2.0 && inflation < 3.0 && unemployment < 4.5) {
        return {
          phase: 'Recovery',
          description: 'Moderate growth with improving economic conditions',
          confidence: 0.75,
          indicators: ['Moderate GDP growth', 'Controlled inflation', 'Improving employment'],
          color: 'info',
          icon: 'autorenew',
        };
      } else if (gdp < 1.5 && inflation > 3.0 && unemployment > 5.0) {
        return {
          phase: 'Contraction',
          description: 'Economic slowdown with rising inflation and unemployment',
          confidence: 0.70,
          indicators: ['Low GDP growth', 'High inflation', 'Rising unemployment'],
          color: 'error',
          icon: 'trending_down',
        };
      } else {
        return {
          phase: 'Slowdown',
          description: 'Mixed economic signals with potential headwinds',
          confidence: 0.65,
          indicators: ['Slowing growth', 'Elevated inflation', 'Stable employment'],
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
      
      const vixIndicator = indicators.find(i => i.name.includes('VIX'));
      const treasuryIndicator = indicators.find(i => i.name.includes('Treasury'));
      const fedFundsIndicator = indicators.find(i => i.name.includes('Fed Funds'));

      if (!vixIndicator || !treasuryIndicator || !fedFundsIndicator) {
        return this.getFallbackRiskEnvironment();
      }

      const vix = vixIndicator.value;
      const treasuryYield = treasuryIndicator.value;
      const fedFundsRate = fedFundsIndicator.value;

      // Risk assessment logic
      const riskScore = 
        (vix < 15 ? 1 : vix < 20 ? 0.5 : 0) + // Low VIX = risk-on
        (treasuryYield < 4.0 ? 1 : treasuryYield < 4.5 ? 0.5 : 0) + // Low yields = risk-on
        (fedFundsRate < 5.0 ? 1 : fedFundsRate < 5.5 ? 0.5 : 0); // Low rates = risk-on

      if (riskScore >= 2.5) {
        return {
          environment: 'Risk-On',
          confidence: 0.80,
          color: 'success',
          indicators: ['Low volatility', 'Low interest rates', 'Accommodative Fed'],
          description: 'Favorable conditions for risk assets',
        };
      } else if (riskScore <= 1.5) {
        return {
          environment: 'Risk-Off',
          confidence: 0.75,
          color: 'error',
          indicators: ['High volatility', 'High interest rates', 'Restrictive Fed'],
          description: 'Defensive positioning recommended',
        };
      } else {
        return {
          environment: 'Neutral',
          confidence: 0.70,
          color: 'warning',
          indicators: ['Mixed signals', 'Moderate volatility', 'Balanced rates'],
          description: 'Balanced approach with selective risk-taking',
        };
      }
    } catch (error) {
      console.error('Error assessing risk environment:', error);
      return this.getFallbackRiskEnvironment();
    }
  }


  /**
   * Fallback indicators when FRED API is unavailable
   */
  private getFallbackIndicators(): MacroIndicator[] {
    const now = new Date().toISOString();
    return [
      {
        name: 'GDP Growth Forecast',
        value: 2.8,
        unit: '%',
        change: 0.2,
        trend: 'up',
        targetRange: { min: 2.0, max: 3.5 },
        description: 'Annualized GDP growth projection',
        lastUpdated: now,
        source: 'Fallback Data',
      },
      {
        name: 'Inflation Rate (CPI)',
        value: 3.2,
        unit: '%',
        change: -0.1,
        trend: 'down',
        targetRange: { min: 2.0, max: 2.5 },
        description: 'Consumer Price Index year-over-year',
        lastUpdated: now,
        source: 'Fallback Data',
      },
      {
        name: 'Unemployment Rate',
        value: 3.9,
        unit: '%',
        change: 0.1,
        trend: 'up',
        targetRange: { min: 3.5, max: 4.5 },
        description: 'Seasonally adjusted unemployment rate',
        lastUpdated: now,
        source: 'Fallback Data',
      },
      {
        name: 'Fed Funds Rate',
        value: 5.25,
        unit: '%',
        change: 0,
        trend: 'stable',
        targetRange: { min: 5.0, max: 5.5 },
        description: 'Federal Reserve target rate',
        lastUpdated: now,
        source: 'Fallback Data',
      },
      {
        name: '10-Year Treasury Yield',
        value: 4.35,
        unit: '%',
        change: 0.05,
        trend: 'up',
        targetRange: { min: 4.0, max: 4.5 },
        description: 'US Treasury 10-year bond yield',
        lastUpdated: now,
        source: 'Fallback Data',
      },
      {
        name: 'VIX Index',
        value: 15.2,
        unit: '',
        change: -0.8,
        trend: 'down',
        targetRange: { min: 12, max: 20 },
        description: 'Market volatility index',
        lastUpdated: now,
        source: 'Fallback Data',
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