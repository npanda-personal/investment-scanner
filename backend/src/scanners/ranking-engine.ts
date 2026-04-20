import { 
  ScoredOpportunity, 
  RankingConfig, 
  Signal,
  EnhancedMarketData 
} from '../types/scanner-extended';

/**
 * Default ranking configuration
 */
export const DEFAULT_RANKING_CONFIG: RankingConfig = {
  signalWeights: {
    'RSI_OVERSOLD': 1.2,
    'RSI_OVERBOUGHT': 1.0,
    'EMA_CROSSOVER_BULLISH': 1.5,
    'EMA_CROSSOVER_BEARISH': 1.3,
    'MACD_BULLISH_CROSSOVER': 1.4,
    'MACD_BEARISH_CROSSOVER': 1.2,
    'VOLUME_SPIKE': 1.1,
    'PRICE_SURGE': 1.3,
    'PRICE_DECLINE': 1.1,
    'RSI_BULLISH_DIVERGENCE': 1.6,
    'RSI_BEARISH_DIVERGENCE': 1.4,
    'MACD_BULLISH_DIVERGENCE': 1.7,
    'MACD_BEARISH_DIVERGENCE': 1.5,
    'EMA_ALIGNMENT_BULLISH': 1.2,
    'EMA_ALIGNMENT_BEARISH': 1.1,
    'VOLUME_UPTREND': 1.0,
    'VOLUME_DOWNTREND': 0.9,
    'PRICE_BREAKOUT': 1.8,
    'PRICE_BREAKDOWN': 1.6
  },
  volumeWeight: 0.3,
  priceChangeWeight: 0.4,
  recencyBias: 0.2 // Favor recent signals (0-1)
};

/**
 * Ranking engine for scoring and sorting trading opportunities
 */
export class RankingEngine {
  private config: RankingConfig;

  constructor(config: Partial<RankingConfig> = {}) {
    this.config = { ...DEFAULT_RANKING_CONFIG, ...config };
  }

  /**
   * Rank opportunities based on signals and market data
   */
  rankOpportunities(
    opportunities: EnhancedMarketData[]
  ): ScoredOpportunity[] {
    const scoredOpportunities: ScoredOpportunity[] = [];

    for (const opportunity of opportunities) {
      const score = this.calculateOpportunityScore(opportunity);
      const scoredOpportunity: ScoredOpportunity = {
        symbol: opportunity.symbol,
        price: opportunity.latestPrice?.close || 0,
        changePercent: this.calculatePriceChange(opportunity),
        volume: opportunity.latestPrice?.volume || 0,
        signals: opportunity.signals || [],
        score,
        breakdown: this.calculateScoreBreakdown(opportunity),
        rank: 0 // Will be set after sorting
      };
      scoredOpportunities.push(scoredOpportunity);
    }

    // Sort by score (descending) and assign ranks
    scoredOpportunities.sort((a, b) => b.score - a.score);
    scoredOpportunities.forEach((opportunity, index) => {
      opportunity.rank = index + 1;
    });

    return scoredOpportunities;
  }

  /**
   * Calculate overall score for an opportunity
   */
  private calculateOpportunityScore(opportunity: EnhancedMarketData): number {
    const signalScore = this.calculateSignalScore(opportunity.signals || []);
    const volumeScore = this.calculateVolumeScore(opportunity);
    const changeScore = this.calculateChangeScore(opportunity);
    const recencyScore = this.calculateRecencyScore(opportunity.signals || []);

    // Weighted sum of component scores
    const totalScore = 
      signalScore * 0.5 +
      volumeScore * this.config.volumeWeight +
      changeScore * this.config.priceChangeWeight +
      recencyScore * this.config.recencyBias;

    // Normalize to 0-100 scale
    return Math.min(100, Math.max(0, totalScore * 100));
  }

