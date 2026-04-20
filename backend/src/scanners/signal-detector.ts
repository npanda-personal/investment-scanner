import * as ti from 'technicalindicators';
import { ConditionEvaluator, MarketData } from './evaluator';
import { Signal, CrossoverDetection } from '../types/scanner-extended';

/**
 * Signal detector for real-time scanner
 * Extends the existing ConditionEvaluator with signal detection capabilities
 */
export class SignalDetector extends ConditionEvaluator {
  
  /**
   * Detect RSI signals
   */
  async detectRSISignals(data: MarketData, period: number = 14): Promise<Signal[]> {
    const signals: Signal[] = [];
    
    if (!data.historicalPrices || data.historicalPrices.length < period + 1) {
      return signals;
    }

    try {
      const closes = data.historicalPrices.map(p => p.close);
      const rsiValues = this.calculateRSISeries(closes, period);
      
      if (rsiValues.length === 0) {
        return signals;
      }

      const currentRSI = rsiValues[rsiValues.length - 1];
      const previousRSI = rsiValues.length > 1 ? rsiValues[rsiValues.length - 2] : currentRSI;

      // RSI Oversold signal (RSI < 30)
      if (currentRSI < 30) {
        const strength = Math.max(0, 1 - (currentRSI / 30));
        signals.push({
          type: 'RSI',
          name: 'RSI_OVERSOLD',
          direction: 'BULLISH',
          strength,
          timestamp: new Date(),
          metadata: {
            rsiValue: currentRSI,
            previousRSI,
            period,
            threshold: 30,
            crossedBelow: previousRSI >= 30 && currentRSI < 30
          }
        });
      }

      // RSI Overbought signal (RSI > 70)
      if (currentRSI > 70) {
        const strength = Math.max(0, (currentRSI - 70) / 30);
        signals.push({
          type: 'RSI',
          name: 'RSI_OVERBOUGHT',
          direction: 'BEARISH',
          strength,
          timestamp: new Date(),
          metadata: {
            rsiValue: currentRSI,
            previousRSI,
            period,
            threshold: 70,
            crossedAbove: previousRSI <= 70 && currentRSI > 70
          }
        });
      }

      // RSI divergence detection (simplified)
      if (rsiValues.length >= 10) {
        const recentRSI = rsiValues.slice(-10);
        const recentPrices = closes.slice(-10);
        
        // Simple divergence detection (price vs RSI trend)
        if (currentRSI > 40 && currentRSI < 60) {
          const priceTrend = recentPrices[recentPrices.length - 1] - recentPrices[0];
          const rsiTrend = recentRSI[recentRSI.length - 1] - recentRSI[0];
          
          if (priceTrend < 0 && rsiTrend > 0 && Math.abs(priceTrend) > 0.02) {
            signals.push({
              type: 'RSI',
              name: 'RSI_BULLISH_DIVERGENCE',
              direction: 'BULLISH',
              strength: 0.6,
              timestamp: new Date(),
              metadata: {
                rsiValue: currentRSI,
                priceChange: priceTrend,
                rsiChange: rsiTrend,
                divergenceType: 'bullish'
              }
            });
          }
        }
      }

    } catch (error) {
      console.error(`Error detecting RSI signals for ${data.symbol}:`, error);
    }

    return signals;
  }

