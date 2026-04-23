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
   * Extract indicators from EnhancedMarketData, preferring daily timeframe
   */
  private getIndicators(opportunity: EnhancedMarketData): Record<string, number> {
    if (opportunity.timeframes?.daily?.indicators) {
      return opportunity.timeframes.daily.indicators;
    }
    return opportunity.indicators;
  }

  /**
   * Get indicators for a specific timeframe
   */
  private getTimeframeIndicators(
    opportunity: EnhancedMarketData,
    timeframe: 'daily' | 'weekly' | 'monthly'
  ): Record<string, number> {
    if (opportunity.timeframes?.[timeframe]?.indicators) {
      return opportunity.timeframes[timeframe].indicators;
    }
    // Fallback to daily if requested timeframe not available
    if (timeframe !== 'daily' && opportunity.timeframes?.daily?.indicators) {
      return opportunity.timeframes.daily.indicators;
    }
    return opportunity.indicators;
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
      
      // Calculate trends for each timeframe
      const dailyIndicators = this.getTimeframeIndicators(opportunity, 'daily');
      const weeklyIndicators = this.getTimeframeIndicators(opportunity, 'weekly');
      const monthlyIndicators = this.getTimeframeIndicators(opportunity, 'monthly');
      
      const dailyTrend = getTrend(dailyIndicators);
      const weeklyTrend = getTrend(weeklyIndicators);
      const monthlyTrend = getTrend(monthlyIndicators);
      
      // Calculate breakdown for decision logic
      const breakdown = this.calculateScoreBreakdown(opportunity);
      
      const convictionScore = Math.round(score);
      
      // Calculate setup type
      const priceChange = this.calculateSimplePriceChange(opportunity);
      const setupType = getSetupType(dailyIndicators, priceChange, dailyTrend);
      
      // Calculate volume visibility with context
      const currentVolume = opportunity.latestPrice?.volume || 0;
      const avgVolume = dailyIndicators.volume_avg ?? dailyIndicators.VOLUME_AVG;
      const volumeLevel = getVolumeLevel(currentVolume, avgVolume);
      const volumeContext = getVolumeContext(volumeLevel, dailyTrend, priceChange);
      const volumeVisibility = volumeLevel; // Keep backward compatibility
      
      // Calculate risk level (depends on alignment and weekly trend, NOT conviction)
      const riskLevel = getRiskLevel(breakdown.alignmentScore, weeklyTrend);
      const distanceToSupport = getDistanceToSupport(
        { ...dailyIndicators, priceChange },
        dailyTrend
      );
      const trendStrength = getTrendStrength(
        { ...dailyIndicators, priceChange },
        dailyTrend
      );
      const entryQuality = getEntryQuality(
        { ...dailyIndicators, priceChange },
        volumeContext,
        setupType,
        distanceToSupport
      );
      const decision = getDecision({
        convictionScore,
        alignmentScore: breakdown.alignmentScore,
        dailyTrend,
        weeklyTrend,
        monthlyTrend,
        setupType,
        riskLevel,
        entryQuality,
        trendStrength,
        signals: opportunity.signals || [],
      });
      const portfolioRelevance = getPortfolioRelevance(
        decision,
        convictionScore,
        riskLevel,
        entryQuality
      );
      
      const scoredOpportunity: ScoredOpportunity = {
        symbol: opportunity.symbol,
        price: opportunity.latestPrice?.close || 0,
        changePercent: priceChange,
        volume: currentVolume,
        signals: opportunity.signals || [],
        score: convictionScore, // conviction score rounded
        breakdown: breakdown,
        rank: 0, // Will be set after sorting
        // New fields
        alignment: `${dailyTrend}/${weeklyTrend}/${monthlyTrend}`,
        insight: generateInsight(dailyTrend, weeklyTrend, monthlyTrend, decision, convictionScore, breakdown.alignmentScore, volumeContext),
        indicators: dailyIndicators,
        // Phase 1: Decision Clarity
        decision: decision,
        setupType: setupType,
        volumeVisibility: volumeVisibility,
        riskLevel: riskLevel,
        entryQuality,
        distanceToSupport,
        trendStrength,
        portfolioRelevance,
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
   * Calculate overall score for an opportunity using new conviction scoring
   */
  private calculateOpportunityScore(opportunity: EnhancedMarketData): number {
    // Get indicators for each timeframe
    const dailyIndicators = this.getTimeframeIndicators(opportunity, 'daily');
    const weeklyIndicators = this.getTimeframeIndicators(opportunity, 'weekly');
    const monthlyIndicators = this.getTimeframeIndicators(opportunity, 'monthly');

    // Calculate trends
    const trendDaily = getTrend(dailyIndicators);
    const trendWeekly = getTrend(weeklyIndicators);
    const trendMonthly = getTrend(monthlyIndicators);

    // Alignment score
    const alignmentScore = getAlignmentScore(trendDaily, trendWeekly, trendMonthly);

    // Momentum score (0-40)
    const rsi = dailyIndicators.rsi ?? dailyIndicators.RSI;
    const macd = dailyIndicators.macd ?? dailyIndicators.MACD;
    const rsiScore = (rsi !== undefined && rsi < 30) ? 20 : 0;
    const macdBullish = macd !== undefined && macd > 0;
    const macdScore = macdBullish ? 20 : 0;
    let momentumScore = rsiScore + macdScore;
    
    // Penalize bullish signals in bearish trends (dead-cat bounces, fake reversals)
    const hasBullishSignals = rsiScore > 0 || macdScore > 0;
    if (trendWeekly === "BEARISH" && hasBullishSignals) {
      momentumScore = Math.max(0, momentumScore - 20); // penalize trap signals
    }

    // Volume score (0-20)
    const volume = opportunity.latestPrice?.volume ?? 0;
    const avgVolume = dailyIndicators.volume_avg ?? dailyIndicators.VOLUME_AVG;
    const volumeScore = (avgVolume !== undefined && volume > avgVolume) ? 20 : 0;

    // Conviction score (weighted sum)
    let convictionScore =
      alignmentScore * 0.4 +
      momentumScore * 0.3 +
      volumeScore * 0.3;

    // Penalize counter-trend setups
    if (trendWeekly === "BEARISH") {
      convictionScore *= 0.6; // reduce by 40% for bearish weekly trend
    }

    // Penalize neutral alignment structure (no clear trend)
    const alignmentSummary = getAlignmentSummary(trendDaily, trendWeekly, trendMonthly);
    if (alignmentSummary === "NEUTRAL") {
      convictionScore *= 0.6; // reduce by 40% for neutral structure
    }

    // Ensure score is between 0-100
    return Math.min(100, Math.max(0, convictionScore));
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
    const indicators = this.getIndicators(opportunity);
    const avgVolume = indicators?.VOLUME_AVG;
    
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
   * Calculate momentum score based on RSI and MACD indicators
   */
  private calculateMomentumScore(indicators: Record<string, number>): number {
    // Get RSI value (case-insensitive lookup)
    const rsiKey = Object.keys(indicators).find(k => k.toLowerCase() === 'rsi');
    const rsi = rsiKey ? indicators[rsiKey] : 50; // Default to neutral
    
    // Get MACD value (case-insensitive lookup)
    const macdKey = Object.keys(indicators).find(k => k.toLowerCase() === 'macd');
    const macd = macdKey ? indicators[macdKey] : 0; // Default to neutral
    
    // RSI scoring: <30 = bullish (1.0), 30-70 = neutral (0.5), >70 = bearish (0.0)
    let rsiScore = 0.5;
    if (rsi < 30) rsiScore = 1.0;
    else if (rsi > 70) rsiScore = 0.0;
    
    // MACD scoring: positive = bullish (1.0), negative = bearish (0.0)
    const macdScore = macd > 0 ? 1.0 : 0.0;
    
    // Combined momentum score (weighted average)
    return (rsiScore * 0.6 + macdScore * 0.4);
  }

  /**
   * Calculate simple price change percentage for display
   */
  private calculateSimplePriceChange(opportunity: EnhancedMarketData): number {
    if (!opportunity.historicalPrices || opportunity.historicalPrices.length < 2) {
      return 0;
    }

    const recent = opportunity.historicalPrices.slice(-2);
    const oldClose = recent[0].close;
    const newClose = recent[1].close;
    
    return (newClose - oldClose) / oldClose;
  }


  /**
   * Calculate detailed score breakdown
   */
  private calculateScoreBreakdown(opportunity: EnhancedMarketData): {
    alignmentScore: number;
    momentumScore: number;
    volumeScore: number;
  } {
    // Calculate trends for each timeframe
    const dailyIndicators = this.getTimeframeIndicators(opportunity, 'daily');
    const weeklyIndicators = this.getTimeframeIndicators(opportunity, 'weekly');
    const monthlyIndicators = this.getTimeframeIndicators(opportunity, 'monthly');
    
    const dailyTrend = getTrend(dailyIndicators);
    const weeklyTrend = getTrend(weeklyIndicators);
    const monthlyTrend = getTrend(monthlyIndicators);
    
    // Calculate alignment score
    const alignmentScore = getAlignmentScore(dailyTrend, weeklyTrend, monthlyTrend);
    
    // Calculate momentum score based on RSI and MACD
    const momentumScore = this.calculateMomentumScore(dailyIndicators);
    
    // Calculate volume score
    const volumeScore = this.calculateVolumeScore(opportunity);
    
    return {
      alignmentScore,
      momentumScore,
      volumeScore
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

/**
 * Determine trend based on EMA indicators
 * @param data - Either an indicators object or EnhancedMarketData with multi-timeframe structure
 * @returns 'BULLISH' if ema20 > ema50, 'BEARISH' if ema20 < ema50, 'NEUTRAL' otherwise
 */
export function getTrend(data: Record<string, number> | EnhancedMarketData): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
  let indicators: Record<string, number>;
  
  if ('symbol' in data) {
    // EnhancedMarketData - extract daily indicators
    const enhancedData = data as EnhancedMarketData;
    if (enhancedData.timeframes?.daily?.indicators) {
      indicators = enhancedData.timeframes.daily.indicators;
    } else {
      indicators = enhancedData.indicators;
    }
  } else {
    // Plain indicators object
    indicators = data as Record<string, number>;
  }
  
  if (indicators.ema20 > indicators.ema50) return 'BULLISH';
  if (indicators.ema20 < indicators.ema50) return 'BEARISH';
  return 'NEUTRAL';
}

/**
 * Calculate alignment score based on trend consistency across timeframes
 * @param d - Daily trend ('BULLISH' | 'BEARISH' | 'NEUTRAL')
 * @param w - Weekly trend ('BULLISH' | 'BEARISH' | 'NEUTRAL')
 * @param m - Monthly trend ('BULLISH' | 'BEARISH' | 'NEUTRAL')
 * @returns Alignment score from 20 (all bearish/neutral) to 90 (all bullish)
 */
export function getAlignmentScore(
  d: 'BULLISH' | 'BEARISH' | 'NEUTRAL',
  w: 'BULLISH' | 'BEARISH' | 'NEUTRAL',
  m: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
): number {
  const trends = [d, w, m];
  const bullishCount = trends.filter(t => t === 'BULLISH').length;

  if (bullishCount === 3) return 90;
  if (bullishCount === 2) return 70;
  if (bullishCount === 1) return 40;
  return 20;
}

/**
 * Get alignment summary string
 * @param d - Daily trend
 * @param w - Weekly trend
 * @param m - Monthly trend
 * @returns Alignment summary: "BULLISH" | "BEARISH" | "NEUTRAL" | "MIXED"
 */
export function getAlignmentSummary(
  d: 'BULLISH' | 'BEARISH' | 'NEUTRAL',
  w: 'BULLISH' | 'BEARISH' | 'NEUTRAL',
  m: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
): 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'MIXED' {
  const trends = [d, w, m];
  const bullishCount = trends.filter(t => t === 'BULLISH').length;
  const bearishCount = trends.filter(t => t === 'BEARISH').length;
  const neutralCount = trends.filter(t => t === 'NEUTRAL').length;

  if (bullishCount === 3) return 'BULLISH';
  if (bearishCount === 3) return 'BEARISH';
  if (neutralCount === 3) return 'NEUTRAL';
  
  if (bullishCount >= 2) return 'BULLISH';
  if (bearishCount >= 2) return 'BEARISH';
  
  return 'MIXED';
}

/**
 * Generate human-readable insight based on multi-timeframe trends
 * @param d - Daily trend ('BULLISH' | 'BEARISH' | 'NEUTRAL')
 * @param w - Weekly trend ('BULLISH' | 'BEARISH' | 'NEUTRAL')
 * @param m - Monthly trend ('BULLISH' | 'BEARISH' | 'NEUTRAL')
 * @param decision - Trading decision ('BUY' | 'ACCUMULATE' | 'WAIT' | 'AVOID')
 * @param convictionScore - Conviction score (0-100)
 * @param alignmentScore - Alignment score (20-90)
 * @returns Actionable insight explaining the decision
 */
export function generateInsight(
  d: 'BULLISH' | 'BEARISH' | 'NEUTRAL',
  w: 'BULLISH' | 'BEARISH' | 'NEUTRAL',
  m: 'BULLISH' | 'BEARISH' | 'NEUTRAL',
  decision: 'BUY' | 'ACCUMULATE' | 'WAIT' | 'AVOID',
  convictionScore: number,
  alignmentScore: number,
  volumeContext?: { label: string; emoji: string; meaning: string }
): string {
  // Base trend analysis
  const bullishCount = [d, w, m].filter(t => t === 'BULLISH').length;
  const bearishCount = [d, w, m].filter(t => t === 'BEARISH').length;
  const neutralCount = [d, w, m].filter(t => t === 'NEUTRAL').length;
  
  // Determine trend summary
  let trendSummary = '';
  if (bullishCount === 3) trendSummary = 'Strong uptrend across all timeframes';
  else if (bullishCount === 2 && bearishCount === 0) trendSummary = 'Majority bullish with neutral support';
  else if (bullishCount === 2 && bearishCount === 1) trendSummary = 'Bullish bias but conflicting weekly/monthly';
  else if (bullishCount === 1 && bearishCount === 0) trendSummary = 'Weak bullish with neutral consolidation';
  else if (bearishCount === 3) trendSummary = 'Strong downtrend across all timeframes';
  else if (bearishCount === 2) trendSummary = 'Majority bearish pressure';
  else if (neutralCount >= 2) trendSummary = 'Consolidation/range-bound across timeframes';
  else trendSummary = 'Mixed signals with no clear direction';
  
  // Determine setup context
  let setupContext = '';
  if (d === 'BULLISH' && w === 'BULLISH' && m === 'BULLISH') {
    setupContext = 'Perfect alignment for positional entry';
  } else if (d === 'BULLISH' && w === 'BULLISH') {
    setupContext = 'Daily pullback within weekly uptrend';
  } else if (d === 'BEARISH' && w === 'BULLISH') {
    setupContext = 'Daily bounce against weekly uptrend';
  } else if (d === 'BULLISH' && w === 'BEARISH') {
    setupContext = 'Counter-trend rally (risky)';
  } else if (neutralCount >= 2) {
    setupContext = 'Range-bound consolidation';
  } else {
    setupContext = 'Mixed timeframe signals';
  }
  
  // Generate structured insight: [Trend] + [Current Setup] + [Volume Context] + [Action]
  const volumeInfo = volumeContext ? ` ${volumeContext.emoji} ${volumeContext.meaning}.` : '';
  
  switch (decision) {
    case 'BUY':
      if (convictionScore >= 80 && alignmentScore >= 80) {
        return `${trendSummary}. ${setupContext}.${volumeInfo} High-conviction BUY for positional entry.`;
      }
      return `${trendSummary}. ${setupContext}.${volumeInfo} BUY with ${convictionScore} conviction - consider scaling in.`;
      
    case 'ACCUMULATE':
      return `${trendSummary}. ${setupContext}.${volumeInfo} ACCUMULATE while the broader trend remains supportive.`;

    case 'WAIT':
      if (neutralCount >= 2) {
        return `${trendSummary}. ${setupContext}.${volumeInfo} WAIT for breakout confirmation.`;
      }
      if (bullishCount === bearishCount) {
        return `${trendSummary}. ${setupContext}.${volumeInfo} WAIT - conflicting signals need resolution.`;
      }
      return `${trendSummary}. ${setupContext}.${volumeInfo} WAIT - monitor for improved setup (${convictionScore} conviction).`;
      
    case 'AVOID':
      // Use getRejectReason for specific rejection clarity
      const rejectReason = getRejectReason(d, w, convictionScore, alignmentScore);
      return `${trendSummary}. ${setupContext}.${volumeInfo} AVOID - ${rejectReason}.`;
      
    default:
      return `${trendSummary}. ${setupContext}.${volumeInfo} Mixed signals, low conviction setup.`;
  }
}

/**
 * Determine trading decision from conviction, trend alignment, setup quality, and risk.
 */
export function getDecision(
  {
    convictionScore,
    alignmentScore,
    dailyTrend,
    weeklyTrend,
    monthlyTrend,
    setupType,
    riskLevel,
    entryQuality,
    trendStrength,
    signals,
  }: {
    convictionScore: number;
    alignmentScore: number;
    dailyTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    weeklyTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    monthlyTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    setupType: 'PULLBACK' | 'BREAKOUT' | 'REVERSAL' | 'RANGE';
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    entryQuality: 'IDEAL' | 'OK' | 'LATE';
    trendStrength: 'STRONG' | 'MODERATE' | 'WEAK';
    signals: Signal[];
  }
): 'BUY' | 'ACCUMULATE' | 'WAIT' | 'AVOID' {
  const trapWarning = getTrapWarning(dailyTrend, weeklyTrend);
  const bullishSignals = signals.filter(signal => signal.direction === 'BULLISH').length;
  const bearishSignals = signals.filter(signal => signal.direction === 'BEARISH').length;
  const hasConflict = bullishSignals > 0 && bearishSignals > 0;
  const strongTrendAlignment =
    weeklyTrend === 'BULLISH' &&
    monthlyTrend === 'BULLISH' &&
    alignmentScore >= 80;
  const favorableSetup = setupType === 'PULLBACK' || setupType === 'BREAKOUT';

  if (
    weeklyTrend === 'BEARISH' ||
    riskLevel === 'HIGH' ||
    trapWarning === 'WARNING_COUNTER_TREND' ||
    bearishSignals > bullishSignals + 1
  ) {
    return 'AVOID';
  }

  if (
    convictionScore >= 80 &&
    strongTrendAlignment &&
    favorableSetup &&
    entryQuality !== 'LATE' &&
    trendStrength === 'STRONG' &&
    !hasConflict
  ) {
    return 'BUY';
  }

  if (
    convictionScore >= 68 &&
    weeklyTrend === 'BULLISH' &&
    alignmentScore >= 60 &&
    (setupType === 'PULLBACK' || setupType === 'REVERSAL' || entryQuality === 'IDEAL') &&
    trendStrength !== 'WEAK'
  ) {
    return 'ACCUMULATE';
  }

  if (
    convictionScore >= 45 ||
    alignmentScore >= 50 ||
    weeklyTrend === 'NEUTRAL' ||
    hasConflict
  ) {
    return 'WAIT';
  }

  return 'AVOID';
}

/**
 * Determine setup type based on price action and indicators
 * @param indicators - Daily timeframe indicators
 * @param priceChange - Recent price change percentage
 * @param trendDaily - Daily trend direction
 * @returns Setup type: "PULLBACK" | "BREAKOUT" | "REVERSAL" | "RANGE"
 */
export function getSetupType(
  indicators: Record<string, number>,
  priceChange: number,
  trendDaily: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
): 'PULLBACK' | 'BREAKOUT' | 'REVERSAL' | 'RANGE' {
  const rsi = indicators.rsi ?? indicators.RSI;
  const atr = indicators.atr ?? indicators.ATR;
  const volatility = atr ? atr / 100 : 0.02; // Default 2% volatility
  
  // Check for pullback (price decline in bullish trend)
  if (trendDaily === 'BULLISH' && priceChange < -2 && rsi && rsi < 40) {
    return 'PULLBACK';
  }
  
  // Check for breakout (price surge with high volatility) with safeguards
  if (Math.abs(priceChange) > 5 && volatility > 0.03) {
    // Safeguard 1: Prevent late entries (price already extended > 8%)
    const isLateEntry = Math.abs(priceChange) > 8;
    
    // Safeguard 2: Check volume (we don't have volume here, but we can check if RSI is overbought)
    const isOverbought = rsi && rsi > 70;
    const isOversold = rsi && rsi < 30;
    
    // For bullish breakouts, avoid if already overbought (late)
    if (priceChange > 0 && (isLateEntry || isOverbought)) {
      // Too extended, treat as PULLBACK instead of BREAKOUT
      return trendDaily === 'BULLISH' ? 'PULLBACK' : 'RANGE';
    }
    
    // For bearish breakouts, avoid if already oversold (late)
    if (priceChange < 0 && (isLateEntry || isOversold)) {
      return trendDaily === 'BEARISH' ? 'REVERSAL' : 'RANGE';
    }
    
    return 'BREAKOUT';
  }
  
  // Check for reversal (trend change with extreme RSI)
  if (trendDaily === 'BEARISH' && priceChange > 3 && rsi && rsi < 30) {
    return 'REVERSAL';
  }
  if (trendDaily === 'BULLISH' && priceChange < -3 && rsi && rsi > 70) {
    return 'REVERSAL';
  }
  
  // Check for range (low volatility, neutral trend)
  if (trendDaily === 'NEUTRAL' && volatility < 0.02) {
    return 'RANGE';
  }
  
  // Default based on trend
  if (trendDaily === 'BULLISH') return 'PULLBACK';
  if (trendDaily === 'BEARISH') return 'REVERSAL';
  return 'RANGE';
}

/**
 * Determine volume level based on current volume vs average
 * @param currentVolume - Current trading volume
 * @param avgVolume - Average volume (from indicators)
 * @returns Volume level: "HIGH" | "NORMAL" | "LOW"
 */
export function getVolumeLevel(
  currentVolume: number,
  avgVolume?: number
): 'HIGH' | 'NORMAL' | 'LOW' {
  if (!avgVolume || avgVolume === 0) {
    return 'NORMAL'; // No baseline to compare
  }
  
  const ratio = currentVolume / avgVolume;
  
  if (ratio > 1.5) {
    return 'HIGH'; // Volume significantly above average
  }
  if (ratio < 0.7) {
    return 'LOW'; // Volume significantly below average
  }
  return 'NORMAL'; // Volume within normal range
}

/**
 * Determine volume context with meaning based on volume level and trend
 * @param volumeLevel - Volume level from getVolumeLevel()
 * @param trendDaily - Daily trend direction
 * @param priceChange - Daily price change percentage
 * @returns Volume context with emoji and meaning
 */
export function getVolumeContext(
  volumeLevel: 'HIGH' | 'NORMAL' | 'LOW',
  trendDaily: 'BULLISH' | 'BEARISH' | 'NEUTRAL',
  priceChange: number
): { label: string; emoji: string; meaning: string } {
  // Enhanced volume interpretation with clear context
  if (volumeLevel === 'HIGH') {
    if (trendDaily === 'BULLISH' && priceChange > 0) {
      return {
        label: 'High volume + Uptrend',
        emoji: '🟢',
        meaning: 'Accumulation (institutional buying)'
      };
    } else if (trendDaily === 'BEARISH' && priceChange < 0) {
      return {
        label: 'High volume + Downtrend',
        emoji: '🔴',
        meaning: 'Distribution (institutional selling)'
      };
    } else if (trendDaily === 'BULLISH' && priceChange <= 0) {
      return {
        label: 'High volume + Bullish trend',
        emoji: '🟡',
        meaning: 'Potential accumulation (price not confirming)'
      };
    } else if (trendDaily === 'BEARISH' && priceChange >= 0) {
      return {
        label: 'High volume + Bearish trend',
        emoji: '🟠',
        meaning: 'Potential distribution (price not confirming)'
      };
    } else {
      return {
        label: 'High volume',
        emoji: '⚠️',
        meaning: 'High volume with unclear direction'
      };
    }
  } else if (volumeLevel === 'LOW') {
    if (Math.abs(priceChange) > 2) {
      return {
        label: 'Low volume + Large move',
        emoji: '⚠️',
        meaning: 'Weak move (low conviction)'
      };
    } else {
      return {
        label: 'Low volume',
        emoji: '⚪',
        meaning: 'Low interest/participation'
      };
    }
  } else {
    // NORMAL volume
    if (trendDaily === 'BULLISH' && priceChange > 0) {
      return {
        label: 'Normal volume + Uptrend',
        emoji: '🔵',
        meaning: 'Healthy uptrend with average participation'
      };
    } else if (trendDaily === 'BEARISH' && priceChange < 0) {
      return {
        label: 'Normal volume + Downtrend',
        emoji: '🔵',
        meaning: 'Healthy downtrend with average participation'
      };
    } else {
      return {
        label: 'Normal volume',
        emoji: '🔵',
        meaning: 'Average market participation'
      };
    }
  }
}

// Keep backward compatibility
export function getVolumeVisibility(
  currentVolume: number,
  avgVolume?: number
): 'HIGH' | 'NORMAL' | 'LOW' {
  return getVolumeLevel(currentVolume, avgVolume);
}

/**
 * Determine risk level based on alignment and weekly trend
 * @param alignmentScore - Alignment score (20-90)
 * @param trendWeekly - Weekly trend: "BULLISH" | "BEARISH" | "NEUTRAL"
 * @returns Risk level: "LOW" | "MEDIUM" | "HIGH"
 */
export function getRiskLevel(
  alignmentScore: number,
  trendWeekly: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
): 'LOW' | 'MEDIUM' | 'HIGH' {
  // Risk depends ONLY on trend + alignment, NOT conviction
  // Strong alignment with bullish trend = LOW risk
  // Weak alignment or bearish trend = HIGH risk
  
  if (alignmentScore >= 80 && trendWeekly === "BULLISH") {
    return "LOW";
  }
  
  if (alignmentScore >= 60) {
    return "MEDIUM";
  }
  
  return "HIGH";
}

/**
 * Detect trap warnings (counter-trend bounces)
 * @param trendDaily - Daily trend direction
 * @param trendWeekly - Weekly trend direction
 * @returns Trap warning message or null if no trap
 */
export function getTrapWarning(
  trendDaily: 'BULLISH' | 'BEARISH' | 'NEUTRAL',
  trendWeekly: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
): string | null {
  // Trap: Daily bullish but weekly bearish (counter-trend bounce)
  if (trendDaily === "BULLISH" && trendWeekly === "BEARISH") {
    return "WARNING_COUNTER_TREND";
  }
  
  // Also flag if daily bearish but weekly bullish (potential reversal)
  if (trendDaily === "BEARISH" && trendWeekly === "BULLISH") {
    return "WARNING_PULLBACK";
  }
  
  return null;
}

/**
 * Generate specific reject reason for AVOID decisions
 * @param d - Daily trend
 * @param w - Weekly trend
 * @param m - Monthly trend
 * @param convictionScore - Conviction score (0-100)
 * @param alignmentScore - Alignment score (20-90)
 * @returns Specific reason why opportunity is avoided
 */
export function getRejectReason(
  d: 'BULLISH' | 'BEARISH' | 'NEUTRAL',
  w: 'BULLISH' | 'BEARISH' | 'NEUTRAL',
  convictionScore: number,
  alignmentScore: number
): string {
  const trends = [d, w];
  const bearishCount = trends.filter(t => t === 'BEARISH').length;
  const neutralCount = trends.filter(t => t === 'NEUTRAL').length;
  
  // Primary reasons based on trend structure
  if (bearishCount >= 2) {
    return "Strong downtrend across timeframes";
  }
  
  if (neutralCount >= 2) {
    return "No clear trend (range-bound)";
  }
  
  if (d === 'BULLISH' && w === 'BEARISH') {
    return "Counter-trend rally (daily bullish, weekly bearish)";
  }
  
  if (d === 'BEARISH' && w === 'BULLISH') {
    return "Pullback in uptrend (wait for confirmation)";
  }
  
  // Secondary reasons based on scores
  if (convictionScore < 55) {
    return `Low conviction (${convictionScore}) - insufficient momentum`;
  }
  
  if (alignmentScore < 60) {
    return `Poor alignment (${alignmentScore}) - conflicting signals`;
  }
  
  if (convictionScore >= 55 && alignmentScore >= 60 && w === 'BEARISH') {
    return "Weekly bearish trend overrides bullish signals";
  }
  
  // Default generic reason
  return "Mixed signals with no clear edge";
}

/**
 * Calculate entry quality based on RSI depth, support proximity, volume behavior
 * @param indicators - Market indicators (RSI, price, volume, etc.)
 * @param volumeContext - Volume context object
 * @param setupType - Setup type (PULLBACK, BREAKOUT, etc.)
 * @returns Entry quality rating: "STRONG" | "AVERAGE" | "WEAK"
 */
export function getEntryQuality(
  indicators: Record<string, number>,
  volumeContext?: { label: string; emoji: string; meaning: string },
  setupType?: 'PULLBACK' | 'BREAKOUT' | 'REVERSAL' | 'RANGE',
  distanceToSupport?: 'NEAR' | 'MID' | 'FAR'
): 'IDEAL' | 'OK' | 'LATE' {
  // Logic based on user's requirements:
  // IDEAL = Pullback + near support + volume
  // LATE = Extended breakout
  // OK = Mid-range
  
  // Check for IDEAL conditions
  const hasGoodVolume = volumeContext && (
    volumeContext.label.toLowerCase().includes('accumulation') ||
    volumeContext.label.toLowerCase().includes('breakout') ||
    volumeContext.label.toLowerCase().includes('normal')
  );
  
  const isPullbackNearSupport = (
    setupType === 'PULLBACK' &&
    distanceToSupport === 'NEAR' &&
    hasGoodVolume
  );
  
  if (isPullbackNearSupport) {
    return "IDEAL";
  }
  
  // Check for LATE conditions (extended breakout)
  const rsi = indicators.RSI || indicators.rsi || 50;
  const priceChange = indicators.priceChange || indicators.change || 0;
  const isExtendedBreakout = (
    setupType === 'BREAKOUT' &&
    (Math.abs(priceChange) > 8 || rsi > 70 || rsi < 30)
  );
  
  if (isExtendedBreakout) {
    return "LATE";
  }
  
  // Default to OK (mid-range)
  return "OK";
}

/**
 * Calculate distance to nearest support/resistance level
 * @param indicators - Market indicators (RSI, price change, volatility, etc.)
 * @param trendDaily - Daily trend direction
 * @returns Distance classification: "NEAR" | "MID" | "FAR"
 */
export function getDistanceToSupport(
  indicators: Record<string, number>,
  trendDaily: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
): 'NEAR' | 'MID' | 'FAR' {
  const rsi = indicators.RSI || indicators.rsi || 50;
  const priceChange = indicators.priceChange || indicators.change || 0;
  const volatility = indicators.volatility || indicators.atr || 0.02;
  
  // Estimate distance based on multiple factors
  let distanceScore = 0;
  
  // 1. RSI proximity to oversold/overbought (40 points max)
  if (rsi <= 30) {
    distanceScore += 40; // Deeply oversold - very near support
  } else if (rsi <= 35) {
    distanceScore += 30; // Oversold - near support
  } else if (rsi <= 40) {
    distanceScore += 20; // Mildly oversold - moderate distance
  } else if (rsi >= 70) {
    distanceScore += 0; // Overbought - far from support
  } else if (rsi >= 60) {
    distanceScore += 10; // Approaching overbought - far from support
  } else {
    distanceScore += 15; // Neutral RSI - moderate distance
  }
  
  // 2. Recent price movement (30 points max)
  // For bullish trends: negative price change means pullback toward support
  // For bearish trends: positive price change means bounce toward resistance
  if (trendDaily === 'BULLISH') {
    if (priceChange < -3) {
      distanceScore += 30; // Strong pullback - near support
    } else if (priceChange < -1) {
      distanceScore += 20; // Moderate pullback
    } else if (priceChange > 5) {
      distanceScore += 0; // Extended rally - far from support
    } else {
      distanceScore += 10; // Neutral movement
    }
  } else if (trendDaily === 'BEARISH') {
    if (priceChange > 3) {
      distanceScore += 30; // Strong bounce - near resistance
    } else if (priceChange > 1) {
      distanceScore += 20; // Moderate bounce
    } else if (priceChange < -5) {
      distanceScore += 0; // Extended decline - far from resistance
    } else {
      distanceScore += 10; // Neutral movement
    }
  } else {
    // Neutral trend
    if (Math.abs(priceChange) < 2) {
      distanceScore += 15; // Range-bound - moderate distance
    } else {
      distanceScore += 5; // Moving but no clear trend
    }
  }
  
  // 3. Volatility adjustment (30 points max)
  // High volatility = wider ranges, so "near" means closer in percentage terms
  const volatilityFactor = Math.min(volatility * 100, 5); // Scale volatility
  if (volatilityFactor > 3) {
    distanceScore -= 10; // High volatility reduces "near" classification
  } else if (volatilityFactor < 1) {
    distanceScore += 10; // Low volatility increases "near" classification
  }
  
  // Classify based on total score
  if (distanceScore >= 60) {
    return "NEAR"; // Close to support/resistance
  } else if (distanceScore >= 30) {
    return "MID"; // Moderate distance
  } else {
    return "FAR"; // Far from support/resistance
  }
}

/**
 * Calculate trend strength based on EMA spread and price slope
 * @param indicators - Market indicators (EMA values, price slope, etc.)
 * @param trendDaily - Daily trend direction
 * @returns Trend strength classification: "STRONG" | "MODERATE" | "WEAK"
 */
export function getTrendStrength(
  indicators: Record<string, number>,
  trendDaily: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
): 'STRONG' | 'MODERATE' | 'WEAK' {
  // Extract EMA values if available
  const ema20 = indicators.ema20 || indicators.EMA20 || 0;
  const ema50 = indicators.ema50 || indicators.EMA50 || 0;
  const ema200 = indicators.ema200 || indicators.EMA200 || 0;
  const priceSlope = indicators.priceSlope || indicators.slope || 0;
  
  let strengthScore = 0;
  
  // 1. EMA alignment (40 points max)
  if (ema20 > ema50 && ema50 > ema200 && ema20 > ema200) {
    strengthScore += 40; // Perfect bullish alignment
  } else if (ema20 < ema50 && ema50 < ema200 && ema20 < ema200) {
    strengthScore += 40; // Perfect bearish alignment
  } else if ((ema20 > ema50 && ema50 > ema200) || (ema20 < ema50 && ema50 < ema200)) {
    strengthScore += 30; // Good alignment (2 out of 3)
  } else if (Math.abs(ema20 - ema50) < (ema50 * 0.01) || Math.abs(ema50 - ema200) < (ema200 * 0.01)) {
    strengthScore += 10; // EMAs converging (weak trend)
  } else {
    strengthScore += 20; // Mixed alignment
  }
  
  // 2. Price slope magnitude (30 points max)
  const slopeAbs = Math.abs(priceSlope);
  if (slopeAbs > 0.5) {
    strengthScore += 30; // Strong slope
  } else if (slopeAbs > 0.2) {
    strengthScore += 20; // Moderate slope
  } else if (slopeAbs > 0.05) {
    strengthScore += 10; // Weak slope
  } else {
    strengthScore += 5; // Flat
  }
  
  // 3. Trend consistency (30 points max)
  // Check if trend direction matches price movement
  const priceChange = indicators.priceChange || indicators.change || 0;
  if (trendDaily === 'BULLISH' && priceChange > 0) {
    strengthScore += 30; // Bullish trend with upward price
  } else if (trendDaily === 'BEARISH' && priceChange < 0) {
    strengthScore += 30; // Bearish trend with downward price
  } else if (trendDaily === 'NEUTRAL' && Math.abs(priceChange) < 2) {
    strengthScore += 20; // Neutral trend with range-bound price
  } else if (
    (trendDaily === 'BULLISH' && priceChange < 0) ||
    (trendDaily === 'BEARISH' && priceChange > 0)
  ) {
    strengthScore += 5; // Counter-trend movement (weakens trend)
  } else {
    strengthScore += 15; // Mixed signals
  }
  
  // Classify based on total score
  if (strengthScore >= 80) {
    return "STRONG";
  } else if (strengthScore >= 50) {
    return "MODERATE";
  } else {
    return "WEAK";
  }
}

/**
 * Calculate portfolio relevance (position sizing guidance)
 * @param decision - Trading decision (BUY/ACCUMULATE/WAIT/AVOID)
 * @param convictionScore - Conviction score (0-100)
 * @param riskLevel - Risk level (LOW/MEDIUM/HIGH)
 * @param entryQuality - Entry quality (STRONG/AVERAGE/WEAK)
 * @returns Portfolio relevance: "CORE" | "SATELLITE" | "AVOID" | "SMALL"
 */
export function getPortfolioRelevance(
  decision: 'BUY' | 'ACCUMULATE' | 'WAIT' | 'AVOID',
  convictionScore: number,
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH',
  entryQuality: 'IDEAL' | 'OK' | 'LATE'
): 'CORE' | 'SATELLITE' | 'AVOID' | 'SMALL' {
  // AVOID decisions should not be in portfolio
  if (decision === 'AVOID') {
    return 'AVOID';
  }
  
  if (decision === 'WAIT') {
    return 'SMALL';
  }

  if (decision === 'ACCUMULATE') {
    return riskLevel === 'LOW' ? 'SATELLITE' : 'SMALL';
  }
  
  // BUY decisions with strong criteria become CORE positions
  if (convictionScore >= 80 && riskLevel === 'LOW' && entryQuality === 'IDEAL') {
    return 'CORE'; // 3-5% portfolio allocation
  }
  
  // BUY decisions with good criteria become SATELLITE positions
  if (convictionScore >= 70 && riskLevel !== 'HIGH' && entryQuality !== 'LATE') {
    return 'SATELLITE'; // 1-3% portfolio allocation
  }
  
  // Other BUY decisions are SMALL positions
  return 'SMALL'; // 0.5-1% portfolio allocation
}