  /**
   * Calculate signal-based score
   */
  calculateSignalScore(signals: Signal[]): number {
    if (signals.length === 0) {
      return 0;
    }

    let totalScore = 0;
    let maxPossibleScore = 0;

    for (const signal of signals) {
      const signalWeight = this.config.signalWeights[signal.name] || 1.0;
      const signalStrength = signal.strength;
      
      // Direction multiplier: bullish signals positive, bearish negative
      const directionMultiplier = signal.direction === 'BULLISH' ? 1 : -1;
      
      totalScore += signalStrength * signalWeight * directionMultiplier;
      maxPossibleScore += signalWeight;
    }

    // Normalize to -1 to 1 range
    const normalizedScore = maxPossibleScore > 0 ? totalScore / maxPossibleScore : 0;
    
    // Convert to 0-1 range (bearish signals reduce score)
    return (normalizedScore + 1) / 2;
  }

  /**
   * Calculate volume-based score
   */
  private calculateVolumeScore(opportunity: EnhancedMarketData): number {
    if (!opportunity.latestPrice?.volume) {
      return 0.5; // Neutral score for missing volume
    }

    const currentVolume = opportunity.latestPrice.volume;
    
    // Try to get average volume from indicators
    const avgVolume = opportunity.indicators?.VOLUME_AVG;
    
    if (avgVolume && avgVolume > 0) {
      const volumeRatio = currentVolume / avgVolume;
      
      // Score based on volume ratio: 1x = 0.5, 2x = 0.75, 5x = 1.0
      if (volumeRatio >= 5) return 1.0;
      if (volumeRatio >= 2) return 0.5 + (volumeRatio - 2) / 6;
      if (volumeRatio >= 1) return 0.5 + (volumeRatio - 1) / 2;
      return volumeRatio / 2; // 0-1x volume
    }

    // Fallback: use absolute volume (simplified)
    const volumeInMillions = currentVolume / 1000000;
    if (volumeInMillions > 10) return 1.0;
    if (volumeInMillions > 1) return 0.5 + (volumeInMillions / 20);
    return volumeInMillions / 2;
  }

  /**
   * Calculate price change score
   */
  private calculateChangeScore(opportunity: EnhancedMarketData): number {
    const changePercent = this.calculatePriceChange(opportunity);
    
    // Convert percentage change to 0-1 score
    // +20% = 1.0, 0% = 0.5, -20% = 0.0
    const normalizedScore = 0.5 + (changePercent / 40);
    
    return Math.max(0, Math.min(1, normalizedScore));
  }

  /**
   * Calculate price change percentage
   */
  private calculatePriceChange(opportunity: EnhancedMarketData): number {
    if (!opportunity.historicalPrices || opportunity.historicalPrices.length < 2) {
      return 0;
    }

    const recent = opportunity.historicalPrices.slice(-2);
    const oldClose = recent[0].close;
    const newClose = recent[1].close;
    
    return (newClose - oldClose) / oldClose;
  }

  /**
   * Calculate recency score for signals
   */
  private calculateRecencyScore(signals: Signal[]): number {
    if (signals.length === 0) {
      return 0;
    }

    const now = Date.now();
    let totalRecencyScore = 0;
    
    for (const signal of signals) {
      const signalAge = now - signal.timestamp.getTime();
      const ageInHours = signalAge / (1000 * 60 * 60);
      
      // Exponential decay: signals from last hour = 1.0, last 24 hours = 0.5
      const recency = Math.exp(-ageInHours / 24);
      totalRecencyScore += recency;
    }

    return totalRecencyScore / signals.length;
  }

  /**
   * Calculate detailed score breakdown
   */
  private calculateScoreBreakdown(opportunity: EnhancedMarketData): {
    signalScore: number;
    volumeScore: number;
    changeScore: number;
    recencyScore: number;
  } {
    return {
      signalScore: this.calculateSignalScore(opportunity.signals || []),
      volumeScore: this.calculateVolumeScore(opportunity),
      changeScore: this.calculateChangeScore(opportunity),
      recencyScore: this.calculateRecencyScore(opportunity.signals || [])
    };
  }

  /**
   * Filter opportunities by minimum score
   */
  filterByScore(
    opportunities: ScoredOpportunity[], 
    minScore: number = 50
  ): ScoredOpportunity[] {
    return opportunities.filter(opp => opp.score >= minScore);
  }