  /**
   * Detect EMA crossover signals
   */
  async detectEMASignals(
    data: MarketData, 
    shortPeriod: number = 9, 
    longPeriod: number = 21
  ): Promise<Signal[]> {
    const signals: Signal[] = [];
    
    if (!data.historicalPrices || data.historicalPrices.length < longPeriod + 1) {
      return signals;
    }

    try {
      const closes = data.historicalPrices.map(p => p.close);
      
      // Calculate EMA series
      const emaShortSeries = this.calculateEMASeries(closes, shortPeriod);
      const emaLongSeries = this.calculateEMASeries(closes, longPeriod);
      
      if (emaShortSeries.length < 2 || emaLongSeries.length < 2) {
        return signals;
      }

      const currentEmaShort = emaShortSeries[emaShortSeries.length - 1];
      const previousEmaShort = emaShortSeries[emaShortSeries.length - 2];
      const currentEmaLong = emaLongSeries[emaLongSeries.length - 1];
      const previousEmaLong = emaLongSeries[emaLongSeries.length - 2];

      // Bullish crossover: short EMA crosses above long EMA
      if (previousEmaShort <= previousEmaLong && currentEmaShort > currentEmaLong) {
        const crossoverStrength = this.calculateCrossoverStrength(
          previousEmaShort, currentEmaShort, previousEmaLong, currentEmaLong
        );
        
        signals.push({
          type: 'EMA',
          name: 'EMA_CROSSOVER_BULLISH',
          direction: 'BULLISH',
          strength: crossoverStrength,
          timestamp: new Date(),
          metadata: {
            emaShort: currentEmaShort,
            emaLong: currentEmaLong,
            shortPeriod,
            longPeriod,
            gap: currentEmaShort - currentEmaLong,
            crossoverType: 'golden_cross'
          }
        });
      }

      // Bearish crossover: short EMA crosses below long EMA
      if (previousEmaShort >= previousEmaLong && currentEmaShort < currentEmaLong) {
        const crossoverStrength = this.calculateCrossoverStrength(
          previousEmaShort, currentEmaShort, previousEmaLong, currentEmaLong
        );
        
        signals.push({
          type: 'EMA',
          name: 'EMA_CROSSOVER_BEARISH',
          direction: 'BEARISH',
          strength: crossoverStrength,
          timestamp: new Date(),
          metadata: {
            emaShort: currentEmaShort,
            emaLong: currentEmaLong,
            shortPeriod,
            longPeriod,
            gap: currentEmaLong - currentEmaShort,
            crossoverType: 'death_cross'
          }
        });
      }

      // EMA alignment signals (all EMAs trending in same direction)
      if (emaShortSeries.length >= 5 && emaLongSeries.length >= 5) {
        const shortTrend = this.calculateTrendStrength(emaShortSeries.slice(-5));
        const longTrend = this.calculateTrendStrength(emaLongSeries.slice(-5));
        
        if (shortTrend > 0.7 && longTrend > 0.7) {
          signals.push({
            type: 'EMA',
            name: 'EMA_ALIGNMENT_BULLISH',
            direction: 'BULLISH',
            strength: (shortTrend + longTrend) / 2,
            timestamp: new Date(),
            metadata: {
              emaShort: currentEmaShort,
              emaLong: currentEmaLong,
              shortTrend,
              longTrend,
              alignment: 'bullish'
            }
          });
        } else if (shortTrend < -0.7 && longTrend < -0.7) {
          signals.push({
            type: 'EMA',
            name: 'EMA_ALIGNMENT_BEARISH',
            direction: 'BEARISH',
            strength: Math.abs((shortTrend + longTrend) / 2),
            timestamp: new Date(),
            metadata: {
              emaShort: currentEmaShort,
              emaLong: currentEmaLong,
              shortTrend,
              longTrend,
              alignment: 'bearish'
            }
          });
        }
      }

    } catch (error) {
      console.error(`Error detecting EMA signals for ${data.symbol}:`, error);
    }

    return signals;
  }

  /**
   * Detect MACD signals
   */
  async detectMACDSignals(data: MarketData): Promise<Signal[]> {
    const signals: Signal[] = [];
    
    if (!data.historicalPrices || data.historicalPrices.length < 26) {
      return signals;
    }

    try {
      const closes = data.historicalPrices.map(p => p.close);
      const macdSeries = this.calculateMACDSeries(closes);
      
      if (macdSeries.length < 2) {
        return signals;
      }

      const currentMACD = macdSeries[macdSeries.length - 1];
      const previousMACD = macdSeries[macdSeries.length - 2];

      // MACD crossover signals
      if (previousMACD.histogram! <= 0 && currentMACD.histogram! > 0) {
        signals.push({
          type: 'MACD',
          name: 'MACD_BULLISH_CROSSOVER',
          direction: 'BULLISH',
          strength: Math.min(1, currentMACD.histogram! * 10), // Scale histogram to 0-1
          timestamp: new Date(),
          metadata: {
            macd: currentMACD.MACD,
            signal: currentMACD.signal,
            histogram: currentMACD.histogram,
            crossoverType: 'bullish'
          }
        });
      }

      if (previousMACD.histogram! >= 0 && currentMACD.histogram! < 0) {
        signals.push({
          type: 'MACD',
          name: 'MACD_BEARISH_CROSSOVER',
          direction: 'BEARISH',
          strength: Math.min(1, Math.abs(currentMACD.histogram!) * 10),
          timestamp: new Date(),
          metadata: {
            macd: currentMACD.MACD,
            signal: currentMACD.signal,
            histogram: currentMACD.histogram,
            crossoverType: 'bearish'
          }
        });
      }

      // MACD divergence
      if (macdSeries.length >= 20) {
        const recentMACD = macdSeries.slice(-20).map(m => m.histogram!);
        const recentPrices = closes.slice(-20);
        
        const macdTrend = this.calculateTrendStrength(recentMACD);
        const priceTrend = this.calculateTrendStrength(recentPrices);
        
        // Bullish divergence: price down, MACD up
        if (priceTrend < -0.3 && macdTrend > 0.3) {
          signals.push({
            type: 'MACD',
            name: 'MACD_BULLISH_DIVERGENCE',
            direction: 'BULLISH',
            strength: 0.7,
            timestamp: new Date(),
            metadata: {
              macdTrend,
              priceTrend,
              divergenceType: 'bullish'
            }
          });
        }
        
        // Bearish divergence: price up, MACD down
        if (priceTrend > 0.3 && macdTrend < -0.3) {
          signals.push({
            type: 'MACD',
            name: 'MACD_BEARISH_DIVERGENCE',
            direction: 'BEARISH',
            strength: 0.7,
            timestamp: new Date(),
            metadata: {
              macdTrend,
              priceTrend,
              divergenceType: 'bearish'
            }
          });
        }
      }

    } catch (error) {
      console.error(`Error detecting MACD signals for ${data.symbol}:`, error);
    }

    return signals;
  }

  /**
   * Detect volume spike signals
   */
  async detectVolumeSpikes(data: MarketData, lookbackPeriod: number = 20): Promise<Signal[]> {
    const signals: Signal[] = [];
    
    if (!data.historicalPrices || data.historicalPrices.length < lookbackPeriod + 1) {
      return signals;
    }

    try {
      const volumes = data.historicalPrices.map(p => p.volume || 0);
      const recentVolumes = volumes.slice(-lookbackPeriod);
      
      if (recentVolumes.length === 0 || recentVolumes[recentVolumes.length - 1] === 0) {
        return signals;
      }

      const currentVolume = recentVolumes[recentVolumes.length - 1];
      const avgVolume = recentVolumes.reduce((sum, vol) => sum + vol, 0) / recentVolumes.length;
      
      if (avgVolume === 0) {
        return signals;
      }

      const volumeRatio = currentVolume / avgVolume;

      // Volume spike detection
      if (volumeRatio > 2) {
        const strength = Math.min(1, (volumeRatio - 2) / 3); // 2x = 0, 5x = 1
        const direction = data.latestPrice && data.historicalPrices.length >= 2
          ? data.latestPrice.close > data.historicalPrices[data.historicalPrices.length - 2].close
            ? 'BULLISH'
            : 'BEARISH'
          : 'NEUTRAL';

        signals.push({
          type: 'VOLUME',
          name: 'VOLUME_SPIKE',
          direction,
          strength,
          timestamp: new Date(),
          metadata: {
            currentVolume,
            avgVolume,
            volumeRatio,
            lookbackPeriod,
            priceDirection: direction
          }
        });
      }

      // Volume trend detection
      if (recentVolumes.length >= 5) {
        const volumeTrend = this.calculateTrendStrength(recentVolumes.slice(-5));
        if (Math.abs(volumeTrend) > 0.7) {
          signals.push({
            type: 'VOLUME',
            name: volumeTrend > 0 ? 'VOLUME_UPTREND' : 'VOLUME_DOWNTREND',
            direction: volumeTrend > 0 ? 'BULLISH' : 'BEARISH',
            strength: Math.abs(volumeTrend),
            timestamp: new Date(),
            metadata: {
              volumeTrend,
              currentVolume,
              avgVolume
            }
          });
        }
      }

    } catch (error) {
      console.error(`Error detecting volume signals for ${data.symbol}:`, error);
    }

    return signals;
  }