  /**
   * Filter opportunities by signal type
   */
  filterBySignalType(
    opportunities: ScoredOpportunity[],
    signalType: string
  ): ScoredOpportunity[] {
    return opportunities.filter(opp => 
      opp.signals.some(signal => signal.type === signalType || signal.name === signalType)
    );
  }

  /**
   * Group opportunities by signal count
   */
  groupBySignalCount(opportunities: ScoredOpportunity[]): {
    high: ScoredOpportunity[]; // 3+ signals
    medium: ScoredOpportunity[]; // 2 signals
    low: ScoredOpportunity[]; // 1 signal
    none: ScoredOpportunity[]; // 0 signals
  } {
    const groups = {
      high: [] as ScoredOpportunity[],
      medium: [] as ScoredOpportunity[],
      low: [] as ScoredOpportunity[],
      none: [] as ScoredOpportunity[]
    };

    for (const opportunity of opportunities) {
      const signalCount = opportunity.signals.length;
      
      if (signalCount >= 3) {
        groups.high.push(opportunity);
      } else if (signalCount === 2) {
        groups.medium.push(opportunity);
      } else if (signalCount === 1) {
        groups.low.push(opportunity);
      } else {
        groups.none.push(opportunity);
      }
    }

    return groups;
  }

  /**
   * Get top N opportunities
   */
  getTopOpportunities(
    opportunities: ScoredOpportunity[],
    limit: number = 10
  ): ScoredOpportunity[] {
    return opportunities
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Get opportunities by rank range
   */
  getByRankRange(
    opportunities: ScoredOpportunity[],
    startRank: number = 1,
    endRank: number = 10
  ): ScoredOpportunity[] {
    return opportunities
      .filter(opp => opp.rank >= startRank && opp.rank <= endRank)
      .sort((a, b) => a.rank - b.rank);
  }

  /**
   * Calculate statistics for a set of opportunities
   */
  calculateStatistics(opportunities: ScoredOpportunity[]): {
    averageScore: number;
    medianScore: number;
    scoreDistribution: Record<string, number>;
    signalDistribution: Record<string, number>;
    topSignals: Array<{ name: string; count: number }>;
  } {
    if (opportunities.length === 0) {
      return {
        averageScore: 0,
        medianScore: 0,
        scoreDistribution: {},
        signalDistribution: {},
        topSignals: []
      };
    }

    // Calculate average and median scores
    const scores = opportunities.map(opp => opp.score);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    const sortedScores = [...scores].sort((a, b) => a - b);
    const medianScore = sortedScores[Math.floor(sortedScores.length / 2)];

    // Score distribution
    const scoreDistribution: Record<string, number> = {
      '90-100': 0,
      '80-89': 0,
      '70-79': 0,
      '60-69': 0,
      '50-59': 0,
      '40-49': 0,
      '30-39': 0,
      '20-29': 0,
      '10-19': 0,
      '0-9': 0
    };

    for (const score of scores) {
      const range = Math.floor(score / 10) * 10;
      const key = `${range}-${range + 9}`;
      if (scoreDistribution[key] !== undefined) {
        scoreDistribution[key]++;
      }
    }

    // Signal distribution
    const signalDistribution: Record<string, number> = {};
    const signalCounts: Record<string, number> = {};

    for (const opportunity of opportunities) {
      for (const signal of opportunity.signals) {
        signalCounts[signal.name] = (signalCounts[signal.name] || 0) + 1;
      }
    }

    // Convert to distribution percentages
    const totalSignals = Object.values(signalCounts).reduce((sum, count) => sum + count, 0);
    for (const [signalName, count] of Object.entries(signalCounts)) {
      signalDistribution[signalName] = totalSignals > 0 ? (count / totalSignals) * 100 : 0;
    }

    // Top signals
    const topSignals = Object.entries(signalCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      averageScore,
      medianScore,
      scoreDistribution,
      signalDistribution,
      topSignals
    };
  }

  /**
   * Update ranking configuration
   */
  updateConfig(newConfig: Partial<RankingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): RankingConfig {
    return { ...this.config };
  }

  /**
   * Reset to default configuration
   */
  resetConfig(): void {
    this.config = { ...DEFAULT_RANKING_CONFIG };
  }
}