  /**
   * Detect price change signals
   */
  async detectPriceChange(
    data: MarketData, 
    period: '1d' | '1w' | '1m' = '1d'
  ): Promise<Signal[]> {
    const signals: Signal[] = [];
    
    if (!data.historicalPrices || data.historicalPrices.length < 2) {
      return signals;
    }

    try {
      let lookback = 1;
      if (period === '1w') lookback = 5;
      if (period === '1m') lookback = 20;
      
      if (data.historicalPrices.length < lookback + 1) {
        return signals;
      }

      const recent = data.historicalPrices.slice(-lookback - 1);
      const oldClose = recent[0].close;
      const newClose = recent[recent.length - 1].close;
      const percentChange = (newClose - oldClose) / oldClose;

      // Significant price movement
      const absChange = Math.abs(percentChange);
      if (absChange > 0.05) { // 5% threshold
        const direction = percentChange > 0 ? 'BULLISH' : 'BEARISH';
        const strength = Math.min(1, absChange / 0.2); // 20% change = max strength
        
        signals.push({
          type: 'PRICE_CHANGE',
          name: direction === 'BULLISH' ? 'PRICE_SURGE' : 'PRICE_DECLINE',
          direction,
          strength,
          timestamp: new Date(),
          metadata: {
            percentChange,
            period,
            oldClose,
            newClose,
            lookback
          }
        });
      }

      // Breakout detection (simplified)
      if (data.historicalPrices.length >= 50) {
        const recentPrices = data.historicalPrices.slice(-20).map(p => p.close);
        const olderPrices = data.historicalPrices.slice(-50, -20).map(p => p.close);
        
        if (olderPrices.length > 0 && recentPrices.length > 0) {
          const olderAvg = olderPrices.reduce((sum, p) => sum + p, 0) / olderPrices.length;
          const recentAvg = recentPrices.reduce((sum, p) => sum + p, 0) / recentPrices.length;
          const breakoutRatio = recentAvg / olderAvg;
          
          if (breakoutRatio > 1.1) { // 10% breakout
            signals.push({
              type: 'PRICE_CHANGE',
              name: 'PRICE_BREAKOUT',
              direction: 'BULLISH',
              strength: Math.min(1, (breakoutRatio - 1.1) / 0.2),
              timestamp: new Date(),
              metadata: {
                breakoutRatio,
                olderAvg,
                recentAvg,
                period: 'breakout'
              }
            });
          } else if (breakoutRatio < 0.9) { // 10% breakdown
            signals.push({
              type: 'PRICE_CHANGE',
              name: 'PRICE_BREAKDOWN',
              direction: 'BEARISH',
              strength: Math.min(1, (0.9 - breakoutRatio) / 0.2),
              timestamp: new Date(),
              metadata: {
                breakoutRatio,
                olderAvg,
                recentAvg,
                period: 'breakdown'
              }
            });
          }
        }
      }

    } catch (error) {
      console.error(`Error detecting price change signals for ${data.symbol}:`, error);
    }

    return signals;
  }

  /**
   * Calculate RSI series
   */
  private calculateRSISeries(closes: number[], period: number): number[] {
    if (closes.length < period + 1) {
      return [];
    }
    const rsi = ti.RSI.calculate({ values: closes, period });
    return rsi;
  }

  /**
   * Calculate EMA series
   */
  private calculateEMASeries(closes: number[], period: number): number[] {
    if (closes.length < period) {
      return [];
    }
    const ema = ti.EMA.calculate({ values: closes, period });
    return ema;
  }

  /**
   * Calculate MACD series
   */
  private calculateMACDSeries(closes: number[]): any[] {
    if (closes.length < 26) {
      return [];
    }
    const macd = ti.MACD.calculate({
      values: closes,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false
    });
    return macd;
  }

  /**
   * Calculate crossover strength
   */
  private calculateCrossoverStrength(
    prevShort: number, currShort: number,
    prevLong: number, currLong: number
  ): number {
    const gap = Math.abs(currShort - currLong);
    const prevGap = Math.abs(prevShort - prevLong);
    const gapChange = gap - prevGap;
    
    // Strength based on gap size and change
    const baseStrength = Math.min(1, gap / (currLong * 0.01)); // 1% of long EMA as max
    const changeStrength = Math.min(1, Math.abs(gapChange) / (prevGap || 1));
    
    return (baseStrength + changeStrength) / 2;
  }

  /**
   * Calculate trend strength of a series
   * Returns value between -1 (strong downtrend) and 1 (strong uptrend)
   */
  private calculateTrendStrength(series: number[]): number {
    if (series.length < 2) {
      return 0;
    }
    
    // Simple linear regression slope
    const n = series.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += series[i];
      sumXY += i * series[i];
      sumX2 += i * i;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgY = sumY / n;
    
    // Normalize slope by average value
    return slope / (avgY || 1);
  }

  /**
   * Detect crossovers in a series
   */
  detectCrossovers(series: number[], threshold: number = 0): CrossoverDetection[] {
    const detections: CrossoverDetection[] = [];
    
    if (series.length < 2) {
      return detections;
    }

    for (let i = 1; i < series.length; i++) {
      const previousValue = series[i - 1];
      const currentValue = series[i];
      
      const crossedAbove = previousValue <= threshold && currentValue > threshold;
      const crossedBelow = previousValue >= threshold && currentValue < threshold;
      
      if (crossedAbove || crossedBelow) {
        detections.push({
          previousValue,
          currentValue,
          threshold,
          crossedAbove,
          crossedBelow
        });
      }
    }

    return detections;
  }

  /**
   * Detect all signals for a symbol
   */
  async detectAllSignals(data: MarketData): Promise<Signal[]> {
    const signals: Signal[] = [];
    
    // Detect RSI signals
    const rsiSignals = await this.detectRSISignals(data);
    signals.push(...rsiSignals);
    
    // Detect EMA signals
    const emaSignals = await this.detectEMASignals(data);
    signals.push(...emaSignals);
    
    // Detect MACD signals
    const macdSignals = await this.detectMACDSignals(data);
    signals.push(...macdSignals);
    
    // Detect volume signals
    const volumeSignals = await this.detectVolumeSpikes(data);
    signals.push(...volumeSignals);
    
    // Detect price change signals
    const priceSignals = await this.detectPriceChange(data);
    signals.push(...priceSignals);
    
    // Sort by strength (descending)
    return signals.sort((a, b) => b.strength - a.strength);
  }

  /**
   * Get signal summary for a symbol
   */
  async getSignalSummary(data: MarketData): Promise<{
    bullishCount: number;
    bearishCount: number;
    totalStrength: number;
    strongestSignal: Signal | null;
  }> {
    const signals = await this.detectAllSignals(data);
    
    let bullishCount = 0;
    let bearishCount = 0;
    let totalStrength = 0;
    let strongestSignal: Signal | null = null;
    
    for (const signal of signals) {
      if (signal.direction === 'BULLISH') {
        bullishCount++;
      } else if (signal.direction === 'BEARISH') {
        bearishCount++;
      }
      
      totalStrength += signal.strength;
      
      if (!strongestSignal || signal.strength > strongestSignal.strength) {
        strongestSignal = signal;
      }
    }
    
    return {
      bullishCount,
      bearishCount,
      totalStrength,
      strongestSignal
    };
  }
}